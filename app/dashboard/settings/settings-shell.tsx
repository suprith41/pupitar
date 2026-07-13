"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { Sidebar } from "../dashboard-shell";
import type { ReactNode } from "react";
import { useDashboardTheme, type DashboardTheme } from "@/components/dashboard-theme-provider";
import { DashboardEmptyIllustration } from "@/components/dashboard-empty-illustration";

type Profile = {
  role: string | null;
  account_type: string | null;
  name: string | null;
  company_name: string | null;
};

type Deployment = {
  id: string;
  repo_id: string;
  repo_name: string;
  api_key: string;
};

export type SettingsData = {
  profile: Profile | null;
  email: string | null;
  deployments: Deployment[];
};

type SettingsShellProps = {
  canCreateRepos: boolean;
  data: SettingsData;
};

const T = {
  bg: "var(--dash-bg)",
  surface: "var(--dash-surface)",
  ink: "var(--dash-ink)",
  muted: "var(--dash-muted)",
  line: "var(--dash-line)",
  danger: "var(--dash-error)",
  dangerBg: "var(--dash-danger-soft)",
  accent: "var(--dash-accent)",
  accentHover: "var(--dash-accent-hover)",
  success: "var(--dash-success)",
  lineSoft: "var(--dash-elevated)",
  dm: '"DM Sans", Arial, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace'
} as const;

const ROLE_OPTIONS = [
  "Prompt Engineer",
  "AI/ML Engineer",
  "Software Developer",
  "Product Manager",
  "Founder / Indie Hacker",
  "Researcher",
  "Other"
] as const;

function formatApiKey(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function randomHex(bytes = 24) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function Section({
  title,
  titleColor = T.ink,
  children
}: {
  title: string;
  titleColor?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: "28px 0", borderTop: `1px solid ${T.line}` }}>
      <h2
        style={{
          margin: "0 0 24px",
          fontFamily: T.dm,
          fontSize: 18,
          fontWeight: 700,
          color: titleColor,
          lineHeight: 1.2
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        marginBottom: 8,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 500,
        color: T.ink
      }}
    >
      {children}
    </label>
  );
}

function TextButton({
  children,
  onClick,
  disabled = false,
  danger = false
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: "none",
        background: "transparent",
        color: danger ? T.danger : hovered ? T.ink : T.muted,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0
      }}
    >
      {children}
    </button>
  );
}

function Button({
  children,
  onClick,
  disabled = false,
  kind = "primary",
  id
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  kind?: "primary" | "ghost" | "danger";
  id?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const styles =
        kind === "danger"
      ? {
          background: T.danger,
          color: "#fff",
          border: "none"
        }
      : kind === "ghost"
        ? {
            background: hovered ? T.lineSoft : T.surface,
            color: T.ink,
            border: `1px solid ${T.line}`
          }
        : {
            background: hovered ? T.accentHover : T.accent,
            color: "#fff",
            border: "none"
          };

  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 38,
        padding: "0 16px",
        borderRadius: 6,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...styles
      }}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(2px)"
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: T.surface,
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: T.muted, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  value,
  onValueChange,
  onClose,
  onConfirm,
  loading
}: {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal open={open} title="Delete account" onClose={onClose}>
      <p style={{ margin: "0 0 14px", fontFamily: T.dm, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
        Type <strong style={{ color: T.ink }}>DELETE</strong> to confirm that you want to proceed.
      </p>
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="DELETE"
        style={{
          width: "100%",
          height: 40,
          padding: "0 12px",
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          fontFamily: T.dm,
          fontSize: 14,
          color: T.ink,
          outline: "none",
          marginBottom: 16
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button kind="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button kind="danger" onClick={onConfirm} disabled={loading || value !== "DELETE"}>
          Delete account
        </Button>
      </div>
    </Modal>
  );
}

export default function SettingsShell({ canCreateRepos: _canCreateRepos, data }: SettingsShellProps) {
  const router = useRouter();
  const { theme, setTheme } = useDashboardTheme();
  const [userEmail, setUserEmail] = useState<string | null>(data.email);
  const [role, setRole] = useState<string>(data.profile?.role ?? "");
  const [accountType, setAccountType] = useState<"solo" | "team">(
    data.profile?.account_type === "team" ? "team" : "solo"
  );
  const [displayName, setDisplayName] = useState<string>(
    data.profile?.name ?? data.profile?.company_name ?? ""
  );
  const [editingAccountType, setEditingAccountType] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [dangerMessage, setDangerMessage] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deployments, setDeployments] = useState(data.deployments);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserEmail(session?.user.email ?? data.email);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? data.email);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [data.email]);

  useEffect(() => {
    if (!profileMessage) return;
    const timer = window.setTimeout(() => setProfileMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [profileMessage]);

  useEffect(() => {
    if (!accountMessage) return;
    const timer = window.setTimeout(() => setAccountMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [accountMessage]);

  useEffect(() => {
    if (!copiedKeyId) return;
    const timer = window.setTimeout(() => setCopiedKeyId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [copiedKeyId]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleSaveProfile() {
    const supabase = createClient();
    setSaveLoading(true);
    setProfileMessage("");

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please log in again.");
      }

      const normalizedName = displayName.trim();
      const payload: Database["public"]["Tables"]["user_profiles"]["Insert"] =
        accountType === "solo"
          ? {
              id: user.id,
              role: role || null,
              account_type: "solo",
              name: normalizedName || null,
              company_name: null
            }
          : {
              id: user.id,
              role: role || null,
              account_type: "team",
              name: null,
              company_name: normalizedName || null
            };

      const { error } = await supabase.from("user_profiles").upsert(payload, { onConflict: "id" });
      if (error) {
        throw new Error(error.message);
      }

      setProfileMessage("Saved ✓");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!userEmail) return;
    const supabase = createClient();
    setPasswordLoading(true);
    setAccountMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
      if (error) {
        throw new Error(error.message);
      }
      setAccountMessage("Password reset email sent");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleCopyKey(key: string, id: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
  }

  async function handleRevokeKey(deploymentId: string) {
    const supabase = createClient();
    setRevokeLoadingId(deploymentId);
    try {
      const nextKey = randomHex(24);
      const { error } = await supabase.from("deployments").update({ api_key: nextKey }).eq("id", deploymentId);
      if (error) {
        throw new Error(error.message);
      }
      setDeployments((current) =>
        current.map((row) => (row.id === deploymentId ? { ...row, api_key: nextKey } : row))
      );
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Could not revoke key.");
    } finally {
      setRevokeLoadingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setDangerMessage("Contact support to delete your account");
      setDeleteOpen(false);
      setDeleteConfirm("");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, overflow: "hidden" }}>
      <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />

      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 24px 32px" }}>
          <div style={{ maxWidth: 640 }}>
            <h1
              style={{
                margin: "0 0 28px",
                fontFamily: T.dm,
                fontSize: 22,
                fontWeight: 700,
                color: T.ink,
                lineHeight: 1
              }}
            >
              Settings
            </h1>

            <Section title="Appearance">
              <p style={{ margin: "0 0 16px", fontFamily: T.dm, fontSize: 13, lineHeight: 1.6, color: T.muted }}>
                Choose a complete dashboard theme. Your selection is saved on this device.
              </p>
              <div className="dashboard-theme-options">
                {(["dark", "light"] as DashboardTheme[]).map((option) => {
                  const active = theme === option;
                  const dark = option === "dark";
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTheme(option)}
                      aria-pressed={active}
                      className="dashboard-theme-option"
                      style={{
                        border: `2px solid ${active ? T.accent : T.line}`,
                        background: T.surface,
                        color: T.ink
                      }}
                    >
                      <span
                        className="dashboard-theme-preview"
                        style={{
                          background: dark ? "#0d1117" : "#ffffff",
                          borderColor: dark ? "#30363d" : "#d0d7de"
                        }}
                      >
                        <span style={{ background: dark ? "#161b22" : "#f6f8fa", borderColor: dark ? "#30363d" : "#d0d7de" }} />
                        <span style={{ background: dark ? "#21262d" : "#ffffff", borderColor: dark ? "#30363d" : "#d0d7de" }} />
                        <span style={{ background: dark ? "#2f81f7" : "#0969da" }} />
                      </span>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
                        <span style={{ fontFamily: T.dm, fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{option}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 11, color: active ? T.accent : T.muted }}>{active ? "ACTIVE" : "SELECT"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Profile">
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <Label htmlFor="settings-display-name">Display name</Label>
                  <input
                    id="settings-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      width: "100%",
                      height: 40,
                      padding: "10px 14px",
                      border: `1px solid ${T.line}`,
                      borderRadius: 6,
                      fontFamily: T.dm,
                      fontSize: 14,
                      color: T.ink,
                      background: T.surface,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="settings-role">Role</Label>
                  <select
                    id="settings-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: "100%",
                      height: 40,
                      padding: "10px 14px",
                      border: `1px solid ${T.line}`,
                      borderRadius: 6,
                      fontFamily: T.dm,
                      fontSize: 14,
                      color: role ? T.ink : T.muted,
                      background: T.surface,
                      outline: "none"
                    }}
                  >
                    <option value="">Select a role</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="settings-account-type">Account type</Label>
                  {!editingAccountType ? (
                    <div
                      id="settings-account-type"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        minHeight: 40,
                        padding: "10px 0"
                      }}
                    >
                      <span style={{ fontFamily: T.dm, fontSize: 14, color: T.ink }}>
                        {accountType === "team" ? "Team / Company" : "Solo builder"}
                      </span>
                      <TextButton onClick={() => setEditingAccountType(true)}>Edit</TextButton>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        border: `1px solid ${T.line}`,
                        borderRadius: 6,
                        padding: 14
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: T.dm, fontSize: 14 }}>
                        <input
                          type="radio"
                          checked={accountType === "solo"}
                          onChange={() => setAccountType("solo")}
                        />
                        Solo builder
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: T.dm, fontSize: 14 }}>
                        <input
                          type="radio"
                          checked={accountType === "team"}
                          onChange={() => setAccountType("team")}
                        />
                        Team / Company
                      </label>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <TextButton onClick={() => setEditingAccountType(false)}>Done</TextButton>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Button onClick={handleSaveProfile} disabled={saveLoading}>
                    Save changes
                  </Button>
                  {profileMessage && (
                    <span
                      style={{
                        fontFamily: T.dm,
                        fontSize: 14,
                        color: profileMessage === "Saved ✓" ? T.success : T.danger
                      }}
                    >
                      {profileMessage}
                    </span>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Account">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <Label htmlFor="settings-email">Email</Label>
                  <div id="settings-email" style={{ fontFamily: T.dm, fontSize: 14, color: T.muted }}>
                    {userEmail ?? "No email on file"}
                  </div>
                  <p style={{ margin: "6px 0 0", fontFamily: T.dm, fontSize: 13, color: T.muted }}>
                    Contact support to change your email
                  </p>
                </div>

                <div>
                  <Label htmlFor="settings-password">Password</Label>
                  <Button id="settings-password" onClick={handleResetPassword} kind="ghost" disabled={passwordLoading}>
                    Change password
                  </Button>
                </div>

                {accountMessage && (
                  <p style={{ margin: 0, fontFamily: T.dm, fontSize: 14, color: T.success }}>{accountMessage}</p>
                )}
              </div>
            </Section>

            <Section title="API Keys">
              <p style={{ margin: "0 0 16px", fontFamily: T.dm, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
                Use these keys to authenticate requests to your deployed prompt endpoints.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.deployments.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: 20,
                      border: `1px solid ${T.line}`,
                      borderRadius: 8,
                      background: T.surface,
                      fontFamily: T.dm,
                      fontSize: 14,
                      color: T.muted,
                      textAlign: "center"
                    }}
                  >
                    <DashboardEmptyIllustration kind="deployments" />
                    <span style={{ marginTop: 2 }}>No deployed API keys yet.</span>
                  </div>
                ) : (
                  data.deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 1fr auto auto",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        border: `1px solid ${T.line}`,
                        borderRadius: 8,
                        background: T.surface
                      }}
                    >
                      <div style={{ fontFamily: T.dm, fontSize: 14, fontWeight: 500, color: T.ink }}>
                        {deployment.repo_name}
                      </div>
                      <div style={{ fontFamily: T.mono, fontSize: 13, color: T.muted }}>
                        {formatApiKey(deployment.api_key)}
                      </div>
                      <Button onClick={() => void handleCopyKey(deployment.api_key, deployment.id)} kind="ghost">
                        {copiedKeyId === deployment.id ? "Copied" : "Copy"}
                      </Button>
                      <TextButton
                        onClick={() => void handleRevokeKey(deployment.id)}
                        disabled={revokeLoadingId === deployment.id}
                        danger
                      >
                        Revoke
                      </TextButton>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Danger Zone" titleColor={T.danger}>
              <div
                style={{
                  border: `1px solid ${T.danger}`,
                  background: T.dangerBg,
                  borderRadius: 8,
                  padding: 20
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
                  <div>
                    <div style={{ fontFamily: T.dm, fontSize: 14, fontWeight: 500, color: T.ink, marginBottom: 6 }}>
                      Delete account
                    </div>
                    <p style={{ margin: 0, fontFamily: T.dm, fontSize: 14, color: T.ink, lineHeight: 1.6 }}>
                      Permanently delete your account and all repos. This cannot be undone.
                    </p>
                  </div>
                  <Button kind="danger" onClick={() => setDeleteOpen(true)}>
                    Delete account
                  </Button>
                </div>
              </div>
              {dangerMessage && (
                <p style={{ margin: "14px 0 0", fontFamily: T.dm, fontSize: 14, color: T.success }}>
                  {dangerMessage}
                </p>
              )}
            </Section>
          </div>
        </div>
      </main>

      <DeleteConfirmModal
        open={deleteOpen}
        value={deleteConfirm}
        onValueChange={setDeleteConfirm}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteConfirm("");
        }}
        onConfirm={() => void handleDeleteConfirm()}
        loading={deleteLoading}
      />
    </div>
  );
}
