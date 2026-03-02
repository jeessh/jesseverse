"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateExtension, type Extension } from "@/lib/extensions";
import { useRouter } from "next/navigation";

interface Props {
  extension: Extension;
  onClose: () => void;
}

export function EditExtensionModal({ extension, onClose }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const [name, setName] = React.useState(extension.name);
  const [url, setUrl] = React.useState(extension.url);
  const [description, setDescription] = React.useState(extension.description ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const updates: { name?: string; url?: string; description?: string } = {};
    if (name.trim() !== extension.name) updates.name = name.trim();
    if (url.trim() !== extension.url) updates.url = url.trim();
    if (description.trim() !== (extension.description ?? "")) updates.description = description.trim();

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const updated = await updateExtension(extension.name, updates);
      toast("Extension updated", "default");
      onClose();
      // navigate to new name if it changed
      router.push(`/extensions/${encodeURIComponent(updated.name)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update extension");
    } finally {
      setLoading(false);
    }
  }

  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Edit extension</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-extension"
              required
            />
          </div>
          <div>
            <label className={labelCls}>URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://my-extension.vercel.app"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this extension do?"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
