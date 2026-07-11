import Link from "next/link";
import { notFound } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import RepoEditorShell from "./repo-editor-shell";
import { redirect } from "next/navigation";
import { PupitarLogo } from "@/components/logo";

export default async function RepoPage({ params }: { params: { repoId: string } }) {
  if (!hasSupabaseConfig()) {
    return (
      <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
        <section className="mx-auto flex w-full max-w-[960px] flex-col">
          <RepoPageHeader repoName="PUPITAR" userLabel="account" />
          <div className="border-t border-line py-10">
            <p className="text-lg font-medium tracking-[-0.03em] text-ink">Connect Supabase</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable repo
              editing.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: repo, error: repoError },
    { data: versions, error: versionsError },
    { data: branches, error: branchesError },
    { data: evalCases, error: evalCasesError },
    { data: deployment }
  ] =
    await Promise.all([
      supabase.from("repos").select("id, name").eq("id", params.repoId).eq("owner_id", user.id).single(),
      supabase
        .from("prompt_versions")
        .select(
          "id, repo_id, branch_id, content, model, temperature, max_tokens, commit_message, parent_version_id, eval_score, eval_total, created_at"
        )
        .eq("repo_id", params.repoId)
        .order("created_at", { ascending: false }),
      supabase
        .from("branches")
        .select("id, repo_id, name, created_from_version_id, is_main, created_at")
        .eq("repo_id", params.repoId)
        .order("created_at", { ascending: true }),
      supabase
        .from("eval_cases")
        .select("id, repo_id, input, expected_outcome, description, created_at")
        .eq("repo_id", params.repoId)
        .order("created_at", { ascending: true }),
      supabase
        .from("deployments")
        .select("active_version_id")
        .eq("repo_id", params.repoId)
        .maybeSingle()
    ]);

  if (repoError || !repo) {
    notFound();
  }

  if (versionsError) {
    return (
      <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
        <section className="mx-auto flex w-full max-w-[960px] flex-col">
          <RepoPageHeader repoName="PUPITAR" userLabel="account" />
          <div className="border-t border-line py-10">
            <p className="text-lg font-medium tracking-[-0.03em] text-ink">Could not load this repo</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{versionsError.message}</p>
          </div>
        </section>
      </main>
    );
  }

  if (branchesError) {
    return (
      <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
        <section className="mx-auto flex w-full max-w-[960px] flex-col">
          <RepoPageHeader repoName="Pupitar" userLabel="account" />
          <div className="border-t border-line py-10">
            <p className="text-lg font-medium tracking-[-0.03em] text-ink">Could not load branches</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{branchesError.message}</p>
          </div>
        </section>
      </main>
    );
  }

  if (evalCasesError) {
    return (
      <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
        <section className="mx-auto flex w-full max-w-[900px] flex-col">
          <RepoPageHeader repoName={repo.name} userLabel={user.email?.split("@")[0] ?? "account"} />
          <div className="border-t border-line py-10">
            <p className="text-lg font-medium tracking-[-0.03em] text-ink">Could not load eval cases</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{evalCasesError.message}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-8 md:py-8">
      <section className="mx-auto flex w-full max-w-none flex-col">
        <RepoEditorShell
          repo={repo}
          initialVersions={versions ?? []}
          initialBranches={branches ?? []}
          initialEvalCases={evalCases ?? []}
          deploymentVersionId={deployment?.active_version_id ?? null}
          currentUserEmail={user.email ?? null}
          currentUserLabel={user.email?.split("@")[0] ?? "account"}
        />
      </section>
    </main>
  );
}

function RepoPageHeader({ repoName, userLabel }: { repoName: string; userLabel: string }) {
  return (
    <header className="flex items-center justify-between border-b border-line pb-4 pt-1 text-[13px] font-bold uppercase tracking-[0.18em] text-muted">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0 tracking-[-0.02em] text-ink" style={{ textDecoration: "none" }}>
          <PupitarLogo size={14} />
          PUPITAR
        </Link>
        <span className="text-line">/</span>
        <span className="font-medium">{userLabel}</span>
        <span className="text-line">/</span>
        <span className="shrink-0 font-bold text-ink">{repoName}</span>
      </div>
    </header>
  );
}
