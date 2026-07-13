import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import ExploreShell, { type ExploreRepo } from "./explore-shell";

type RepoRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  star_count?: number;
  fork_count?: number;
  updated_at?: string;
  created_at: string;
};

type VersionRow = {
  repo_id: string;
  content: string;
  created_at: string;
};

export default async function ExplorePage() {
  if (!hasSupabaseConfig()) {
    return <ExploreShell repos={[]} userEmail={null} isAuthenticated={false} initialNote="Connect Supabase to browse public repos." />;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const primaryReposResult = await supabase
    .from("repos")
    .select("id, owner_id, name, description, star_count, fork_count, updated_at, created_at")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });

  // Existing projects may not have run the discovery migration yet. Keep Explore
  // usable for their public repos while the enhanced counters are unavailable.
  const fallbackReposResult = primaryReposResult.error
    ? await supabase
        .from("repos")
        .select("id, owner_id, name, description, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
    : null;

  const repos = (primaryReposResult.data ?? fallbackReposResult?.data ?? []) as RepoRow[];
  const repoIds = repos.map((repo) => repo.id);
  const ownerIds = Array.from(new Set(repos.map((repo) => repo.owner_id)));

  const [versionsResult, profilesResult, starsResult, tagsResult, forksResult] = await Promise.all([
    repoIds.length
      ? supabase
          .from("prompt_versions")
          .select("repo_id, content, created_at")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as VersionRow[], error: null }),
    ownerIds.length
      ? supabase.from("public_profiles").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }>, error: null }),
    user && repoIds.length
      ? supabase.from("repo_stars").select("repo_id").eq("user_id", user.id).in("repo_id", repoIds)
      : Promise.resolve({ data: [] as Array<{ repo_id: string }>, error: null }),
    repoIds.length
      ? supabase.from("repo_tags").select("repo_id, tag").in("repo_id", repoIds)
      : Promise.resolve({ data: [] as Array<{ repo_id: string; tag: string }>, error: null }),
    user && repoIds.length
      ? supabase.from("repo_forks").select("original_repo_id, forked_repo_id").eq("forked_by", user.id).in("original_repo_id", repoIds)
      : Promise.resolve({ data: [] as Array<{ original_repo_id: string; forked_repo_id: string }>, error: null })
  ]);

  const latestPrompt = new Map<string, string>();
  for (const version of (versionsResult.data ?? []) as VersionRow[]) {
    if (!latestPrompt.has(version.repo_id)) latestPrompt.set(version.repo_id, version.content);
  }

  const ownerNames = new Map(
    (profilesResult.data ?? [])
      .filter((profile): profile is { id: string; name: string | null } => Boolean(profile.id))
      .map((profile) => [profile.id, profile.name])
  );
  const starredRepoIds = new Set((starsResult.data ?? []).map((star) => star.repo_id));
  const tagsByRepo = new Map<string, string[]>();
  for (const row of tagsResult.data ?? []) {
    tagsByRepo.set(row.repo_id, [...(tagsByRepo.get(row.repo_id) ?? []), row.tag]);
  }
  const forksByRepo = new Map((forksResult.data ?? []).map((fork) => [fork.original_repo_id, fork.forked_repo_id]));

  const entries: ExploreRepo[] = repos.map((repo) => ({
    ...repo,
    star_count: repo.star_count ?? 0,
    fork_count: repo.fork_count ?? 0,
    updated_at: repo.updated_at ?? repo.created_at,
    tags: tagsByRepo.get(repo.id) ?? [],
    ownerLabel: ownerNames.get(repo.owner_id)?.trim() || "Pupitar creator",
    latestPromptContent: latestPrompt.get(repo.id) ?? null,
    isStarred: starredRepoIds.has(repo.id),
    forkedRepoId: forksByRepo.get(repo.id) ?? null
  }));

  const note = fallbackReposResult?.error?.message ?? versionsResult.error?.message ?? null;

  return <ExploreShell repos={entries} userEmail={user?.email ?? null} isAuthenticated={Boolean(user)} initialNote={note} />;
}
