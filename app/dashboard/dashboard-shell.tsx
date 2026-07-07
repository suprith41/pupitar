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
    <main className="min-h-screen bg-surface px-6 py-6 text-ink md:px-10 md:py-8">
      <section className="mx-auto flex w-full max-w-[960px] flex-col">
        <DashboardTopBar onNewRepo={() => setIsModalOpen(true)} canCreateRepos={canCreateRepos} />

        <div className="border-t border-line pt-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Your repos</p>
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
    <header className="flex items-center justify-between pb-4 pt-1 text-[13px] uppercase tracking-[0.18em] text-muted">
      <Link href="/dashboard" className="font-heading text-[18px] text-ink">
        PUPITAR
      </Link>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onNewRepo}
          disabled={!canCreateRepos}
          className="text-[#4F46E5] transition-colors hover:text-[#3730A3] disabled:cursor-not-allowed disabled:text-muted"
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
      <p className="text-lg font-medium tracking-[-0.03em] text-ink">
        {canCreateRepos ? "Create your first repo." : "Connect Supabase to enable repos."}
      </p>
      {errorMessage ? <p className="max-w-xl text-sm leading-7 text-[#DC2626]">{errorMessage}</p> : null}
      {!canCreateRepos ? (
        <p className="max-w-xl text-sm leading-7 text-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your frontend env, then restart the dev server.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onNewRepo}
        disabled={!canCreateRepos}
        className="w-fit text-sm text-ink transition-colors hover:text-muted disabled:cursor-not-allowed disabled:text-muted"
      >
        New repo →
      </button>
    </div>
  );
}

function RepoGrid({ repos }: { repos: Repo[] }) {
  return (
    <div className="mt-8 grid gap-0 md:grid-cols-2">
      {repos.map((repo) => (
        <Link
          key={repo.id}
          href={`/dashboard/${repo.id}`}
          className="flex min-h-32 flex-col justify-between border-b border-line py-5 transition-colors hover:bg-panel md:border-r md:px-6 first:md:pl-0 last:md:border-r-0"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-medium tracking-[-0.03em] text-ink">
                {repo.name}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted">{repo.description || "No description"}</p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-muted">
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-white/90 px-6 py-8">
      <section className="w-full max-w-md border border-line bg-white p-6">
        <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
          <h2 className="font-heading text-[24px] text-ink">New repo</h2>
          <button type="button" onClick={resetAndClose} className="text-sm text-muted transition-colors hover:text-ink">
            Close
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-[#4F46E5]"
              placeholder="my-prompt-repo"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 resize-none border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-[#4F46E5]"
            />
          </label>

          <div className="flex items-center justify-between border border-line px-3 py-3">
            <div>
              <p className="text-sm text-ink">{isPublic ? "Public" : "Private"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted">Visibility</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((value) => !value)}
              className="relative h-7 w-12 border border-line bg-white transition-colors hover:border-[#4F46E5]"
              aria-pressed={isPublic}
            >
              <span
                className={`absolute top-1 h-5 w-5 bg-[#4F46E5] transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {error ? <p className="text-sm leading-7 text-[#DC2626]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !canCreateRepos}
            className="w-fit border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : canCreateRepos ? "Create repo →" : "Configure Supabase"}
          </button>
        </form>
      </section>
    </div>
  );
}
