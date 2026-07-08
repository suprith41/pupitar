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
        <main className="min-h-screen bg-bg px-6 py-6 text-ink md:px-10 md:py-8">
          <section className="mx-auto flex w-full max-w-[900px] flex-col gap-4 border-t border-line py-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Application error</p>
            <p className="text-lg font-bold tracking-[-0.03em] text-ink">
              Pupitar could not render this page.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              {error.message || "Pupitar could not render this page."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 w-fit rounded-pill bg-accent px-4 py-2 text-sm font-bold text-white shadow-blue transition-all hover:bg-accent-hover hover:shadow-lg"
            >
              Reload →
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
