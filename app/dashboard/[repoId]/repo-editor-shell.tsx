"use client";

const DiffMatchPatch = require("diff-match-patch");

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";

type Repo = Pick<Database["public"]["Tables"]["repos"]["Row"], "id" | "name">;
type PromptVersion = Database["public"]["Tables"]["prompt_versions"]["Row"];
type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
type EvalCaseRow = Database["public"]["Tables"]["eval_cases"]["Row"];

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

type RepoEditorShellProps = {
  repo: Repo;
  initialVersions: PromptVersion[];
  initialBranches: BranchRow[];
  initialEvalCases: EvalCaseRow[];
  deploymentVersionId?: string | null;
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

export default function RepoEditorShell({
  repo,
  initialVersions,
  initialBranches,
  initialEvalCases,
  deploymentVersionId = null
}: RepoEditorShellProps) {
  const [versions, setVersions] = useState(initialVersions);
  const [evalCases, setEvalCases] = useState(initialEvalCases);
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
  const [model, setModel] = useState(initialSeedVersion?.model ?? defaultModel);
  const [temperature, setTemperature] = useState(initialSeedVersion?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initialSeedVersion?.max_tokens ?? 512);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    initialSeedVersion?.id ?? null
  );
  const [previewVersion, setPreviewVersion] = useState<PromptVersion | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "evals">("editor");
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
  const deployedVersionLabel =
    deploymentVersionId == null ? null : formatDeploymentLabel(deploymentVersionId, orderedVersions);
  const isPreviewing = Boolean(previewVersion);
  const isDiffView = Boolean(diffSourceVersion && currentBranchLatestVersion);
  const canDeploy = Boolean(mostRecentVersion);
  const diffSourceVersionNumber = diffSourceVersion ? getVersionNumber(diffSourceVersion) : null;
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

  function getVersionNumber(version: PromptVersion) {
    const newestFirstIndex = orderedVersions.findIndex((item) => item.id === version.id);
    return newestFirstIndex === -1 ? orderedVersions.length : orderedVersions.length - newestFirstIndex;
  }

  function syncEditorToBranch(branch: BranchOption | null) {
    const seedVersion = getSeedVersion(versions, branch, branch?.id ?? null);

    setSelectedBranchId(branch?.id ?? null);
    setPreviewVersion(null);
    setDiffVersionId(null);
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
        "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, created_at"
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
    setActiveTab("editor");
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
    setActiveTab("editor");
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
        "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, created_at"
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
    const response = await fetch("/api/run-evals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repo.id, version_id: versionId })
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

    setActiveTab("editor");
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
          "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, created_at"
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
      <section className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium tracking-wide text-ink">
            <Link href="/dashboard" className="shrink-0">
              PUPITAR
            </Link>
            <span className="text-muted">/</span>
            <span className="shrink-0 text-muted">suprith</span>
            <span className="text-muted">/</span>
            <span className="truncate text-ink">{repo.name}</span>
            <BranchSwitcher
              branches={branches}
              currentBranch={currentBranch}
              onSelectBranch={syncEditorToBranch}
              onCreateBranch={createBranch}
              onMergeIntoMain={startMergeGate}
            />
          </div>

          <div className="flex items-center gap-3">
            {deployedVersionLabel == null ? null : (
              <span
                className={`rounded-sm border px-2.5 py-1 font-mono text-xs ${
                  deployFeedback ? "border-[#4F46E5] text-[#4F46E5]" : "border-[#4F46E5] text-[#4F46E5]"
                }`}
              >
                {deployedVersionLabel}
              </span>
            )}
            <UserAvatar />
          </div>
        </header>

        <div className="flex items-center gap-2 border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`border-b-2 px-0 py-2 text-sm transition-colors ${
              activeTab === "editor"
                ? "border-[#4F46E5] text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("evals")}
            className={`border-b-2 px-0 py-2 text-sm transition-colors ${
              activeTab === "evals"
                ? "border-[#4F46E5] text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Evals
          </button>
        </div>

        {activeTab === "editor" ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="break-words text-2xl font-semibold text-ink">{repo.name}</h1>
              <span className="font-mono text-sm text-muted">/ prompt.md</span>
            </div>

            {mergeMessage ? <p className="text-sm leading-6 text-muted">{mergeMessage}</p> : null}

            {mergeFlow ? (
              <MergeGatePanel
                flow={mergeFlow}
                onConfirm={confirmMerge}
                onCancel={resetMergeFlow}
              />
            ) : isDiffView && diffSourceVersion && currentBranchLatestVersion ? (
              <DiffViewPanel
                sourceVersion={diffSourceVersion}
                currentVersion={currentBranchLatestVersion}
                sourceVersionNumber={diffSourceVersionNumber ?? 0}
                diffRows={diffRows}
                onBack={exitDiffView}
              />
            ) : (
              <>
                {isPreviewing ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3">
                    <p className="text-sm text-muted">
                      Previewing v{previewVersion ? getVersionNumber(previewVersion) : orderedVersions.length}{" "}
                      - this is read only
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={exitPreview}
                        className="rounded-sm border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onRestore}
                        disabled={isCommitting}
                        className="rounded-sm border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
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
                  className={`min-h-[520px] w-full resize-none border bg-white p-5 font-mono text-sm leading-7 text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5] read-only:text-muted ${
                    isPreviewing ? "border-[#4F46E5]/70" : "border-line"
                  }`}
                  placeholder="Write the system prompt..."
                />

                <form className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center" onSubmit={onCommit}>
                  <input
                    value={commitMessage}
                    onChange={(event) => setCommitMessage(event.target.value)}
                    disabled={isPreviewing}
                    className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Commit message"
                  />
                  <button
                    type="submit"
                    disabled={isCommitting || isPreviewing}
                    className="border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCommitting ? "Committing..." : commitFeedback ? "Committed ✓" : "Commit →"}
                  </button>
                </form>

                <section className="border-t border-line pt-8">
                  <h2 className="text-[11px] uppercase tracking-[0.15em] text-muted">Playground</h2>
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={onRun}>
                    <input
                      value={testMessage}
                      onChange={(event) => setTestMessage(event.target.value)}
                      className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
                      placeholder="Type a test message..."
                    />
                    <button
                      type="submit"
                      disabled={isRunning || !testMessage.trim()}
                      className="border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRunning ? "Running..." : "Run →"}
                    </button>
                  </form>
                  <div className="mt-4 min-h-32 border-t border-line pt-4">
                    <p className={`whitespace-pre-wrap text-sm leading-7 ${playgroundError ? "text-[#DC2626]" : "text-muted"}`}>
                      {isRunning ? "Running..." : playgroundError || playgroundResponse || "No response yet."}
                    </p>
                  </div>
                </section>

                {error ? <p className="text-sm leading-7 text-[#DC2626]">{error}</p> : null}
                {status ? <p className="text-sm leading-6 text-muted">{status}</p> : null}
              </>
            )}
          </>
        ) : (
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Evals</p>
                <p className="mt-2 text-lg font-medium tracking-[-0.03em] text-ink">
                  Run repo-specific cases against the current branch.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="border border-line bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
                >
                  AI generate
                </button>
                <button
                  type="button"
                  onClick={runEvals}
                  disabled={isRunningEvals || evalCases.length === 0 || !currentBranchLatestVersion}
                  className="border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningEvals
                    ? `Running ${evalCases.length} evals...`
                    : "Run evals"}
                </button>
              </div>
            </div>

            {evalRunSummary ? (
              <div className="border-t border-line py-4">
                <p className="font-mono text-sm text-ink">
                  {evalRunSummary.score} / {evalRunSummary.total} passed
                </p>
              </div>
            ) : null}

            <div className="border-t border-line pt-4">
              <div className="flex flex-col gap-3">
                {evalCases.length === 0 ? (
                  <p className="text-sm text-muted">No eval cases yet.</p>
                ) : (
                  evalCases.map((evalCase) => {
                    const result = evalRunResults?.find((item) => item.eval_case_id === evalCase.id);
                    return (
                      <div key={evalCase.id} className="border border-line bg-panel p-4">
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
                                    ? "border-[#1a3a1a] text-[#4caf50]"
                                    : "border-[#3a1a1a] text-[#f44336]"
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
            </div>

            <div className="border-t border-line pt-8">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Add eval case</p>
              <div className="grid gap-3">
                <input
                  value={newEvalInput}
                  onChange={(event) => setNewEvalInput(event.target.value)}
                  className="border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
                  placeholder="Test input"
                />
                <input
                  value={newEvalExpectedOutcome}
                  onChange={(event) => setNewEvalExpectedOutcome(event.target.value)}
                  className="border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
                  placeholder="Expected outcome"
                />
                <input
                  value={newEvalDescription}
                  onChange={(event) => setNewEvalDescription(event.target.value)}
                  className="border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
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
                  {evalError ? <p className="text-sm text-[#DC2626]">{evalError}</p> : null}
                </div>
              </div>
            </div>

            {isGenerateModalOpen ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/90 px-6 py-8">
                <div className="w-full max-w-md border border-line bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted">AI generate</h3>
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
                    className="mt-4 min-h-28 w-full resize-none border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
                    placeholder="e.g. help support agents decide whether to approve a refund"
                  />
                  {generateError ? <p className="mt-3 text-sm text-[#DC2626]">{generateError}</p> : null}
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

          </section>
        )}
      </section>

      <aside className="flex min-w-0 flex-col gap-6 border-line lg:border-l lg:pl-6">
        <section className="flex flex-col gap-5 border-t border-line pt-6">
          <label className="flex flex-col gap-2 text-sm text-muted">
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted">Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-[#4F46E5]"
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
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted">Max tokens</span>
            <input
              type="number"
              min="1"
              value={maxTokens}
              onChange={(event) => setMaxTokens(Number(event.target.value))}
              className="border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-[#4F46E5]"
            />
          </label>

          <button
            type="button"
            onClick={onDeploy}
            disabled={isDeploying || !canDeploy}
            className="w-fit border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeploying ? "Deploying..." : "Deploy"}
          </button>

          {deploymentDetails ? (
            <div className="border border-line bg-panel p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Live endpoint</p>
              <code className="mt-3 block break-all border border-line bg-white px-3 py-2 font-mono text-xs text-[#4F46E5]">
                POST {deploymentDetails.endpoint_url}
              </code>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <code className="block break-all border border-line bg-white px-3 py-2 font-mono text-xs text-muted">
                  {deploymentDetails.api_key}
                </code>
                <button
                  type="button"
                  onClick={() => copyApiKey(deploymentDetails.api_key)}
                  className="text-sm text-muted transition-colors hover:text-ink"
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
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-muted">History</h2>
          {currentBranchVersions.length === 0 ? (
            <p className="text-sm leading-6 text-muted">No commits yet.</p>
          ) : (
            <div className="flex flex-col gap-0">
              {currentBranchVersions.map((version) => {
                const isCurrent = previewVersion?.id === version.id || (!isPreviewing && activeVersionId === version.id);
                const isMainVersion = isLegacyMainVersion(version, currentBranch?.is_main ? currentBranch.id : null);
                const isMergeWithoutEvals =
                  version.eval_score == null &&
                  version.eval_total == null &&
                  typeof version.commit_message === "string" &&
                  version.commit_message.startsWith("Merged from ");

                return (
                  <div
                    key={version.id}
                    className={`flex items-stretch gap-2 border-b border-line py-3 transition-colors ${
                      isCurrent ? "border-l-2 border-[#4F46E5] bg-panel pl-3" : "pl-0"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadVersion(version)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isMainVersion ? "bg-[#9CA3AF]" : "bg-[#4F46E5]"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-ink">
                          {version.commit_message || "Untitled commit"}
                        </p>
                        {version.eval_score != null && version.eval_total != null ? (
                          <p className="mt-1 inline-flex border border-line bg-panel px-2 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                            {version.eval_score}/{version.eval_total}
                          </p>
                        ) : isMergeWithoutEvals ? (
                          <p className="mt-1 inline-flex border border-line bg-panel px-2 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                            No evals
                          </p>
                        ) : null}
                        <p className="mt-2 font-mono text-xs text-muted">
                          {formatRelativeTime(version.created_at)}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openDiff(version)}
                      className="shrink-0 self-start font-mono text-[11px] uppercase tracking-[0.16em] text-[#4F46E5] transition-colors hover:text-[#111111]"
                    >
                      Diff
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </aside>
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
        className="ml-3 inline-flex items-center gap-1 text-sm text-[#4F46E5] transition-colors hover:text-[#3730A3]"
      >
        <span className="max-w-28 truncate">{currentBranch.name}</span>
        <ChevronDownIcon />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-64 border border-line bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
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
                  className="border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-[#4F46E5]"
                />
                {error ? <p className="px-1 text-xs leading-5 text-[#DC2626]">{error}</p> : null}
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
                    className="w-full border-t border-line px-3 py-2 text-left text-sm text-[#f44336] transition-colors hover:text-ink"
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
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-sm font-medium text-ink">
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
    <section className="flex flex-col gap-4 border border-line bg-panel p-5">
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
              className="text-sm text-[#DC2626] transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="text-sm font-medium text-[#16A34A]">
              Evals passed - {summary ? `${summary.score}/${summary.total} passed` : "ready to merge"}
            </p>
            <p className="mt-2 text-sm text-muted">This branch cleared the 80% merge gate.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirm merge
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="border border-line bg-white px-4 py-2.5 text-sm text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {flow.status === "blocked" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-[#DC2626]">
              Merge blocked - {summary ? `${summary.score}/${summary.total} passed (need 80%)` : "evals failed"}
            </p>
            <p className="mt-2 text-sm text-muted">
              Fix the failing cases on this branch then try again.
            </p>
          </div>

          {flow.error ? <p className="text-sm leading-6 text-[#DC2626]">{flow.error}</p> : null}

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
        <button type="button" onClick={onBack} className="text-sm text-[#4F46E5] transition-colors hover:text-[#3730A3]">
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
        <div className="max-h-[70vh] overflow-auto border border-line bg-white">
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
        <div className={`${rowClasses} bg-[#FEF2F2] text-[#DC2626]`}>
          <span className="mr-2 text-[#DC2626]">-</span>
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
        <div className={`${rowClasses} bg-[#F0FDF4] text-[#16A34A]`}>
          <span className="mr-2 text-[#16A34A]">+</span>
          <span>{row.newLine || " "}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px border-b border-line/60 last:border-b-0">
      <div className={`${rowClasses} bg-[#FEF2F2] text-[#DC2626]`}>
        <span className="mr-2 text-[#DC2626]">-</span>
        <InlineDiffText oldLine={row.oldLine} newLine={row.newLine} side="old" />
      </div>
      <div className={`${rowClasses} bg-[#F0FDF4] text-[#16A34A]`}>
        <span className="mr-2 text-[#16A34A]">+</span>
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
                className="rounded-sm bg-[#FEF2F2] px-0.5 text-red-50"
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
              className="rounded-sm bg-[#F0FDF4] px-0.5 text-green-50"
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
