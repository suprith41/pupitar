"use client";

const DiffMatchPatch = require("diff-match-patch");

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { DashboardEmptyIllustration } from "@/components/dashboard-empty-illustration";

type Repo = Pick<Database["public"]["Tables"]["repos"]["Row"], "id" | "name">;
type PromptVersion = Database["public"]["Tables"]["prompt_versions"]["Row"];
type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
type EvalCaseRow = Database["public"]["Tables"]["eval_cases"]["Row"];
type RequestLogRow = Pick<
  Database["public"]["Tables"]["request_logs"]["Row"],
  "id" | "latency_ms" | "token_count" | "input_tokens" | "output_tokens" | "status" | "created_at"
>;

type BranchOption = {
  id: string | null;
  repo_id: string;
  name: string;
  created_from_version_id: string | null;
  is_main: boolean;
  created_at: string;
};

const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] as const;
const defaultModel = models[0];
const COMMON_REPO_TAGS = [
  "customer-support",
  "coding-assistant",
  "data-extraction",
  "summarization",
  "classification",
  "translation",
  "qa-bot",
  "agent",
  "other"
] as const;

type RepoEditorShellProps = {
  repo: Repo;
  initialVersions: PromptVersion[];
  initialBranches: BranchRow[];
  initialEvalCases: EvalCaseRow[];
  initialTags: string[];
  initialRequestLogs: RequestLogRow[];
  deploymentVersionId?: string | null;
  currentUserEmail?: string | null;
  currentUserLabel?: string;
};

type DeploymentDetails = {
  endpoint_url: string;
  api_key: string;
};

type DiffLineRow = {
  kind: "equal" | "delete" | "insert" | "replace";
  oldLine: string;
  newLine: string;
};

type EvalRunCaseResult = {
  eval_case_id: string;
  input: string;
  expected_outcome: string;
  description: string | null;
  response: string;
  passed: boolean;
  verdict: "PASS" | "FAIL";
};

type MergeFlowState = {
  branchId: string | null;
  branchName: string;
  versionId: string;
  status: "running" | "ready" | "blocked" | "no-evals";
  summary: { score: number; total: number } | null;
  results: EvalRunCaseResult[] | null;
  isMerging: boolean;
  error: string;
};

type MainTab = "overview" | "editor" | "evals" | "changelog";
type OverviewTab = "content" | "analytics";

function toBranchOption(branch: BranchRow, repoId: string): BranchOption {
  return {
    id: branch.id,
    repo_id: branch.repo_id || repoId,
    name: branch.name,
    created_from_version_id: branch.created_from_version_id,
    is_main: Boolean(branch.is_main),
    created_at: branch.created_at
  };
}

function buildInitialBranches(initialBranches: BranchRow[], repoId: string) {
  const mapped = initialBranches.map((branch) => toBranchOption(branch, repoId));
  const mainBranch = mapped.find((branch) => branch.is_main) ?? {
    id: null,
    repo_id: repoId,
    name: "main",
    created_from_version_id: null,
    is_main: true,
    created_at: ""
  };
  const otherBranches = mapped
    .filter((branch) => !branch.is_main)
    .sort((first, second) => first.name.localeCompare(second.name));

  return [mainBranch, ...otherBranches];
}

function isMainBranch(branch: BranchOption) {
  return branch.is_main;
}

function isLegacyMainVersion(version: PromptVersion, mainBranchId: string | null) {
  return version.branch_id == null || (mainBranchId != null && version.branch_id === mainBranchId);
}

function getBranchVersions(
  versions: PromptVersion[],
  branch: BranchOption | null,
  mainBranchId: string | null
) {
  if (!branch) {
    return [];
  }

  return versions.filter((version) => {
    if (isMainBranch(branch)) {
      return isLegacyMainVersion(version, mainBranchId);
    }

    return version.branch_id === branch.id;
  });
}

function getSeedVersion(
  versions: PromptVersion[],
  branch: BranchOption | null,
  mainBranchId: string | null
) {
  if (!branch) {
    return null;
  }

  const branchVersions = getBranchVersions(versions, branch, mainBranchId);
  if (branchVersions[0]) {
    return branchVersions[0];
  }

  if (branch.created_from_version_id) {
    return versions.find((version) => version.id === branch.created_from_version_id) ?? null;
  }

  return null;
}

function sortVersionsNewestFirst(versions: PromptVersion[]) {
  return [...versions].sort(
    (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  );
}

function formatDeploymentLabel(versionId: string, versions: PromptVersion[]) {
  const versionIndex = versions.findIndex((version) => version.id === versionId);
  return versionIndex === -1 ? null : `v${versions.length - versionIndex} deployed`;
}

function stripTrailingNewline(line: string) {
  return line.endsWith("\n") ? line.slice(0, -1) : line;
}

function splitLinesWithTerminators(text: string) {
  if (!text) {
    return [];
  }

  const lines: string[] = [];
  let start = 0;

  while (start < text.length) {
    const newlineIndex = text.indexOf("\n", start);
    if (newlineIndex === -1) {
      lines.push(text.slice(start));
      break;
    }

    lines.push(text.slice(start, newlineIndex + 1));
    start = newlineIndex + 1;
  }

  return lines;
}

function computeDiffRows(oldText: string, newText: string) {
  const diffMatchPatch = new DiffMatchPatch();
  const encoded = diffMatchPatch.diff_linesToChars_(oldText, newText);
  const diffs = diffMatchPatch.diff_main(encoded.chars1, encoded.chars2, false);
  diffMatchPatch.diff_cleanupSemantic(diffs);
  diffMatchPatch.diff_charsToLines_(diffs, encoded.lineArray);

  const rows: DiffLineRow[] = [];
  let pendingChanges: Array<{ op: number; line: string }> = [];

  function flushPendingChanges() {
    if (pendingChanges.length === 0) {
      return;
    }

    const deletions = pendingChanges.filter((item) => item.op === -1).map((item) => stripTrailingNewline(item.line));
    const insertions = pendingChanges.filter((item) => item.op === 1).map((item) => stripTrailingNewline(item.line));
    const maxLength = Math.max(deletions.length, insertions.length);

    for (let index = 0; index < maxLength; index += 1) {
      const oldLine = deletions[index] ?? "";
      const newLine = insertions[index] ?? "";

      if (oldLine && newLine) {
        rows.push({ kind: "replace", oldLine, newLine });
      } else if (oldLine) {
        rows.push({ kind: "delete", oldLine, newLine: "" });
      } else if (newLine) {
        rows.push({ kind: "insert", oldLine: "", newLine });
      }
    }

    pendingChanges = [];
  }

  for (const [op, text] of diffs as Array<[number, string]>) {
    const lineChunks = splitLinesWithTerminators(text);

    if (op === 0) {
      flushPendingChanges();
      for (const line of lineChunks) {
        const normalized = stripTrailingNewline(line);
        rows.push({ kind: "equal", oldLine: normalized, newLine: normalized });
      }
      continue;
    }

    pendingChanges.push(...lineChunks.map((line) => ({ op, line })));
  }

  flushPendingChanges();
  return rows;
}

function getInlineDiffParts(oldLine: string, newLine: string) {
  const diffMatchPatch = new DiffMatchPatch();
  const diffs = diffMatchPatch.diff_main(oldLine, newLine, false);
  diffMatchPatch.diff_cleanupSemantic(diffs);
  return diffs as Array<[number, string]>;
}

function getMergeThresholdMessage(score: number, total: number) {
  const threshold = Math.ceil(total * 0.8);
  return `need ${threshold}/${total}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function releaseLabelClassName(label: string) {
  if (label.toLowerCase() === "prod") return "bg-[var(--dash-success-soft)] text-[var(--dash-success)]";
  if (label.toLowerCase() === "dev") return "bg-[var(--dash-accent-soft)] text-[var(--dash-accent)]";
  return "bg-[var(--dash-elevated)] text-[var(--dash-muted)]";
}

function getVersionDisplayNumber(version: PromptVersion, orderedVersions: PromptVersion[]) {
  const newestFirstIndex = orderedVersions.findIndex((item) => item.id === version.id);
  return newestFirstIndex === -1 ? orderedVersions.length : orderedVersions.length - newestFirstIndex;
}

function renderPromptContent(text: string) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) {
      return;
    }

    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="mb-5 ml-5 list-disc space-y-2">
        {bullets.map((item, index) => (
          <li key={`${item}-${index}`} className="font-serif text-[15px] leading-7 text-ink">
            {item}
          </li>
        ))}
      </ul>
    );
    bullets = [];
  }

  lines.forEach((line, index) => {
    const key = `${index}-${line}`;
    const trimmed = line.trim();

    if (trimmed === "") {
      flushBullets();
      blocks.push(<div key={key} className="h-4" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushBullets();
      blocks.push(
        <h3 key={key} className="mb-4 text-[18px] font-bold leading-7 text-ink">
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushBullets();
      blocks.push(
        <h2 key={key} className="mb-4 text-[22px] font-bold leading-8 text-ink">
          {trimmed.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushBullets();
      blocks.push(
        <h1 key={key} className="mb-5 text-[28px] font-bold leading-9 text-ink">
          {trimmed.slice(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
      return;
    }

    flushBullets();
    blocks.push(
      <p key={key} className="mb-4 font-serif text-[15px] leading-7 text-ink">
        {line}
      </p>
    );
  });

  flushBullets();

  if (blocks.length === 0) {
    blocks.push(
      <p key="empty" className="font-serif text-[15px] leading-7 text-muted">
        No content yet.
      </p>
    );
  }

  return blocks;
}

function isMergeWithoutEvals(version: PromptVersion) {
  return (
    version.eval_score == null &&
    version.eval_total == null &&
    typeof version.commit_message === "string" &&
    version.commit_message.startsWith("Merged from ")
  );
}

export default function RepoEditorShell({
  repo,
  initialVersions,
  initialBranches,
  initialEvalCases,
  initialTags,
  initialRequestLogs,
  deploymentVersionId = null,
  currentUserEmail = null,
  currentUserLabel = "account"
}: RepoEditorShellProps) {
  const [versions, setVersions] = useState(initialVersions);
  const [evalCases, setEvalCases] = useState(initialEvalCases);
  const [requestLogs] = useState(initialRequestLogs);
  const [branches, setBranches] = useState<BranchOption[]>(() =>
    buildInitialBranches(initialBranches, repo.id)
  );

  const initialBranch = branches[0] ?? {
    id: null,
    repo_id: repo.id,
    name: "main",
    created_from_version_id: null,
    is_main: true,
    created_at: ""
  };
  const initialSeedVersion = getSeedVersion(initialVersions, initialBranch, initialBranch.id);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(initialBranch.id);
  const [content, setContent] = useState(initialSeedVersion?.content ?? "");
  const [commitMessage, setCommitMessage] = useState("");
  const [labelVersionId, setLabelVersionId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [repoTags, setRepoTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isTagPanelOpen, setIsTagPanelOpen] = useState(false);
  const [tagMutation, setTagMutation] = useState<string | null>(null);
  const [tagError, setTagError] = useState("");
  const [model, setModel] = useState(initialSeedVersion?.model ?? defaultModel);
  const [temperature, setTemperature] = useState(initialSeedVersion?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initialSeedVersion?.max_tokens ?? 512);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    initialSeedVersion?.id ?? null
  );
  const [previewVersion, setPreviewVersion] = useState<PromptVersion | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [overviewTab, setOverviewTab] = useState<OverviewTab>("content");
  const [isGeneratingEvals, setIsGeneratingEvals] = useState(false);
  const [isRunningEvals, setIsRunningEvals] = useState(false);
  const [evalRunResults, setEvalRunResults] = useState<EvalRunCaseResult[] | null>(null);
  const [evalRunSummary, setEvalRunSummary] = useState<{ score: number; total: number } | null>(
    null
  );
  const [mergeFlow, setMergeFlow] = useState<MergeFlowState | null>(null);
  const [mergeMessage, setMergeMessage] = useState("");
  const [generatePurpose, setGeneratePurpose] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [evalError, setEvalError] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newEvalInput, setNewEvalInput] = useState("");
  const [newEvalExpectedOutcome, setNewEvalExpectedOutcome] = useState("");
  const [newEvalDescription, setNewEvalDescription] = useState("");
  const [isAddingEvalCase, setIsAddingEvalCase] = useState(false);
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
  const [commitFeedback, setCommitFeedback] = useState(false);
  const [deployFeedback, setDeployFeedback] = useState(false);
  const commitFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deployFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergeFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedVersions = useMemo(() => sortVersionsNewestFirst(versions), [versions]);
  const mainBranch = useMemo(() => branches.find((branch) => branch.is_main) ?? null, [branches]);
  const currentBranch = useMemo(() => {
    if (selectedBranchId == null) {
      return mainBranch ?? branches[0] ?? null;
    }

    return branches.find((branch) => branch.id === selectedBranchId) ?? branches[0] ?? null;
  }, [branches, mainBranch, selectedBranchId]);

  const currentBranchVersions = useMemo(
    () => getBranchVersions(orderedVersions, currentBranch, currentBranch?.id ?? null),
    [currentBranch, orderedVersions]
  );
  const currentBranchLatestVersion = currentBranchVersions[0] ?? null;
  const diffSourceVersion = useMemo(
    () => versions.find((version) => version.id === diffVersionId) ?? null,
    [diffVersionId, versions]
  );
  const diffRows = useMemo(
    () =>
      diffSourceVersion && currentBranchLatestVersion
        ? computeDiffRows(diffSourceVersion.content, currentBranchLatestVersion.content)
        : [],
    [currentBranchLatestVersion, diffSourceVersion]
  );
  const mostRecentVersion = orderedVersions[0] ?? null;
  const selectedVersion = useMemo(() => {
    if (previewVersion) {
      return previewVersion;
    }

    if (activeVersionId) {
      return orderedVersions.find((version) => version.id === activeVersionId) ?? null;
    }

    return currentBranchLatestVersion ?? mostRecentVersion;
  }, [activeVersionId, currentBranchLatestVersion, mostRecentVersion, orderedVersions, previewVersion]);
  const selectedVersionNumber = selectedVersion ? getVersionDisplayNumber(selectedVersion, orderedVersions) : orderedVersions.length;
  const selectedVersionId = selectedVersion?.id ?? null;
  const deployedVersionLabel =
    deploymentVersionId == null ? null : formatDeploymentLabel(deploymentVersionId, orderedVersions);
  const isPreviewing = Boolean(previewVersion);
  const isDiffView = Boolean(diffSourceVersion && currentBranchLatestVersion);
  const canDeploy = Boolean(mostRecentVersion);
  const diffSourceVersionNumber = diffSourceVersion
    ? getVersionDisplayNumber(diffSourceVersion, orderedVersions)
    : null;
  const isMergeGateActive = Boolean(mergeFlow);

  useEffect(
    () => () => {
      if (commitFeedbackTimer.current) {
        clearTimeout(commitFeedbackTimer.current);
      }

      if (deployFeedbackTimer.current) {
        clearTimeout(deployFeedbackTimer.current);
      }

      if (mergeFeedbackTimer.current) {
        clearTimeout(mergeFeedbackTimer.current);
      }
    },
    []
  );

  function syncEditorToBranch(branch: BranchOption | null) {
    const seedVersion = getSeedVersion(versions, branch, branch?.id ?? null);

    setSelectedBranchId(branch?.id ?? null);
    setPreviewVersion(null);
    setDiffVersionId(null);
    setActiveTab("overview");
    setOverviewTab("content");
    setCommitMessage("");
    setStatus("");
    setError("");
    setContent(seedVersion?.content ?? "");
    setModel(seedVersion?.model ?? defaultModel);
    setTemperature(seedVersion?.temperature ?? 0.7);
    setMaxTokens(seedVersion?.max_tokens ?? 512);
    setActiveVersionId(seedVersion?.id ?? null);
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
        branch_id: currentBranch?.id ?? null,
        content: nextContent,
        commit_message: message.trim() || null,
        model,
        temperature,
        max_tokens: maxTokens,
        parent_version_id: activeVersionId
      })
      .select(
        "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, release_label, created_at"
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
    setCommitFeedback(true);
    if (commitFeedbackTimer.current) {
      clearTimeout(commitFeedbackTimer.current);
    }
    commitFeedbackTimer.current = setTimeout(() => setCommitFeedback(false), 1500);
    return data;
  }

  async function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || repoTags.includes(tag)) {
      setTagInput("");
      return;
    }
    setTagMutation(tag);
    setTagError("");
    const { error: insertError } = await createClient().from("repo_tags").insert({ repo_id: repo.id, tag });
    setTagMutation(null);
    if (insertError) {
      setTagError(insertError.message);
      return;
    }
    setRepoTags((current) => [...current, tag]);
    setTagInput("");
  }

  async function removeTag(tag: string) {
    setTagMutation(tag);
    setTagError("");
    const { error: deleteError } = await createClient().from("repo_tags").delete().eq("repo_id", repo.id).eq("tag", tag);
    setTagMutation(null);
    if (deleteError) {
      setTagError(deleteError.message);
      return;
    }
    setRepoTags((current) => current.filter((item) => item !== tag));
  }

  async function saveReleaseLabel(versionId: string) {
    const nextLabel = labelDraft.trim();
    if (!nextLabel) return;
    setLabelSaving(true);
    setLabelError("");
    const { error: updateError } = await createClient()
      .from("prompt_versions")
      .update({ release_label: nextLabel })
      .eq("id", versionId)
      .eq("repo_id", repo.id);
    setLabelSaving(false);
    if (updateError) {
      setLabelError(updateError.message);
      return;
    }
    setVersions((current) => current.map((version) => version.id === versionId ? { ...version, release_label: nextLabel } : version));
    setLabelVersionId(null);
    setLabelDraft("");
  }

  async function deleteRepo() {
    setIsDeletingRepo(true);
    setDeleteError("");
    const { error: deleteRepoError } = await createClient().from("repos").delete().eq("id", repo.id);
    setIsDeletingRepo(false);
    if (deleteRepoError) {
      setDeleteError(deleteRepoError.message);
      return;
    }
    window.location.assign("/dashboard/repos");
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
      setDeployFeedback(true);
      if (deployFeedbackTimer.current) {
        clearTimeout(deployFeedbackTimer.current);
      }
      deployFeedbackTimer.current = setTimeout(() => setDeployFeedback(false), 1500);
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
    setActiveTab("overview");
    setOverviewTab("content");
    setPreviewVersion(version);
    setDiffVersionId(null);
    setContent(version.content);
    setModel(version.model);
    setTemperature(version.temperature);
    setMaxTokens(version.max_tokens);
    setCommitMessage("");
    setStatus("");
    setError("");
  }

  function exitPreview() {
    syncEditorToBranch(currentBranch);
  }

  function openDiff(version: PromptVersion) {
    setActiveTab("overview");
    setOverviewTab("content");
    setDiffVersionId(version.id);
    setPreviewVersion(null);
    setStatus("");
    setError("");
  }

  function exitDiffView() {
    setDiffVersionId(null);
  }

  async function refreshEvalCases() {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("eval_cases")
      .select("id, repo_id, input, expected_outcome, description, created_at")
      .eq("repo_id", repo.id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    setEvalCases(data ?? []);
  }

  async function refreshVersions() {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("prompt_versions")
      .select(
        "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, release_label, created_at"
      )
      .eq("repo_id", repo.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    setVersions(data ?? []);
  }

  async function addEvalCase() {
    const input = newEvalInput.trim();
    const expectedOutcome = newEvalExpectedOutcome.trim();

    if (!input || !expectedOutcome) {
      setEvalError("Test input and expected outcome are required.");
      return;
    }

    setEvalError("");
    setIsAddingEvalCase(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("eval_cases")
        .insert({
          repo_id: repo.id,
          input,
          expected_outcome: expectedOutcome,
          description: newEvalDescription.trim() || null
        })
        .select("id, repo_id, input, expected_outcome, description, created_at")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error("Eval case insert did not return a row.");
      }

      setEvalCases((current) => [...current, data]);
      setNewEvalInput("");
      setNewEvalExpectedOutcome("");
      setNewEvalDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add eval case.";
      setEvalError(message);
    } finally {
      setIsAddingEvalCase(false);
    }
  }

  async function deleteEvalCase(evalCaseId: string) {
    setEvalError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("eval_cases").delete().eq("id", evalCaseId);

    if (deleteError) {
      setEvalError(deleteError.message);
      return;
    }

    setEvalCases((current) => current.filter((item) => item.id !== evalCaseId));
  }

  async function generateEvalCases() {
    const purpose = generatePurpose.trim();
    if (!purpose) {
      setGenerateError("Purpose is required.");
      return;
    }

    setGenerateError("");
    setIsGeneratingEvals(true);

    try {
      const response = await fetch("/api/generate-evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, repo_id: repo.id })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || "Generate evals failed.");
      }

      await refreshEvalCases();

      setGeneratePurpose("");
      setIsGenerateModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate evals.";
      setGenerateError(message);
    } finally {
      setIsGeneratingEvals(false);
    }
  }

  async function runEvals() {
    if (!currentBranchLatestVersion) {
      setEvalError("Commit a version before running evals.");
      return;
    }

    if (evalCases.length === 0) {
      setEvalError("Add eval cases before running evals.");
      return;
    }

    setEvalError("");
    setIsRunningEvals(true);
    setEvalRunResults(null);
    setEvalRunSummary(null);

    try {
      const payload = await requestEvalRun(currentBranchLatestVersion.id);

      setEvalRunResults(payload.results ?? []);
      setEvalRunSummary({
        score: payload.score ?? 0,
        total: payload.total ?? evalCases.length
      });

      await refreshVersions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not run evals.";
      setEvalError(message);
    } finally {
      setIsRunningEvals(false);
    }
  }

  async function requestEvalRun(versionId: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/run-evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repo.id, version_id: versionId }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || "Run evals failed.");
      }

      return payload as {
        score?: number;
        total?: number;
        results?: EvalRunCaseResult[];
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Eval run timed out after 2 minutes.");
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function createBranch(branchName: string) {
    const trimmedName = branchName.trim();

    if (!trimmedName) {
      throw new Error("Branch name is required.");
    }

    const branchInsert = {
      repo_id: repo.id,
      name: trimmedName,
      is_main: false,
      ...(activeVersionId ? { created_from_version_id: activeVersionId } : {})
    };

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      console.log("[branches] insert start", branchInsert);
      console.log("attempting insert");
      const { data, error: insertError } = await supabase
        .from("branches")
        .insert(branchInsert)
        .select("id, repo_id, name, created_from_version_id, is_main, created_at")
        .single();
      console.log("[branches] insert end", { data, insertError });

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error("Branch insert did not return a row.");
      }

      const nextBranch = toBranchOption(data, repo.id);
      setBranches((current) => {
        const nextBranches = [...current, nextBranch];
        const main = nextBranches.find((branch) => branch.is_main) ?? nextBranch;
        const others = nextBranches
          .filter((branch) => !branch.is_main)
          .sort((first, second) => first.name.localeCompare(second.name));

        return [main, ...others];
      });
      syncEditorToBranch(nextBranch);
    } catch (branchError) {
      console.error("[branches] insert failed", branchError);
      throw branchError instanceof Error ? branchError : new Error(String(branchError));
    }
  }

  function resetMergeFlow() {
    setMergeFlow(null);
    setMergeMessage("");
  }

  async function startMergeGate() {
    if (!currentBranch || currentBranch.is_main) {
      return;
    }

    if (!currentBranchLatestVersion) {
      setEvalError("Commit a version on this branch before merging.");
      return;
    }

    setActiveTab("overview");
    setOverviewTab("content");
    setPreviewVersion(null);
    setDiffVersionId(null);
    setError("");
    setStatus("");
    setEvalError("");
    setMergeMessage("");
    const mergeVersionId = currentBranchLatestVersion.id;
    setMergeFlow({
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      versionId: mergeVersionId,
      status: "running",
      summary: null,
      results: null,
      isMerging: false,
      error: ""
    });

    if (evalCases.length === 0) {
      setMergeFlow((current) =>
        current
          ? {
              ...current,
              status: "no-evals"
            }
          : current
      );
      return;
    }

    try {
      const payload = await requestEvalRun(currentBranchLatestVersion.id);
      const summary = {
        score: payload.score ?? 0,
        total: payload.total ?? evalCases.length
      };
      const results = payload.results ?? [];
      const passedThreshold = summary.total === 0 ? true : summary.score >= summary.total * 0.8;

      setEvalRunResults(results);
      setEvalRunSummary(summary);
      setMergeFlow((current) =>
        current && current.versionId === mergeVersionId
          ? {
              ...current,
              status: passedThreshold ? "ready" : "blocked",
              summary,
              results
            }
          : current
      );

      await refreshVersions();
    } catch (mergeError) {
      const message = mergeError instanceof Error ? mergeError.message : "Could not run merge evals.";
      setMergeFlow((current) =>
        current && current.versionId === mergeVersionId
          ? {
              ...current,
              status: "blocked",
              error: message
            }
          : current
      );
    }
  }

  async function confirmMerge() {
    if (!mergeFlow || (mergeFlow.status !== "ready" && mergeFlow.status !== "no-evals")) {
      return;
    }

    const sourceVersion = versions.find((version) => version.id === mergeFlow.versionId);
    if (!sourceVersion) {
      setMergeFlow((current) =>
        current
          ? {
              ...current,
              isMerging: false,
              error: "Could not find the version to merge."
            }
          : current
      );
      return;
    }

    const mainBranchId = mainBranch?.id ?? null;
    const supabase = createClient();

    setMergeFlow((current) =>
      current
        ? {
            ...current,
            isMerging: true,
            error: ""
          }
        : current
    );

    try {
      const { data, error: insertError } = await supabase
        .from("prompt_versions")
        .insert({
          repo_id: repo.id,
          branch_id: mainBranchId,
          content: sourceVersion.content,
          commit_message: `Merged from ${mergeFlow.branchName}`,
          model: sourceVersion.model,
          temperature: sourceVersion.temperature,
          max_tokens: sourceVersion.max_tokens,
          parent_version_id: sourceVersion.id,
          eval_score: mergeFlow.summary?.score ?? null,
          eval_total: mergeFlow.summary?.total ?? null
        })
        .select(
          "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, release_label, created_at"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error("Merge insert did not return a row.");
      }

      setVersions((current) => [data, ...current]);
      setSelectedBranchId(mainBranchId);
      setPreviewVersion(null);
      setDiffVersionId(null);
      setCommitMessage("");
      setStatus("");
      setError("");
      setContent(data.content);
      setModel(data.model);
      setTemperature(data.temperature);
      setMaxTokens(data.max_tokens);
      setActiveVersionId(data.id);
      setMergeMessage("Merged into main");
      if (mergeFeedbackTimer.current) {
        clearTimeout(mergeFeedbackTimer.current);
      }
      mergeFeedbackTimer.current = setTimeout(() => setMergeMessage(""), 1500);
      setMergeFlow(null);
    } catch (mergeError) {
      const message = mergeError instanceof Error ? mergeError.message : "Could not merge branch.";
      setMergeFlow((current) =>
        current
          ? {
              ...current,
              isMerging: false,
              error: message
            }
          : current
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted">
          <Link href="/dashboard" className="text-ink transition-colors hover:text-accent">
            ← Back
          </Link>
          <span className="text-line">|</span>
          <span>Home</span>
          <span className="text-line">|</span>
          <span className="truncate text-ink">{repo.name}</span>
          <span className="text-line">|</span>
          <span className="text-ink">prompt.md</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="relative flex min-w-0 items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-ink">{repo.name}</h1>
            <button
              type="button"
              onClick={() => setIsTagPanelOpen((current) => !current)}
              aria-label="Manage repo tags"
              aria-expanded={isTagPanelOpen}
              className="rounded-full border border-line bg-white p-2 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <GearIcon />
            </button>
            {isTagPanelOpen ? (
              <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-[340px] rounded-lg border border-line bg-white p-4 shadow-elevated">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-ink">Repo tags</p>
                  <button type="button" onClick={() => setIsTagPanelOpen(false)} aria-label="Close tag settings" className="text-lg leading-none text-muted hover:text-ink">×</button>
                </div>
                <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
                  {repoTags.length ? repoTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-sm bg-[var(--dash-elevated)] px-2.5 py-1 text-[11px] text-muted">
                      {tag}
                      <button type="button" onClick={() => void removeTag(tag)} disabled={tagMutation === tag} aria-label={`Remove ${tag}`} className="text-sm leading-none text-muted hover:text-error disabled:opacity-50">×</button>
                    </span>
                  )) : <span className="text-[12px] text-muted">No tags yet.</span>}
                </div>
                <form className="mt-4" onSubmit={(event) => { event.preventDefault(); void addTag(); }}>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted" htmlFor="repo-tag-input">Add tag</label>
                  <input
                    id="repo-tag-input"
                    list="common-repo-tags"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="Type a tag and press Enter"
                    maxLength={48}
                    className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                  <datalist id="common-repo-tags">
                    {COMMON_REPO_TAGS.filter((tag) => !repoTags.includes(tag)).map((tag) => <option key={tag} value={tag} />)}
                  </datalist>
                </form>
                {tagError ? <p role="alert" className="mt-2 text-[11px] text-error">{tagError}</p> : null}
                <p className="mt-2 text-[11px] text-muted">Choose a suggestion or add a custom tag.</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BranchSwitcher
              branches={branches}
              currentBranch={currentBranch}
              onSelectBranch={syncEditorToBranch}
              onCreateBranch={createBranch}
              onMergeIntoMain={startMergeGate}
            />
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setIsDeleteDialogOpen(true);
              }}
              className="rounded-pill border border-transparent px-3 py-1.5 text-sm font-medium text-error transition-colors hover:border-[var(--dash-error)] hover:bg-[var(--dash-danger-soft)]"
            >
              Delete
            </button>
            {deployedVersionLabel == null ? null : (
              <span className="rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted">
                {deployedVersionLabel}
              </span>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-6">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "editor" as const, label: "Editor" },
            { key: "evals" as const, label: "Evals" },
            { key: "changelog" as const, label: "Changelog" }
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key !== "overview") {
                    setOverviewTab("content");
                  }
                }}
                className={`border-b-2 pb-3 text-sm transition-colors ${
                  isActive
                    ? "border-accent font-medium text-ink"
                    : "border-transparent font-normal text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-4">
            <VersionsIcon />
            <p className="text-[14px] font-semibold text-ink">Versions</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {orderedVersions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No versions yet.</p>
            ) : (
              <div className="flex flex-col">
                {orderedVersions.map((version) => {
                  const versionNumber = getVersionDisplayNumber(version, orderedVersions);
                  const isCurrent = selectedVersionId === version.id;
                  const isMainVersion = isLegacyMainVersion(version, currentBranch?.is_main ? currentBranch.id : null);

                  return (
                    <div
                      key={version.id}
                      className={`border-b border-line last:border-b-0 ${
                        isCurrent ? "bg-accent/10 border-l-[3px] border-l-accent" : ""
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => loadVersion(version)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") loadVersion(version);
                        }}
                        className="flex w-full items-start gap-3 px-4 py-4 text-left"
                      >
                        <span
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isCurrent ? "border-accent" : "border-line"
                          }`}
                          aria-hidden="true"
                        >
                          {isCurrent ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-ink">
                                Version {versionNumber}
                              </p>
                              <p className="mt-1 text-[12px] text-muted">{formatDateTime(version.created_at)}</p>
                              <p className="mt-1 text-[12px] text-muted">• {currentUserLabel}</p>
                            </div>
                            {version.eval_score != null && version.eval_total != null ? (
                              <span className="rounded-pill border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-muted">
                                {version.eval_score}/{version.eval_total}
                              </span>
                            ) : isMergeWithoutEvals(version) ? (
                              <span className="rounded-pill border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-muted">
                                No evals
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDiff(version);
                              }}
                              className="text-[11px] font-medium text-accent transition-colors hover:text-ink"
                            >
                              Diff
                            </button>
                            {version.release_label ? (
                              <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${releaseLabelClassName(version.release_label)}`}>
                                {version.release_label}
                              </span>
                            ) : labelVersionId === version.id ? (
                              <form
                                className="flex min-w-0 items-center gap-1"
                                onClick={(event) => event.stopPropagation()}
                                onSubmit={(event) => { event.preventDefault(); void saveReleaseLabel(version.id); }}
                              >
                                <input
                                  autoFocus
                                  value={labelDraft}
                                  onChange={(event) => setLabelDraft(event.target.value)}
                                  maxLength={32}
                                  aria-label={`Label for version ${versionNumber}`}
                                  placeholder="prod"
                                  className="h-6 min-w-0 w-[88px] rounded border border-line bg-white px-2 text-[11px] text-ink outline-none focus:border-accent"
                                />
                                <button type="submit" disabled={labelSaving || !labelDraft.trim()} className="text-[11px] font-semibold text-accent disabled:opacity-50">Save</button>
                                <button type="button" onClick={() => { setLabelVersionId(null); setLabelDraft(""); setLabelError(""); }} className="text-[13px] text-muted hover:text-ink">×</button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setLabelVersionId(version.id);
                                  setLabelDraft("");
                                  setLabelError("");
                                }}
                                className="text-[11px] font-medium text-muted transition-colors hover:text-accent"
                              >
                                + Label
                              </button>
                            )}
                          </div>
                          {labelVersionId === version.id && labelError ? <p className="mt-1 text-[10px] text-error">{labelError}</p> : null}
                          <p className="sr-only">{isMainVersion ? "main branch version" : "branch version"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-line bg-white">
          {activeTab === "overview" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <div className="flex items-center gap-2">
                  {[
                    { key: "content" as const, label: "Content" },
                    { key: "analytics" as const, label: "Analytics & Logs" }
                  ].map((tab) => {
                    const isActive = overviewTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOverviewTab(tab.key)}
                        className={`border-b-2 pb-3 text-sm transition-colors ${
                          isActive
                            ? "border-accent font-medium text-ink"
                            : "border-transparent font-normal text-muted hover:text-ink"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("editor")}
                    className="rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label="Settings"
                    onClick={() => setIsTagPanelOpen(true)}
                    className="rounded-full border border-line bg-white p-2 text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <GearIcon />
                  </button>
                </div>
              </div>

              <div className="border-b border-line px-5 py-3 text-[13px] text-muted">
                Viewing Version {selectedVersionNumber} of {orderedVersions.length}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--dash-bg)] p-5">
                {mergeMessage ? <p className="mb-4 text-sm text-muted">{mergeMessage}</p> : null}

                {mergeFlow ? (
                  <MergeGatePanel flow={mergeFlow} onConfirm={confirmMerge} onCancel={resetMergeFlow} />
                ) : isDiffView && diffSourceVersion && currentBranchLatestVersion ? (
                  <DiffViewPanel
                    sourceVersion={diffSourceVersion}
                    currentVersion={currentBranchLatestVersion}
                    sourceVersionNumber={diffSourceVersionNumber ?? 0}
                    diffRows={diffRows}
                    onBack={exitDiffView}
                  />
                ) : overviewTab === "analytics" ? (
                  <AnalyticsLogsPanel versions={orderedVersions} evalCases={evalCases} requestLogs={requestLogs} />
                ) : (
                  <>
                    <div className="rounded-sm border border-line bg-[var(--dash-surface)] p-6 md:p-8">
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <span className="rounded-sm border border-line bg-[var(--dash-elevated)] px-3 py-1 text-[12px] font-medium text-muted">
                          System
                        </span>
                        {previewVersion ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={exitPreview}
                              className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={onRestore}
                              disabled={isCommitting}
                              className="rounded-pill border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCommitting ? "Restoring..." : "Restore version"}
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="max-w-[900px]">
                        {renderPromptContent(selectedVersion?.content ?? "")}
                      </div>
                    </div>

                    <div className="mt-4 rounded-sm border border-line bg-[var(--dash-surface)] px-5 py-4">
                      <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
                        <span className="font-medium text-ink">Placeholder</span>
                        <span>{model}</span>
                        <span>Temperature {temperature.toFixed(1)}</span>
                        <span>Max tokens {maxTokens}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : activeTab === "editor" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-muted">Editing prompt.md</p>
                  <p className="mt-1 text-[24px] font-bold tracking-[-0.03em] text-ink">{repo.name}</p>
                </div>
                <button
                  type="button"
                  aria-label="Settings"
                  className="rounded-full border border-line bg-white p-2 text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <GearIcon />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 text-[13px] text-muted">
                <span>
                  Viewing Version {selectedVersionNumber} of {orderedVersions.length}
                </span>
                {selectedVersion?.commit_message ? <span>{selectedVersion.commit_message}</span> : null}
              </div>

              {mergeFlow ? (
                <MergeGatePanel flow={mergeFlow} onConfirm={confirmMerge} onCancel={resetMergeFlow} />
              ) : null}

              {isPreviewing ? (
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-[var(--dash-elevated)] px-4 py-3">
                  <p className="text-sm text-muted">
                    Previewing v{selectedVersionNumber} - this is read only
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={exitPreview}
                      className="rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onRestore}
                      disabled={isCommitting}
                      className="rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCommitting ? "Restoring..." : "Restore version"}
                    </button>
                  </div>
                </div>
              ) : null}

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                readOnly={isPreviewing}
                spellCheck={false}
                className={`min-h-[420px] w-full flex-1 resize-none border border-line bg-white p-6 font-serif text-[15px] leading-7 text-ink outline-none transition-all placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_rgba(32,103,255,0.14)] read-only:text-muted`}
                placeholder="Write the system prompt..."
              />

              <form className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4" onSubmit={onCommit}>
                <input
                  value={commitMessage}
                  onChange={(event) => setCommitMessage(event.target.value)}
                  disabled={isPreviewing}
                  className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Commit message"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={isCommitting || isPreviewing}
                    className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCommitting ? "Committing..." : commitFeedback ? "Committed" : "Commit"}
                  </button>
                  {error ? <p className="text-sm text-error">{error}</p> : status ? <p className="text-sm text-muted">{status}</p> : null}
                </div>
              </form>

              <section className="grid gap-5 rounded-[20px] border border-line bg-white p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Playground</p>
                    <button
                      type="button"
                      onClick={onDeploy}
                      disabled={isDeploying || !canDeploy}
                      className="rounded-pill bg-nav px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeploying ? "Deploying..." : "Deploy"}
                    </button>
                  </div>

                  <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={onRun}>
                    <input
                      value={testMessage}
                      onChange={(event) => setTestMessage(event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                      placeholder="Type a test message..."
                    />
                    <button
                      type="submit"
                      disabled={isRunning || !testMessage.trim()}
                      className="rounded-pill border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRunning ? "Running..." : "Run"}
                    </button>
                  </form>
                  <div className="min-h-32 rounded-[16px] border border-line bg-[var(--dash-bg)] p-4">
                    <p className={`whitespace-pre-wrap text-sm leading-7 ${playgroundError ? "text-error" : "text-muted"}`}>
                      {isRunning ? "Running..." : playgroundError || playgroundResponse || "No response yet."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-2 text-sm text-muted">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Model</span>
                    <select
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent"
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
                      <span className="text-[11px] uppercase tracking-[0.15em] text-muted">Temperature</span>
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
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Max tokens</span>
                    <input
                      type="number"
                      min="1"
                      value={maxTokens}
                      onChange={(event) => setMaxTokens(Number(event.target.value))}
                      className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent"
                    />
                  </label>

                  {deploymentDetails ? (
                    <div className="rounded-[16px] border border-line bg-[var(--dash-bg)] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Live endpoint</p>
                      <code className="mt-3 block break-all rounded-md border border-line bg-white px-3 py-2 font-mono text-xs font-semibold text-accent">
                        POST {deploymentDetails.endpoint_url}
                      </code>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <code className="block break-all rounded-md border border-line bg-white px-3 py-2 font-mono text-xs text-muted">
                          {deploymentDetails.api_key}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyApiKey(deploymentDetails.api_key)}
                          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                        >
                          {didCopyApiKey ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted">
                        Pass your api_key as Authorization: Bearer {deploymentDetails.api_key} header
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : activeTab === "evals" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Evals</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-ink">
                    Run repo-specific cases against the current branch.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="rounded-pill border border-line bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    AI generate
                  </button>
                  <button
                    type="button"
                    onClick={runEvals}
                    disabled={isRunningEvals || evalCases.length === 0 || !currentBranchLatestVersion}
                    className="rounded-pill border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRunningEvals ? `Running ${evalCases.length} evals...` : "Run evals"}
                  </button>
                </div>
              </div>

              {evalRunSummary ? (
                <div className="rounded-[16px] border border-line bg-[var(--dash-bg)] px-4 py-3">
                  <p className="font-mono text-sm text-ink">
                    {evalRunSummary.score} / {evalRunSummary.total} passed
                  </p>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {evalCases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <DashboardEmptyIllustration kind="evals" />
                    <p className="mt-2 text-sm text-muted">No eval cases yet.</p>
                  </div>
                ) : (
                  evalCases.map((evalCase) => {
                    const result = evalRunResults?.find((item) => item.eval_case_id === evalCase.id);
                    return (
                      <div key={evalCase.id} className="rounded-[16px] border border-line bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm text-ink">{evalCase.input}</p>
                            <p className="mt-2 text-sm text-muted">Expected: {evalCase.expected_outcome}</p>
                            {evalCase.description ? (
                              <p className="mt-2 text-xs text-muted">{evalCase.description}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {result ? (
                              <span
                                className={`rounded-sm border px-2 py-1 font-mono text-[11px] ${
                                  result.passed
                                    ? "border-[var(--dash-success)] text-success"
                                    : "border-[var(--dash-error)] text-error"
                                }`}
                              >
                                {result.verdict}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => deleteEvalCase(evalCase.id)}
                              className="text-xs text-muted transition-colors hover:text-ink"
                            >
                              X
                            </button>
                          </div>
                        </div>
                        {result ? (
                          <div className="mt-3 border-t border-line pt-3">
                            <p className="font-mono text-xs text-muted">{result.response || "No response"}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="rounded-[20px] border border-line bg-white p-5">
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Add eval case</p>
                <div className="mt-3 grid gap-3">
                  <input
                    value={newEvalInput}
                    onChange={(event) => setNewEvalInput(event.target.value)}
                    className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                    placeholder="Test input"
                  />
                  <input
                    value={newEvalExpectedOutcome}
                    onChange={(event) => setNewEvalExpectedOutcome(event.target.value)}
                    className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                    placeholder="Expected outcome"
                  />
                  <input
                    value={newEvalDescription}
                    onChange={(event) => setNewEvalDescription(event.target.value)}
                    className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                    placeholder="Description"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addEvalCase}
                      disabled={isAddingEvalCase}
                      className="text-sm text-ink transition-colors hover:text-muted disabled:cursor-not-allowed disabled:text-muted"
                    >
                      {isAddingEvalCase ? "Adding..." : "Add →"}
                    </button>
                    {evalError ? <p className="text-sm text-error">{evalError}</p> : null}
                  </div>
                </div>
              </div>

              {isGenerateModalOpen ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-nav/80 px-6 py-8 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-[20px] border border-line bg-white p-5 shadow-elevated">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">AI generate</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGenerateModalOpen(false);
                          setGenerateError("");
                        }}
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        Close
                      </button>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-muted">
                      Describe your prompt&apos;s purpose in one sentence
                    </p>
                    <textarea
                      value={generatePurpose}
                      onChange={(event) => setGeneratePurpose(event.target.value)}
                      className="mt-4 min-h-28 w-full resize-none rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                      placeholder="e.g. help support agents decide whether to approve a refund"
                    />
                    {generateError ? <p className="mt-3 text-sm text-error">{generateError}</p> : null}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateEvalCases}
                        disabled={isGeneratingEvals}
                        className="text-sm text-ink transition-colors hover:text-muted disabled:cursor-not-allowed disabled:text-muted"
                      >
                        {isGeneratingEvals ? "Generating..." : "Generate →"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGenerateModalOpen(false);
                          setGenerateError("");
                        }}
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
              <div className="border-b border-line pb-4">
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Changelog</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-ink">
                  Commit history for this repo.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {orderedVersions.length === 0 ? (
                  <p className="text-sm text-muted">No commits yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {orderedVersions.map((version) => {
                      const versionNumber = getVersionDisplayNumber(version, orderedVersions);

                      return (
                        <div key={version.id} className="border-b border-line py-4 last:border-b-0">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">Version {versionNumber}</p>
                              <p className="mt-1 text-sm text-muted">
                                {version.commit_message || "Untitled commit"}
                              </p>
                            </div>
                            <p className="text-sm text-muted">{formatDateTime(version.created_at)}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted">{currentUserEmail ?? "unknown@example.com"}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {isDeleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-repo-title" className="w-full max-w-[420px] rounded-xl border border-line bg-surface p-6 shadow-elevated">
            <h2 id="delete-repo-title" className="text-[19px] font-bold text-ink">Delete {repo.name}?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">This permanently deletes the repo and its versions, branches, evals, and logs. This action cannot be undone.</p>
            {deleteError ? <p role="alert" className="mt-3 text-sm text-error">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingRepo} className="rounded-pill border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void deleteRepo()} disabled={isDeletingRepo} className="rounded-pill bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50">{isDeletingRepo ? "Deleting…" : "Delete repo"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsLogsPanel({
  versions,
  evalCases,
  requestLogs
}: {
  versions: PromptVersion[];
  evalCases: EvalCaseRow[];
  requestLogs: RequestLogRow[];
}) {
  const successfulRequests = requestLogs.filter((log) => !log.status || log.status.toLowerCase() === "success").length;
  const averageLatency = requestLogs.length
    ? Math.round(requestLogs.reduce((sum, log) => sum + (log.latency_ms ?? 0), 0) / requestLogs.length)
    : 0;
  const totalTokens = requestLogs.reduce((sum, log) => sum + (log.token_count ?? 0), 0);
  const statCards = [
    { label: "Versions", value: String(versions.length), detail: versions[0] ? `Latest ${formatRelativeTime(versions[0].created_at)}` : "No versions yet" },
    { label: "Eval cases", value: String(evalCases.length), detail: evalCases.length ? "Ready to run" : "Add cases in Evals" },
    { label: "Requests", value: String(requestLogs.length), detail: requestLogs.length ? `${successfulRequests}/${requestLogs.length} successful` : "No recent requests" },
    { label: "Avg. latency", value: requestLogs.length ? `${averageLatency}ms` : "—", detail: requestLogs.length ? `${totalTokens.toLocaleString()} tokens` : "No request data" }
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--dash-bg)] p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-sm border border-line bg-[var(--dash-surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{stat.label}</p>
            <p className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-ink">{stat.value}</p>
            <p className="mt-1 text-[12px] text-muted">{stat.detail}</p>
          </div>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-sm border border-line bg-[var(--dash-surface)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Recent requests</p>
            <p className="mt-1 text-[12px] text-muted">Latest runtime activity for this repo</p>
          </div>
          <span className="rounded-sm bg-[var(--dash-elevated)] px-2.5 py-1 text-[11px] text-muted">{requestLogs.length} shown</span>
        </div>
        {requestLogs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-[var(--dash-elevated)] text-[11px] uppercase tracking-[0.1em] text-muted">
                <tr><th className="px-5 py-3 font-medium">Time</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Latency</th><th className="px-5 py-3 font-medium">Tokens</th></tr>
              </thead>
              <tbody>
                {requestLogs.map((log) => {
                  const success = !log.status || log.status.toLowerCase() === "success";
                  return <tr key={log.id} className="border-t border-line text-[13px] text-muted"><td className="px-5 py-3">{formatDateTime(log.created_at)}</td><td className="px-5 py-3"><span className={`rounded-pill px-2 py-0.5 text-[11px] ${success ? "bg-[var(--dash-success-soft)] text-success" : "bg-[var(--dash-danger-soft)] text-error"}`}>{log.status || "success"}</span></td><td className="px-5 py-3 font-mono text-[12px] text-ink">{log.latency_ms != null ? `${log.latency_ms}ms` : "—"}</td><td className="px-5 py-3 font-mono text-[12px] text-ink">{(log.token_count ?? 0).toLocaleString()}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-ink">No requests yet</p><p className="mt-2 text-sm text-muted">Deploy a version and send requests to see runtime activity here.</p></div>}
      </section>
    </div>
  );
}

function BranchSwitcher({
  branches,
  currentBranch,
  onSelectBranch,
  onCreateBranch,
  onMergeIntoMain
}: {
  branches: BranchOption[];
  currentBranch: BranchOption | null;
  onSelectBranch: (branch: BranchOption) => void;
  onCreateBranch: (name: string) => Promise<void>;
  onMergeIntoMain: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setIsCreateFormOpen(false);
        setError("");
      }
    }

    if (!isOpen) {
      return undefined;
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
    setIsCreating(false);
    setIsCreateFormOpen(false);
    setBranchName("");
    setError("");
  }

  async function handleCreateBranch() {
    setError("");

    const trimmed = branchName.trim();
    if (!trimmed) {
      setError("Branch name is required.");
      return;
    }

    setIsCreating(true);

    try {
      await onCreateBranch(trimmed);
      closeMenu();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : typeof createError === "object" && createError !== null && "message" in createError
            ? String((createError as { message?: unknown }).message)
            : "Could not create branch.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  if (!currentBranch) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="ml-3 inline-flex items-center gap-1 rounded-pill bg-accent/10 px-3 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <span className="max-w-28 truncate">{currentBranch.name}</span>
        <ChevronDownIcon />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-64 rounded-lg border-2 border-line bg-surface p-2 shadow-elevated">
          <div className="flex flex-col gap-1">
            {branches.map((branch) => {
              const isSelected = branch.id === currentBranch.id;

              return (
                <button
                  key={branch.id ?? branch.name}
                  type="button"
                  onClick={() => {
                    onSelectBranch(branch);
                    closeMenu();
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  <span className="truncate">{branch.name}</span>
                  {branch.is_main ? (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      main
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-line pt-2">
            {isCreateFormOpen ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="new-branch-name"
                  className="border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                />
                {error ? <p className="px-1 text-xs leading-5 text-error">{error}</p> : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateBranch}
                    disabled={isCreating}
                    className="text-xs text-ink transition-colors hover:text-muted disabled:cursor-not-allowed disabled:text-muted"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="text-xs text-muted transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreateFormOpen(true)}
                  className="w-full px-3 py-2 text-left text-sm text-muted transition-colors hover:text-ink"
                >
                  + New branch
                </button>
                {!currentBranch.is_main ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onMergeIntoMain();
                    }}
                    className="w-full border-t border-line px-3 py-2 text-left text-sm text-error transition-colors hover:text-ink"
                  >
                    Merge into main
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5 text-muted"
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-blue">
      S
    </div>
  );
}

function MergeGatePanel({
  flow,
  onConfirm,
  onCancel
}: {
  flow: MergeFlowState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const summary = flow.summary;
  const failedCases = (flow.results ?? []).filter((result) => !result.passed);

  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-line bg-panel p-5">
      {flow.status === "running" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">Running evals before merge...</p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
          </div>
        </div>
      ) : null}

      {flow.status === "no-evals" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-ink">No eval cases found - merge without testing?</p>
            <p className="mt-2 text-sm text-muted">
              This branch has no eval cases, so the merge can proceed with a warning.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="text-sm text-error transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Merge anyway
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {flow.status === "ready" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-success">
              Evals passed - {summary ? `${summary.score}/${summary.total} passed` : "ready to merge"}
            </p>
            <p className="mt-2 text-sm text-muted">This branch cleared the 80% merge gate.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-pill bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-blue transition-all hover:bg-accent-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              Confirm merge
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-pill border-2 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {flow.status === "blocked" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-error">
              Merge blocked - {summary ? `${summary.score}/${summary.total} passed (need 80%)` : "evals failed"}
            </p>
            <p className="mt-2 text-sm text-muted">
              Fix the failing cases on this branch then try again.
            </p>
          </div>

          {flow.error ? <p className="text-sm leading-6 text-error">{flow.error}</p> : null}

          {summary ? (
            <p className="font-mono text-xs text-muted">
              {summary.score} / {summary.total} passed - {getMergeThresholdMessage(summary.score, summary.total)}
            </p>
          ) : null}

          {failedCases.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              {failedCases.map((result) => (
                <div key={result.eval_case_id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm text-ink">{result.input}</p>
                  <p className="mt-2 text-sm text-muted">Expected: {result.expected_outcome}</p>
                  <p className="mt-2 font-mono text-xs text-muted">{result.response || "No response"}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DiffViewPanel({
  sourceVersion,
  currentVersion,
  sourceVersionNumber,
  diffRows,
  onBack
}: {
  sourceVersion: PromptVersion;
  currentVersion: PromptVersion;
  sourceVersionNumber: number;
  diffRows: DiffLineRow[];
  onBack: () => void;
}) {
  const hasChanges = diffRows.some((row) => row.kind !== "equal");

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="text-sm text-accent transition-colors hover:text-accent-hover">
          ← Back to editor
        </button>
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Comparing v{sourceVersionNumber} → current</p>
      </div>

      <div className="grid gap-3 border-t border-line pt-3 text-xs text-muted sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-ink">{sourceVersion.commit_message || "Untitled commit"}</p>
          <p className="font-mono">{formatRelativeTime(sourceVersion.created_at)}</p>
        </div>
        <div className="flex flex-col gap-1 sm:text-right">
          <p className="text-ink">current</p>
          <p className="font-mono">{formatRelativeTime(currentVersion.created_at)}</p>
        </div>
      </div>

      {hasChanges ? (
        <div className="max-h-[70vh] overflow-auto rounded-lg border-2 border-line bg-surface">
          <div className="grid grid-cols-2 gap-px">
            <div className="border-b border-line/80 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Older version
            </div>
            <div className="border-b border-line/80 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Current
            </div>
          </div>

          <div className="flex flex-col">
            {diffRows.map((row, index) => (
              <DiffRowView key={`${row.kind}-${index}`} row={row} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-line px-4 py-8 text-center text-sm text-muted">
          No changes between these versions
        </div>
      )}
    </section>
  );
}

function VersionsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted">
      <path
        d="M4 5h12M4 10h12M4 15h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-current">
      <path
        d="M8.7 2.7h2.6l.4 1.9c.3.1.7.3 1 .5l1.8-1 1.8 1.8-1 1.8c.2.3.4.7.5 1l1.9.4v2.6l-1.9.4c-.1.3-.3.7-.5 1l1 1.8-1.8 1.8-1.8-1c-.3.2-.7.4-1 .5l-.4 1.9H8.7l-.4-1.9c-.3-.1-.7-.3-1-.5l-1.8 1-1.8-1.8 1-1.8c-.2-.3-.4-.7-.5-1l-1.9-.4V8.7l1.9-.4c.1-.3.3-.7.5-1l-1-1.8 1.8-1.8 1.8 1c.3-.2.7-.4 1-.5l.4-1.9Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function DiffRowView({ row }: { row: DiffLineRow }) {
  const rowClasses =
    "min-h-9 px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap break-words";

  if (row.kind === "equal") {
    return (
      <div className="grid grid-cols-2 gap-px border-b border-line/60 last:border-b-0">
        <div className={rowClasses}>{row.oldLine || " "}</div>
        <div className={rowClasses}>{row.newLine || " "}</div>
      </div>
    );
  }

  if (row.kind === "delete") {
    return (
      <div className="grid grid-cols-2 gap-px border-b border-line/60 last:border-b-0">
        <div className={`${rowClasses} bg-[var(--dash-danger-soft)] text-error`}>
          <span className="mr-2 text-error">-</span>
          <span>{row.oldLine || " "}</span>
        </div>
        <div className={rowClasses} />
      </div>
    );
  }

  if (row.kind === "insert") {
    return (
      <div className="grid grid-cols-2 gap-px border-b border-line/60 last:border-b-0">
        <div className={rowClasses} />
        <div className={`${rowClasses} bg-[var(--dash-success-soft)] text-success`}>
          <span className="mr-2 text-success">+</span>
          <span>{row.newLine || " "}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px border-b border-line/60 last:border-b-0">
      <div className={`${rowClasses} bg-[var(--dash-danger-soft)] text-error`}>
        <span className="mr-2 text-error">-</span>
        <InlineDiffText oldLine={row.oldLine} newLine={row.newLine} side="old" />
      </div>
      <div className={`${rowClasses} bg-[var(--dash-success-soft)] text-success`}>
        <span className="mr-2 text-success">+</span>
        <InlineDiffText oldLine={row.oldLine} newLine={row.newLine} side="new" />
      </div>
    </div>
  );
}

function InlineDiffText({
  oldLine,
  newLine,
  side
}: {
  oldLine: string;
  newLine: string;
  side: "old" | "new";
}) {
  const parts = getInlineDiffParts(oldLine, newLine);

  return (
    <>
      {parts.map(([op, text], index) => {
        if (!text) {
          return null;
        }

        if (side === "old") {
          if (op === 1) {
            return null;
          }

          if (op === -1) {
            return (
              <span
                key={index}
                className="rounded-sm bg-[var(--dash-danger-soft)] px-0.5 text-error"
              >
                {text}
              </span>
            );
          }

          return <span key={index}>{text}</span>;
        }

        if (op === -1) {
          return null;
        }

        if (op === 1) {
          return (
            <span
              key={index}
              className="rounded-sm bg-[var(--dash-success-soft)] px-0.5 text-success"
            >
              {text}
            </span>
          );
        }

        return <span key={index}>{text}</span>;
      })}
    </>
  );
}
