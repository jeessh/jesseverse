-- Jesseverse hub schema
-- Run this in the Supabase SQL editor.
-- This is the only schema the hub owns.
-- Each extension you build will add its own schema separately.

create table if not exists extensions (
    id            uuid primary key default gen_random_uuid(),
    name          text not null unique,   -- slug used in MCP: use("expenses", ...)
    url           text not null,          -- base URL of the extension backend
    description   text default '',
    registered_at timestamptz not null default now()
);
