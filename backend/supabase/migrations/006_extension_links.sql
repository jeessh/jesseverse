-- Add external link fields to extensions
alter table extensions
  add column if not exists supabase_url text,
  add column if not exists vercel_url   text;
