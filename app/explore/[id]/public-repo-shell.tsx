"use client";

import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ForkModal, ForkSuccessToast } from "../fork-modal";
import { ExploreNavbar } from "@/components/explore-navbar";
import { DashboardThemeProvider } from "@/components/dashboard-theme-provider";
import { StarIcon } from "@/components/star-icon";

type PublicRepo = {
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
};

type PublicVersion = {
  id: string;
  content: string;
  model: string;
  temperature: number;
  max_tokens: number;
  commit_message: string | null;
  release_label: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function releaseLabelClassName(label: string) {
  if (label.toLowerCase() === "prod") return "bg-[#0F2A1A] text-[#4CAF82]";
  if (label.toLowerCase() === "dev") return "bg-[#1A2A4A] text-[#2067FF]";
  return "bg-[#242424] text-[#A0A0A0]";
}

function renderPromptContent(text: string) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="mb-5 ml-5 list-disc space-y-2">
        {bullets.map((item, index) => <li key={`${item}-${index}`} className="font-serif text-[15px] leading-7 text-[#F0F0F0]">{item}</li>)}
      </ul>
    );
    bullets = [];
  }

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      blocks.push(<div key={`space-${index}`} className="h-4" />);
    } else if (trimmed.startsWith("### ")) {
      flushBullets();
      blocks.push(<h3 key={index} className="mb-4 text-[18px] font-bold leading-7 text-[#F0F0F0]">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      flushBullets();
      blocks.push(<h2 key={index} className="mb-4 text-[22px] font-bold leading-8 text-[#F0F0F0]">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("# ")) {
      flushBullets();
      blocks.push(<h1 key={index} className="mb-5 text-[28px] font-bold leading-9 text-[#F0F0F0]">{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
    } else {
      flushBullets();
      blocks.push(<p key={index} className="mb-4 whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#F0F0F0]">{line}</p>);
    }
  });
  flushBullets();
  return blocks.length ? blocks : <p className="text-[15px] text-[#A0A0A0]">No content yet.</p>;
}

export default function PublicRepoShell(props: {
  repo: PublicRepo;
  versions: PublicVersion[];
  initialStarred: boolean;
  initialForkedRepoId: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  initialNote?: string | null;
}) {
  return (
    <DashboardThemeProvider>
      <PublicRepoShellContent {...props} />
    </DashboardThemeProvider>
  );
}

function PublicRepoShellContent({
  repo,
  versions,
  initialStarred,
  initialForkedRepoId,
  userEmail,
  isAuthenticated,
  initialNote = null
}: {
  repo: PublicRepo;
  versions: PublicVersion[];
  initialStarred: boolean;
  initialForkedRepoId: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  initialNote?: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(versions[0]?.id ?? null);
  const [starred, setStarred] = useState(initialStarred);
  const [starCount, setStarCount] = useState(repo.star_count);
  const [forkCount, setForkCount] = useState(repo.fork_count);
  const [busy, setBusy] = useState<"star" | "fork" | null>(null);
  const [note, setNote] = useState(initialNote);
  const [forkModalOpen, setForkModalOpen] = useState(false);
  const [forkedRepoId, setForkedRepoId] = useState(initialForkedRepoId);
  const [forkError, setForkError] = useState<string | null>(null);
  const [showForkToast, setShowForkToast] = useState(false);
  const selectedVersion = useMemo(() => versions.find((version) => version.id === selectedId) ?? versions[0] ?? null, [selectedId, versions]);

  function requireAuth() {
    if (isAuthenticated) return true;
    router.push("/login");
    return false;
  }

  async function toggleStar() {
    if (!requireAuth()) return;
    const previousStarred = starred;
    const previousCount = starCount;
    const optimisticStarred = !previousStarred;
    setStarred(optimisticStarred);
    setStarCount(Math.max(0, previousCount + (optimisticStarred ? 1 : -1)));
    setBusy("star");
    setNote(null);
    const supabase = createClient();
    const rpcResult = await supabase.rpc("toggle_repo_star", { target_repo_id: repo.id });
    let nextStarred = rpcResult.data;
    let starError: { message: string } | null = rpcResult.error;

    if (starError?.message.includes("toggle_repo_star")) {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) {
        starError = { message: userError?.message ?? "Please sign in to star this repo." };
      } else {
        const fallbackResult = optimisticStarred
          ? await supabase.from("repo_stars").insert({ repo_id: repo.id, user_id: userResult.user.id })
          : await supabase.from("repo_stars").delete().eq("repo_id", repo.id).eq("user_id", userResult.user.id);
        starError = fallbackResult.error;
        nextStarred = optimisticStarred;
      }
    }
    setBusy(null);
    if (starError) {
      setStarred(previousStarred);
      setStarCount(previousCount);
      setNote(starError.message);
      return;
    }
    const next = Boolean(nextStarred);
    if (next !== optimisticStarred) {
      setStarred(next);
      setStarCount(Math.max(0, previousCount + (next === previousStarred ? 0 : next ? 1 : -1)));
    }
  }

  async function forkRepo(name: string, description: string) {
    setBusy("fork");
    setForkError(null);
    const { data, error } = await createClient().rpc("fork_public_repo", {
      source_repo_id: repo.id,
      fork_name: name,
      fork_description: description || null
    });
    setBusy(null);
    if (error || !data) {
      if (error?.message.includes("Already forked")) {
        const { data: existing } = await createClient().from("repo_forks").select("forked_repo_id").eq("original_repo_id", repo.id).maybeSingle();
        if (existing?.forked_repo_id) {
          setForkedRepoId(existing.forked_repo_id);
          return;
        }
      }
      setForkError(error?.message ?? "Could not fork this repo.");
      return;
    }
    setForkCount((current) => current + 1);
    setForkedRepoId(data);
    setForkModalOpen(false);
    setShowForkToast(true);
    window.setTimeout(() => router.push(`/dashboard/${data}`), 900);
  }

  return (
    <main className="min-h-screen bg-[var(--dash-bg)] px-5 py-6 text-[var(--dash-ink)] md:px-10 md:py-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <ExploreNavbar isAuthenticated={isAuthenticated} userEmail={userEmail} />
        <Link href="/explore" className="mt-6 inline-flex text-[13px] font-medium text-[#2067FF] transition-colors hover:text-[#2F6BFF]">← Back to Explore</Link>

        <header className="mt-7 flex flex-col gap-6 border-b border-[#2A2A2A] pb-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[800px] min-w-0">
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#F0F0F0]">{repo.name}</h1>
            <p className="mt-1 text-[14px] text-[#A0A0A0]">by {repo.ownerLabel}</p>
            {repo.description ? <p className="mt-4 text-[15px] leading-6 text-[#A0A0A0]">{repo.description}</p> : null}
            {repo.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {repo.tags.map((tag) => <span key={tag} className="rounded-full bg-[#242424] px-2.5 py-1 text-[11px] text-[#A0A0A0]">{tag}</span>)}
              </div>
            ) : null}
            <p className="mt-5 flex items-center gap-1 text-[13px] text-[#606060]"><StarIcon className="h-3.5 w-3.5" /> {starCount} stars <span className="mx-1.5">·</span> 🍴 {forkCount} forks <span className="mx-1.5">·</span> {versions.length} versions <span className="mx-1.5">·</span> Updated {formatRelativeTime(repo.updated_at)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleStar()}
              disabled={busy !== null}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 ${starred ? "border-[#D29922] bg-[#1A1A1A] text-[#F4B740]" : "border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] hover:border-[#D29922]"}`}
            >
              {busy === "star" ? "Saving…" : <><StarIcon filled={starred} className="h-4 w-4" /> {starred ? "Starred" : "Star"}</>}
            </button>
            <button type="button" onClick={() => { setForkError(null); setForkModalOpen(true); }} disabled={busy !== null} className="h-10 rounded-md bg-[#2067FF] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2F6BFF] disabled:opacity-50">
              Fork
            </button>
          </div>
        </header>

        {note ? <p role="status" className="mt-5 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-[13px] text-[#A0A0A0]">{note}</p> : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)]">
            <div className="border-b border-[#2A2A2A] px-4 py-4 text-[14px] font-semibold text-[#F0F0F0]">Versions</div>
            <div className="max-h-[520px] overflow-y-auto">
              {versions.length ? versions.map((version, index) => {
                const active = version.id === selectedVersion?.id;
                const versionNumber = versions.length - index;
                return (
                  <button key={version.id} type="button" onClick={() => setSelectedId(version.id)} className={`w-full border-b border-[#2A2A2A] px-4 py-4 text-left last:border-0 ${active ? "border-l-[3px] border-l-[#2067FF] bg-[#1A2A4A]" : "hover:bg-[#242424]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#F0F0F0]">Version {versionNumber}</p>
                        <p className="mt-1 truncate text-[12px] text-[#A0A0A0]">{version.commit_message || "Untitled commit"}</p>
                        <p className="mt-1 text-[11px] text-[#606060]">{formatDate(version.created_at)}</p>
                      </div>
                      {version.release_label ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${releaseLabelClassName(version.release_label)}`}>{version.release_label}</span> : null}
                    </div>
                  </button>
                );
              }) : <p className="px-4 py-6 text-[13px] text-[#A0A0A0]">No versions yet.</p>}
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] px-5 py-4">
              <div>
                <p className="text-[14px] font-semibold text-[#F0F0F0]">prompt.md</p>
                {selectedVersion?.release_label ? <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${releaseLabelClassName(selectedVersion.release_label)}`}>{selectedVersion.release_label}</span> : null}
              </div>
              {selectedVersion ? <p className="text-[11px] text-[#606060]">{selectedVersion.model} · Temperature {selectedVersion.temperature.toFixed(1)} · {selectedVersion.max_tokens} max tokens</p> : null}
            </div>
            <div className="min-h-[520px] bg-[#0F0F0F] p-6 md:p-8">
              {renderPromptContent(selectedVersion?.content ?? "")}
            </div>
          </section>
        </div>
      </div>
      {forkModalOpen ? (
        <ForkModal
          repo={{ id: repo.id, name: repo.name, description: repo.description, forkedRepoId }}
          loggedIn={isAuthenticated}
          busy={busy === "fork"}
          error={forkError}
          onClose={() => busy !== "fork" && setForkModalOpen(false)}
          onConfirm={forkRepo}
        />
      ) : null}
      {showForkToast ? <ForkSuccessToast /> : null}
    </main>
  );
}
