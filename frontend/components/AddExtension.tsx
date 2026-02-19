"use client";

import * as React from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fetchRegistrationPreview, registerExtension, type Capability } from "@/lib/extensions";
import { useRouter } from "next/navigation";

type Step = "idle" | "registering" | "confirm" | "saving" | "done" | "error";

interface RegisterPreview {
  title: string;
  description: string;
  version: string;
  author: string;
  capabilities: Capability[];
}

export function AddExtension() {
  const [url, setUrl] = React.useState("");
  const [step, setStep] = React.useState<Step>("idle");
  const [preview, setPreview] = React.useState<RegisterPreview | null>(null);
  const [error, setError] = React.useState("");
  const [name, setName] = React.useState("");
  const { toast } = useToast();
  const router = useRouter();

  async function handleFetchPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setStep("registering");
    try {
      const result = await fetchRegistrationPreview(url.trim());
      setPreview(result);
      // Use the title from /info as the default name slug
      const defaultName = result.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setName(defaultName);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the extension");
      setStep("error");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || !name.trim()) return;
    setStep("saving");
    try {
      await registerExtension(
        name.trim(),
        url.trim().replace(/\/$/, ""),
        preview.description,
      );
      setStep("done");
      toast(`"${preview.title}" registered successfully`, "success");
      setTimeout(() => {
        setStep("idle");
        setUrl("");
        setName("");
        setPreview(null);
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
    setPreview(null);
    setName("");
  }

  return (
    <div className="space-y-3">
      {/* URL input row */}
      <form onSubmit={step === "confirm" || step === "done" ? (e) => e.preventDefault() : handleFetchPreview} className="flex gap-2">
        <Input
          type="url"
          placeholder="https://my-extension.vercel.app"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (step !== "idle") reset();
          }}
          disabled={step === "registering" || step === "saving"}
          className="font-mono text-sm"
        />
        <Button
          type="submit"
          disabled={!url.trim() || step === "registering" || step === "saving" || step === "confirm" || step === "done"}
          size="default"
          className="shrink-0"
        >
          {step === "registering" ? (
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
      {(step === "confirm" || step === "saving" || step === "done") && preview && (
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            {/* Info from /info */}
            <div className="mb-3">
              <p className="text-sm font-semibold">{preview.title}</p>
              <p className="text-xs text-muted-foreground">{preview.description}</p>
              {(preview.version || preview.author) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[preview.version && `v${preview.version}`, preview.author].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Capability chips */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {preview.capabilities.map((cap) => (
                <Badge key={cap.name} variant="secondary" className="text-xs">
                  {cap.name}
                </Badge>
              ))}
            </div>

            {/* Name + register form */}
            <form onSubmit={handleRegister} className="flex gap-2">
              <Input
                placeholder="Extension slug"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={step === "saving" || step === "done"}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || step === "saving" || step === "done"}
                className="shrink-0"
              >
                {step === "saving" ? (
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
