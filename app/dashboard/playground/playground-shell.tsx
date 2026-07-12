"use client";

import { createClient } from "@/lib/supabase/client";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../dashboard-shell";

type ModelChoice = "llama-3.3-70b-versatile" | "llama-3.1-8b-instant";
type MessageRole = "user" | "assistant";

type MessageTurn = {
  id: string;
  role: MessageRole;
  content: string;
};

type VariantState = {
  model: ModelChoice;
  temperature: number;
  maxTokens: number;
  systemMessage: string;
  userMessage: string;
  extraMessages: MessageTurn[];
  systemOpen: boolean;
  isRunning: boolean;
  response: string;
  error: string;
  latencyMs: number | null;
  tokenCount: number | null;
};

type PlaygroundShellProps = {
  canCreateRepos: boolean;
};

const T = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  ink: "#F0F0F0",
  muted: "#A0A0A0",
  line: "#2A2A2A",
  lineSoft: "#242424",
  accent: "#2067FF",
  accentHover: "#2F6BFF",
  accentLight: "#1A2A4A",
  ghost: "#242424",
  error: "#F87171",
  dm: '"DM Sans", Arial, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace'
} as const;

const MODEL_OPTIONS: ModelChoice[] = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

function blankVariant(): VariantState {
  return {
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    maxTokens: 512,
    systemMessage: "",
    userMessage: "",
    extraMessages: [],
    systemOpen: true,
    isRunning: false,
    response: "",
    error: "",
    latencyMs: null,
    tokenCount: null
  };
}

function copyVariant(base: VariantState): VariantState {
  return {
    ...base,
    extraMessages: base.extraMessages.map((turn) => ({ ...turn })),
    systemOpen: true,
    isRunning: false,
    response: "",
    error: "",
    latencyMs: null,
    tokenCount: null
  };
}

function formatLatency(ms: number | null) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatTokenCount(count: number | null) {
  if (count == null) return "";
  return `${count} tokens`;
}

function buildTestMessage(variant: VariantState) {
  const parts = [];

  if (variant.userMessage.trim()) {
    parts.push(`User: ${variant.userMessage.trim()}`);
  }

  for (const turn of variant.extraMessages) {
    if (turn.content.trim()) {
      parts.push(`${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content.trim()}`);
    }
  }

  return parts.join("\n\n");
}

function SectionLabel({
  children,
  onToggle,
  collapsed
}: {
  children: string;
  onToggle?: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      type={onToggle ? "button" : "button"}
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: onToggle ? "pointer" : "default",
        color: T.muted,
        fontFamily: T.dm,
        fontSize: 13,
        fontWeight: 500,
        margin: 0
      }}
    >
      <span>{children}</span>
      {onToggle && <span style={{ fontSize: 11, lineHeight: 1 }}>{collapsed ? "▸" : "▾"}</span>}
    </button>
  );
}

function AddButton({
  children,
  onClick,
  disabled = false
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
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
        height: 36,
        padding: "0 14px",
        border: `1px solid ${T.line}`,
        borderRadius: 6,
        background: hovered && !disabled ? T.lineSoft : T.surface,
        color: disabled ? T.muted : T.ink,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 400,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled = false
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
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
        height: 32,
        padding: "0 10px",
        border: "none",
        background: hovered && !disabled ? T.ghost : "transparent",
        color: disabled ? T.muted : T.ink,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 6
      }}
    >
      {children}
    </button>
  );
}

function OutputPill() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        padding: "0 10px",
        borderRadius: 999,
        background: T.ghost,
        color: T.muted,
        fontFamily: T.dm,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap"
      }}
    >
      Output type: Text
    </span>
  );
}

function PlaygroundPanel({
  variant,
  onChange,
  onAddMessage,
  onRun,
  onSave
}: {
  variant: VariantState;
  onChange: (patch: Partial<VariantState>) => void;
  onAddMessage: () => void;
  onRun: () => void;
  onSave: () => void;
}) {
  const topCellStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "12px 14px"
  };

  const textAreaStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    background: T.surface,
    fontFamily: T.mono,
    fontSize: 13,
    color: T.ink,
    resize: "vertical",
    outline: "none",
    lineHeight: 1.55,
    boxSizing: "border-box"
  };

  const responseBoxStyle: CSSProperties = {
    minHeight: 112,
    padding: 16,
    borderRadius: 6,
    border: `1px solid ${T.lineSoft}`,
    background: T.surface,
    fontFamily: T.mono,
    fontSize: 13,
    color: T.ink,
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
    overflowWrap: "anywhere"
  };

  return (
    <section
      style={{
        width: "100%",
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: 24,
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          overflow: "hidden",
          background: T.surface,
          marginBottom: 20
        }}
      >
        <div style={{ ...topCellStyle, borderRight: `1px solid ${T.line}` }}>
          <select
            value={variant.model}
            onChange={(e) => onChange({ model: e.target.value as ModelChoice })}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: T.ink,
              fontFamily: T.dm,
              fontSize: 14,
              outline: "none"
            }}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option} value={option} style={{ background: T.surface, color: T.ink }}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...topCellStyle, borderRight: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={variant.temperature}
              onChange={(e) => onChange({ temperature: Number(e.target.value) })}
              style={{
                flex: 1,
                accentColor: T.accent,
                cursor: "pointer"
              }}
            />
            <span
              style={{
                minWidth: 28,
                textAlign: "right",
                fontFamily: T.dm,
                fontSize: 14,
                color: T.ink
              }}
            >
              {variant.temperature.toFixed(1)}
            </span>
          </div>
        </div>

        <div style={topCellStyle}>
          <input
            type="number"
            min={1}
            step={1}
            value={variant.maxTokens}
            onChange={(e) => onChange({ maxTokens: Number(e.target.value) })}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: T.ink,
              fontFamily: T.dm,
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <SectionLabel
            collapsed={!variant.systemOpen}
            onToggle={() => onChange({ systemOpen: !variant.systemOpen })}
          >
            System message
          </SectionLabel>

          {variant.systemOpen && (
            <textarea
              value={variant.systemMessage}
              onChange={(e) => onChange({ systemMessage: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={5}
              style={{ ...textAreaStyle, minHeight: 120, marginTop: 8 }}
            />
          )}
        </div>

        <div>
          <SectionLabel>User</SectionLabel>
          <textarea
            value={variant.userMessage}
            onChange={(e) => onChange({ userMessage: e.target.value })}
            placeholder="Type your message here..."
            rows={4}
            style={{ ...textAreaStyle, minHeight: 80, marginTop: 8 }}
          />
        </div>

        {variant.extraMessages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {variant.extraMessages.map((turn, index) => (
              <div key={turn.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <SectionLabel>{turn.role === "assistant" ? "Assistant" : "User"}</SectionLabel>
                  <button
                    type="button"
                    onClick={() => {
                      const next = variant.extraMessages.filter((item) => item.id !== turn.id);
                      onChange({ extraMessages: next });
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: T.muted,
                      cursor: "pointer",
                      fontFamily: T.dm,
                      fontSize: 12,
                      fontWeight: 500,
                      padding: 0
                    }}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={turn.content}
                  onChange={(e) => {
                    const next = variant.extraMessages.map((item) =>
                      item.id === turn.id ? { ...item, content: e.target.value } : item
                    );
                    onChange({ extraMessages: next });
                  }}
                  placeholder={
                    turn.role === "assistant"
                      ? "Assistant reply for the next turn..."
                      : "User follow-up message..."
                  }
                  rows={index === variant.extraMessages.length - 1 ? 4 : 3}
                  style={{ ...textAreaStyle, minHeight: 72, marginTop: 8 }}
                />
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          <GhostButton onClick={onAddMessage}>+ Message</GhostButton>
          <GhostButton onClick={() => {}} disabled>
            + Tool
          </GhostButton>
          <OutputPill />
          <div style={{ marginLeft: "auto" }} />
          <button
            type="button"
            onClick={onRun}
            disabled={variant.isRunning}
            style={{
              height: 36,
              padding: "0 24px",
              background: variant.isRunning ? T.surface : T.ink,
              color: variant.isRunning ? T.ink : T.bg,
              border: "none",
              borderRadius: 6,
              fontFamily: T.dm,
              fontWeight: 700,
              fontSize: 14,
              cursor: variant.isRunning ? "wait" : "pointer"
            }}
          >
            {variant.isRunning ? "Running..." : "Run ▶"}
          </button>
        </div>

        <div style={responseBoxStyle}>
          {variant.error ? (
            <span style={{ color: T.error }}>{variant.error}</span>
          ) : variant.isRunning ? (
            "Running..."
          ) : variant.response ? (
            variant.response
          ) : (
            <span style={{ color: T.muted }}>Click run to generate</span>
          )}
        </div>

        {(variant.latencyMs != null || variant.tokenCount != null) && !variant.error && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {variant.latencyMs != null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 999,
                  background: T.ghost,
                  color: T.muted,
                  fontFamily: T.dm,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {formatLatency(variant.latencyMs)}
              </span>
            )}
            {variant.tokenCount != null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 999,
                  background: T.ghost,
                  color: T.muted,
                  fontFamily: T.dm,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {formatTokenCount(variant.tokenCount)}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onSave}
            style={{
              border: "none",
              background: "transparent",
              color: T.accent,
              fontFamily: T.dm,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              padding: "6px 0"
            }}
          >
            Save as repo →
          </button>
        </div>
      </div>
    </section>
  );
}

function SaveRepoModal({
  open,
  canCreateRepos,
  loading,
  error,
  initialPrompt,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  canCreateRepos: boolean;
  loading: boolean;
  error: string;
  initialPrompt: string;
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [cancelHovered, setCancelHovered] = useState(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="playground-save-heading"
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
          maxWidth: 480,
          background: T.surface,
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          boxSizing: "border-box"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            id="playground-save-heading"
            style={{
              fontFamily: T.dm,
              fontWeight: 700,
              fontSize: 20,
              color: T.ink,
              margin: 0
            }}
          >
            Create new repo from this prompt
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: T.muted,
              cursor: "pointer",
              fontFamily: T.dm,
              fontSize: 13
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            margin: "10px 0 20px",
            color: T.muted,
            fontFamily: T.dm,
            fontSize: 13,
            lineHeight: 1.5
          }}
        >
          This will create a new repo and seed its first prompt version with the current system message.
        </p>

        <div
          style={{
            border: `1px solid ${T.line}`,
            borderRadius: 8,
            padding: 12,
            background: T.bg,
            marginBottom: 18
          }}
        >
          <p style={{ margin: 0, fontFamily: T.dm, fontSize: 12, color: T.muted }}>Prompt preview</p>
          <pre
            style={{
              margin: "8px 0 0",
              whiteSpace: "pre-wrap",
              fontFamily: T.mono,
              fontSize: 12,
              lineHeight: 1.5,
              color: T.ink
            }}
          >
            {initialPrompt || " "}
          </pre>
        </div>

        <form
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSubmit();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label
              htmlFor="playground-repo-name"
              style={{
                display: "block",
                marginBottom: 6,
                color: T.ink,
                fontFamily: T.dm,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Name <span style={{ color: T.error }}>*</span>
            </label>
            <input
              id="playground-repo-name"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="my-prompt-repo"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                background: T.bg,
                fontFamily: T.dm,
                fontSize: 14,
                color: T.ink,
                outline: "none"
              }}
            />
          </div>

          <div>
            <label
              htmlFor="playground-repo-description"
              style={{
                display: "block",
                marginBottom: 6,
                color: T.ink,
                fontFamily: T.dm,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Description{" "}
              <span style={{ fontWeight: 400, color: T.muted }}>(optional)</span>
            </label>
            <textarea
              id="playground-repo-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                background: T.bg,
                fontFamily: T.dm,
                fontSize: 14,
                color: T.ink,
                outline: "none",
                resize: "vertical",
                minHeight: 88
              }}
            />
          </div>

          {error && (
            <p role="alert" style={{ margin: 0, color: T.error, fontFamily: T.dm, fontSize: 13 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !canCreateRepos}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width: "100%",
              height: 42,
              border: "none",
              borderRadius: 6,
              background: loading || !canCreateRepos ? T.accentLight : hovered ? T.accentHover : T.accent,
              color: "#fff",
              fontFamily: T.dm,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading || !canCreateRepos ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating…" : canCreateRepos ? "Create repo" : "Configure Supabase"}
          </button>

          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setCancelHovered(true)}
            onMouseLeave={() => setCancelHovered(false)}
            style={{
              width: "100%",
              height: 42,
              borderRadius: 6,
              border: `1px solid ${cancelHovered ? T.ink : T.line}`,
              background: "transparent",
              color: cancelHovered ? T.ink : T.muted,
              fontFamily: T.dm,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

function GenerationCard({
  title,
  variant
}: {
  title: string;
  variant: VariantState;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        background: T.surface,
        padding: 18
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10
        }}
      >
        <p style={{ margin: 0, fontFamily: T.dm, fontSize: 14, fontWeight: 700, color: T.ink }}>
          {title}
        </p>
        <span style={{ fontFamily: T.dm, fontSize: 12, color: T.muted }}>{variant.model}</span>
      </div>
      <div
        style={{
          minHeight: 140,
          border: `1px solid ${T.lineSoft}`,
          borderRadius: 6,
          padding: 14,
          background: T.surface,
          fontFamily: T.mono,
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: variant.error ? T.error : T.ink
        }}
      >
        {variant.error
          ? variant.error
          : variant.isRunning
            ? "Running..."
            : variant.response || "Click run to generate"}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {variant.latencyMs != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              padding: "0 8px",
              borderRadius: 999,
              background: T.ghost,
              color: T.muted,
              fontFamily: T.dm,
              fontSize: 12,
              fontWeight: 500
            }}
          >
            {formatLatency(variant.latencyMs)}
          </span>
        )}
        {variant.tokenCount != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              padding: "0 8px",
              borderRadius: 999,
              background: T.ghost,
              color: T.muted,
              fontFamily: T.dm,
              fontSize: 12,
              fontWeight: 500
            }}
          >
            {formatTokenCount(variant.tokenCount)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PlaygroundShell({ canCreateRepos }: PlaygroundShellProps) {
  const router = useRouter();
  const [variants, setVariants] = useState<[VariantState, VariantState | null]>([blankVariant(), null]);
  const [saveTargetIndex, setSaveTargetIndex] = useState<number | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const compareMode = Boolean(variants[1]);

  const visibleVariants = compareMode ? [variants[0], variants[1]!] : [variants[0]];

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserEmail(session?.user.email ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function updateVariant(index: number, patch: Partial<VariantState>) {
    setVariants((current) => {
      const next: [VariantState, VariantState | null] = [current[0], current[1] ? { ...current[1] } : null];
      if (index === 0) {
        next[0] = { ...next[0], ...patch };
      } else if (next[1]) {
        next[1] = { ...next[1], ...patch };
      }
      return next;
    });
  }

  function addVariant() {
    setVariants((current) => {
      if (current[1]) return current;
      return [current[0], copyVariant(current[0])];
    });
  }

  function addMessage(index: number) {
    setVariants((current) => {
      const next: [VariantState, VariantState | null] = [current[0], current[1] ? { ...current[1] } : null];
      const target = index === 0 ? next[0] : next[1];
      if (!target) return current;
      const role: MessageRole = target.extraMessages.length % 2 === 0 ? "assistant" : "user";
      const updated = {
        ...target,
        extraMessages: [
          ...target.extraMessages,
          {
            id: crypto.randomUUID(),
            role,
            content: ""
          }
        ]
      };
      if (index === 0) {
        next[0] = updated;
      } else {
        next[1] = updated;
      }
      return next;
    });
  }

  async function runVariant(index: number) {
    const variant = index === 0 ? variants[0] : variants[1];
    if (!variant) return;

    updateVariant(index, { isRunning: true, error: "", response: "", latencyMs: null, tokenCount: null });
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: variant.systemMessage,
          model: variant.model,
          temperature: variant.temperature,
          max_tokens: variant.maxTokens,
          test_message: buildTestMessage(variant)
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || "Playground request failed.");
      }

      const tokenCount =
        typeof payload?.output_tokens === "number"
          ? payload.output_tokens
          : typeof payload?.total_tokens === "number"
            ? payload.total_tokens
            : typeof payload?.response === "string"
              ? Math.max(1, Math.round(payload.response.length / 4))
              : null;

      updateVariant(index, {
        response: payload?.response ?? "",
        error: "",
        latencyMs: Math.round(performance.now() - startedAt),
        tokenCount
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "";
      updateVariant(index, {
        error:
          message === "Failed to fetch"
            ? "Could not reach the playground backend. Make sure FastAPI is running."
            : message || "Could not reach the playground backend. Make sure FastAPI is running."
      });
    } finally {
      updateVariant(index, { isRunning: false });
    }
  }

  async function runAll() {
    await Promise.all([runVariant(0), variants[1] ? runVariant(1) : Promise.resolve()]);
  }

  function openSaveModal(index: number) {
    setSaveTargetIndex(index);
    setSaveName("");
    setSaveDescription("");
    setSaveError("");
  }

  async function submitSave() {
    if (saveTargetIndex == null) return;
    const target = saveTargetIndex === 0 ? variants[0] : variants[1];
    if (!target) return;

    const systemMessage = target.systemMessage.trim();
    const repoName = saveName.trim();

    if (!systemMessage) {
      setSaveError("Add a system message before saving.");
      return;
    }

    if (!repoName) {
      setSaveError("Name is required.");
      return;
    }

    if (!canCreateRepos) {
      setSaveError("Supabase URL and anon key are required before creating repos.");
      return;
    }

    setSaveLoading(true);
    setSaveError("");

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in again.");
      }

      const { data: repo, error: repoError } = await supabase
        .from("repos")
        .insert({
          owner_id: user.id,
          name: repoName,
          description: saveDescription.trim() || null,
          is_public: false
        })
        .select("id")
        .single();

      if (repoError) {
        throw new Error(repoError.message);
      }

      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .insert({
          repo_id: repo.id,
          name: "main",
          is_main: true
        })
        .select("id")
        .single();

      if (branchError) {
        throw new Error(branchError.message);
      }

      const { error: versionError } = await supabase.from("prompt_versions").insert({
        repo_id: repo.id,
        branch_id: branch.id,
        content: systemMessage,
        model: target.model,
        temperature: target.temperature,
        max_tokens: target.maxTokens,
        commit_message: "Initial prompt from playground"
      });

      if (versionError) {
        throw new Error(versionError.message);
      }

      setSaveTargetIndex(null);
      router.push(`/dashboard/${repo.id}`);
      router.refresh();
    } catch (saveErr) {
      setSaveError(saveErr instanceof Error ? saveErr.message : "Could not create repo.");
    } finally {
      setSaveLoading(false);
    }
  }

  const mainWidthStyle: CSSProperties = compareMode
    ? {
        width: "100%",
        maxWidth: 1460,
        margin: "0 auto"
      }
    : {
        width: "100%",
        maxWidth: 720,
        margin: "0 auto"
      };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: T.bg,
        overflow: "hidden"
      }}
    >
      <Sidebar userEmail={userEmail} onSignOut={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
      }} />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 24px 18px"
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: T.dm,
              fontSize: 22,
              fontWeight: 700,
              color: T.ink,
              lineHeight: 1
            }}
          >
            Playground
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {compareMode && (
              <button
                type="button"
                onClick={runAll}
                style={{
                  height: 36,
                  padding: "0 16px",
                  border: "none",
                  borderRadius: 6,
                  background: T.ink,
                  color: T.bg,
                  fontFamily: T.dm,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Run all
              </button>
            )}
            <AddButton onClick={addVariant}>+ Add variant</AddButton>
          </div>
        </div>

        <div style={{ padding: "0 24px 28px" }}>
          <div style={mainWidthStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: compareMode ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 720px)",
                gap: 16,
                alignItems: "start"
              }}
            >
              {visibleVariants.map((variant, index) => (
                <PlaygroundPanel
                  key={index}
                  variant={variant}
                  onChange={(patch) => updateVariant(index, patch)}
                  onAddMessage={() => addMessage(index)}
                  onRun={() => void runVariant(index)}
                  onSave={() => openSaveModal(index)}
                />
              ))}
            </div>

            {compareMode && (
              <div style={{ marginTop: 24 }}>
                <h2
                  style={{
                    margin: "0 0 14px",
                    fontFamily: T.dm,
                    fontSize: 16,
                    fontWeight: 600,
                    color: T.ink
                  }}
                >
                  Generations
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16
                  }}
                >
                  <GenerationCard title="Variant A" variant={variants[0]} />
                  <GenerationCard title="Variant B" variant={variants[1]!} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <SaveRepoModal
        open={saveTargetIndex != null}
        canCreateRepos={canCreateRepos}
        loading={saveLoading}
        error={saveError}
        initialPrompt={
          saveTargetIndex == null
            ? ""
            : (saveTargetIndex === 0 ? variants[0] : variants[1])?.systemMessage ?? ""
        }
        name={saveName}
        description={saveDescription}
        onNameChange={setSaveName}
        onDescriptionChange={setSaveDescription}
        onClose={() => {
          setSaveTargetIndex(null);
          setSaveError("");
        }}
        onSubmit={submitSave}
      />
    </div>
  );
}
