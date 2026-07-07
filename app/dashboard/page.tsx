import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) {
    return <DashboardShell repos={[]} canCreateRepos={false} />;
  }

  const supabase = await createClient();

  const { data: repos, error } = await supabase
    .from("repos")
    .select("id, name, description, is_public, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <DashboardShell
        repos={[]}
        canCreateRepos={true}
        initialErrorMessage={error.message}
      />
    );
  }

  return <DashboardShell repos={repos ?? []} canCreateRepos />;
}
