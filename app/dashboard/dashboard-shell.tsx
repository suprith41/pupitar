"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Repo = Pick<
  Database["public"]["Tables"]["repos"]["Row"],
  "id" | "name" | "description" | "is_public" | "created_at"
>;

type DashboardShellProps = {
  repos: Repo[];
  canCreateRepos: boolean;
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

// ─── Sidebar nav item ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", emoji: "🏠", href: "/dashboard" },
  { label: "Repos", emoji: "📁", href: "/dashboard/repos" },
  { label: "Playground", emoji: "🔬", href: "/dashboard/playground" },
  { label: "Analytics", emoji: "📊", href: "/dashboard/analytics" },
  { label: "Settings", emoji: "⚙️", href: "/dashboard/settings" }
] as const;

function NavItem({ label, emoji, href }: { label: string; emoji: string; href: string }) {
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
      <span style={{ fontSize: 15, lineHeight: 1 }}>{emoji}</span>
      {label}
    </Link>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
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
            fontFamily: T.dm,
            fontWeight: 700,
            fontSize: 16,
            color: T.accent,
            textDecoration: "none",
            lineHeight: 1
          }}
        >
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

// ─── Root Shell ────────────────────────────────────────────────────────────────

export default function DashboardShell({ repos, canCreateRepos, initialErrorMessage }: DashboardShellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user email
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserEmail(session?.user.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  // Client-side search filter
  const filteredRepos = searchQuery.trim()
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : repos;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: T.bg,
        overflow: "hidden"
      }}
    >
      {/* Sidebar */}
      <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0
        }}
      >
        {/* Top bar */}
        <MainTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewRepo={() => setIsModalOpen(true)}
          canCreateRepos={canCreateRepos}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px"
          }}
        >
          {filteredRepos.length === 0 ? (
            <EmptyState
              onNewRepo={() => setIsModalOpen(true)}
              canCreateRepos={canCreateRepos}
              errorMessage={
                searchQuery.trim()
                  ? `No repos match "${searchQuery}".`
                  : initialErrorMessage
              }
            />
          ) : (
            <RepoList repos={filteredRepos} />
          )}
        </div>
      </main>

      {/* Modal */}
      <NewRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canCreateRepos={canCreateRepos}
      />
    </div>
  );
}
