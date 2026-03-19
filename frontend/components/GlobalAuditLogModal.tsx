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
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllActionLogs,
  getActionLogAnalytics,
  type ActionLog,
  type ActionLogAnalytics,
} from "@/lib/extensions";

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
  const [view, setView] = React.useState<"logs" | "analytics">("logs");
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<ActionLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [spinning, setSpinning] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const [page, setPage] = React.useState(0);

  // filter state
  const [extFilter, setExtFilter] = React.useState<string>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // extension names for filter pills — loaded once from extensions API
  const [extensionNames, setExtensionNames] = React.useState<string[]>([]);
  const [analytics, setAnalytics] = React.useState<ActionLogAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [analyticsDays, setAnalyticsDays] = React.useState<number>(30);

  // core fetch — uses explicit args to avoid stale closure issues
  const doFetch = React.useCallback(async (
    fetchPage: number,
    ext: string,
    src: string,
    status: string,
    showSpinner = false,
  ) => {
    if (showSpinner) setSpinning(true);
    setLoading(true);
    const params: Parameters<typeof getAllActionLogs>[0] = {
      limit: PAGE_SIZE,
      offset: fetchPage * PAGE_SIZE,
    };
    if (ext !== "all") params.extensionName = ext;
    if (src !== "all") params.source = src;
    if (status === "success") params.success = true;
    if (status === "error") params.success = false;
    const result = await getAllActionLogs(params);
    setLogs(result.data);
    setTotal(result.total);
    setLoading(false);
    if (showSpinner) setSpinning(false);
  }, []);

  const fetchAnalytics = React.useCallback(async (
    ext: string,
    src: string,
    days: number,
  ) => {
    setAnalyticsLoading(true);
    const result = await getActionLogAnalytics({
      days,
      extensionName: ext === "all" ? undefined : ext,
      source: src === "all" ? undefined : src,
    });
    setAnalytics(result);
    setAnalyticsLoading(false);
  }, []);

  // load on first open
  React.useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      fetch("/api/extensions")
        .then((r) => r.json())
        .then((exts: { name: string }[]) =>
          setExtensionNames(exts.map((e) => e.name).sort())
        )
        .catch(() => {});
      doFetch(0, "all", "all", "all");
      fetchAnalytics("all", "all", analyticsDays);
    }
  }, [open, initialized, doFetch, fetchAnalytics, analyticsDays]);

  const handleFilterChange = React.useCallback((
    ext: string,
    src: string,
    status: string,
  ) => {
    setExtFilter(ext);
    setSourceFilter(src);
    setStatusFilter(status);
    setPage(0);
    doFetch(0, ext, src, status);
    fetchAnalytics(ext, src, analyticsDays);
  }, [doFetch, fetchAnalytics, analyticsDays]);

  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage);
    doFetch(newPage, extFilter, sourceFilter, statusFilter);
  }, [doFetch, extFilter, sourceFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageLogs = logs;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary/75 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.2)] hover:border-primary/40 hover:bg-primary/15 hover:text-primary hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.35)] transition-all duration-200"
      >
        <Activity className="h-3.5 w-3.5" />
        Activity
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Activity log</DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-2 flex items-center gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setView("logs")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                view === "logs"
                  ? "bg-primary/10 border-primary/30 text-primary/80"
                  : "border-border text-muted-foreground/70 hover:bg-muted/60"
              }`}
            >
              Logs
            </button>
            <button
              type="button"
              onClick={() => setView("analytics")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                view === "analytics"
                  ? "bg-primary/10 border-primary/30 text-primary/80"
                  : "border-border text-muted-foreground/70 hover:bg-muted/60"
              }`}
            >
              Analytics
            </button>
          </div>

          {/* filter bar */}
          <div className="px-6 pb-2 pt-2 flex flex-wrap items-center gap-2 border-b border-border">
            {/* extension filter */}
            {extensionNames.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FilterPill label="all" active={extFilter === "all"} onClick={() => handleFilterChange("all", sourceFilter, statusFilter)} />
                {extensionNames.map((n) => (
                  <FilterPill key={n} label={n} active={extFilter === n} onClick={() => handleFilterChange(n, sourceFilter, statusFilter)} />
                ))}
              </div>
            )}

            {/* divider */}
            {extensionNames.length > 1 && (
              <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
            )}

            {/* source filter */}
            <div className="flex items-center gap-1.5">
              <FilterPill label="poke" active={sourceFilter === "poke"} onClick={() => handleFilterChange(extFilter, sourceFilter === "poke" ? "all" : "poke", statusFilter)} />
              <FilterPill label="hub" active={sourceFilter === "hub"} onClick={() => handleFilterChange(extFilter, sourceFilter === "hub" ? "all" : "hub", statusFilter)} />
            </div>

            <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

            {/* status filter */}
            <div className="flex items-center gap-1.5">
              <FilterPill label="success" active={statusFilter === "success"} onClick={() => handleFilterChange(extFilter, sourceFilter, statusFilter === "success" ? "all" : "success")} />
              <FilterPill label="error" active={statusFilter === "error"} onClick={() => handleFilterChange(extFilter, sourceFilter, statusFilter === "error" ? "all" : "error")} />
            </div>

            {/* spacer + refresh */}
            <div className="ml-auto flex items-center gap-3">
              {view === "analytics" && (
                <select
                  value={analyticsDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setAnalyticsDays(days);
                    fetchAnalytics(extFilter, sourceFilter, days);
                  }}
                  className="h-7 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground"
                >
                  <option value={7}>7d</option>
                  <option value={14}>14d</option>
                  <option value={30}>30d</option>
                  <option value={90}>90d</option>
                </select>
              )}
              <span className="text-xs text-muted-foreground/50 tabular-nums">
                {view === "logs"
                  ? loading
                    ? ""
                    : `${total} event${total === 1 ? "" : "s"}`
                  : analytics
                    ? `${analytics.totals.events} event${analytics.totals.events === 1 ? "" : "s"}`
                    : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  doFetch(page, extFilter, sourceFilter, statusFilter, true);
                  fetchAnalytics(extFilter, sourceFilter, analyticsDays);
                }}
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
            {view === "logs" && loading ? (
              <LogSkeleton />
            ) : view === "logs" && logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Terminal className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">No audit entries yet.</p>
                <p className="mt-0.5 text-xs text-muted-foreground/40">
                  Calls from Claude or the hub will appear here.
                </p>
              </div>
            ) : view === "logs" ? (
              <div className="space-y-2.5">
                {pageLogs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            ) : analyticsLoading ? (
              <LogSkeleton />
            ) : !analytics ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">No analytics data available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Events</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{analytics.totals.events}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Success Rate</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{analytics.totals.success_rate}%</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Unique Actions</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{analytics.totals.unique_actions}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Extensions</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{analytics.totals.unique_extensions}</p>
                  </div>
                </div>

                {analytics.sampled && (
                  <p className="text-xs text-muted-foreground/60">
                    Showing {analytics.sample_size} of {analytics.total_matching} matching events.
                  </p>
                )}

                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Top Actions</p>
                  {analytics.top_actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60">No action data.</p>
                  ) : (
                    analytics.top_actions.map((item) => {
                      const max = analytics.top_actions[0]?.count || 1;
                      const width = Math.max(6, Math.round((item.count / max) * 100));
                      return (
                        <div key={item.action} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono truncate">{item.action}</span>
                            <span className="tabular-nums text-muted-foreground/70">{item.count}</span>
                          </div>
                          <div className="h-1.5 rounded bg-muted/60 overflow-hidden">
                            <div className="h-full bg-primary/70" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Top Extensions</p>
                  {analytics.top_extensions.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60">No extension data.</p>
                  ) : (
                    analytics.top_extensions.map((item) => (
                      <div key={item.extension} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{item.extension}</span>
                        <span className="tabular-nums text-muted-foreground/70">{item.count}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Sources</p>
                  {analytics.sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60">No source data.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {analytics.sources.map((src) => (
                        <span key={src.source} className="text-xs rounded-full border border-border bg-muted/40 px-2 py-0.5">
                          {src.source}: {src.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Daily Activity</p>
                  <div className="max-h-48 overflow-y-auto border border-border/70 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          <th className="text-left font-medium px-2 py-1.5">Date</th>
                          <th className="text-right font-medium px-2 py-1.5">Total</th>
                          <th className="text-right font-medium px-2 py-1.5">Success</th>
                          <th className="text-right font-medium px-2 py-1.5">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...analytics.daily].reverse().map((d) => (
                          <tr key={d.date} className="border-t border-border/60">
                            <td className="px-2 py-1.5 tabular-nums">{d.date}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{d.total}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{d.success}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{d.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* pagination */}
          {view === "logs" && totalPages > 1 && (
            <div className="px-6 py-3 border-t border-border flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(0, page - 1))}
                disabled={page === 0 || loading}
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
                onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1 || loading}
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
