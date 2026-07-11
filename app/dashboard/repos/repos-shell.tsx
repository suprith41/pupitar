"use client";

import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { NewRepoModal, Sidebar } from "../dashboard-shell";

export type RepoEntry = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  versionCount: number;
  evalCount: number;
  requestCount: number;
  latestPromptContent: string | null;
  updatedAt: string;
};

type FilterValue = "all" | "public" | "private";
type ViewMode = "list" | "grid";

type ReposShellProps = {
  canCreateRepos: boolean;
  repos: RepoEntry[];
  initialNote?: string | null;
};

const T = {
  bg: "#FCFBF7",
  surface: "#FFFFFF",
  ink: "#000000",
  muted: "#706E6E",
  subtlest: "#9CA3AF",
  line: "#E1E4EA",
  accent: "#2067FF",
  accentHover: "#2F6BFF",
  accentLight: "#EEF4FF",
  hover: "#FCFBF7",
  chip: "#F5F5F5",
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  dm: '"DM Sans", Arial, sans-serif'
} as const;

const VIEW_STORAGE_KEY = "pupitar-repos-view";
const ICON_COLORS = ["#2067FF", "#1D7F4D", "#B42318", "#706E6E", "#9333EA"] as const;

function truncatePreview(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "No prompt versions yet.";
  return trimmed;
}

function getAccent(index: number) {
  return ICON_COLORS[index % ICON_COLORS.length];
}

function IconBadge({ repo, index }: { repo: RepoEntry; index: number }) {
  const color = getAccent(index);
  const letter = repo.name.trim().charAt(0).toUpperCase() || "R";

  return (
    <div
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: color,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: T.dm,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.02em"
      }}
    >
      {letter}
    </div>
  );
}

function Badge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 8px",
        borderRadius: 999,
        background: isPublic ? T.accentLight : T.chip,
        color: isPublic ? T.accent : T.muted,
        fontFamily: T.dm,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em"
      }}
    >
      {isPublic ? "PUBLIC" : "PRIVATE"}
    </span>
  );
}

function ViewToggle({
  view,
  onChange
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  const buttonStyle = (active: boolean): CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 6,
    border: `1px solid ${active ? T.accent : T.line}`,
    background: active ? T.accent : T.surface,
    color: active ? "#fff" : T.muted,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  });

  return (
    <div style={{ display: "inline-flex", gap: 8 }}>
      <button type="button" aria-label="List view" onClick={() => onChange("list")} style={buttonStyle(view === "list")}>
        <ListIcon />
      </button>
      <button type="button" aria-label="Grid view" onClick={() => onChange("grid")} style={buttonStyle(view === "grid")}>
        <GridIcon />
      </button>
    </div>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 6.5h10M5 10h10M5 13.5h10" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="12" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="12" width="5" height="5" rx="1" />
      <rect x="12" y="12" width="5" height="5" rx="1" />
    </svg>
  );
}

function FieldButton({
  children,
  onClick,
  kind = "primary",
  disabled = false
}: {
  children: string;
  onClick: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const styles: CSSProperties =
    kind === "ghost"
      ? {
          background: hovered ? "#F6F8FC" : T.surface,
          color: T.ink,
          border: `1px solid ${T.line}`
        }
      : {
          background: disabled ? "#A0B8FF" : hovered ? T.accentHover : T.accent,
          color: "#fff",
          border: "none"
        };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: 6,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.9 : 1,
        whiteSpace: "nowrap",
        ...styles
      }}
    >
      {children}
    </button>
  );
}

function RepoRow({
  repo,
  index,
  onClick
}: {
  repo: RepoEntry;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: "16px 20px",
        border: "none",
        borderBottom: `1px solid ${T.line}`,
        background: hovered ? T.hover : T.surface,
        cursor: "pointer",
        textAlign: "left"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
          <IconBadge repo={repo} index={index} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: T.dm,
                fontSize: 15,
                fontWeight: 600,
                color: T.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {repo.name}
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: T.dm,
                fontSize: 13,
                color: T.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {repo.description || "No description"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ fontFamily: T.dm, fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>{repo.versionCount} versions</div>
          <div style={{ fontFamily: T.dm, fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>{repo.evalCount} evals</div>
          <div style={{ fontFamily: T.dm, fontSize: 12, color: T.subtlest, whiteSpace: "nowrap" }}>
            {formatRelativeTime(repo.updatedAt)}
          </div>
          <Badge isPublic={repo.is_public} />
          <div
            style={{
              fontFamily: T.dm,
              fontSize: 13,
              fontWeight: 500,
              color: T.accent,
              opacity: hovered ? 1 : 0,
              transition: "opacity 120ms ease",
              whiteSpace: "nowrap"
            }}
          >
            Open →
          </div>
        </div>
      </div>
    </button>
  );
}

function RepoGridCard({
  repo,
  index,
  onClick
}: {
  repo: RepoEntry;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const preview = truncatePreview(repo.latestPromptContent ?? "");

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        minHeight: 260,
        padding: 20,
        borderRadius: 8,
        border: `1px solid ${hovered ? T.accent : T.line}`,
        background: T.surface,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: hovered ? "0 2px 8px rgba(32,103,255,0.08)" : "none"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <IconBadge repo={repo} index={index} />
          <div
            style={{
              fontFamily: T.dm,
              fontSize: 15,
              fontWeight: 600,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {repo.name}
          </div>
        </div>
        <Badge isPublic={repo.is_public} />
      </div>

      <div
        style={{
          marginTop: 8,
          fontFamily: T.dm,
          fontSize: 13,
          lineHeight: 1.5,
          color: T.muted,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 40
        }}
      >
        {repo.description || "No description"}
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontFamily: T.dm,
            fontSize: 10,
            fontWeight: 700,
            color: T.subtlest,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6
          }}
        >
          Latest prompt
        </div>
        <div
          style={{
            borderRadius: 4,
            background: "#F9FAFB",
            padding: "8px 12px",
            fontFamily: T.mono,
            fontSize: 11,
            color: T.muted,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            whiteSpace: "pre-wrap"
          }}
        >
          {preview}
        </div>
      </div>

      <div style={{ height: 1, background: T.line, margin: "12px 0 10px" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: T.dm, fontSize: 11, color: T.subtlest, whiteSpace: "nowrap" }}>
          {repo.versionCount} versions · {repo.evalCount} evals · {repo.requestCount} requests
        </div>
        <div style={{ fontFamily: T.dm, fontSize: 11, color: T.subtlest, whiteSpace: "nowrap" }}>
          Updated {formatRelativeTime(repo.updatedAt)}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  canCreateRepos,
  onCreateRepo,
  message
}: {
  canCreateRepos: boolean;
  onCreateRepo: () => void;
  message?: string | null;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: 380,
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: 48,
        textAlign: "center"
      }}
    >
      <div>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 18 }}>📁</div>
        <div style={{ fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>No repos yet.</div>
        <p style={{ margin: "10px 0 0", fontFamily: T.dm, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
          {message ?? "Create your first prompt repo to get started."}
        </p>
        <div style={{ marginTop: 16 }}>
          <FieldButton onClick={onCreateRepo} kind="primary" disabled={!canCreateRepos}>
            + Create repo
          </FieldButton>
        </div>
      </div>
    </div>
  );
}

export default function ReposShell({ canCreateRepos, repos, initialNote }: ReposShellProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      setView(stored);
    }
    setHydrated(true);

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view, hydrated]);

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return repos.filter((repo) => {
      const matchesQuery =
        !normalized ||
        repo.name.toLowerCase().includes(normalized) ||
        (repo.description ?? "").toLowerCase().includes(normalized);
      const matchesFilter =
        filter === "all" || (filter === "public" ? repo.is_public : !repo.is_public);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, repos]);

  const totalRepos = repos.length;
  const publicRepos = repos.filter((repo) => repo.is_public).length;
  const privateRepos = totalRepos - publicRepos;

  const hasRepos = repos.length > 0;
  const showEmpty = filteredRepos.length === 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <Sidebar
        userEmail={userEmail}
        onSignOut={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/");
        }}
      />

      <main style={{ flex: 1, minWidth: 0, padding: 32 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
              flexWrap: "wrap"
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: T.dm,
                fontSize: 22,
                fontWeight: 700,
                color: T.ink,
                lineHeight: 1.2
              }}
            >
              Repos
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repos..."
                style={{
                  width: 240,
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 6,
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  fontFamily: T.dm,
                  fontSize: 14,
                  color: T.ink,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterValue)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 6,
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  fontFamily: T.dm,
                  fontSize: 14,
                  color: T.ink,
                  outline: "none"
                }}
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>

              <ViewToggle view={view} onChange={setView} />

              <FieldButton onClick={() => setModalOpen(true)} kind="primary" disabled={!canCreateRepos}>
                + New repo
              </FieldButton>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap"
            }}
          >
            <div style={{ fontFamily: T.dm, fontSize: 13, color: T.muted }}>
              {totalRepos} repos total · {publicRepos} public · {privateRepos} private
            </div>
            <div style={{ fontFamily: T.dm, fontSize: 13, color: T.subtlest }}>
              {hasRepos ? `${filteredRepos.length} visible` : " "}
            </div>
          </div>

          {initialNote && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                border: `1px solid ${T.line}`,
                borderRadius: 8,
                background: T.surface,
                fontFamily: T.dm,
                fontSize: 13,
                color: T.muted
              }}
            >
              {initialNote}
            </div>
          )}

          {showEmpty ? (
            <EmptyState
              canCreateRepos={canCreateRepos}
              onCreateRepo={() => setModalOpen(true)}
              message={
                hasRepos
                  ? "No repos match your search or filter."
                  : canCreateRepos
                    ? "Create your first prompt repo to get started."
                    : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your frontend env, then restart."
              }
            />
          ) : view === "list" ? (
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden", background: T.surface }}>
              {filteredRepos.map((repo, index) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onClick={() => router.push(`/dashboard/${repo.id}`)}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16
              }}
            >
              {filteredRepos.map((repo, index) => (
                <RepoGridCard
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onClick={() => router.push(`/dashboard/${repo.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <NewRepoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} canCreateRepos={canCreateRepos} />
    </div>
  );
}
