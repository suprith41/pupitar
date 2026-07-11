import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import PlaygroundShell from "./playground-shell";

export default async function PlaygroundPage() {
  if (!hasSupabaseConfig()) {
    return <PlaygroundShell canCreateRepos={false} />;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <PlaygroundShell canCreateRepos />;
}
