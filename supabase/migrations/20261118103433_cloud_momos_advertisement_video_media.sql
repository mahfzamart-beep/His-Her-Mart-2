-- Cloud Momos promotional video support.
-- Existing advertisement records remain images by default.
alter table public.advertisements
  add column if not exists media_type text not null default 'image';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'advertisements_media_type_check'
      and conrelid = 'public.advertisements'::regclass
  ) then
    alter table public.advertisements
      add constraint advertisements_media_type_check
      check (media_type in ('image', 'video'));
  end if;
end $$;

-- Expand the existing admin-protected media bucket for short promotional videos.
update storage.buckets
set file_size_limit = 41943040,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]::text[]
where id = 'product-images';
