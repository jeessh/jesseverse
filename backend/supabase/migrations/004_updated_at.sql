-- Add updated_at to extensions table.
-- Backfills existing rows to registered_at so the value is never null.

alter table extensions
    add column if not exists updated_at timestamptz;

update extensions
    set updated_at = registered_at
    where updated_at is null;

alter table extensions
    alter column updated_at set not null,
    alter column updated_at set default now();
