const envKeys = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-14">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <p className="text-sm font-medium tracking-wide text-ink">Pupitar</p>
          <span className="rounded-sm border border-accent px-2.5 py-1 font-mono text-xs text-accent">
            scaffold
          </span>
        </header>

        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-5">
            <p className="max-w-2xl text-3xl font-semibold leading-tight text-ink md:text-5xl">
              A quiet base for the Pupitar app.
            </p>
            <p className="max-w-xl text-base leading-7 text-muted">
              Next.js App Router, TypeScript, Tailwind CSS, and a FastAPI service are ready for the first real product pass.
            </p>
          </div>

          <div className="rounded-md border border-line bg-panel p-5">
            <p className="mb-4 text-sm font-medium text-ink">Environment keys</p>
            <div className="flex flex-col gap-2">
              {envKeys.map((key) => (
                <code key={key} className="font-mono text-xs text-muted">
                  {key}
                </code>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
