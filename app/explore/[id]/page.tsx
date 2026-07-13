import { notFound } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import PublicRepoShell from "./public-repo-shell";

export default async function PublicRepoPage({ params }: { params: { id: string } }) {
  if (!hasSupabaseConfig()) notFound();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: repo, error } = await supabase
    .from("repos")
    .select("id, owner_id, name, description, star_count, fork_count, updated_at, created_at")
    .eq("id", params.id)
    .eq("is_public", true)
    .single();

  if (error || !repo) notFound();

  const [versionsResult, profileResult, starResult, tagsResult, forkResult] = await Promise.all([
    supabase
      .from("prompt_versions")
      .select("id, content, model, temperature, max_tokens, commit_message, release_label, created_at")
      .eq("repo_id", repo.id)
      .order("created_at", { ascending: false }),
    supabase.from("public_profiles").select("name").eq("id", repo.owner_id).maybeSingle(),
    user
      ? supabase.from("repo_stars").select("id").eq("repo_id", repo.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("repo_tags").select("tag").eq("repo_id", repo.id).order("created_at", { ascending: true }),
    user
      ? supabase.from("repo_forks").select("forked_repo_id").eq("original_repo_id", repo.id).eq("forked_by", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <PublicRepoShell
      repo={{ ...repo, tags: (tagsResult.data ?? []).map((row) => row.tag), ownerLabel: profileResult.data?.name?.trim() || "Pupitar creator" }}
      versions={versionsResult.data ?? []}
      initialStarred={Boolean(starResult.data)}
      initialForkedRepoId={forkResult.data?.forked_repo_id ?? null}
      userEmail={user?.email ?? null}
      isAuthenticated={Boolean(user)}
      initialNote={versionsResult.error?.message ?? profileResult.error?.message ?? starResult.error?.message ?? tagsResult.error?.message ?? forkResult.error?.message ?? null}
    />
  );
}
