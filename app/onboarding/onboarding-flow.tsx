"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PupitarLogo } from "@/components/logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role =
  | ""
  | "Prompt Engineer"
  | "AI/ML Engineer"
  | "Software Developer"
  | "Product Manager"
  | "Founder / Indie Hacker"
  | "Researcher"
  | "Other";

type AccountType = "solo" | "team" | null;

// ─── Shared design tokens (inline, no Tailwind dependency) ────────────────────

const T = {
  bg: "#FCFBF7",
  surface: "#FFFFFF",
  ink: "#000000",
  muted: "#706E6E",
  line: "#E1E4EA",
  accent: "#2067FF",
  accentHover: "#2F6BFF",
  accentLight: "#EEF4FF",
  error: "#B42318",
  success: "#1D7F4D",
  dmSans: '"DM Sans", Arial, sans-serif',
  serif: '"Source Serif 4", Georgia, serif'
} as const;

// ─── Progress indicator ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / 3) * 100);
  return (
    <div style={{ marginBottom: 32 }}>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 13,
          color: T.muted,
          margin: "0 0 10px 0",
          lineHeight: 1
        }}
      >
        Step {step} of 3
      </p>
      <div
        style={{
          height: 3,
          background: T.line,
          borderRadius: 999,
          overflow: "hidden"
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: step ${step} of 3`}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: T.accent,
            borderRadius: 999,
            transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
    </div>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  id
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        padding: "13px 20px",
        background: disabled || loading ? "#A0B8FF" : hovered ? T.accentHover : T.accent,
        color: "#FFFFFF",
        border: "none",
        borderRadius: 6,
        fontFamily: T.serif,
        fontWeight: 700,
        fontSize: 15,
        lineHeight: 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "background 200ms ease",
        outline: "none"
      }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  id
}: {
  children: React.ReactNode;
  onClick?: () => void;
  id?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "13px 20px",
        background: "transparent",
        color: hovered ? T.ink : T.muted,
        border: `1px solid ${hovered ? T.ink : T.line}`,
        borderRadius: 6,
        fontFamily: T.serif,
        fontWeight: 700,
        fontSize: 15,
        lineHeight: 1,
        cursor: "pointer",
        transition: "color 200ms ease, border-color 200ms ease",
        outline: "none"
      }}
    >
      {children}
    </button>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontFamily: T.serif,
        fontWeight: 500,
        fontSize: 14,
        color: T.ink,
        marginBottom: 8
      }}
    >
      {children}
    </label>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({
  role,
  onChange,
  onContinue,
  loading
}: {
  role: Role;
  onChange: (r: Role) => void;
  onContinue: () => void;
  loading: boolean;
}) {
  const [selectHovered, setSelectHovered] = useState(false);

  return (
    <div>
      <h1
        style={{
          fontFamily: T.dmSans,
          fontWeight: 700,
          fontSize: 28,
          color: T.ink,
          margin: "0 0 10px 0",
          lineHeight: 1.2
        }}
      >
        Tell us about yourself.
      </h1>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 15,
          color: T.muted,
          margin: "0 0 32px 0",
          lineHeight: 1.55
        }}
      >
        This helps us tailor Pupitar to how you work.
      </p>

      <div style={{ marginBottom: 28 }}>
        <FieldLabel htmlFor="onb-role">Your Role</FieldLabel>
        <select
          id="onb-role"
          value={role}
          onChange={(e) => onChange(e.target.value as Role)}
          onMouseEnter={() => setSelectHovered(true)}
          onMouseLeave={() => setSelectHovered(false)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: T.surface,
            border: `1px solid ${selectHovered ? "#B0B8C8" : T.line}`,
            borderRadius: 6,
            fontFamily: T.serif,
            fontSize: 14,
            color: role === "" ? T.muted : T.ink,
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23706E6E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 36,
            cursor: "pointer",
            outline: "none",
            transition: "border-color 200ms ease"
          }}
        >
          <option value="" disabled>
            Select a role
          </option>
          <option value="Prompt Engineer">Prompt Engineer</option>
          <option value="AI/ML Engineer">AI/ML Engineer</option>
          <option value="Software Developer">Software Developer</option>
          <option value="Product Manager">Product Manager</option>
          <option value="Founder / Indie Hacker">Founder / Indie Hacker</option>
          <option value="Researcher">Researcher</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <PrimaryButton id="onb-step1-continue" onClick={onContinue} disabled={role === ""} loading={loading}>
        Continue →
      </PrimaryButton>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function AccountTypeCard({
  id,
  title,
  description,
  selected,
  onClick
}: {
  id: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        textAlign: "left",
        padding: 20,
        background: selected ? T.accentLight : hovered ? "#F7F8FA" : T.surface,
        border: `${selected ? 2 : 1}px solid ${selected ? T.accent : hovered ? "#C8CDD8" : T.line}`,
        borderRadius: 8,
        cursor: "pointer",
        transition: "background 180ms ease, border-color 180ms ease",
        outline: "none"
      }}
    >
      <p
        style={{
          fontFamily: T.dmSans,
          fontWeight: 700,
          fontSize: 15,
          color: T.ink,
          margin: "0 0 6px 0",
          lineHeight: 1.3
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 13,
          color: T.muted,
          margin: 0,
          lineHeight: 1.5
        }}
      >
        {description}
      </p>
    </button>
  );
}

function Step2({
  accountType,
  nameValue,
  onAccountTypeChange,
  onNameChange,
  onBack,
  onContinue,
  loading
}: {
  accountType: AccountType;
  nameValue: string;
  onAccountTypeChange: (t: AccountType) => void;
  onNameChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  loading: boolean;
}) {
  const isSolo = accountType === "solo";
  const isTeam = accountType === "team";
  const canContinue = accountType !== null && nameValue.trim().length > 0;

  return (
    <div>
      <h1
        style={{
          fontFamily: T.dmSans,
          fontWeight: 700,
          fontSize: 28,
          color: T.ink,
          margin: "0 0 10px 0",
          lineHeight: 1.2
        }}
      >
        How will you use Pupitar?
      </h1>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 15,
          color: T.muted,
          margin: "0 0 28px 0",
          lineHeight: 1.55
        }}
      >
        Are you flying solo or building with a team?
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 0 }}>
        <AccountTypeCard
          id="onb-card-solo"
          title="Solo builder"
          description="Just me — I manage my own prompts and agents."
          selected={isSolo}
          onClick={() => onAccountTypeChange("solo")}
        />
        <AccountTypeCard
          id="onb-card-team"
          title="Team / Company"
          description="I work with others on shared prompt repos."
          selected={isTeam}
          onClick={() => onAccountTypeChange("team")}
        />
      </div>

      {accountType !== null && (
        <div
          style={{ marginTop: 16, marginBottom: 28 }}
          key={accountType}
        >
          <FieldLabel htmlFor="onb-name-input">
            {isSolo ? "Your name" : "Company name"}
          </FieldLabel>
          <input
            id="onb-name-input"
            type="text"
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={isSolo ? "Suprith" : "Acme Inc."}
            autoFocus
            style={{
              width: "100%",
              padding: "10px 14px",
              background: T.surface,
              border: `1px solid ${T.line}`,
              borderRadius: 6,
              fontFamily: T.serif,
              fontSize: 14,
              color: T.ink,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
      )}

      {accountType === null && <div style={{ marginBottom: 28 }} />}

      <div style={{ display: "flex", gap: 10 }}>
        <GhostButton id="onb-step2-back" onClick={onBack}>
          Back
        </GhostButton>
        <div style={{ flex: 2 }}>
          <PrimaryButton id="onb-step2-continue" onClick={onContinue} disabled={!canContinue} loading={loading}>
            Continue →
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Email chip input ─────────────────────────────────────────────────

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function EmailChipInput({
  chips,
  onAdd,
  onRemove,
  inputError
}: {
  chips: string[];
  onAdd: (email: string) => void;
  onRemove: (index: number) => void;
  inputError: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function tryAddChip(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, "");
    if (!trimmed) return;
    onAdd(trimmed);
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      tryAddChip(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && chips.length > 0) {
      onRemove(chips.length - 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(",")) {
      tryAddChip(val);
    } else {
      setInputValue(val);
    }
  }

  return (
    <div>
      <div
        id="onb-email-chip-area"
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          minHeight: 80,
          padding: 8,
          background: T.surface,
          border: `1px solid ${inputError ? T.error : T.line}`,
          borderRadius: 6,
          cursor: "text",
          transition: "border-color 200ms ease"
        }}
      >
        {chips.map((chip, i) => (
          <span
            key={chip + i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              background: T.accentLight,
              color: T.accent,
              borderRadius: 100,
              fontFamily: T.serif,
              fontSize: 13,
              lineHeight: 1.4,
              whiteSpace: "nowrap"
            }}
          >
            {chip}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              aria-label={`Remove ${chip}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: T.accent,
                display: "flex",
                alignItems: "center",
                fontFamily: T.serif,
                fontSize: 14,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id="onb-email-input"
          type="email"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) tryAddChip(inputValue); }}
          placeholder={chips.length === 0 ? "Enter email addresses" : ""}
          style={{
            flex: 1,
            minWidth: 160,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: T.serif,
            fontSize: 14,
            color: T.ink,
            padding: "2px 4px"
          }}
        />
      </div>
      {inputError && (
        <p
          role="alert"
          style={{
            fontFamily: T.serif,
            fontSize: 13,
            color: T.error,
            margin: "6px 0 0 0",
            lineHeight: 1.4
          }}
        >
          {inputError}
        </p>
      )}
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 12,
          color: T.muted,
          margin: "6px 0 0 0",
          lineHeight: 1.4
        }}
      >
        Press Enter or comma after each email to add it.
      </p>
    </div>
  );
}

function Step3({
  chips,
  onAddChip,
  onRemoveChip,
  chipError,
  onBack,
  onFinish,
  onSkip,
  loading
}: {
  chips: string[];
  onAddChip: (email: string) => void;
  onRemoveChip: (i: number) => void;
  chipError: string;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  return (
    <div>
      <h1
        style={{
          fontFamily: T.dmSans,
          fontWeight: 700,
          fontSize: 28,
          color: T.ink,
          margin: "0 0 10px 0",
          lineHeight: 1.2
        }}
      >
        Invite your team.
      </h1>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 15,
          color: T.muted,
          margin: "0 0 28px 0",
          lineHeight: 1.55
        }}
      >
        Optional. You can always do this later.
      </p>

      <div style={{ marginBottom: 28 }}>
        <FieldLabel htmlFor="onb-email-input">Team Members</FieldLabel>
        <EmailChipInput
          chips={chips}
          onAdd={onAddChip}
          onRemove={onRemoveChip}
          inputError={chipError}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <GhostButton id="onb-step3-back" onClick={onBack}>
          Back
        </GhostButton>
        <div style={{ flex: 2 }}>
          <PrimaryButton id="onb-step3-finish" onClick={onFinish} disabled={!!chipError} loading={loading}>
            Finish setup →
          </PrimaryButton>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          id="onb-step3-skip"
          type="button"
          onClick={onSkip}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: T.serif,
            fontSize: 13,
            color: T.muted,
            padding: 0,
            textDecoration: "underline",
            textDecorationColor: "transparent",
            transition: "color 180ms ease, text-decoration-color 180ms ease"
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = T.ink;
            (e.currentTarget as HTMLButtonElement).style.textDecorationColor = T.ink;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = T.muted;
            (e.currentTarget as HTMLButtonElement).style.textDecorationColor = "transparent";
          }}
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}

// ─── Root Onboarding Flow ─────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStep = searchParams.get("step");
  const currentStep = rawStep === "2" ? 2 : rawStep === "3" ? 3 : 1;

  // Step 1 state
  const [role, setRole] = useState<Role>("");

  // Step 2 state
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [nameValue, setNameValue] = useState("");

  // Step 3 state
  const [chips, setChips] = useState<string[]>([]);
  const [chipError, setChipError] = useState("");

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Clear global error whenever step changes
  useEffect(() => {
    setGlobalError("");
  }, [currentStep]);

  function goToStep(n: 1 | 2 | 3) {
    router.push(`/onboarding?step=${n}`);
  }

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  async function handleStep1Continue() {
    if (!role) return;
    setLoading(true);
    setGlobalError("");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { error } = await supabase
        .from("user_profiles")
        .upsert({ id: user.id, role }, { onConflict: "id" });

      if (error) { setGlobalError(error.message); return; }
      goToStep(2);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────

  function handleAccountTypeChange(t: AccountType) {
    setAccountType(t);
    setNameValue(""); // reset name when toggling type
  }

  async function handleStep2Continue() {
    if (!accountType || !nameValue.trim()) return;
    setLoading(true);
    setGlobalError("");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const payload: {
        id: string;
        account_type: string;
        name?: string | null;
        company_name?: string | null;
      } =
        accountType === "solo"
          ? { id: user.id, account_type: "solo", name: nameValue.trim(), company_name: null }
          : { id: user.id, account_type: "team", company_name: nameValue.trim(), name: null };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) { setGlobalError(error.message); return; }
      goToStep(3);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3 handlers ──────────────────────────────────────────────────────

  function handleAddChip(email: string) {
    if (!isValidEmail(email)) {
      setChipError(`"${email}" is not a valid email address.`);
      return;
    }
    if (chips.includes(email.trim())) {
      setChipError(`"${email.trim()}" has already been added.`);
      return;
    }
    setChipError("");
    setChips((prev) => [...prev, email.trim()]);
  }

  function handleRemoveChip(i: number) {
    setChips((prev) => prev.filter((_, idx) => idx !== i));
    setChipError("");
  }

  async function completeOnboarding(emailList: string[]) {
    setLoading(true);
    setGlobalError("");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          { id: user.id, invited_emails: emailList, onboarding_completed: true },
          { onConflict: "id" }
        );

      if (error) { setGlobalError(error.message); return; }
      router.replace("/dashboard");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    if (chipError) return;
    completeOnboarding(chips);
  }

  function handleSkip() {
    completeOnboarding([]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage: "url('/auth-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        position: "relative"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${T.line}`,
          borderRadius: 8,
          padding: "40px 44px",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
          boxShadow: "0 10px 24px rgba(0, 11, 28, 0.08)"
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: T.dmSans,
            fontWeight: 700,
            fontSize: 16,
            color: T.ink,
            margin: "0 0 32px 0",
            lineHeight: 1
          }}
        >
          <PupitarLogo size={18} />
          <span>Pupitar</span>
        </div>

        <ProgressBar step={currentStep} />

        {/* Step content with fade-in */}
        <div
          key={currentStep}
          style={{ animation: "onb-fade-in 300ms ease both" }}
        >
          {currentStep === 1 && (
            <Step1
              role={role}
              onChange={setRole}
              onContinue={handleStep1Continue}
              loading={loading}
            />
          )}
          {currentStep === 2 && (
            <Step2
              accountType={accountType}
              nameValue={nameValue}
              onAccountTypeChange={handleAccountTypeChange}
              onNameChange={setNameValue}
              onBack={() => goToStep(1)}
              onContinue={handleStep2Continue}
              loading={loading}
            />
          )}
          {currentStep === 3 && (
            <Step3
              chips={chips}
              onAddChip={handleAddChip}
              onRemoveChip={handleRemoveChip}
              chipError={chipError}
              onBack={() => goToStep(2)}
              onFinish={handleFinish}
              onSkip={handleSkip}
              loading={loading}
            />
          )}
        </div>

        {/* Global error */}
        {globalError && (
          <p
            role="alert"
            style={{
              fontFamily: T.serif,
              fontSize: 13,
              color: T.error,
              marginTop: 16,
              lineHeight: 1.4
            }}
          >
            {globalError}
          </p>
        )}
      </div>

      {/* Built with 💙 by Suprith */}
      <p
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: T.serif,
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.6)",
          zIndex: 2,
          margin: 0,
          letterSpacing: "0.025em"
        }}
      >
        Built with 💙 by Suprith
      </p>

      {/* Keyframe for step transitions */}
      <style>{`
        @keyframes onb-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
