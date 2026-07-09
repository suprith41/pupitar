"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type OAuthProvider = "google" | "apple";

const copy = {
  login: {
    heading: "Welcome back.",
    subtext: "Log in to your Pupitar account.",
    submit: "Log in →",
    footerLabel: "Don't have an account?",
    footerLink: "Sign up →",
    footerHref: "/signup",
    passwordAutoComplete: "current-password"
  },
  signup: {
    heading: "Create your account.",
    subtext: "Start versioning your prompts for free.",
    submit: "Create account →",
    footerLabel: "Already have an account?",
    footerLink: "Log in →",
    footerHref: "/login",
    passwordAutoComplete: "new-password"
  }
} satisfies Record<
  AuthMode,
  {
    heading: string;
    subtext: string;
    submit: string;
    footerLabel: string;
    footerLink: string;
    footerHref: string;
    passwordAutoComplete: string;
  }
>;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2045c0-.6387-.0573-1.2528-.1636-1.8409H9v3.4873h4.8436c-.2082 1.1232-.8427 2.0746-1.7945 2.7133v2.255h2.903c1.6973-1.563 2.6879-3.8664 2.6879-6.6147Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8053 5.956-2.18l-2.903-2.255c-.8054.54-1.8355.8597-3.053.8597-2.3461 0-4.3355-1.5799-5.0455-3.7066H.954v2.3261A8.9989 8.9989 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.9545 10.7181A5.4108 5.4108 0 0 1 3.668 9c0-.5978.1027-1.1787.2865-1.7181V4.955h-2.8A8.9988 8.9988 0 0 0 0 9c0 1.4455.3455 2.813.9545 4.0455l3-2.3274Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5782c1.3218 0 2.5082.4545 3.4427 1.3455l2.5827-2.5827C13.4636.8473 11.4264 0 9 0A8.9988 8.9988 0 0 0 .9545 4.955L3.9545 7.2823C4.6645 5.1555 6.6539 3.5782 9 3.5782Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M12.734 9.434c-.016-1.645 1.346-2.435 1.406-2.47-.766-1.12-1.95-1.274-2.366-1.29-1.008-.102-1.967.593-2.48.593-.512 0-1.302-.578-2.142-.562-1.103.016-2.119.64-2.687 1.63-1.146 1.987-.292 4.927.824 6.538.546.79 1.195 1.678 2.047 1.646.824-.032 1.135-.53 2.128-.53.994 0 1.274.53 2.142.513.883-.017 1.44-.807 1.98-1.614.625-.93.883-1.84.898-1.886-.02-.01-1.737-.666-1.75-2.568Zm-1.656-4.924c.454-.545.762-1.304.678-2.06-.653.026-1.445.435-1.914.98-.42.48-.79 1.255-.687 1.995.73.056 1.478-.369 1.923-.915Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.333 8s2.334-4.667 6.667-4.667S14.667 8 14.667 8s-2.334 4.667-6.667 4.667S1.333 8 1.333 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10.333A2.333 2.333 0 1 0 8 5.667a2.333 2.333 0 0 0 0 4.666Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="m2.5 3.5 11 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10.284 10.076a2.333 2.333 0 0 1-4.118-1.79"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.657 4.906C6.382 4.585 7.155 4.333 8 4.333c4.333 0 6.667 3.667 6.667 3.667a12.997 12.997 0 0 1-1.959 2.52"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.49 6.515A12.642 12.642 0 0 0 1.333 8s2.334 4.667 6.667 4.667c.723 0 1.38-.102 1.98-.274"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-px flex-1 bg-[#E5E7EB]" />
      <span
        className="text-[13px] leading-none text-[#9CA3AF]"
        style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
      >
        or
      </span>
      <div className="h-px flex-1 bg-[#E5E7EB]" />
    </div>
  );
}

function SocialButton({
  provider,
  label,
  onClick
}: {
  provider: OAuthProvider;
  label: string;
  onClick: (provider: OAuthProvider) => void;
}) {
  const isGoogle = provider === "google";

  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      className={`flex w-full items-center justify-center gap-3 rounded-[6px] border px-5 py-3 text-[14px] font-medium leading-none transition-colors ${
        isGoogle
          ? "border-[#E5E7EB] bg-white text-[#111111] hover:bg-[#F9FAFB]"
          : "border-[#111111] bg-[#111111] text-white hover:bg-[#222222]"
      }`}
    >
      {isGoogle ? <GoogleIcon /> : <AppleIcon />}
      <span>{label}</span>
    </button>
  );
}

function ComingSoonButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  function revealTooltip() {
    setShowTooltip(true);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => setShowTooltip(false), 1800);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={revealTooltip}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex w-full items-center justify-center gap-3 rounded-[6px] border border-[#111111] bg-[#111111] px-5 py-3 text-[14px] font-medium leading-none text-white transition-colors hover:bg-[#222222]"
      >
        <AppleIcon />
        <span>Continue with Apple</span>
      </button>

      <div
        role="tooltip"
        aria-hidden={!showTooltip}
        className={`pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-[6px] bg-[#111111] px-3 py-1.5 text-[12px] leading-none text-white shadow-lg transition-all duration-150 ${
          showTooltip ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
        style={{ fontFamily: '"DM Sans", Arial, sans-serif' }}
      >
        Coming soon
      </div>
    </div>
  );
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";
  const content = copy[mode];

  async function onOAuth(provider: OAuthProvider) {
    if (provider === "apple") {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (!data.url) {
        setError("Could not start the sign-in flow.");
        return;
      }

      window.location.assign(data.url);
    } catch (submissionError) {
      const nextError =
        submissionError instanceof Error ? submissionError.message : "Could not start the sign-in flow.";
      setError(nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        window.location.assign("/api/post-auth");
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setPassword("");
      setMessage("Check your email to confirm your account.");
    } catch (submissionError) {
      const nextError =
        submissionError instanceof Error ? submissionError.message : "Something went wrong.";
      setError(nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center px-6 relative flex items-center justify-center py-12"
      style={{
        backgroundImage: "url('/auth-bg.jpg')"
      }}
    >

      <section
        className="relative z-10 w-full max-w-[440px] rounded-lg border border-[#E1E4EA]/60 p-10 text-center shadow-lg"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxSizing: "border-box"
        }}
      >
        <Link
          href="/"
          className="text-[18px] font-bold leading-none text-[#111111]"
          style={{ fontFamily: '"DM Sans", Arial, sans-serif' }}
        >
          Pupitar
        </Link>

        <div className="mt-10">
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[#111111]">
            {content.heading}
          </h1>
          <p
            className="mt-3 text-[14px] leading-[1.55] text-[#555555]"
            style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
          >
            {content.subtext}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-left">
          <SocialButton provider="google" label="Continue with Google" onClick={onOAuth} />
          <ComingSoonButton />
        </div>

        <div className="mt-6">
          <Divider />
        </div>

        <form className="mt-4 flex flex-col gap-3 text-left" onSubmit={onSubmit}>
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              className="auth-field w-full rounded-[6px] border border-[#E5E7EB] bg-white px-[14px] py-[10px] text-[14px] leading-[1.45] text-[#111111] outline-none placeholder:text-[#9CA3AF]"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <div className="relative">
              <input
                className="auth-field w-full rounded-[6px] border border-[#E5E7EB] bg-white px-[14px] py-[10px] pr-11 text-[14px] leading-[1.45] text-[#111111] outline-none placeholder:text-[#9CA3AF]"
                type={showPassword ? "text" : "password"}
                autoComplete={content.passwordAutoComplete}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#111111]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-[6px] bg-[#111111] px-3 py-3 text-[14px] font-bold leading-none text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {content.submit}
          </button>

          <div aria-live="polite" className="min-h-[20px]">
            {error ? (
              <p
                className="text-[13px] leading-5 text-[#DC2626]"
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                {error}
              </p>
            ) : message ? (
              <p
                className="text-[13px] leading-5 text-[#555555]"
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>

        <p
          className="mt-5 text-[13px] leading-5 text-[#555555]"
          style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
        >
          {content.footerLabel}{" "}
          <Link href={content.footerHref} className="text-[#111111] underline underline-offset-2">
            {content.footerLink}
          </Link>
        </p>
      </section>
    </main>
  );
}
