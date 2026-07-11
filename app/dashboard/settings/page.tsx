import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import SettingsShell, { type SettingsData } from "./settings-shell";

type ProfileRow = {
  role: string | null;
  account_type: string | null;
  name: string | null;
  company_name: string | null;
};

type RepoRow = {
  id: string;
  name: string;
};

type DeploymentRow = {
  id: string;
  repo_id: string;
  api_key: string;
  repo_name: string;
};

export default async function SettingsPage() {
  if (!hasSupabaseConfig()) {
    return (
      <SettingsShell
        canCreateRepos={false}
        data={{
          profile: null,
          email: null,
          deployments: []
        }}
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

  const [{ data: profile }, { data: repos }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("role, account_type, name, company_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("repos").select("id, name").eq("owner_id", user.id).order("created_at", { ascending: false })
  ]);

  const repoIds = (repos ?? []).map((repo: RepoRow) => repo.id);
  const { data: deployments } = repoIds.length
    ? await supabase.from("deployments").select("id, repo_id, api_key").in("repo_id", repoIds)
    : { data: [] as DeploymentRow[] };

  const data: SettingsData = {
    profile: (profile as ProfileRow | null) ?? null,
    email: user.email ?? null,
    deployments: ((deployments ?? []) as Array<Pick<DeploymentRow, "id" | "repo_id" | "api_key">>).map((deployment) => ({
      ...deployment,
      repo_name: (repos ?? []).find((repo: RepoRow) => repo.id === deployment.repo_id)?.name ?? "Unknown repo"
    }))
  };

  return <SettingsShell canCreateRepos data={data} />;
}
