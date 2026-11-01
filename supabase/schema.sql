create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text not null check (char_length(customer_phone) between 8 and 30),
  customer_email text not null check (char_length(customer_email) between 5 and 254),
  service text not null check (char_length(service) between 1 and 100),
  details text not null default '' check (char_length(details) <= 1200),
  booking_date date not null,
  booking_time text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notifications_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_active_slot_unique
  on public.bookings (booking_date, booking_time)
  where status in ('pending', 'confirmed');

create index if not exists bookings_date_idx on public.bookings (booking_date, booking_time);

alter table public.admins enable row level security;
alter table public.bookings enable row level security;

revoke all on public.admins from anon, authenticated;
revoke all on public.bookings from anon, authenticated;
grant select on public.admins to authenticated;
grant select, update on public.bookings to authenticated;

drop policy if exists "Admins can view their own access" on public.admins;
create policy "Admins can view their own access"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can read bookings" on public.bookings;
create policy "Admins can read bookings"
  on public.bookings for select to authenticated
  using (
    exists (
      select 1 from public.admins
      where admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
  on public.bookings for update to authenticated
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
