-- Add metadata columns fetched from extensions' /info endpoint at registration time.
-- Safe to run multiple times (IF NOT EXISTS).

alter table extensions
  add column if not exists title        text not null default '',
  add column if not exists version      text not null default '',
  add column if not exists author       text not null default '',
  add column if not exists icon_url     text not null default '',
  add column if not exists homepage_url text not null default '';
