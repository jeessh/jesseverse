"use client";

import * as React from "react";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { probeExtension, registerExtension, type Capability } from "@/lib/extensions";
import { useRouter } from "next/navigation";

type Step = "idle" | "probing" | "confirm" | "registering" | "done" | "error";

interface ProbeResult {
  name: string;
  description: string;
  capabilities: Capability[];
}

export function AddExtension() {
  const [url, setUrl] = React.useState("");
  const [step, setStep] = React.useState<Step>("idle");
  const [probeResult, setProbeResult] = React.useState<ProbeResult | null>(null);
  const [error, setError] = React.useState("");
  const [name, setName] = React.useState("");
  const { toast } = useToast();
  const router = useRouter();

  async function handleProbe(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setStep("probing");
    try {
      const result = await probeExtension(url.trim());
      setProbeResult(result);
      // Derive a default name from the URL hostname
      const hostname = new URL(url.trim().replace(/\/$/, "")).hostname;
      const defaultName = hostname.replace(/^www\./, "").split(".")[0];
      setName(defaultName);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the extension");
      setStep("error");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!probeResult || !name.trim()) return;
    setStep("registering");
    try {
      await registerExtension(
        name.trim(),
        url.trim().replace(/\/$/, ""),
        probeResult.capabilities.map((c) => c.name).join(", ")
      );
      setStep("done");
      toast(`Extension "${name.trim()}" registered successfully`, "success");
      setTimeout(() => {
        setStep("idle");
        setUrl("");
        setName("");
        setProbeResult(null);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register");
      setStep("error");
    }
  }

  function reset() {
    setStep("idle");
    setError("");
    setProbeResult(null);
    setName("");
  }

  return (
    <div className="space-y-3">
      {/* URL input row */}
      <form onSubmit={step === "confirm" || step === "done" ? (e) => e.preventDefault() : handleProbe} className="flex gap-2">
        <Input
          type="url"
          placeholder="https://my-extension.vercel.app"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (step !== "idle") reset();
          }}
          disabled={step === "probing" || step === "registering"}
          className="font-mono text-sm"
        />
        <Button
          type="submit"
          disabled={!url.trim() || step === "probing" || step === "registering" || step === "confirm" || step === "done"}
          size="default"
          className="shrink-0"
        >
          {step === "probing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" />
              Connect
            </>
          )}
        </Button>
      </form>

      {/* Error state */}
      {step === "error" && (
        <Card className="border-destructive/50 bg-destructive/10 animate-fade-in">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive-foreground">Could not connect</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm state */}
      {(step === "confirm" || step === "registering" || step === "done") && probeResult && (
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              {step === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {probeResult.capabilities.length}{" "}
                {probeResult.capabilities.length === 1 ? "action" : "actions"} found
              </p>
            </div>

            {/* Capability chips */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {probeResult.capabilities.map((cap) => (
                <Badge key={cap.name} variant="secondary" className="text-xs">
                  {cap.name}
                </Badge>
              ))}
            </div>

            {/* Name + register form */}
            <form onSubmit={handleRegister} className="flex gap-2">
              <Input
                placeholder="Extension name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={step === "registering" || step === "done"}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || step === "registering" || step === "done"}
                className="shrink-0"
              >
                {step === "registering" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : step === "done" ? (
                  "Registered!"
                ) : (
                  "Register"
                )}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={reset} className="shrink-0 text-muted-foreground">
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
