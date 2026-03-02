"use client";

import * as React from "react";
import { RefreshCw, ChevronDown, CheckCircle2, XCircle, Terminal, ChevronLeft, ChevronRight } from "lucide-react";
import { getActionLogs, type ActionLog } from "@/lib/extensions";

const PAGE_SIZE = 5;

interface Props {
  extensionName: string;
  initialLogs: ActionLog[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ParamBlock({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params);
  if (entries.length === 0)
    return <span className="text-muted-foreground/50 italic text-xs">none</span>;
  return (
    <pre className="text-xs font-mono bg-muted/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap break-all text-foreground/80 leading-relaxed">
      {JSON.stringify(params, null, 2)}
    </pre>
  );
}

function LogSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card overflow-hidden animate-pulse"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-3.5 w-3.5 rounded-full bg-muted/70 shrink-0" />
            <div className="h-2.5 rounded bg-muted/70 flex-1 max-w-[140px]" />
            <div className="h-2.5 rounded bg-muted/50 w-10 ml-auto" />
            <div className="h-3.5 w-3.5 rounded bg-muted/40 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogEntry({ log }: { log: ActionLog }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {log.success ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        )}

        <span className="font-mono text-sm font-medium truncate flex-1 min-w-0">
          {log.action}
        </span>

        <span
          className={`text-[11px] px-2 py-0.5 rounded-md border shrink-0 font-normal tracking-wide ${
            log.source === "poke"
              ? "border-primary/30 text-primary/70 bg-primary/5"
              : "border-orange-400/40 text-orange-400/80 bg-orange-400/5"
          }`}
        >
          {log.source}
        </span>

        <span className="text-xs text-muted-foreground/50 shrink-0 tabular-nums">
          {relativeTime(log.created_at)}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground/50 tabular-nums">
            {new Date(log.created_at).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>

          {log.prompt && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Prompt
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{log.prompt}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
              Parameters
            </p>
            <ParamBlock params={log.params} />
          </div>

          {!log.success && log.error && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-destructive/60">
                Error
              </p>
              <pre className="text-xs font-mono bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5 whitespace-pre-wrap break-all text-destructive/80 leading-relaxed">
                {log.error}
              </pre>
            </div>
          )}

          {log.success && log.result_summary && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Result
              </p>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap break-all text-foreground/80 leading-relaxed">
                {log.result_summary}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExtensionActionLog({ extensionName, initialLogs }: Props) {
  const [logs, setLogs] = React.useState<ActionLog[]>(initialLogs);
  const [loading, setLoading] = React.useState(false);
  const [spinning, setSpinning] = React.useState(false);
  const [page, setPage] = React.useState(0);

  const load = React.useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setSpinning(true);
      setLoading(true);
      const data = await getActionLogs(extensionName);
      setLogs(data);
      setLoading(false);
      if (showSpinner) setSpinning(false);
    },
    [extensionName]
  );

  // no mount fetch — data comes from server via initialLogs

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const pageLogs = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      {/* toolbar: entry count + refresh */}
      <div className="mb-3 flex items-center justify-between min-h-[28px]">
        <span className="text-xs text-muted-foreground/70 tabular-nums">
          {loading ? "" : `${logs.length} ${logs.length === 1 ? "event" : "events"}`}
          {!loading && logs.length > PAGE_SIZE && (
            <> &middot; {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, logs.length)}</>
          )}
        </span>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={spinning}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground/75 hover:text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <LogSkeleton />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
          <Terminal className="h-6 w-6 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/60">No audit entries yet.</p>
          <p className="mt-0.5 text-xs text-muted-foreground/40">Calls made via MCP will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageLogs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-xs text-muted-foreground/50 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
