-- Cloud Momos foundation: configurable Sylhet delivery zones and area-targeted homepage ads.
-- Safe additive migration: existing customer/order/product records are not modified.

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  city text not null default 'Sylhet' check (city = 'Sylhet'),
  delivery_charge numeric(10,2) not null check (delivery_charge >= 0),
  is_active boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_areas_name_unique unique (name)
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text,
  image_url text not null check (image_url ~ '^https?://'),
  button_text text not null default 'Explore' check (char_length(button_text) between 1 and 40),
  target_url text,
  product_id uuid references public.products(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertisements_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint advertisements_target_url_check check (target_url is null or target_url ~ '^(/|https?://)')
);

create table if not exists public.advertisement_delivery_areas (
  advertisement_id uuid not null references public.advertisements(id) on delete cascade,
  delivery_area_id uuid not null references public.delivery_areas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (advertisement_id, delivery_area_id)
);

create index if not exists delivery_areas_active_sort_idx
  on public.delivery_areas (is_active, sort_order, name);
create index if not exists advertisements_active_schedule_idx
  on public.advertisements (is_active, starts_at, ends_at, display_order);
create index if not exists advertisement_delivery_areas_area_idx
  on public.advertisement_delivery_areas (delivery_area_id, advertisement_id);

alter table public.delivery_areas enable row level security;
alter table public.advertisements enable row level security;
alter table public.advertisement_delivery_areas enable row level security;

revoke all on public.delivery_areas from anon, authenticated;
revoke all on public.advertisements from anon, authenticated;
revoke all on public.advertisement_delivery_areas from anon, authenticated;

grant select on public.delivery_areas to anon, authenticated;
grant select on public.advertisements to anon, authenticated;
grant select on public.advertisement_delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;
grant insert, update, delete on public.advertisements to authenticated;
grant insert, update, delete on public.advertisement_delivery_areas to authenticated;

drop policy if exists "Public can read active delivery areas" on public.delivery_areas;
create policy "Public can read active delivery areas"
on public.delivery_areas for select to anon, authenticated
using (is_active = true or private.is_admin());

drop policy if exists "Admins manage delivery areas" on public.delivery_areas;
create policy "Admins manage delivery areas"
on public.delivery_areas for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Public can read currently published advertisements" on public.advertisements;
create policy "Public can read currently published advertisements"
on public.advertisements for select to anon, authenticated
using (
  private.is_admin()
  or (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  )
);

drop policy if exists "Admins manage advertisements" on public.advertisements;
create policy "Admins manage advertisements"
on public.advertisements for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Public can read published advertisement area links" on public.advertisement_delivery_areas;
create policy "Public can read published advertisement area links"
on public.advertisement_delivery_areas for select to anon, authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.advertisements a
    where a.id = advertisement_id
      and a.is_active = true
      and (a.starts_at is null or a.starts_at <= now())
      and (a.ends_at is null or a.ends_at > now())
  )
);

drop policy if exists "Admins manage advertisement area links" on public.advertisement_delivery_areas;
create policy "Admins manage advertisement area links"
on public.advertisement_delivery_areas for all to authenticated
using (private.is_admin())
with check (private.is_admin());
