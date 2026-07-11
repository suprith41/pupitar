import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import DashboardShell from "./dashboard-shell";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) {
    return (
      <DashboardShell
        repos={[]}
        canCreateRepos={false}
        profileName={null}
        profileEmail={null}
        requestLogs={[] as any[]}
        evalRuns={[] as any[]}
        promptVersions={[] as any[]}
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

  const [{ data: repos, error }, { data: profile }] = await Promise.all([
    supabase
      .from("repos")
      .select("id, name, description, is_public, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("name").eq("id", user.id).maybeSingle()
  ]);

  if (error) {
    return (
      <DashboardShell
        repos={[]}
        canCreateRepos={true}
        profileName={profile?.name ?? null}
        profileEmail={user.email ?? null}
        requestLogs={[] as any[]}
        evalRuns={[] as any[]}
        promptVersions={[] as any[]}
        initialErrorMessage={error.message}
      />
    );
  }

  const repoIds = (repos ?? []).map((repo) => repo.id);
  const [requestLogs, evalRuns, promptVersions] = repoIds.length
    ? await Promise.all([
        supabase
          .from("request_logs")
          .select("repo_id, latency_ms, token_count, created_at, status")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("eval_runs")
          .select("repo_id, score, total, created_at")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("prompt_versions")
          .select("repo_id, created_at")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false })
      ])
    : [
        { data: [] as Array<unknown> },
        { data: [] as Array<unknown> },
        { data: [] as Array<unknown> }
      ];

  return (
    <DashboardShell
      repos={repos ?? []}
      canCreateRepos
      profileName={profile?.name ?? null}
      profileEmail={user.email ?? null}
      requestLogs={(requestLogs.data ?? []) as any[]}
      evalRuns={(evalRuns.data ?? []) as any[]}
      promptVersions={(promptVersions.data ?? []) as any[]}
    />
  );
}
