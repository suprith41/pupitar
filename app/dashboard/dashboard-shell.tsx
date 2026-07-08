"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";

type Repo = Pick<
  Database["public"]["Tables"]["repos"]["Row"],
  "id" | "name" | "description" | "is_public" | "created_at"
>;

type DashboardShellProps = {
  repos: Repo[];
  canCreateRepos: boolean;
  initialErrorMessage?: string;
};

export default function DashboardShell({ repos, canCreateRepos, initialErrorMessage }: DashboardShellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
      <section className="mx-auto flex w-full max-w-[960px] flex-col">
        <DashboardTopBar onNewRepo={() => setIsModalOpen(true)} canCreateRepos={canCreateRepos} />

        <div className="border-t border-line pt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Your repos</p>
          {repos.length === 0 ? (
            <EmptyState
              onNewRepo={() => setIsModalOpen(true)}
              canCreateRepos={canCreateRepos}
              errorMessage={initialErrorMessage}
            />
          ) : (
            <RepoGrid repos={repos} />
          )}
        </div>
      </section>

      <NewRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canCreateRepos={canCreateRepos}
      />
    </main>
  );
}

function DashboardTopBar({
  onNewRepo,
  canCreateRepos
}: {
  onNewRepo: () => void;
  canCreateRepos: boolean;
}) {
  return (
    <header className="flex items-center justify-between pb-4 pt-1">
      <Link href="/dashboard" className="text-[18px] font-extrabold uppercase tracking-[-0.02em] text-ink">
        PUPITAR
      </Link>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onNewRepo}
          disabled={!canCreateRepos}
          className="rounded-pill bg-accent px-4 py-2 text-[13px] font-bold text-white shadow-blue transition-all hover:bg-accent-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          + New repo
        </button>
      </div>
    </header>
  );
}

function EmptyState({
  onNewRepo,
  canCreateRepos,
  errorMessage
}: {
  onNewRepo: () => void;
  canCreateRepos: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="flex min-h-[420px] flex-col justify-center gap-4 py-12">
      <p className="text-lg font-bold tracking-[-0.03em] text-ink">
        {canCreateRepos ? "Create your first repo." : "Connect Supabase to enable repos."}
      </p>
      {errorMessage ? <p className="max-w-xl text-sm leading-7 text-error">{errorMessage}</p> : null}
      {!canCreateRepos ? (
        <p className="max-w-xl text-sm leading-7 text-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your frontend env, then restart the dev server.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onNewRepo}
        disabled={!canCreateRepos}
        className="w-fit text-sm font-semibold text-accent transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:text-muted"
      >
        New repo →
      </button>
    </div>
  );
}

function RepoGrid({ repos }: { repos: Repo[] }) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {repos.map((repo) => (
        <Link
          key={repo.id}
          href={`/dashboard/${repo.id}`}
          className="flex min-h-32 flex-col justify-between rounded-xl border-2 border-line bg-surface p-6 shadow-card transition-all hover:border-accent/30 hover:shadow-elevated"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold tracking-[-0.03em] text-ink">
                {repo.name}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted">{repo.description || "No description"}</p>
            </div>
            <span className="shrink-0 rounded-pill border border-line bg-panel px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              {repo.is_public ? "Public" : "Private"}
            </span>
          </div>

          <p className="mt-6 font-mono text-xs text-muted">Updated {formatRelativeTime(repo.created_at)}</p>
        </Link>
      ))}
    </div>
  );
}

function NewRepoModal({
  isOpen,
  onClose,
  canCreateRepos
}: {
  isOpen: boolean;
  onClose: () => void;
  canCreateRepos: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetAndClose() {
    setName("");
    setDescription("");
    setIsPublic(false);
    setError("");
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const repoName = name.trim();

    if (!/^[a-z0-9-]+$/.test(repoName)) {
      setError("Use lowercase letters, numbers, and hyphens only.");
      return;
    }

    setIsSubmitting(true);

    if (!canCreateRepos) {
      setIsSubmitting(false);
      setError("Supabase URL and anon key are required before creating repos.");
      return;
    }

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("repos")
      .insert({
        name: repoName,
        description: description.trim() || null,
        is_public: isPublic
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const { error: branchError } = await supabase.from("branches").insert({
      repo_id: data.id,
      name: "main",
      is_main: true
    });

    if (branchError) {
      setError(branchError.message);
      return;
    }

    resetAndClose();
    router.push(`/dashboard/${data.id}`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-nav/80 px-6 py-8 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-xl border-2 border-line bg-surface p-6 shadow-elevated">
        <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-ink">New repo</h2>
          <button type="button" onClick={resetAndClose} className="text-sm font-medium text-muted transition-colors hover:text-ink">
            Close
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-md border-2 border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(59,92,255,0.15)]"
              placeholder="my-prompt-repo"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 resize-none rounded-md border-2 border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(59,92,255,0.15)]"
            />
          </label>

          <div className="flex items-center justify-between rounded-md border-2 border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{isPublic ? "Public" : "Private"}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Visibility</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((value) => !value)}
              className={`relative h-7 w-12 rounded-pill transition-colors ${
                isPublic ? "bg-accent" : "bg-line"
              }`}
              aria-pressed={isPublic}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-subtle transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {error ? <p className="text-sm leading-7 text-error">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !canCreateRepos}
            className="w-fit rounded-pill bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-blue transition-all hover:bg-accent-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {isSubmitting ? "Creating..." : canCreateRepos ? "Create repo →" : "Configure Supabase"}
          </button>
        </form>
      </section>
    </div>
  );
}
