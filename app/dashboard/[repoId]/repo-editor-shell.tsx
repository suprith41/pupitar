"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";

type Repo = Pick<Database["public"]["Tables"]["repos"]["Row"], "id" | "name">;
type PromptVersion = Database["public"]["Tables"]["prompt_versions"]["Row"];

const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] as const;
const defaultModel = models[0];

type RepoEditorShellProps = {
  repo: Repo;
  initialVersions: PromptVersion[];
};

type DeploymentDetails = {
  endpoint_url: string;
  api_key: string;
};

export function RepoEditorShell({ repo, initialVersions }: RepoEditorShellProps) {
  const latestVersion = initialVersions[0] ?? null;
  const [versions, setVersions] = useState(initialVersions);
  const [content, setContent] = useState(latestVersion?.content ?? "");
  const [commitMessage, setCommitMessage] = useState("");
  const [model, setModel] = useState(latestVersion?.model ?? defaultModel);
  const [temperature, setTemperature] = useState(latestVersion?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(latestVersion?.max_tokens ?? 512);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(latestVersion?.id ?? null);
  const [previewVersion, setPreviewVersion] = useState<PromptVersion | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [playgroundResponse, setPlaygroundResponse] = useState("");
  const [playgroundError, setPlaygroundError] = useState("");
  const [deploymentDetails, setDeploymentDetails] = useState<DeploymentDetails | null>(null);
  const [didCopyApiKey, setDidCopyApiKey] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const mostRecentVersion = versions[0] ?? null;
  const isPreviewing = Boolean(previewVersion);
  const canDeploy = Boolean(mostRecentVersion);

  const orderedVersions = useMemo(
    () =>
      [...versions].sort(
        (first, second) =>
          new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      ),
    [versions]
  );

  function getVersionNumber(version: PromptVersion) {
    const newestFirstIndex = orderedVersions.findIndex((item) => item.id === version.id);
    return newestFirstIndex === -1 ? orderedVersions.length : orderedVersions.length - newestFirstIndex;
  }

  async function createCommit(message: string, nextContent = content) {
    setError("");
    setStatus("");
    setIsCommitting(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("prompt_versions")
      .insert({
        repo_id: repo.id,
        content: nextContent,
        commit_message: message.trim() || null,
        model,
        temperature,
        max_tokens: maxTokens,
        parent_version_id: activeVersionId
      })
      .select(
        "id, repo_id, content, model, temperature, max_tokens, commit_message, parent_version_id, created_at"
      )
      .single();

    setIsCommitting(false);

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    setVersions((current) => [data, ...current]);
    setContent(data.content);
    setCommitMessage("");
    setActiveVersionId(data.id);
    setPreviewVersion(null);
    setStatus("Committed.");
    return data;
  }

  async function onCommit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPreviewing) {
      return;
    }

    await createCommit(commitMessage);
  }

  async function onRestore() {
    if (!previewVersion) {
      return;
    }

    await createCommit(
      `Restored from ${previewVersion.commit_message || "Untitled commit"}`,
      previewVersion.content
    );
  }

  async function onDeploy() {
    if (!mostRecentVersion) {
      setError("Commit a version before deploying.");
      return;
    }

    setError("");
    setStatus("");
    setIsDeploying(true);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repo.id })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || "Deploy failed.");
      }

      setDeploymentDetails(payload);
      setDidCopyApiKey(false);
      setStatus("Deployed latest commit.");
    } catch (deployError) {
      const message = deployError instanceof Error ? deployError.message : "Deploy failed.";
      setError(message);
    } finally {
      setIsDeploying(false);
    }
  }

  async function copyApiKey(apiKey: string) {
    await navigator.clipboard.writeText(apiKey);
    setDidCopyApiKey(true);
  }

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlaygroundError("");
    setStatus("");
    setPlaygroundResponse("");
    setIsRunning(true);

    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          model,
          temperature,
          max_tokens: maxTokens,
          test_message: testMessage
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || "Playground request failed.");
      }

      setPlaygroundResponse(payload.response ?? "");
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "";
      setPlaygroundError(
        message === "Failed to fetch"
          ? "Could not reach the playground backend. Make sure FastAPI is running."
          : message
            ? message
          : "Could not reach the playground backend. Make sure FastAPI is running."
      );
    } finally {
      setIsRunning(false);
    }
  }

  function loadVersion(version: PromptVersion) {
    setPreviewVersion(version);
    setContent(version.content);
    setModel(version.model);
    setTemperature(version.temperature);
    setMaxTokens(version.max_tokens);
    setCommitMessage("");
    setStatus("");
    setError("");
  }

  function exitPreview() {
    const latest = versions[0] ?? null;

    setContent(latest?.content ?? "");
    setModel(latest?.model ?? defaultModel);
    setTemperature(latest?.temperature ?? 0.7);
    setMaxTokens(latest?.max_tokens ?? 512);
    setActiveVersionId(latest?.id ?? null);
    setCommitMessage("");
    setPreviewVersion(null);
    setStatus("");
    setError("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
      <section className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-baseline gap-2 border-b border-line pb-4">
          <h1 className="break-words text-2xl font-semibold text-ink">{repo.name}</h1>
          <span className="font-mono text-sm text-muted">/ prompt.md</span>
        </div>

        {isPreviewing ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent bg-panel p-3">
            <p className="text-sm text-muted">
              Previewing v{previewVersion ? getVersionNumber(previewVersion) : orderedVersions.length}{" "}
              - this is read only
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exitPreview}
                className="rounded-sm border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRestore}
                disabled={isCommitting}
                className="rounded-sm border border-accent bg-accent px-3 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCommitting ? "Restoring..." : "Restore this version"}
              </button>
            </div>
          </div>
        ) : null}

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          readOnly={isPreviewing}
          spellCheck={false}
          className={`min-h-[520px] w-full resize-none rounded-md border bg-[#0d0d10] p-5 font-mono text-sm leading-7 text-ink outline-none transition-colors placeholder:text-muted focus:border-accent read-only:text-muted ${
            isPreviewing ? "border-accent/70" : "border-line"
          }`}
          placeholder="Write the system prompt..."
        />

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onCommit}>
          <input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            disabled={isPreviewing}
            className="rounded-sm border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Commit message"
          />
          <button
            type="submit"
            disabled={isCommitting || isPreviewing}
            className="rounded-sm border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCommitting ? "Committing..." : "Commit"}
          </button>
        </form>

        <section className="border-t border-line pt-6">
          <h2 className="text-sm font-medium text-ink">Playground</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onRun}>
            <input
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              className="rounded-sm border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
              placeholder="Type a test message..."
            />
            <button
              type="submit"
              disabled={isRunning || !testMessage.trim()}
              className="rounded-sm border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Run"}
            </button>
          </form>
          <div className="mt-4 min-h-32 rounded-md border border-line bg-panel p-4">
            <p className={`whitespace-pre-wrap text-sm leading-6 ${playgroundError ? "text-accent" : "text-ink"}`}>
              {isRunning ? "Running..." : playgroundError || playgroundResponse || "No response yet."}
            </p>
          </div>
        </section>

        {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
        {status ? <p className="text-sm leading-6 text-muted">{status}</p> : null}
      </section>

      <aside className="flex min-w-0 flex-col gap-6 border-line lg:border-l lg:pl-6">
        <section className="flex flex-col gap-5 rounded-md border border-line bg-panel p-5">
          <label className="flex flex-col gap-2 text-sm text-muted">
            Model
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
            >
              {models.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span className="flex items-center justify-between gap-4">
              Temperature
              <span className="font-mono text-xs text-ink">{temperature.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(event) => setTemperature(Number(event.target.value))}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            Max tokens
            <input
              type="number"
              min="1"
              value={maxTokens}
              onChange={(event) => setMaxTokens(Number(event.target.value))}
              className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
          </label>

          <button
            type="button"
            onClick={onDeploy}
            disabled={isDeploying || !canDeploy}
            className="rounded-sm border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeploying ? "Deploying..." : "Deploy"}
          </button>

          {deploymentDetails ? (
            <div className="border-t border-line pt-5">
              <p className="text-sm font-medium text-ink">Live endpoint</p>
              <code className="mt-3 block break-all rounded-sm border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">
                POST {deploymentDetails.endpoint_url}
              </code>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <code className="block break-all rounded-sm border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">
                  {deploymentDetails.api_key}
                </code>
                <button
                  type="button"
                  onClick={() => copyApiKey(deploymentDetails.api_key)}
                  className="rounded-sm border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {didCopyApiKey ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                Pass your api_key as Authorization: Bearer {deploymentDetails.api_key} header
              </p>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="text-lg font-medium text-ink">History</h2>
          {orderedVersions.length === 0 ? (
            <p className="text-sm leading-6 text-muted">No commits yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {orderedVersions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => loadVersion(version)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    previewVersion?.id === version.id || (!isPreviewing && activeVersionId === version.id)
                      ? "border-accent bg-panel"
                      : "border-line bg-transparent hover:border-accent"
                  }`}
                >
                  <p className="break-words text-sm font-medium text-ink">
                    {version.commit_message || "Untitled commit"}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted">
                    {formatRelativeTime(version.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
