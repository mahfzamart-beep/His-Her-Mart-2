create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  platform_code text unique,
  contact_person text,
  phone text,
  email text,
  website_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_website_url_check
    check (website_url is null or website_url ~ '^https?://')
);

create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('packaging','marketing','courier','refund','operations','software','supplier','other')),
  description text not null check (char_length(btrim(description)) between 2 and 240),
  amount numeric(12,2) not null check (amount > 0),
  incurred_on date not null default current_date,
  supplier_id uuid references public.suppliers(id) on delete set null,
  payment_method text check (payment_method is null or payment_method in ('cash','bank','bkash','nagad','card','other')),
  reference text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

alter table public.order_items
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists supplier_cost_snapshot numeric(12,2),
  add column if not exists supplier_order_reference text,
  add column if not exists supplier_fulfillment_status text not null default 'not_submitted';

alter table public.orders
  add column if not exists courier_partner text,
  add column if not exists courier_tracking_number text,
  add column if not exists courier_status_note text,
  add column if not exists handed_over_at timestamptz,
  add column if not exists delivered_at timestamptz;

alter table public.order_items
  add constraint order_items_supplier_cost_snapshot_check
  check (supplier_cost_snapshot is null or supplier_cost_snapshot >= 0);

alter table public.order_items
  add constraint order_items_supplier_fulfillment_status_check
  check (supplier_fulfillment_status in ('not_submitted','submitted','confirmed','packed','shipped','delivered','cancelled'));

insert into public.suppliers (name, platform_code, notes)
values
  ('ShopBase BD', 'shopbase_bd', 'Manual supplier fulfilment. No live API sync is configured. Verify availability and price with the supplier before confirming each order.'),
  ('DropshippingBD', 'dropshippingbd', 'Manual supplier fulfilment. No live API sync is configured. Verify availability and price with the supplier before confirming each order.')
on conflict (platform_code) do nothing;

update public.products p
set supplier_id = s.id,
    updated_at = now()
from public.suppliers s
where p.supplier_id is null
  and p.fulfillment_source = s.platform_code;

create or replace function private.capture_order_item_supplier_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_cost numeric(12,2);
  v_supplier_id uuid;
begin
  if new.product_id is not null then
    select p.supplier_cost_price, p.supplier_id
      into v_cost, v_supplier_id
    from public.products p
    where p.id = new.product_id;

    new.supplier_cost_snapshot := coalesce(new.supplier_cost_snapshot, v_cost);
    new.supplier_id := coalesce(new.supplier_id, v_supplier_id);

    if new.supplier_id is null and new.fulfillment_source is not null then
      select s.id into v_supplier_id
      from public.suppliers s
      where s.platform_code = new.fulfillment_source
      limit 1;
      new.supplier_id := v_supplier_id;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists order_items_capture_supplier_snapshot on public.order_items;
create trigger order_items_capture_supplier_snapshot
before insert on public.order_items
for each row execute function private.capture_order_item_supplier_snapshot();

create index if not exists suppliers_active_name_idx on public.suppliers (is_active, name);
create index if not exists expenses_incurred_on_idx on public.operating_expenses (incurred_on desc);
create index if not exists expenses_supplier_idx on public.operating_expenses (supplier_id);
create index if not exists admin_activity_created_idx on public.admin_activity_log (created_at desc);
create index if not exists order_items_supplier_status_idx on public.order_items (supplier_id, supplier_fulfillment_status);
create index if not exists orders_courier_tracking_idx on public.orders (courier_tracking_number);

alter table public.suppliers enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.admin_activity_log enable row level security;

revoke all on public.suppliers from anon, authenticated;
revoke all on public.operating_expenses from anon, authenticated;
revoke all on public.admin_activity_log from anon, authenticated;

grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.operating_expenses to authenticated;
grant select, insert on public.admin_activity_log to authenticated;

drop policy if exists "Admins manage suppliers" on public.suppliers;
create policy "Admins manage suppliers"
on public.suppliers for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins manage operating expenses" on public.operating_expenses;
create policy "Admins manage operating expenses"
on public.operating_expenses for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins read activity log" on public.admin_activity_log;
create policy "Admins read activity log"
on public.admin_activity_log for select to authenticated
using (private.is_admin());

drop policy if exists "Admins append activity log" on public.admin_activity_log;
create policy "Admins append activity log"
on public.admin_activity_log for insert to authenticated
with check (private.is_admin());
