-- Hardwood (NBA Over/Unders) — initial schema
--
-- Ported from the NFL contest, whose nine incremental migrations are
-- squashed into this one file since this is a fresh Supabase project.
--
-- A note on "games_played": the NBA regular season is 82 games per team.
-- Unlike the NFL version, a draft pick resolves as soon as its outcome is
-- mathematically locked (an Over once wins pass the line, an Under once
-- even winning every remaining game can't reach it), not only after all
-- 82 games — see draft_pick_scores below. The NBA Cup championship game
-- doesn't count toward team records (the NBA excludes it from the
-- standings), so games carries a counts_toward_record flag. The league-
-- wide point total (used for the tiebreaker) covers all 1,230 regular
-- season games that count.

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  -- E.164, e.g. +15551234567, for the group text thread.
  phone text,
  is_commissioner boolean not null default false,
  is_demo boolean not null default false,
  -- Set only by the Twilio inbound webhook (STOP/START replies).
  sms_opted_out_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keeps profiles.email in sync once a Supabase Auth email change is
-- confirmed (auth.users.email only updates after the confirmation link).
create function sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function sync_profile_email();

-- Prevent a signed-in user from self-escalating privileges by calling
-- profiles.update() directly with the anon key (the "users can update
-- their own profile" policy only checks auth.uid() = id). Service-role
-- and SQL editor writes are unaffected.
create function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    new.is_commissioner := old.is_commissioner;
    new.is_demo := old.is_demo;
    new.sms_opted_out_at := old.sms_opted_out_at;
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileges
  before update on profiles
  for each row execute function protect_privileged_profile_columns();

-- Helper used by RLS policies below.
create function is_commissioner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_commissioner from profiles p where p.id = auth.uid()), false);
$$;

-- ============================================================
-- teams
-- ============================================================
create table teams (
  id serial primary key,
  name text not null,
  code text not null unique,
  conference text not null check (conference in ('East', 'West')),
  division text not null check (
    division in ('Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest')
  ),
  win_total_line numeric(4, 1),
  win_total_source text not null default 'manual' check (win_total_source in ('manual', 'api')),
  win_total_updated_at timestamptz
);

-- ============================================================
-- games (synced from ESPN)
-- ============================================================
create table games (
  id integer primary key,
  -- Contest week: Monday-to-Sunday in America/New_York, week 1 being
  -- the week of opening night. See src/lib/domain/season.ts.
  week integer not null check (week between 1 and 30),
  home_team_id integer not null references teams (id),
  away_team_id integer not null references teams (id),
  home_score integer,
  away_score integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  tipoff_utc timestamptz not null,
  -- False only for the NBA Cup championship game.
  counts_toward_record boolean not null default true
);

create index games_week_idx on games (week);

-- ============================================================
-- the draft
-- ============================================================
create table draft_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  total_rounds integer not null default 6,
  current_round integer not null default 1,
  current_pick_index integer not null default 0,
  snake_order uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references draft_sessions (id) on delete cascade,
  user_id uuid not null references profiles (id),
  team_id integer not null references teams (id),
  side text not null check (side in ('over', 'under')),
  round integer not null,
  pick_number integer not null,
  picked_at timestamptz not null default now(),
  unique (session_id, team_id, side),
  unique (session_id, pick_number)
);

-- ============================================================
-- division bonus + tiebreaker
-- ============================================================
create table division_predictions (
  user_id uuid not null references profiles (id),
  division text not null check (
    division in ('Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest')
  ),
  predicted_team_id integer not null references teams (id),
  created_at timestamptz not null default now(),
  primary key (user_id, division)
);

create table division_winners (
  division text primary key check (
    division in ('Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest')
  ),
  team_id integer not null references teams (id),
  set_at timestamptz not null default now()
);

create table tiebreaker_predictions (
  user_id uuid primary key references profiles (id),
  points_guess integer not null check (points_guess > 0),
  created_at timestamptz not null default now()
);

-- ============================================================
-- settings + message log
-- ============================================================

-- Key/value settings (Twilio Conversation SID, text tone, texting on/off,
-- send-once guards, last sync time). RLS is enabled with no policies on
-- purpose: only the service role (server code, after its own
-- commissioner check) can read or write it.
create table app_settings (
  key text primary key,
  value text
);

-- Audit trail of outbound texts. Written only by server code via the
-- service role; readable by the commissioner on /admin.
create table sent_messages (
  id bigint generated always as identity primary key,
  kind text not null,
  target text not null check (target in ('self', 'group')),
  week integer,
  message text not null,
  sent_at timestamptz not null default now()
);

-- ============================================================
-- derived views
-- ============================================================
create view team_records as
select
  t.id as team_id,
  count(*) filter (
    where g.status = 'final' and (
      (g.home_team_id = t.id and g.home_score > g.away_score) or
      (g.away_team_id = t.id and g.away_score > g.home_score)
    )
  ) as wins,
  count(*) filter (
    where g.status = 'final' and (
      (g.home_team_id = t.id and g.home_score < g.away_score) or
      (g.away_team_id = t.id and g.away_score < g.home_score)
    )
  ) as losses,
  count(*) filter (
    where g.status = 'final' and (g.home_team_id = t.id or g.away_team_id = t.id)
  ) as games_played
from teams t
left join games g
  on (g.home_team_id = t.id or g.away_team_id = t.id) and g.counts_toward_record
group by t.id;

create view league_total_points as
select
  coalesce(sum(home_score), 0) + coalesce(sum(away_score), 0) as total_points,
  count(*) as games_final
from games
where status = 'final' and counts_toward_record;

-- Per-pick scoring. Mirrors scorePick() in src/lib/domain/scoring.ts —
-- keep the two in sync if this formula changes.
--
-- A pick resolves once its side is mathematically locked:
--   Over clinched:  wins > line
--   Under clinched: wins + games remaining < line
-- A correct pick earns 1 point plus 0.25 per full win of margin, capped at
-- +3. Before the season ends the margin used is the *guaranteed* one
-- (wins - line for an Over; line - max possible wins for an Under), which
-- only grows as games are played, so points never go down. bonus_final
-- is true once the margin can't change (season over, or cap reached).
create view draft_pick_scores as
with base as (
  select
    dp.id as pick_id,
    dp.session_id,
    dp.user_id,
    dp.team_id,
    dp.side,
    dp.round,
    dp.pick_number,
    tr.wins,
    tr.losses,
    tr.games_played,
    t.win_total_line,
    tr.wins > t.win_total_line as over_clinched,
    tr.wins + greatest(82 - tr.games_played, 0) < t.win_total_line as under_clinched,
    case
      when dp.side = 'over' then floor(tr.wins - t.win_total_line)
      else floor(t.win_total_line - (tr.wins + greatest(82 - tr.games_played, 0)))
    end as guaranteed_margin
  from draft_picks dp
  join teams t on t.id = dp.team_id
  join team_records tr on tr.team_id = dp.team_id
),
scored as (
  select
    base.*,
    coalesce(over_clinched or under_clinched, false) as resolved,
    case
      when not coalesce(over_clinched or under_clinched, false) then null
      when side = 'over' then over_clinched
      else under_clinched
    end as correct
  from base
)
select
  pick_id,
  session_id,
  user_id,
  team_id,
  side,
  round,
  pick_number,
  wins,
  losses,
  games_played,
  win_total_line,
  resolved,
  correct,
  case when correct then least(guaranteed_margin * 0.25, 3) else 0 end as bonus_points,
  case
    when not resolved then false
    when not correct then true
    else games_played >= 82 or guaranteed_margin * 0.25 >= 3
  end as bonus_final,
  case when correct then 1 + least(guaranteed_margin * 0.25, 3) else 0 end as points
from scored;

create view overall_leaderboard as
with draft_points as (
  select user_id, coalesce(sum(points), 0) as draft_points
  from draft_pick_scores
  group by user_id
),
division_points as (
  select
    dp.user_id,
    count(*) filter (where dw.team_id = dp.predicted_team_id) as division_points
  from division_predictions dp
  left join division_winners dw on dw.division = dp.division
  group by dp.user_id
)
select
  p.id as user_id,
  p.display_name,
  coalesce(d.draft_points, 0) as draft_points,
  coalesce(dv.division_points, 0) as division_points,
  coalesce(d.draft_points, 0) + coalesce(dv.division_points, 0) as total_points
from profiles p
left join draft_points d on d.user_id = p.id
left join division_points dv on dv.user_id = p.id
where p.is_demo = false
order by total_points desc;

-- ============================================================
-- row level security
-- ============================================================
alter table profiles enable row level security;
alter table teams enable row level security;
alter table games enable row level security;
alter table draft_sessions enable row level security;
alter table draft_picks enable row level security;
alter table division_predictions enable row level security;
alter table division_winners enable row level security;
alter table tiebreaker_predictions enable row level security;
alter table app_settings enable row level security;
alter table sent_messages enable row level security;

-- profiles: everyone signed in can see everyone (it's a 5-person pool);
-- a user can only edit their own row.
create policy "profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);
create policy "users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- teams, games, division_winners: read for anyone signed in; writes are
-- commissioner-only (or via the service role from the sync job).
create policy "teams are viewable by authenticated users"
  on teams for select to authenticated using (true);
create policy "commissioner can modify teams"
  on teams for all to authenticated using (is_commissioner()) with check (is_commissioner());

create policy "games are viewable by authenticated users"
  on games for select to authenticated using (true);
create policy "commissioner can modify games"
  on games for all to authenticated using (is_commissioner()) with check (is_commissioner());

create policy "division winners are viewable by authenticated users"
  on division_winners for select to authenticated using (true);
create policy "commissioner can set division winners"
  on division_winners for all to authenticated using (is_commissioner()) with check (is_commissioner());

-- draft_sessions / draft_picks: everyone can watch the draft; picks are
-- written by the /api/draft/pick route (service role).
create policy "draft sessions are viewable by authenticated users"
  on draft_sessions for select to authenticated using (true);
create policy "commissioner can manage draft sessions"
  on draft_sessions for all to authenticated using (is_commissioner()) with check (is_commissioner());

create policy "draft picks are viewable by authenticated users"
  on draft_picks for select to authenticated using (true);

-- division_predictions: locked at opening tip-off (3:00 PM ET / 19:00 UTC
-- on 10/20/2026). Before the lock a user sees only their own picks (the
-- commissioner sees everyone's); after it, everyone sees everyone's.
-- Keep the timestamp in sync with PICKS_LOCK_AT in
-- src/lib/domain/season.ts.
create policy "division picks visible to owner, commissioner, or after lock"
  on division_predictions for select to authenticated
  using (
    auth.uid() = user_id
    or now() >= timestamptz '2026-10-20 19:00:00+00'
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_commissioner)
  );

create policy "users can insert their own division predictions before lock"
  on division_predictions for insert to authenticated
  with check (auth.uid() = user_id and now() < timestamptz '2026-10-20 19:00:00+00');

create policy "users can update their own division predictions before lock"
  on division_predictions for update to authenticated
  using (auth.uid() = user_id and now() < timestamptz '2026-10-20 19:00:00+00')
  with check (auth.uid() = user_id and now() < timestamptz '2026-10-20 19:00:00+00');

create policy "tiebreaker predictions are viewable by authenticated users"
  on tiebreaker_predictions for select to authenticated using (true);
create policy "users manage their own tiebreaker prediction"
  on tiebreaker_predictions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "commissioner can view sent messages"
  on sent_messages for select to authenticated using (is_commissioner());
