"use client";

import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ForkModal, ForkSuccessToast, type ForkTarget } from "./fork-modal";
import { ExploreNavbar } from "@/components/explore-navbar";

export type ExploreRepo = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  tags: string[];
  star_count: number;
  fork_count: number;
  updated_at: string;
  created_at: string;
  ownerLabel: string;
  latestPromptContent: string | null;
  isStarred: boolean;
  forkedRepoId: string | null;
};

type SortOption = "stars" | "forks" | "updated";

const FILTERS = [
  "All",
  "customer-support",
  "coding-assistant",
  "data-extraction",
  "summarization",
  "classification",
  "translation",
  "qa-bot",
  "agent",
  "other"
] as const;

const ICON_COLORS = ["#2067FF", "#4CAF82", "#F87171", "#8B5CF6", "#F59E0B"];

export default function ExploreShell({
  repos: initialRepos,
  userEmail,
  isAuthenticated,
  initialNote = null
}: {
  repos: ExploreRepo[];
  userEmail: string | null;
  isAuthenticated: boolean;
  initialNote?: string | null;
}) {
  const router = useRouter();
  const [repos, setRepos] = useState(initialRepos);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<SortOption>("stars");
  const [query, setQuery] = useState("");
  const [busyRepoId, setBusyRepoId] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote);
  const [forkTarget, setForkTarget] = useState<ForkTarget | null>(null);
  const [forkBusy, setForkBusy] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const [showForkToast, setShowForkToast] = useState(false);

  const visibleRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return repos
      .filter((repo) => filter === "All" || repo.tags.includes(filter))
      .filter((repo) => {
        if (!normalizedQuery) return true;
        return [repo.name, repo.description ?? "", repo.ownerLabel, ...repo.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((first, second) => {
        if (sort === "forks") return second.fork_count - first.fork_count;
        if (sort === "updated") return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
        return second.star_count - first.star_count;
      });
  }, [filter, query, repos, sort]);

  async function toggleStar(repo: ExploreRepo) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const optimisticStarred = !repo.isStarred;
    setRepos((current) =>
      current.map((item) => item.id === repo.id
        ? { ...item, isStarred: optimisticStarred, star_count: Math.max(0, item.star_count + (optimisticStarred ? 1 : -1)) }
        : item)
    );
    setBusyRepoId(repo.id);
    setNote(null);
    const { data, error } = await createClient().rpc("toggle_repo_star", { target_repo_id: repo.id });
    setBusyRepoId(null);
    if (error) {
      setRepos((current) =>
        current.map((item) => item.id === repo.id
          ? { ...item, isStarred: repo.isStarred, star_count: repo.star_count }
          : item)
      );
      setNote(error.message);
      return;
    }

    const isStarred = Boolean(data);
    if (isStarred !== optimisticStarred) {
      setRepos((current) => current.map((item) => item.id === repo.id
        ? {
            ...item,
            isStarred,
            star_count: Math.max(0, repo.star_count + (isStarred === repo.isStarred ? 0 : isStarred ? 1 : -1))
          }
        : item));
    }
  }

  function openForkModal(repo: ExploreRepo) {
    setForkError(null);
    setForkTarget({ id: repo.id, name: repo.name, description: repo.description, forkedRepoId: repo.forkedRepoId });
  }

  async function confirmFork(name: string, description: string) {
    if (!forkTarget) return;
    setForkBusy(true);
    setForkError(null);
    const { data, error } = await createClient().rpc("fork_public_repo", {
      source_repo_id: forkTarget.id,
      fork_name: name,
      fork_description: description || null
    });
    setForkBusy(false);
    if (error || !data) {
      if (error?.message.includes("Already forked")) {
        const { data: existing } = await createClient().from("repo_forks").select("forked_repo_id").eq("original_repo_id", forkTarget.id).maybeSingle();
        if (existing?.forked_repo_id) {
          setForkTarget((current) => current ? { ...current, forkedRepoId: existing.forked_repo_id } : current);
          setRepos((current) => current.map((repo) => repo.id === forkTarget.id ? { ...repo, forkedRepoId: existing.forked_repo_id } : repo));
          return;
        }
      }
      setForkError(error?.message ?? "Could not fork this repo.");
      return;
    }

    setRepos((current) =>
      current.map((item) => (item.id === forkTarget.id ? { ...item, fork_count: item.fork_count + 1, forkedRepoId: data } : item))
    );
    setForkTarget(null);
    setShowForkToast(true);
    window.setTimeout(() => router.push(`/dashboard/${data}`), 900);
  }

  return (
    <div className="pupitar-dashboard min-h-screen bg-[#0F0F0F] text-[#F0F0F0]">
      <main className="min-w-0 px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1440px]">
          <ExploreNavbar isAuthenticated={isAuthenticated} userEmail={userEmail} />
          <div className="mt-7 flex flex-col gap-5 border-b border-[#2A2A2A] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="m-0 font-heading text-[22px] font-bold text-[#F0F0F0]">Explore</h1>
              <p className="mt-1.5 text-[14px] text-[#A0A0A0]">Discover and fork public prompt repos</p>
            </div>
            <label className="relative block w-full lg:w-[320px]">
              <span className="sr-only">Search public repos</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search public repos..."
                className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#1A1A1A] pl-10 pr-3 text-[14px] text-[#F0F0F0] outline-none transition-colors focus:border-[#2067FF]"
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 py-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => {
                const active = item === filter;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${active ? "border-[#2067FF] bg-[#2067FF] text-white" : "border-[#2A2A2A] bg-[#1A1A1A] text-[#A0A0A0] hover:border-[#606060]"}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              aria-label="Sort public repos"
              className="h-9 shrink-0 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-[13px] text-[#F0F0F0] outline-none focus:border-[#2067FF]"
            >
              <option value="stars">Most starred</option>
              <option value="forks">Most forked</option>
              <option value="updated">Recently updated</option>
            </select>
          </div>

          {note ? <p role="status" className="mb-4 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-[13px] text-[#A0A0A0]">{note}</p> : null}

          {visibleRepos.length ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {visibleRepos.map((repo, index) => (
                <article
                  key={repo.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/explore/${repo.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") router.push(`/explore/${repo.id}`);
                  }}
                  className="group flex min-h-[330px] cursor-pointer flex-col rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5 text-left transition-colors hover:border-[#2067FF] focus:outline-none focus:ring-2 focus:ring-[#2067FF]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: ICON_COLORS[index % ICON_COLORS.length] }}>
                      {repo.name.trim().charAt(0).toUpperCase() || "R"}
                    </span>
                    <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#F0F0F0]">{repo.name}</h2>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2067FF] text-[11px] font-bold text-white" title={repo.ownerLabel}>
                      {repo.ownerLabel.trim().charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>

                  {repo.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {repo.tags.map((tag) => <span key={tag} className="rounded-full bg-[#242424] px-2 py-0.5 text-[11px] text-[#A0A0A0]">{tag}</span>)}
                    </div>
                  ) : null}

                  <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-[#A0A0A0]">{repo.description || "No description"}</p>

                  <div className="mt-4">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#606060]">Latest prompt</p>
                    <pre className="line-clamp-3 min-h-[58px] whitespace-pre-wrap rounded bg-[#0F0F0F] px-3 py-2 font-mono text-[11px] leading-[14px] text-[#606060]">{repo.latestPromptContent?.trim() || "No prompt versions yet."}</pre>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                    <div>
                      <p className="text-[12px] text-[#606060]">⭐ {repo.star_count} <span className="mx-1">·</span> 🍴 {repo.fork_count}</p>
                      <p className="mt-1 text-[11px] text-[#606060]">Updated {formatRelativeTime(repo.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={repo.isStarred ? `Unstar ${repo.name}` : `Star ${repo.name}`}
                        disabled={busyRepoId === repo.id}
                        onClick={(event) => { event.stopPropagation(); void toggleStar(repo); }}
                        className={`h-8 rounded-md border px-2.5 text-[14px] transition-colors disabled:opacity-50 ${repo.isStarred ? "border-[#2067FF] bg-[#2067FF] text-white" : "border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] hover:border-[#2067FF]"}`}
                      >
                        {repo.isStarred ? "★" : "⭐"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRepoId === repo.id}
                        onClick={(event) => { event.stopPropagation(); openForkModal(repo); }}
                        className="h-8 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 text-[13px] text-[#F0F0F0] transition-colors hover:border-[#2067FF] hover:bg-[#2067FF] hover:text-white disabled:opacity-50"
                      >
                        Fork
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <p className="text-[17px] font-semibold text-[#F0F0F0]">No public repos yet.</p>
              <p className="mt-2 text-[14px] text-[#A0A0A0]">Be the first to share a prompt repo publicly.</p>
              <button type="button" onClick={() => router.push("/dashboard/repos")} className="mt-5 rounded-md bg-[#2067FF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2F6BFF]">
                Make a repo public
              </button>
            </div>
          )}
        </div>
      </main>
      {forkTarget ? (
        <ForkModal
          repo={forkTarget}
          loggedIn={isAuthenticated}
          busy={forkBusy}
          error={forkError}
          onClose={() => !forkBusy && setForkTarget(null)}
          onConfirm={confirmFork}
        />
      ) : null}
      {showForkToast ? <ForkSuccessToast /> : null}
    </div>
  );
}
