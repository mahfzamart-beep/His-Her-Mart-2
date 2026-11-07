alter table public.products
  add column if not exists supplier_cost_price numeric(12,2),
  add column if not exists supplier_original_description text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_supplier_cost_price_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_supplier_cost_price_nonnegative
      check (supplier_cost_price is null or supplier_cost_price >= 0);
  end if;
end
$$;
