import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-ink md:px-10 md:py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <p className="text-sm font-medium tracking-wide text-ink">Pupitar</p>
          <span className="rounded-sm border border-accent px-2.5 py-1 font-mono text-xs text-accent">
            dashboard
          </span>
        </header>

        <div className="rounded-md border border-line bg-panel p-6">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="mt-2 font-mono text-sm text-ink">{user.email}</p>
        </div>
      </section>
    </main>
  );
}
