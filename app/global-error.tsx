"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
          <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-md border border-line bg-panel p-6">
            <p className="text-sm font-medium text-ink">Application error</p>
            <p className="text-sm leading-6 text-muted">
              {error.message || "Pupitar could not render this page."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 w-fit rounded-sm border border-accent bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
            >
              Reload
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}