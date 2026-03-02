-- Action logs: persist every /execute call for debugging in the extension view.

create table if not exists action_logs (
    id             uuid        primary key default gen_random_uuid(),
    extension_name text        not null,
    action         text        not null,
    prompt         text,                               -- optional: user intent / MCP context
    params         jsonb       not null default '{}',  -- parameters that were passed
    success        boolean     not null,
    error          text,                               -- populated when success = false
    result_summary text,                               -- truncated JSON of result data (≤500 chars)
    source         text        not null default 'mcp', -- 'mcp' | 'hub'
    created_at     timestamptz not null default now()
);

create index if not exists action_logs_ext_time
    on action_logs (extension_name, created_at desc);
