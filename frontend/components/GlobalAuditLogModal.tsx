"use client";

import * as React from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Terminal,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllActionLogs, type ActionLog } from "@/lib/extensions";

const PAGE_SIZE = 10;

// ── helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ParamBlock({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params);
  if (entries.length === 0)
    return <span className="text-xs text-muted-foreground/40 italic">none</span>;
  return (
    <pre className="text-xs font-mono bg-muted/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap break-all text-foreground/80 leading-relaxed">
      {JSON.stringify(params, null, 2)}
    </pre>
  );
}

// ── log entry row ─────────────────────────────────────────────────────────

function LogEntry({ log }: { log: ActionLog }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {log.success ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-destructive/60 shrink-0" />
        )}

        {/* extension badge */}
        <span className="text-[11px] font-medium rounded-full border border-border px-2 py-0.5 text-muted-foreground/70 bg-muted/40 shrink-0 max-w-[110px] truncate">
          {log.extension_name}
        </span>

        {/* action name */}
        <span className="flex-1 truncate text-sm font-mono text-foreground/80 min-w-0">
          {log.action}
        </span>

        {/* source badge */}
        <span
          className={`text-[10px] font-medium rounded-full border px-2 py-0.5 shrink-0 ${
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
        <div className="border-t border-border px-4 py-4 space-y-4">
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

function LogSkeleton() {
  return (
    <div className="space-y-2.5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}

// ── filter pill ───────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
        active
          ? "bg-primary/10 border-primary/30 text-primary/80"
          : "border-border text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {label}
    </button>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export function GlobalAuditLogModal() {
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<ActionLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [spinning, setSpinning] = React.useState(false);
  const [page, setPage] = React.useState(0);

  // filter state
  const [extFilter, setExtFilter] = React.useState<string>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const load = React.useCallback(async (showSpinner = false) => {
    if (showSpinner) setSpinning(true);
    setLoading(true);
    const data = await getAllActionLogs(200);
    setLogs(data);
    setLoading(false);
    if (showSpinner) setSpinning(false);
  }, []);

  // load on first open
  React.useEffect(() => {
    if (open && logs.length === 0 && !loading) {
      load();
    }
  }, [open, logs.length, loading, load]);

  // reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [extFilter, sourceFilter, statusFilter]);

  // unique extension names from logs
  const extensionNames = React.useMemo(
    () => Array.from(new Set(logs.map((l) => l.extension_name))).sort(),
    [logs]
  );

  // apply filters
  const filtered = React.useMemo(() => {
    return logs.filter((l) => {
      if (extFilter !== "all" && l.extension_name !== extFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (statusFilter === "success" && !l.success) return false;
      if (statusFilter === "error" && l.success) return false;
      return true;
    });
  }, [logs, extFilter, sourceFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageLogs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
      >
        <Activity className="h-3.5 w-3.5" />
        Activity
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Activity log</DialogTitle>
          </DialogHeader>

          {/* filter bar */}
          <div className="px-6 pb-2 flex flex-wrap items-center gap-2 border-b border-border">
            {/* extension filter */}
            {extensionNames.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FilterPill label="all" active={extFilter === "all"} onClick={() => setExtFilter("all")} />
                {extensionNames.map((n) => (
                  <FilterPill key={n} label={n} active={extFilter === n} onClick={() => setExtFilter(n)} />
                ))}
              </div>
            )}

            {/* divider */}
            {extensionNames.length > 1 && (
              <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
            )}

            {/* source filter */}
            <div className="flex items-center gap-1.5">
              <FilterPill label="poke" active={sourceFilter === "poke"} onClick={() => setSourceFilter(sourceFilter === "poke" ? "all" : "poke")} />
              <FilterPill label="hub" active={sourceFilter === "hub"} onClick={() => setSourceFilter(sourceFilter === "hub" ? "all" : "hub")} />
            </div>

            <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

            {/* status filter */}
            <div className="flex items-center gap-1.5">
              <FilterPill label="success" active={statusFilter === "success"} onClick={() => setStatusFilter(statusFilter === "success" ? "all" : "success")} />
              <FilterPill label="error" active={statusFilter === "error"} onClick={() => setStatusFilter(statusFilter === "error" ? "all" : "error")} />
            </div>

            {/* spacer + refresh */}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground/50 tabular-nums">
                {loading ? "" : `${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
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
          </div>

          {/* log list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <LogSkeleton />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Terminal className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">No audit entries yet.</p>
                <p className="mt-0.5 text-xs text-muted-foreground/40">
                  Calls from Claude or the hub will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pageLogs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-border flex items-center justify-between shrink-0">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
