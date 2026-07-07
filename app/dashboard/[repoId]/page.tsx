import Link from "next/link";
import { notFound } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { RepoEditorShell } from "./repo-editor-shell";

export default async function RepoPage({ params }: { params: { repoId: string } }) {
  if (!hasSupabaseConfig()) {
    return (
      <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <PageHeader />
          <div className="rounded-md border border-line bg-panel p-6">
            <p className="text-lg font-medium text-ink">Connect Supabase</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable repo
              editing.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data: repo, error: repoError }, { data: versions, error: versionsError }] =
    await Promise.all([
      supabase.from("repos").select("id, name").eq("id", params.repoId).single(),
      supabase
        .from("prompt_versions")
        .select(
          "id, repo_id, content, model, temperature, max_tokens, commit_message, parent_version_id, created_at"
        )
        .eq("repo_id", params.repoId)
        .order("created_at", { ascending: false })
    ]);

  if (repoError || !repo) {
    notFound();
  }

  if (versionsError) {
    return (
      <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <PageHeader />
          <div className="rounded-md border border-line bg-panel p-6">
            <p className="text-lg font-medium text-ink">Could not load this repo</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{versionsError.message}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <PageHeader />
        <RepoEditorShell repo={repo} initialVersions={versions ?? []} />
      </section>
    </main>
  );
}

function PageHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line pb-6">
      <Link href="/dashboard" className="text-sm font-medium tracking-wide text-ink">
        Pupitar
      </Link>
      <span className="rounded-sm border border-accent px-2.5 py-1 font-mono text-xs text-accent">
        repo
      </span>
    </header>
  );
}
