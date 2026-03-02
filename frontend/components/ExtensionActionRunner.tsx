"use client";

import * as React from "react";
import { Loader2, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { executeAction, type Capability } from "@/lib/extensions";

interface Props {
  extensionName: string;
  capability: Capability;
  readOnly?: boolean;
}

type RunState = "idle" | "running" | "success" | "error";

export function ExtensionActionRunner({ extensionName, capability, readOnly = false }: Props) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<RunState>("idle");
  const [result, setResult] = React.useState<string>("");

  const params = capability.parameters ?? [];

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    // reset result when inputs change
    if (state !== "idle") {
      setState("idle");
      setResult("");
    }
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setState("running");
    setResult("");
    try {
      // coerce numeric params — inputs always come back as strings
      const coerced: Record<string, unknown> = {};
      for (const p of params) {
        const raw = values[p.name] ?? "";
        if (p.type === "number" && raw !== "") {
          coerced[p.name] = Number(raw);
        } else if (raw !== "") {
          coerced[p.name] = raw;
        }
      }
      const res = await executeAction(extensionName, capability.name, coerced);
      if (!res.success) {
        setState("error");
        setResult(res.error ?? "The extension returned an error.");
        return;
      }
      setState("success");
      setResult(
        res.data !== undefined && res.data !== null
          ? typeof res.data === "string"
            ? res.data
            : JSON.stringify(res.data, null, 2)
          : "Done."
      );
    } catch (err) {
      setState("error");
      setResult(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* capability header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm font-medium truncate">{capability.name}</span>
          {params.length > 0 && (
            <span className="text-xs text-muted-foreground/60 shrink-0">
              {params.length} param{params.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          {state === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {state === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>
      </button>

      {/* description (always visible below header) */}
      {capability.description && (
        <p className="px-5 pb-4 text-sm text-muted-foreground/70 -mt-1 leading-relaxed">{capability.description}</p>
      )}

      {/* expanded: read-only param reference */}
      {open && readOnly && (
        <div className="border-t border-border px-5 py-4">
          {params.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic">No parameters.</p>
          ) : (
            <div className="space-y-4">
              {params.map((param) => (
                <div key={param.name} className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">{param.name}</span>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-[18px] font-normal">
                      {param.type}
                    </Badge>
                    {param.required ? (
                      <span className="text-xs text-destructive font-medium">required</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">optional</span>
                    )}
                  </div>
                  {param.description && (
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{param.description}</p>
                  )}
                  {param.enum && param.enum.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground/50">enum:</span>
                      {param.enum.map((v) => (
                        <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-mono">{v}</code>
                      ))}
                    </div>
                  )}
                  {param.example && !(param.enum && param.enum.length > 0) && (
                    <p className="text-xs text-muted-foreground/50">
                      e.g.{" "}<code className="font-mono bg-muted px-1.5 py-0.5 rounded-md">{param.example}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* expanded: interactive form */}
      {open && !readOnly && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <form onSubmit={handleRun} className="space-y-4">
            {params.map((param) => (
              <div key={param.name} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium font-mono">{param.name}</label>
                  <Badge
                    variant="outline"
                    className="text-[11px] px-1.5 py-0 h-[18px] font-normal"
                  >
                    {param.type}
                  </Badge>
                  {param.required && (
                    <span className="text-xs text-destructive font-medium">required</span>
                  )}
                </div>
                <Input
                  value={values[param.name] ?? ""}
                  onChange={(e) => setValue(param.name, e.target.value)}
                  placeholder={`Enter ${param.name}…`}
                  required={param.required}
                  className="h-9 text-sm font-mono"
                  type={param.type === "number" ? "number" : "text"}
                />
              </div>
            ))}

            <Button
              type="submit"
              size="sm"
              disabled={state === "running"}
              className="mt-1"
            >
              {state === "running" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Run
            </Button>
          </form>

          {/* result */}
          {result && (
            <Card className={state === "error" ? "border-destructive/50 bg-destructive/5" : "bg-muted/40"}>
              <CardContent className="p-4">
                <pre className={`text-sm whitespace-pre-wrap break-all font-mono leading-relaxed ${
                  state === "error" ? "text-destructive" : "text-foreground/80"
                }`}>
                  {result}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
