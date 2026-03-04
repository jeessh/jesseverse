alter table extensions
  add column if not exists visibility text not null default 'online'
  check (visibility in ('online', 'under_construction', 'offline'));
