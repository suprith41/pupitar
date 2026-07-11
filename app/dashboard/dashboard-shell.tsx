"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ComponentType, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { PupitarLogo } from "@/components/logo";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Repo = Pick<
  Database["public"]["Tables"]["repos"]["Row"],
  "id" | "name" | "description" | "is_public" | "created_at"
>;

type RequestLogRow = Pick<
  Database["public"]["Tables"]["request_logs"]["Row"],
  "repo_id" | "latency_ms" | "token_count" | "created_at" | "status"
>;

type EvalRunRow = Pick<
  Database["public"]["Tables"]["eval_runs"]["Row"],
  "repo_id" | "score" | "total" | "created_at"
>;

type PromptVersionRow = Pick<
  Database["public"]["Tables"]["prompt_versions"]["Row"],
  "repo_id" | "created_at"
>;

type DashboardShellProps = {
  repos: Repo[];
  canCreateRepos: boolean;
  profileName?: string | null;
  profileEmail?: string | null;
  requestLogs?: RequestLogRow[];
  evalRuns?: EvalRunRow[];
  promptVersions?: PromptVersionRow[];
  initialErrorMessage?: string;
};

// ─── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg: "#FCFBF7",
  surface: "#FFFFFF",
  ink: "#000000",
  muted: "#706E6E",
  line: "#E1E4EA",
  accent: "#2067FF",
  accentHover: "#2F6BFF",
  accentLight: "#EEF4FF",
  hover: "#F5F5F5",
  error: "#B42318",
  success: "#1D7F4D",
  dm: '"DM Sans", Arial, sans-serif'
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getEmailInitial(email: string | null) {
  const ch = email?.trim().charAt(0) ?? "";
  return ch ? ch.toUpperCase() : "U";
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function startOfUtcDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isWithinRange(value: string, rangeDays: number | null) {
  if (rangeDays == null) return true;
  const day = startOfUtcDay(value);
  const now = startOfUtcDay(new Date());
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
  return day >= start && day <= now;
}

function timeAgo(date: string | null) {
  if (!date) return "—";
  return formatRelativeTime(date);
}

function getSparklinePoints(values: number[], width = 120, height = 28) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M3.5 8.5v7a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-7M2 9.5l7.3-6a1 1 0 011.4 0l7.3 6M7.5 17v-4.5a1 1 0 011-1h3a1 1 0 011 1V17" />
    </svg>
  );
}

function ReposIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M2.5 5.5a1.5 1.5 0 011.5-1.5h3.3a1.5 1.5 0 011.1.5l1.2 1.5H16a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H4a1.5 1.5 0 01-1.5-1.5v-9z" />
    </svg>
  );
}

function PlaygroundIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M7.5 2.5h5M7.5 2.5v5L3.4 15.6A1.5 1.5 0 004.7 17.5h10.6a1.5 1.5 0 001.3-1.9L12.5 7.5V2.5M5.5 13.5h9" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M15.5 16.5V9.5m-5.5 7V3.5m-5.5 13v-6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M8.7 2.7h2.6l.4 1.9c.3.1.7.3 1 .5l1.8-1 1.8 1.8-1 1.8c.2.3.4.7.5 1l1.9.4v2.6l-1.9.4c-.1.3-.3.7-.5 1l1 1.8-1.8 1.8-1.8-1c-.3.2-.7.4-1 .5l-.4 1.9H8.7l-.4-1.9c-.3-.1-.7-.3-1-.5l-1.8 1-1.8-1.8 1-1.8c-.2-.3-.4-.7-.5-1l-1.9-.4V8.7l1.9-.4c.1-.3.3-.7.5-1l-1-1.8 1.8-1.8 1.8 1c.3-.2.7-.4 1-.5l.4-1.9z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

// ─── Sidebar nav item ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, href: "/dashboard" },
  { label: "Repos", icon: ReposIcon, href: "/dashboard/repos" },
  { label: "Playground", icon: PlaygroundIcon, href: "/dashboard/playground" },
  { label: "Analytics", icon: AnalyticsIcon, href: "/dashboard/analytics" },
  { label: "Settings", icon: SettingsIcon, href: "/dashboard/settings" }
];

function NavItem({ label, icon: Icon, href }: { label: string; icon: ComponentType; href: string }) {
  const pathname = usePathname();
  // Home is active when exactly on /dashboard; others match prefix
  const isActive =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 36,
        padding: "0 12px",
        margin: "2px 8px",
        borderRadius: 6,
        textDecoration: "none",
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? T.accent : T.muted,
        background: isActive ? T.accentLight : hovered ? T.hover : "transparent",
        transition: "background 150ms ease, color 150ms ease",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, flexShrink: 0 }}>
        <Icon />
      </span>
      {label}
    </Link>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  userEmail,
  onSignOut
}: {
  userEmail: string | null;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (!menuOpen) return;
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: T.surface,
        borderRight: `1px solid ${T.line}`,
        overflow: "hidden"
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: `1px solid ${T.line}`
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: T.dm,
            fontWeight: 700,
            fontSize: 16,
            color: T.accent,
            textDecoration: "none",
            lineHeight: 1
          }}
        >
          <PupitarLogo size={18} />
          Pupitar
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 8, overflow: "hidden" }}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* User row */}
      <div
        style={{
          borderTop: `1px solid ${T.line}`,
          padding: "12px 12px 16px"
        }}
      >
        <div ref={menuRef} style={{ position: "relative" }}>
          {/* Dropdown */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: T.surface,
                border: `1px solid ${T.line}`,
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 50
              }}
            >
              <p
                style={{
                  padding: "10px 12px 6px",
                  fontFamily: T.dm,
                  fontSize: 12,
                  color: T.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderBottom: `1px solid ${T.line}`,
                  margin: 0
                }}
              >
                {userEmail ?? "Signed in"}
              </p>
              <DropdownItem
                label="Settings"
                color={T.ink}
                onClick={() => setMenuOpen(false)}
              />
              <DropdownItem
                label="Log out"
                color={T.error}
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
              />
            </div>
          )}

          {/* Trigger row */}
          <button
            type="button"
            id="dash-user-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            onMouseEnter={() => setMenuHovered(true)}
            onMouseLeave={() => setMenuHovered(false)}
            aria-label="Open account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 6px",
              borderRadius: 6,
              border: "none",
              background: menuHovered ? T.hover : "transparent",
              cursor: "pointer",
              transition: "background 150ms ease",
              textAlign: "left"
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: T.accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: T.dm,
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0
              }}
            >
              {getEmailInitial(userEmail)}
            </div>

            {/* Email */}
            <span
              style={{
                flex: 1,
                fontFamily: T.dm,
                fontSize: 13,
                color: T.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.3
              }}
            >
              {userEmail ?? "Account"}
            </span>

            {/* Chevron up/down */}
            <span
              style={{
                fontFamily: T.dm,
                fontSize: 11,
                color: T.muted,
                flexShrink: 0,
                transform: menuOpen ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 200ms ease",
                lineHeight: 1
              }}
            >
              ↑
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function DropdownItem({
  label,
  color,
  onClick
}: {
  label: string;
  color: string;
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
        display: "block",
        width: "100%",
        padding: "9px 12px",
        background: hovered ? T.hover : "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: T.dm,
        fontSize: 14,
        color,
        textAlign: "left",
        transition: "background 120ms ease"
      }}
    >
      {label}
    </button>
  );
}

// ─── Top bar ───────────────────────────────────────────────────────────────────

function MainTopBar({
  searchQuery,
  onSearchChange,
  onNewRepo,
  canCreateRepos
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onNewRepo: () => void;
  canCreateRepos: boolean;
}) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px 16px",
        borderBottom: `1px solid ${T.line}`
      }}
    >
      <h1
        style={{
          fontFamily: T.dm,
          fontWeight: 700,
          fontSize: 22,
          color: T.ink,
          margin: 0,
          lineHeight: 1
        }}
      >
        Your Repos
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Search */}
        <input
          id="dash-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search repos..."
          style={{
            height: 36,
            padding: "0 12px",
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            background: T.surface,
            fontFamily: T.dm,
            fontSize: 14,
            color: T.ink,
            outline: "none",
            width: 200,
            transition: "border-color 150ms ease"
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
          onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
        />

        {/* New repo */}
        <button
          id="dash-new-repo-btn"
          type="button"
          onClick={onNewRepo}
          disabled={!canCreateRepos}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            height: 36,
            padding: "0 14px",
            background: !canCreateRepos ? "#A0B8FF" : btnHovered ? T.accentHover : T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontFamily: T.dm,
            fontWeight: 700,
            fontSize: 14,
            cursor: !canCreateRepos ? "not-allowed" : "pointer",
            transition: "background 150ms ease",
            whiteSpace: "nowrap"
          }}
        >
          + New repo
        </button>
      </div>
    </div>
  );
}

// ─── Repo list ─────────────────────────────────────────────────────────────────

function RepoRow({ repo, isFirst }: { repo: Repo; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      id={`dash-repo-${repo.id}`}
      onClick={() => router.push(`/dashboard/${repo.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/${repo.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 20px",
        background: hovered ? "#FAFAFA" : T.surface,
        borderTop: isFirst ? "none" : `1px solid ${T.line}`,
        cursor: "pointer",
        transition: "background 120ms ease"
      }}
    >
      {/* Left: icon + name + description */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>📁</span>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: T.dm,
              fontWeight: 600,
              fontSize: 15,
              color: T.ink,
              margin: "0 0 3px 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {repo.name}
          </p>
          <p
            style={{
              fontFamily: T.dm,
              fontSize: 14,
              color: T.muted,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {repo.description || "No description"}
          </p>
        </div>
      </div>

      {/* Right: badge + time + open link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0
        }}
      >
        {/* Public / Private badge */}
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            fontFamily: T.dm,
            fontSize: 11,
            fontWeight: 500,
            background: repo.is_public ? T.accentLight : T.hover,
            color: repo.is_public ? T.accent : T.muted
          }}
        >
          {repo.is_public ? "Public" : "Private"}
        </span>

        {/* Timestamp */}
        <span
          style={{
            fontFamily: T.dm,
            fontSize: 12,
            color: T.muted,
            whiteSpace: "nowrap"
          }}
        >
          {formatRelativeTime(repo.created_at)}
        </span>

        {/* Open link — visible on hover */}
        <span
          style={{
            fontFamily: T.dm,
            fontSize: 13,
            fontWeight: 500,
            color: T.accent,
            opacity: hovered ? 1 : 0,
            transition: "opacity 150ms ease",
            whiteSpace: "nowrap"
          }}
        >
          Open →
        </span>
      </div>
    </div>
  );
}

function RepoList({ repos }: { repos: Repo[] }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        overflow: "hidden"
      }}
    >
      {repos.map((repo, i) => (
        <RepoRow key={repo.id} repo={repo} isFirst={i === 0} />
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  onNewRepo,
  canCreateRepos,
  errorMessage
}: {
  onNewRepo: () => void;
  canCreateRepos: boolean;
  errorMessage?: string;
}) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        minHeight: 360,
        textAlign: "center"
      }}
    >
      <span style={{ fontSize: 48, lineHeight: 1 }}>📝</span>
      <p
        style={{
          fontFamily: T.dm,
          fontWeight: 700,
          fontSize: 20,
          color: T.ink,
          margin: 0
        }}
      >
        {canCreateRepos ? "No repos yet." : "Connect Supabase to enable repos."}
      </p>
      <p
        style={{
          fontFamily: T.dm,
          fontSize: 14,
          color: T.muted,
          margin: "0 0 8px",
          maxWidth: 340,
          lineHeight: 1.6
        }}
      >
        {errorMessage
          ? errorMessage
          : canCreateRepos
          ? "Create your first prompt repo to get started."
          : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your frontend env, then restart."}
      </p>
      <button
        id="dash-empty-new-repo-btn"
        type="button"
        onClick={onNewRepo}
        disabled={!canCreateRepos}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        style={{
          padding: "10px 20px",
          background: !canCreateRepos ? "#A0B8FF" : btnHovered ? T.accentHover : T.accent,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontFamily: T.dm,
          fontWeight: 700,
          fontSize: 14,
          cursor: !canCreateRepos ? "not-allowed" : "pointer",
          transition: "background 150ms ease"
        }}
      >
        + New repo
      </button>
    </div>
  );
}

// ─── New Repo Modal ────────────────────────────────────────────────────────────

export function NewRepoModal({
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
  const [submitHovered, setSubmitHovered] = useState(false);
  const [cancelHovered, setCancelHovered] = useState(false);

  function resetAndClose() {
    setName("");
    setDescription("");
    setIsPublic(false);
    setError("");
    onClose();
  }

  if (!isOpen) return null;

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
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      setError("Please log in again.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("repos")
      .insert({
        owner_id: user.id,
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    background: T.surface,
    fontFamily: T.dm,
    fontSize: 14,
    color: T.ink,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 150ms ease"
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(2px)"
      }}
      onClick={(e) => e.target === e.currentTarget && resetAndClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: T.surface,
          borderRadius: 12,
          padding: 32,
          boxSizing: "border-box",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24
          }}
        >
          <h2
            id="modal-heading"
            style={{
              fontFamily: T.dm,
              fontWeight: 700,
              fontSize: 20,
              color: T.ink,
              margin: 0
            }}
          >
            Create a new repo
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: T.dm,
              fontSize: 13,
              color: T.muted,
              padding: "2px 6px"
            }}
          >
            ✕
          </button>
        </div>

        <form style={{ display: "flex", flexDirection: "column", gap: 18 }} onSubmit={onSubmit}>
          {/* Name */}
          <div>
            <label
              htmlFor="modal-repo-name"
              style={{
                display: "block",
                fontFamily: T.dm,
                fontSize: 13,
                fontWeight: 500,
                color: T.ink,
                marginBottom: 6
              }}
            >
              Name <span style={{ color: T.error }}>*</span>
            </label>
            <input
              id="modal-repo-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-prompt-repo"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="modal-repo-desc"
              style={{
                display: "block",
                fontFamily: T.dm,
                fontSize: 13,
                fontWeight: 500,
                color: T.ink,
                marginBottom: 6
              }}
            >
              Description{" "}
              <span style={{ fontWeight: 400, color: T.muted }}>(optional)</span>
            </label>
            <textarea
              id="modal-repo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: 88,
                resize: "none",
                lineHeight: 1.5
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
          </div>

          {/* Visibility toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              border: `1px solid ${T.line}`,
              borderRadius: 6
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: T.dm,
                  fontSize: 14,
                  fontWeight: 500,
                  color: T.ink,
                  margin: "0 0 2px"
                }}
              >
                {isPublic ? "Public" : "Private"}
              </p>
              <p
                style={{
                  fontFamily: T.dm,
                  fontSize: 12,
                  color: T.muted,
                  margin: 0
                }}
              >
                Visibility
              </p>
            </div>
            <button
              type="button"
              id="modal-visibility-toggle"
              onClick={() => setIsPublic((v) => !v)}
              aria-pressed={isPublic}
              style={{
                position: "relative",
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: isPublic ? T.accent : T.line,
                cursor: "pointer",
                transition: "background 200ms ease",
                flexShrink: 0
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: isPublic ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  transition: "left 200ms ease"
                }}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p
              role="alert"
              style={{
                fontFamily: T.dm,
                fontSize: 13,
                color: T.error,
                margin: "0"
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="modal-create-repo-btn"
            type="submit"
            disabled={isSubmitting || !canCreateRepos}
            onMouseEnter={() => setSubmitHovered(true)}
            onMouseLeave={() => setSubmitHovered(false)}
            style={{
              width: "100%",
              padding: "13px",
              background:
                isSubmitting || !canCreateRepos
                  ? "#A0B8FF"
                  : submitHovered
                  ? T.accentHover
                  : T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontFamily: T.dm,
              fontWeight: 700,
              fontSize: 15,
              cursor: isSubmitting || !canCreateRepos ? "not-allowed" : "pointer",
              transition: "background 150ms ease"
            }}
          >
            {isSubmitting ? "Creating…" : canCreateRepos ? "Create repo" : "Configure Supabase"}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={resetAndClose}
            onMouseEnter={() => setCancelHovered(true)}
            onMouseLeave={() => setCancelHovered(false)}
            style={{
              width: "100%",
              padding: "12px",
              background: "transparent",
              color: cancelHovered ? T.ink : T.muted,
              border: `1px solid ${cancelHovered ? T.ink : T.line}`,
              borderRadius: 6,
              fontFamily: T.dm,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "color 150ms ease, border-color 150ms ease",
              marginTop: -8
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Home dashboard UI ────────────────────────────────────────────────────────

const HOME_RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last month", value: 30 },
  { label: "All time", value: null }
] as const;

function RangePill({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        border: `1px solid ${active ? T.accent : T.line}`,
        background: active ? T.accent : T.surface,
        color: active ? "#fff" : T.muted,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  children,
  valueColor
}: {
  title: string;
  value: string;
  subtitle: string;
  children?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: "20px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}
    >
      <p style={{ margin: 0, fontFamily: T.dm, fontSize: 13, color: T.muted }}>{title}</p>
      <div
        style={{
          marginTop: 10,
          fontFamily: T.dm,
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          color: valueColor ?? T.ink
        }}
      >
        {value}
      </div>
      <p style={{ margin: "8px 0 0", fontFamily: T.dm, fontSize: 13, color: T.muted }}>{subtitle}</p>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick
}: {
  icon: string;
  title: string;
  description: string;
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
        textAlign: "left",
        padding: 20,
        borderRadius: 8,
        border: `1px solid ${hovered ? T.accent : T.line}`,
        background: hovered ? T.bg : T.surface,
        cursor: "pointer"
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: T.dm, fontSize: 15, fontWeight: 600, color: T.ink }}>{title}</div>
      <p style={{ margin: "6px 0 0", fontFamily: T.dm, fontSize: 13, lineHeight: 1.5, color: T.muted }}>
        {description}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, fontFamily: T.dm, color: T.muted }}>
        ↗
      </div>
    </button>
  );
}

function RepoBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 8px",
        borderRadius: 999,
        border: `1px solid ${isPublic ? "#C7D7FF" : T.line}`,
        background: isPublic ? "#EEF4FF" : "#F8F9FB",
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

function RepoCard({
  repo,
  versions,
  evals,
  updatedAt,
  onClick
}: {
  repo: Repo;
  versions: number;
  evals: number;
  updatedAt: string | null;
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
        minHeight: 162,
        padding: 20,
        borderRadius: 8,
        border: `1px solid ${hovered ? T.accent : T.line}`,
        background: T.surface,
        cursor: "pointer",
        textAlign: "left"
      }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
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
        <RepoBadge isPublic={repo.is_public} />
      </div>

      <div
        style={{
          marginTop: 6,
          fontFamily: T.dm,
          fontSize: 13,
          lineHeight: 1.5,
          color: T.muted,
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
      >
        {repo.description || "No description"}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 28 }}>
        <div style={{ fontFamily: T.dm, fontSize: 12, color: "#9CA3AF" }}>
          Updated {updatedAt ? timeAgo(updatedAt) : "—"}
        </div>
        <div style={{ fontFamily: T.dm, fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>
          {versions} versions · {evals} evals
        </div>
      </div>
    </button>
  );
}

function Sparkline({
  values
}: {
  values: number[];
}) {
  if (!values.length) {
    return (
      <div style={{ marginTop: 14, fontFamily: T.dm, fontSize: 12, color: T.muted }}>
        No data
      </div>
    );
  }

  return (
    <svg width="100%" height="28" viewBox="0 0 120 28" preserveAspectRatio="none" style={{ marginTop: 10 }}>
      <path d={getSparklinePoints(values)} fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Root Shell ────────────────────────────────────────────────────────────────

export default function DashboardShell({
  repos,
  canCreateRepos,
  profileName,
  profileEmail,
  requestLogs = [],
  evalRuns = [],
  promptVersions = [],
  initialErrorMessage
}: DashboardShellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(profileEmail ?? null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [range, setRange] = useState<number | null>(30);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserEmail(session?.user.email ?? profileEmail ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? profileEmail ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [profileEmail]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("pupitar-dashboard-welcome-dismissed");
    setWelcomeDismissed(dismissed === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pupitar-dashboard-welcome-dismissed", welcomeDismissed ? "1" : "0");
  }, [welcomeDismissed]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const repoSummaries = useMemo(() => {
    const requestMap = new Map<string, RequestLogRow[]>();
    const evalMap = new Map<string, EvalRunRow[]>();
    const versionMap = new Map<string, PromptVersionRow[]>();

    for (const log of requestLogs) {
      const bucket = requestMap.get(log.repo_id) ?? [];
      bucket.push(log);
      requestMap.set(log.repo_id, bucket);
    }

    for (const row of evalRuns) {
      const bucket = evalMap.get(row.repo_id) ?? [];
      bucket.push(row);
      evalMap.set(row.repo_id, bucket);
    }

    for (const row of promptVersions) {
      const bucket = versionMap.get(row.repo_id) ?? [];
      bucket.push(row);
      versionMap.set(row.repo_id, bucket);
    }

    return repos
      .map((repo) => {
        const repoRequests = requestMap.get(repo.id) ?? [];
        const repoEvals = evalMap.get(repo.id) ?? [];
        const repoVersions = versionMap.get(repo.id) ?? [];
        const latestRequest = repoRequests.reduce(
          (latest, row) => (row.created_at > latest ? row.created_at : latest),
          repo.created_at
        );
        const latestEval = repoEvals.reduce(
          (latest, row) => (row.created_at > latest ? row.created_at : latest),
          repo.created_at
        );
        const latestVersion = repoVersions.reduce(
          (latest, row) => (row.created_at > latest ? row.created_at : latest),
          repo.created_at
        );
        const updatedAt = [repo.created_at, latestRequest, latestEval, latestVersion].reduce(
          (latest, current) => (current > latest ? current : latest),
          repo.created_at
        );

        return {
          ...repo,
          requests: repoRequests.length,
          versions: repoVersions.length,
          evals: repoEvals.length,
          updatedAt
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [repos, requestLogs, evalRuns, promptVersions]);

  const latestActiveRepo = repoSummaries[0] ?? null;
  const filteredRequests = useMemo(
    () => requestLogs.filter((row) => isWithinRange(row.created_at, range)),
    [requestLogs, range]
  );
  const filteredEvals = useMemo(
    () => evalRuns.filter((row) => isWithinRange(row.created_at, range)),
    [evalRuns, range]
  );
  const selectedRangeLabel = HOME_RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "Last month";

  const requestCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredRequests) {
      const day = row.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, count]) => count);
  }, [filteredRequests]);

  const totalRequests = filteredRequests.length;
  const avgLatency =
    filteredRequests.length === 0
      ? null
      : filteredRequests.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0) / filteredRequests.length;
  const totalScore = filteredEvals.reduce((sum, row) => sum + row.score, 0);
  const totalCases = filteredEvals.reduce((sum, row) => sum + row.total, 0);
  const evalPassRate = totalCases > 0 ? (totalScore / totalCases) * 100 : null;
  const tokenTotal = filteredRequests.reduce((sum, row) => sum + (row.token_count ?? 0), 0);
  const tokenAvg = filteredRequests.length > 0 ? tokenTotal / filteredRequests.length : null;

  const displayName = profileName?.trim() || userEmail || "Account";
  const visibleRepos = repoSummaries.slice(0, 4);

  function openMostActiveRepoEvaluations() {
    if (!latestActiveRepo) {
      router.push("/dashboard");
      return;
    }
    router.push(`/dashboard/${latestActiveRepo.id}#evals`);
  }

  function openRepo(repoId: string) {
    router.push(`/dashboard/${repoId}`);
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: T.bg,
        overflow: "hidden"
      }}
    >
      <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflowY: "auto"
        }}
      >
        <div style={{ padding: "24px" }}>
          <div style={{ maxWidth: 1280 }}>
            {initialErrorMessage && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  color: T.muted,
                  fontFamily: T.dm,
                  fontSize: 13
                }}
              >
                {initialErrorMessage}
              </div>
            )}

            {!welcomeDismissed && (
              <section
                style={{
                  position: "relative",
                  width: "100%",
                  border: `1px solid ${T.line}`,
                  borderRadius: 12,
                  background: T.surface,
                  padding: "32px 40px",
                  marginBottom: 24
                }}
              >
                <button
                  type="button"
                  onClick={() => setWelcomeDismissed(true)}
                  aria-label="Dismiss welcome card"
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 20,
                    border: "none",
                    background: "transparent",
                    color: T.muted,
                    fontFamily: T.dm,
                    fontSize: 22,
                    cursor: "pointer",
                    lineHeight: 1
                  }}
                >
                  ×
                </button>

                <div style={{ maxWidth: 720 }}>
                  <p style={{ margin: 0, fontFamily: T.dm, fontSize: 16, fontWeight: 400, color: T.muted }}>
                    Welcome back,
                  </p>
                  <h1 style={{ margin: "6px 0 0", fontFamily: T.dm, fontSize: 28, fontWeight: 700, color: T.ink }}>
                    {displayName}
                  </h1>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                    marginTop: 24
                  }}
                >
                  <QuickActionCard
                    icon="✏️"
                    title="Create a prompt"
                    description="Start with a prompt and test it in the playground"
                    onClick={() => setIsModalOpen(true)}
                  />
                  <QuickActionCard
                    icon="🧪"
                    title="Run an evaluation"
                    description="Measure quality on your prompt and compare versions"
                    onClick={openMostActiveRepoEvaluations}
                  />
                  <QuickActionCard
                    icon="📊"
                    title="View analytics"
                    description="See request volume, latency, and eval pass rates"
                    onClick={() => router.push("/dashboard/analytics")}
                  />
                  <QuickActionCard
                    icon="🔬"
                    title="Go to playground"
                    description="Experiment with prompts and compare models side by side"
                    onClick={() => router.push("/dashboard/playground")}
                  />
                </div>
              </section>
            )}

            <section style={{ paddingTop: 24, borderTop: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div style={{ fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>Stats</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {HOME_RANGE_OPTIONS.map((option) => (
                    <RangePill
                      key={String(option.label)}
                      active={range === option.value}
                      onClick={() => setRange(option.value)}
                    >
                      {option.label}
                    </RangePill>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 16
                }}
              >
                <StatCard title="Requests" value={formatCompactNumber(totalRequests)} subtitle={`Total in ${selectedRangeLabel.toLowerCase()}`}>
                  <Sparkline values={requestCountsByDay} />
                </StatCard>
                <StatCard title="Latency" value={avgLatency == null ? "—" : `${Math.round(avgLatency)} ms`} subtitle="Avg response time" />
                <StatCard
                  title="Eval Pass Rate"
                  value={evalPassRate == null ? "—" : `${Math.round(evalPassRate)}%`}
                  subtitle="Across eval runs"
                  valueColor={T.success}
                />
                <StatCard
                  title="Tokens"
                  value={filteredRequests.length === 0 ? "—" : formatCompactNumber(tokenTotal)}
                  subtitle={tokenAvg == null ? "Avg per request" : `Avg: ${Math.round(tokenAvg)} per request`}
                />
              </div>
            </section>

            <section style={{ paddingTop: 24, marginTop: 24, borderTop: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div style={{ fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>Your Repos</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: T.accent,
                      fontFamily: T.dm,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    + New repo
                  </button>
                  <Link
                    href="/dashboard"
                    style={{
                      fontFamily: T.dm,
                      fontSize: 14,
                      fontWeight: 500,
                      color: T.muted
                    }}
                  >
                    View all →
                  </Link>
                </div>
              </div>

              {visibleRepos.length === 0 ? (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minHeight: 320,
                    border: `1px solid ${T.line}`,
                    borderRadius: 8,
                    background: T.surface
                  }}
                >
                  <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                    <div style={{ fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>No repos yet.</div>
                    <p style={{ margin: "10px 0 18px", fontFamily: T.dm, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
                      Create your first prompt repo to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      style={{
                        height: 38,
                        padding: "0 16px",
                        border: "none",
                        borderRadius: 6,
                        background: T.accent,
                        color: "#fff",
                        fontFamily: T.dm,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      + Create repo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16
                  }}
                >
                  {visibleRepos.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      versions={repo.versions}
                      evals={repo.evals}
                      updatedAt={repo.updatedAt}
                      onClick={() => openRepo(repo.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <NewRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canCreateRepos={canCreateRepos}
      />
    </div>
  );
}
