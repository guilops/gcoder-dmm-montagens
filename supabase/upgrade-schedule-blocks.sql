create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  check (
    (start_time is null and end_time is null) or
    (start_time is not null and end_time is not null and start_time < end_time)
  )
);

alter table public.bookings
  add column if not exists duration_minutes integer not null default 90
  check (duration_minutes between 30 and 480 and duration_minutes % 30 = 0);

create table if not exists public.service_durations (
  service text primary key check (char_length(service) between 1 and 100),
  duration_minutes integer not null
    check (duration_minutes between 30 and 480 and duration_minutes % 30 = 0)
);

insert into public.service_durations (service, duration_minutes) values
  ('Móveis em geral', 90),
  ('Armários e cozinhas planejadas', 180),
  ('Desmontagem e remontagem', 180),
  ('Outro — vou explicar nos detalhes', 90)
on conflict (service) do nothing;

alter table public.schedule_blocks enable row level security;
alter table public.service_durations enable row level security;
revoke all on public.schedule_blocks from anon, authenticated;
revoke all on public.service_durations from anon, authenticated;
grant select, insert, delete on public.schedule_blocks to authenticated;
grant select, insert, update on public.service_durations to authenticated;

create or replace function public.prevent_booking_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('pending', 'confirmed') then
    perform pg_advisory_xact_lock(hashtext(new.booking_date::text));
    if exists (
      select 1
      from public.bookings as existing
      where existing.booking_date = new.booking_date
        and existing.status in ('pending', 'confirmed')
        and existing.id is distinct from new.id
        and new.booking_date + new.booking_time::time
          < existing.booking_date + existing.booking_time::time
            + make_interval(mins => existing.duration_minutes)
        and new.booking_date + new.booking_time::time
          + make_interval(mins => new.duration_minutes)
          > existing.booking_date + existing.booking_time::time
    ) then
      raise exception 'Booking overlaps an existing appointment.'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_prevent_overlap on public.bookings;
create trigger bookings_prevent_overlap
  before insert or update of booking_date, booking_time, duration_minutes, status
  on public.bookings
  for each row execute function public.prevent_booking_overlap();

drop policy if exists "Admins can manage schedule blocks" on public.schedule_blocks;
create policy "Admins can manage schedule blocks"
  on public.schedule_blocks for all to authenticated
  using (
    exists (
      select 1 from public.admins
      where admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admins
      where admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can manage service durations" on public.service_durations;
create policy "Admins can manage service durations"
  on public.service_durations for all to authenticated
  using (
    exists (
      select 1 from public.admins
      where admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admins
      where admins.user_id = (select auth.uid())
    )
  );
