alter table public.categories
  add column if not exists size_profile text not null default 'none';

alter table public.categories
  drop constraint if exists categories_size_profile_check;

alter table public.categories
  add constraint categories_size_profile_check
  check (size_profile = any (array['none'::text, 'apparel'::text, 'footwear'::text]));

alter table public.products
  drop constraint if exists products_size_type_check;

alter table public.products
  add constraint products_size_type_check
  check (size_type = any (array[
    'none'::text,
    'numeric'::text,
    'letter'::text,
    'custom'::text,
    'apparel_alpha'::text,
    'apparel_numeric'::text,
    'shoe_eu'::text,
    'shoe_uk'::text,
    'shoe_us'::text
  ]));

update public.categories
set size_profile = 'apparel'
where slug in ('mens-fashion', 'womens-fashion', 'kids-baby')
  and size_profile = 'none';

update public.categories
set size_profile = 'footwear'
where slug = 'shoes-footwear'
  and size_profile = 'none';
