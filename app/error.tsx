"use client";

import { useEffect } from "react";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-md border border-line bg-panel p-6">
        <p className="text-sm font-medium text-ink">Something broke</p>
        <p className="text-sm leading-6 text-muted">
          {error.message || "An unexpected error occurred while loading Pupitar."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 w-fit rounded-sm border border-accent bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
        >
          Try again
        </button>
      </section>
    </main>
  );
}