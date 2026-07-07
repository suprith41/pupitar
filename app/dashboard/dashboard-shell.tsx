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

export function DashboardShell({ repos, canCreateRepos, initialErrorMessage }: DashboardShellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <DashboardTopBar onNewRepo={() => setIsModalOpen(true)} canCreateRepos={canCreateRepos} />

        {repos.length === 0 ? (
          <EmptyState
            onNewRepo={() => setIsModalOpen(true)}
            canCreateRepos={canCreateRepos}
            errorMessage={initialErrorMessage}
          />
        ) : (
          <RepoGrid repos={repos} />
        )}
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
    <header className="flex items-center justify-between border-b border-line pb-6">
      <Link href="/dashboard" className="text-sm font-medium tracking-wide text-ink">
        Pupitar
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNewRepo}
          disabled={!canCreateRepos}
          className="rounded-sm border border-accent bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
        >
          New repo
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
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 text-center">
      <p className="text-lg font-medium text-ink">
        {canCreateRepos ? "Create your first repo" : "Connect Supabase to enable repos"}
      </p>
      {errorMessage ? <p className="max-w-md text-sm leading-6 text-accent">{errorMessage}</p> : null}
      {!canCreateRepos ? (
        <p className="max-w-md text-sm leading-6 text-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your frontend env,
          then restart the dev server.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onNewRepo}
        disabled={!canCreateRepos}
        className="rounded-sm border border-accent bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
      >
        New repo
      </button>
    </div>
  );
}

function RepoGrid({ repos }: { repos: Repo[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <Link
          key={repo.id}
          href={`/dashboard/${repo.id}`}
          className="flex min-h-44 flex-col justify-between rounded-md border border-line bg-panel p-5 transition-colors hover:border-accent"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="break-words text-base font-medium text-ink">{repo.name}</h2>
              <span className="shrink-0 rounded-sm border border-line px-2 py-1 font-mono text-xs text-muted">
                {repo.is_public ? "Public" : "Private"}
              </span>
            </div>

            <p className="overflow-hidden text-sm leading-6 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {repo.description || "No description"}
            </p>
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

    resetAndClose();
    router.push(`/dashboard/${data.id}`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-surface/80 px-6 py-8">
      <section className="w-full max-w-md rounded-md border border-line bg-panel p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink">New repo</h2>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-sm border border-line px-2.5 py-1 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
              placeholder="my-prompt-repo"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 resize-none rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
          </label>

          <div className="flex items-center justify-between rounded-md border border-line bg-surface p-3">
            <div>
              <p className="text-sm text-ink">{isPublic ? "Public" : "Private"}</p>
              <p className="mt-1 text-xs text-muted">Visibility</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((value) => !value)}
              className="relative h-7 w-12 rounded-sm border border-line bg-panel transition-colors hover:border-accent"
              aria-pressed={isPublic}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-sm bg-accent transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !canCreateRepos}
            className="mt-2 rounded-sm border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : canCreateRepos ? "Create repo" : "Configure Supabase"}
          </button>
        </form>
      </section>
    </div>
  );
}
