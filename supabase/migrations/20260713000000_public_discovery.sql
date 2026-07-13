-- Pupitar v3: public discovery, tags, releases, stars, and forks.

alter table public.repos
  add column if not exists tags text[] not null default '{}',
  add column if not exists star_count integer not null default 0 check (star_count >= 0),
  add column if not exists fork_count integer not null default 0 check (fork_count >= 0),
  add column if not exists forked_from_repo_id uuid references public.repos(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'repos' and column_name = 'updated_at'
  ) then
    alter table public.repos add column updated_at timestamptz;
    update public.repos set updated_at = created_at;
    alter table public.repos alter column updated_at set default now();
    alter table public.repos alter column updated_at set not null;
  end if;
end;
$$;

alter table public.prompt_versions
  add column if not exists release_label text;

create table if not exists public.repo_stars (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (repo_id, user_id)
);

create table if not exists public.repo_forks (
  id uuid primary key default gen_random_uuid(),
  original_repo_id uuid not null references public.repos(id) on delete cascade,
  forked_repo_id uuid not null unique references public.repos(id) on delete cascade,
  forked_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (original_repo_id, forked_by)
);

create table if not exists public.repo_tags (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 48 and tag = lower(trim(tag))),
  created_at timestamptz not null default now(),
  unique (repo_id, tag)
);

-- Preserve tags created by the earlier array-based implementation.
insert into public.repo_tags (repo_id, tag)
select repos.id, lower(trim(tag))
from public.repos
cross join lateral unnest(repos.tags) as tag
where trim(tag) <> ''
on conflict (repo_id, tag) do nothing;

create index if not exists repos_public_updated_idx
  on public.repos (is_public, updated_at desc);
create index if not exists repos_tags_idx
  on public.repos using gin (tags);
create index if not exists repo_stars_user_idx
  on public.repo_stars (user_id, repo_id);
create index if not exists repo_forks_user_idx
  on public.repo_forks (forked_by, original_repo_id);
create index if not exists repo_tags_tag_idx
  on public.repo_tags (tag, repo_id);

alter table public.repo_stars enable row level security;
alter table public.repo_forks enable row level security;
alter table public.repo_tags enable row level security;

drop policy if exists "Users can view their own repo stars" on public.repo_stars;
create policy "Users can view their own repo stars"
  on public.repo_stars for select
  using (auth.uid() = user_id);

drop policy if exists "Users can star public repos" on public.repo_stars;
create policy "Users can star public repos"
  on public.repo_stars for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.repos
      where repos.id = repo_id and repos.is_public = true
    )
  );

drop policy if exists "Users can remove their own repo stars" on public.repo_stars;
create policy "Users can remove their own repo stars"
  on public.repo_stars for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own forks" on public.repo_forks;
create policy "Users can view their own forks"
  on public.repo_forks for select
  using (auth.uid() = forked_by);

drop policy if exists "Repo tags are viewable with their repos" on public.repo_tags;
create policy "Repo tags are viewable with their repos"
  on public.repo_tags for select
  using (
    exists (
      select 1 from public.repos
      where repos.id = repo_tags.repo_id
        and (repos.is_public = true or repos.owner_id = auth.uid())
    )
  );

drop policy if exists "Repo owners can add tags" on public.repo_tags;
create policy "Repo owners can add tags"
  on public.repo_tags for insert
  with check (
    exists (
      select 1 from public.repos
      where repos.id = repo_tags.repo_id and repos.owner_id = auth.uid()
    )
  );

drop policy if exists "Repo owners can remove tags" on public.repo_tags;
create policy "Repo owners can remove tags"
  on public.repo_tags for delete
  using (
    exists (
      select 1 from public.repos
      where repos.id = repo_tags.repo_id and repos.owner_id = auth.uid()
    )
  );

drop policy if exists "Public repos are viewable by everyone" on public.repos;
create policy "Public repos are viewable by everyone"
  on public.repos for select
  using (is_public = true);

drop policy if exists "Public repo versions are viewable by everyone" on public.prompt_versions;
create policy "Public repo versions are viewable by everyone"
  on public.prompt_versions for select
  using (
    exists (
      select 1 from public.repos
      where repos.id = prompt_versions.repo_id and repos.is_public = true
    )
  );

drop policy if exists "Public repo branches are viewable by everyone" on public.branches;
create policy "Public repo branches are viewable by everyone"
  on public.branches for select
  using (
    exists (
      select 1 from public.repos
      where repos.id = branches.repo_id and repos.is_public = true
    )
  );

create or replace view public.public_profiles
with (security_invoker = false)
as select id, name from public.user_profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

create or replace function public.touch_repo_from_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.repos
    set updated_at = now()
    where id = coalesce(new.repo_id, old.repo_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.touch_repo_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.is_public is distinct from old.is_public
    or new.tags is distinct from old.tags then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists repos_touch_metadata on public.repos;
create trigger repos_touch_metadata
before update on public.repos
for each row execute function public.touch_repo_metadata();

drop trigger if exists prompt_versions_touch_repo on public.prompt_versions;
create trigger prompt_versions_touch_repo
after insert or update or delete on public.prompt_versions
for each row execute function public.touch_repo_from_version();

create or replace function public.touch_repo_from_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.repos
    set updated_at = now()
    where id = coalesce(new.repo_id, old.repo_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists repo_tags_touch_repo on public.repo_tags;
create trigger repo_tags_touch_repo
after insert or delete on public.repo_tags
for each row execute function public.touch_repo_from_tag();

create or replace function public.sync_repo_star_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.repos set star_count = star_count + 1 where id = new.repo_id;
    return new;
  end if;

  update public.repos set star_count = greatest(star_count - 1, 0) where id = old.repo_id;
  return old;
end;
$$;

drop trigger if exists repo_stars_sync_count on public.repo_stars;
create trigger repo_stars_sync_count
after insert or delete on public.repo_stars
for each row execute function public.sync_repo_star_count();

create or replace function public.toggle_repo_star(target_repo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  removed_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.repos where id = target_repo_id and is_public = true) then
    raise exception 'Public repo not found';
  end if;

  delete from public.repo_stars
    where repo_id = target_repo_id and user_id = current_user_id;
  get diagnostics removed_count = row_count;

  if removed_count > 0 then
    return false;
  end if;

  insert into public.repo_stars (repo_id, user_id)
    values (target_repo_id, current_user_id)
    on conflict (repo_id, user_id) do nothing;
  return true;
end;
$$;

revoke all on function public.toggle_repo_star(uuid) from public;
grant execute on function public.toggle_repo_star(uuid) to authenticated;

drop function if exists public.fork_public_repo(uuid);

create or replace function public.fork_public_repo(
  source_repo_id uuid,
  fork_name text,
  fork_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  source_repo public.repos%rowtype;
  new_repo_id uuid;
  source_branch public.branches%rowtype;
  source_version public.prompt_versions%rowtype;
  source_eval public.eval_cases%rowtype;
  new_branch_id uuid;
  new_version_id uuid;
  existing_fork_id uuid;
  branch_map jsonb := '{}'::jsonb;
  version_map jsonb := '{}'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select forked_repo_id into existing_fork_id
  from public.repo_forks
  where original_repo_id = source_repo_id and forked_by = current_user_id;

  if existing_fork_id is not null then
    raise exception 'Already forked:%', existing_fork_id;
  end if;

  if trim(fork_name) = '' then
    raise exception 'Fork name is required';
  end if;

  select * into source_repo
  from public.repos
  where id = source_repo_id and is_public = true;

  if not found then
    raise exception 'Public repo not found';
  end if;

  insert into public.repos (
    owner_id, name, description, is_public, tags, forked_from_repo_id, updated_at
  ) values (
    current_user_id, trim(fork_name), nullif(trim(fork_description), ''), false,
    '{}', source_repo.id, now()
  ) returning id into new_repo_id;

  for source_branch in
    select * from public.branches where repo_id = source_repo_id order by created_at, id
  loop
    new_branch_id := gen_random_uuid();
    branch_map := branch_map || jsonb_build_object(source_branch.id::text, new_branch_id::text);
    insert into public.branches (
      id, repo_id, name, created_from_version_id, is_main, created_at
    ) values (
      new_branch_id, new_repo_id, source_branch.name, null, source_branch.is_main, now()
    );
  end loop;

  insert into public.repo_tags (repo_id, tag)
  select new_repo_id, tag
  from public.repo_tags
  where repo_id = source_repo_id;

  for source_version in
    select * from public.prompt_versions where repo_id = source_repo_id order by created_at, id
  loop
    new_version_id := gen_random_uuid();
    version_map := version_map || jsonb_build_object(source_version.id::text, new_version_id::text);
    insert into public.prompt_versions (
      id, repo_id, branch_id, content, model, temperature, max_tokens,
      commit_message, parent_version_id, eval_score, eval_total, release_label, created_at
    ) values (
      new_version_id,
      new_repo_id,
      case when source_version.branch_id is null then null
        else (branch_map ->> source_version.branch_id::text)::uuid end,
      source_version.content,
      source_version.model,
      source_version.temperature,
      source_version.max_tokens,
      source_version.commit_message,
      case when source_version.parent_version_id is null then null
        else (version_map ->> source_version.parent_version_id::text)::uuid end,
      source_version.eval_score,
      source_version.eval_total,
      source_version.release_label,
      source_version.created_at
    );
  end loop;

  for source_eval in
    select * from public.eval_cases where repo_id = source_repo_id order by created_at, id
  loop
    insert into public.eval_cases (
      id, repo_id, input, expected_outcome, description, created_at
    ) values (
      gen_random_uuid(), new_repo_id, source_eval.input, source_eval.expected_outcome,
      source_eval.description, source_eval.created_at
    );
  end loop;

  for source_version in
    select * from public.prompt_versions
    where repo_id = source_repo_id and parent_version_id is not null
  loop
    update public.prompt_versions
      set parent_version_id = (version_map ->> source_version.parent_version_id::text)::uuid
      where id = (version_map ->> source_version.id::text)::uuid;
  end loop;

  for source_branch in
    select * from public.branches
    where repo_id = source_repo_id and created_from_version_id is not null
  loop
    update public.branches
      set created_from_version_id = (version_map ->> source_branch.created_from_version_id::text)::uuid
      where id = (branch_map ->> source_branch.id::text)::uuid;
  end loop;

  insert into public.repo_forks (original_repo_id, forked_repo_id, forked_by)
  values (source_repo_id, new_repo_id, current_user_id);

  update public.repos set fork_count = fork_count + 1 where id = source_repo_id;
  update public.repos set updated_at = now() where id = new_repo_id;
  return new_repo_id;
end;
$$;

revoke all on function public.fork_public_repo(uuid, text, text) from public;
grant execute on function public.fork_public_repo(uuid, text, text) to authenticated;
