"use client";

import * as React from "react";
import { X, Loader2, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateExtension, type Extension } from "@/lib/extensions";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Props {
  extension: Extension;
  onClose: () => void;
}

export function EditExtensionModal({ extension, onClose }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(extension.name);
  const [url, setUrl] = React.useState(extension.url);
  const [description, setDescription] = React.useState(extension.description ?? "");
  const [iconUrl, setIconUrl] = React.useState(extension.icon_url ?? "");  const [iconDirty, setIconDirty] = React.useState(false);  const [uploading, setUploading] = React.useState(false);
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slug", name.trim() || "icon");

      const res = await fetch("/api/upload-icon", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (!json.url) throw new Error("Upload succeeded but no URL returned");
      setIconUrl(json.url);
      setIconDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Build a sparse patch — only include fields that actually changed.
    // This keeps the backend lean and preserves the "No fields to update" guard.
    const updates: { name?: string; url?: string; description?: string; icon_url?: string } = {};

    if (name.trim() !== extension.name)
      updates.name = name.trim();
    if (url.trim() !== extension.url)
      updates.url = url.trim();
    if (description.trim() !== (extension.description ?? ""))
      updates.description = description.trim();
    if (iconDirty || (iconUrl ?? "").trim() !== (extension.icon_url ?? ""))
      updates.icon_url = (iconUrl ?? "").trim();

    // Nothing changed — close without making a network request.
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const updated = await updateExtension(extension.name, updates);
      toast("Extension updated", "default");
      onClose();
      router.push(`/extensions/${encodeURIComponent(updated.name)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update extension");
    } finally {
      setLoading(false);
    }
  }

  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";
  const busy = loading || uploading;

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

          {/* icon section */}
          <div>
            <label className={labelCls}>Icon</label>
            <div className="flex items-center gap-3">
              {/* thumbnail */}
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/50">
                {iconUrl ? (
                  <Image src={iconUrl} alt="icon preview" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* upload trigger */}
              <div className="flex flex-1 flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Uploading…" : "Upload image"}
                </Button>
                <p className="text-[10px] text-muted-foreground/50">PNG, JPG, WebP, SVG · max 512 KB</p>
              </div>
            </div>

            {/* or paste URL */}
            <div className="mt-2">
              <Input
                value={iconUrl}
                onChange={(e) => { setIconUrl(e.target.value); setIconDirty(true); }}
                placeholder="or paste a URL"
                className="text-xs"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
