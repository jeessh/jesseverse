-- Create a public storage bucket for extension icons.
-- Run this in the Supabase SQL editor (or via supabase db push).

-- 1. Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'extension-icons',
  'extension-icons',
  true,
  524288,          -- 512 KB max per icon
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do nothing;

-- 2. Anyone can read (objects are public)
create policy "Public read extension icons"
  on storage.objects for select
  using ( bucket_id = 'extension-icons' );

-- 3. Only service-role (our API route) can upload / overwrite / delete
create policy "Service upload extension icons"
  on storage.objects for insert
  with check ( bucket_id = 'extension-icons' );

create policy "Service update extension icons"
  on storage.objects for update
  using ( bucket_id = 'extension-icons' );

create policy "Service delete extension icons"
  on storage.objects for delete
  using ( bucket_id = 'extension-icons' );
