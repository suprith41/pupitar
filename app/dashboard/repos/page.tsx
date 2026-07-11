import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import ReposShell, { type RepoEntry } from "./repos-shell";

type RepoRow = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

type PromptVersionRow = {
  repo_id: string;
  content: string;
  created_at: string;
};

type EvalCaseRow = {
  repo_id: string;
  created_at: string;
};

type RequestLogRow = {
  repo_id: string;
  created_at: string;
};

function latestOf(values: Array<string | null | undefined>): string {
  return values.reduce<string>((latest, current) => {
    if (!current) return latest;
    if (!latest) return current;
    return current > latest ? current : latest;
  }, "");
}

export default async function ReposPage() {
  if (!hasSupabaseConfig()) {
    return (
      <ReposShell
        canCreateRepos={false}
        repos={[]}
        initialNote={null}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: repos, error } = await supabase
    .from("repos")
    .select("id, name, description, is_public, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const ownedRepos = (repos ?? []) as RepoRow[];
  const repoIds = ownedRepos.map((repo) => repo.id);

  const [promptVersions, evalCases, requestLogs] = repoIds.length
    ? await Promise.all([
        supabase
          .from("prompt_versions")
          .select("repo_id, content, created_at")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false }),
        supabase.from("eval_cases").select("repo_id, created_at").in("repo_id", repoIds).order("created_at", { ascending: false }),
        supabase.from("request_logs").select("repo_id, created_at").in("repo_id", repoIds).order("created_at", { ascending: false })
      ])
    : [
        { data: [] as PromptVersionRow[] },
        { data: [] as EvalCaseRow[] },
        { data: [] as RequestLogRow[] }
      ];

  const promptVersionRows = (promptVersions.data ?? []) as PromptVersionRow[];
  const evalCaseRows = (evalCases.data ?? []) as EvalCaseRow[];
  const requestLogRows = (requestLogs.data ?? []) as RequestLogRow[];

  const promptCountMap = new Map<string, number>();
  const evalCountMap = new Map<string, number>();
  const requestCountMap = new Map<string, number>();
  const latestPromptMap = new Map<string, string>();
  const latestActivityMap = new Map<string, string>();

  for (const repo of ownedRepos) {
    latestActivityMap.set(repo.id, repo.created_at);
  }

  for (const row of promptVersionRows) {
    promptCountMap.set(row.repo_id, (promptCountMap.get(row.repo_id) ?? 0) + 1);
    if (!latestPromptMap.has(row.repo_id)) {
      latestPromptMap.set(row.repo_id, row.content);
    }
    latestActivityMap.set(row.repo_id, latestOf([latestActivityMap.get(row.repo_id), row.created_at]));
  }

  for (const row of evalCaseRows) {
    evalCountMap.set(row.repo_id, (evalCountMap.get(row.repo_id) ?? 0) + 1);
    latestActivityMap.set(row.repo_id, latestOf([latestActivityMap.get(row.repo_id), row.created_at]));
  }

  for (const row of requestLogRows) {
    requestCountMap.set(row.repo_id, (requestCountMap.get(row.repo_id) ?? 0) + 1);
    latestActivityMap.set(row.repo_id, latestOf([latestActivityMap.get(row.repo_id), row.created_at]));
  }

  const repoEntries: RepoEntry[] = ownedRepos.map((repo) => ({
    ...repo,
    versionCount: promptCountMap.get(repo.id) ?? 0,
    evalCount: evalCountMap.get(repo.id) ?? 0,
    requestCount: requestCountMap.get(repo.id) ?? 0,
    latestPromptContent: latestPromptMap.get(repo.id) ?? null,
    updatedAt: latestActivityMap.get(repo.id) || repo.created_at
  }));

  return (
    <ReposShell
      canCreateRepos
      repos={repoEntries}
      initialNote={error?.message ?? null}
    />
  );
}
