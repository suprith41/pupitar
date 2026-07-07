export default function Home() {
  return (
    <main className="min-h-screen bg-surface px-6 py-6 text-ink md:px-10 md:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <a href="/" className="text-sm font-medium tracking-wide text-ink">
            Pupitar
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-sm border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Log in
            </a>
            <a
              href="/dashboard"
              className="rounded-sm border border-accent bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
            >
              Sign up
            </a>
          </div>
        </header>

        <div className="flex flex-1 items-center">
          <div className="max-w-3xl py-16 md:py-24">
            <h1 className="text-5xl font-semibold leading-tight text-ink md:text-7xl">
              Version control for prompts and agents.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted md:text-xl">
              Write, commit, and deploy AI prompts with version history, a built-in playground, and a live API endpoint.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-sm border border-accent bg-accent px-5 py-3 text-sm font-medium text-surface transition-colors hover:bg-transparent hover:text-accent"
              >
                Get started →
              </a>
              <a
                href="#"
                className="rounded-sm border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
