"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    if (!hasSupabaseConfig()) {
      setIsSubmitting(false);
      setMessage("Add Supabase URL and anon key values to .env.local, then restart the dev server.");
      return;
    }

    const supabase = createClient();
    const credentials = { email, password };

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (isLogin || data.session) {
      router.replace(searchParams.get("next") ?? "/dashboard");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-10 text-ink">
      <section className="w-full max-w-sm rounded-md border border-line bg-panel p-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-medium">{isLogin ? "Log in" : "Sign up"}</h1>
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-sm border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : isLogin ? "Log in" : "Create account"}
          </button>
        </form>

        {message ? <p className="mt-5 text-sm leading-6 text-muted">{message}</p> : null}
      </section>
    </main>
  );
}
