-- Run this file once in Supabase Dashboard → SQL Editor.
-- The browser only receives INSERT permissions. Raw events and feedback remain private.

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  event_name text not null check (
    event_name in (
      'game_started',
      'game_ended',
      'easter_egg_triggered',
      'auto_research_reported'
    )
  ),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.player_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  ending_id text,
  rating smallint not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 600),
  created_at timestamptz not null default now()
);

create unique index if not exists game_events_one_start_per_run
  on public.game_events (run_id)
  where event_name = 'game_started';

create unique index if not exists game_events_one_ending_per_run
  on public.game_events (run_id)
  where event_name = 'game_ended';

create index if not exists game_events_name_created_idx
  on public.game_events (event_name, created_at desc);

create index if not exists player_feedback_created_idx
  on public.player_feedback (created_at desc);

alter table public.game_events enable row level security;
alter table public.player_feedback enable row level security;

revoke all on table public.game_events from anon, authenticated;
revoke all on table public.player_feedback from anon, authenticated;
grant insert on table public.game_events to anon, authenticated;
grant insert on table public.player_feedback to anon, authenticated;

drop policy if exists "public can submit constrained game events" on public.game_events;
create policy "public can submit constrained game events"
  on public.game_events
  for insert
  to anon, authenticated
  with check (
    event_name in (
      'game_started',
      'game_ended',
      'easter_egg_triggered',
      'auto_research_reported'
    )
    and jsonb_typeof(properties) = 'object'
  );

drop policy if exists "public can submit constrained feedback" on public.player_feedback;
create policy "public can submit constrained feedback"
  on public.player_feedback
  for insert
  to anon, authenticated
  with check (
    rating between 1 and 5
    and char_length(message) between 1 and 600
  );

create or replace function public.get_public_game_stats()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total_finished_runs',
      (select count(*) from public.game_events where event_name = 'game_ended'),
    'average_accepted',
      coalesce((
        select round(avg((properties ->> 'accepted_count')::numeric), 2)
        from public.game_events
        where event_name = 'game_ended'
          and jsonb_typeof(properties -> 'accepted_count') = 'number'
      ), 0),
    'average_submitted',
      coalesce((
        select round(avg((properties ->> 'submitted_count')::numeric), 2)
        from public.game_events
        where event_name = 'game_ended'
          and jsonb_typeof(properties -> 'submitted_count') = 'number'
      ), 0),
    'ending_counts',
      coalesce((
        select jsonb_object_agg(ending_id, total)
        from (
          select properties ->> 'ending_id' as ending_id, count(*) as total
          from public.game_events
          where event_name = 'game_ended'
            and properties ? 'ending_id'
          group by properties ->> 'ending_id'
        ) as ending_stats
      ), '{}'::jsonb),
    'easter_egg_counts',
      coalesce((
        select jsonb_object_agg(easter_egg_id, total)
        from (
          select properties ->> 'easter_egg_id' as easter_egg_id, count(*) as total
          from public.game_events
          where event_name = 'easter_egg_triggered'
            and properties ? 'easter_egg_id'
          group by properties ->> 'easter_egg_id'
        ) as easter_stats
      ), '{}'::jsonb)
  );
$$;

revoke all on function public.get_public_game_stats() from public;
grant execute on function public.get_public_game_stats() to anon, authenticated;
