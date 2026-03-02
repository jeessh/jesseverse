"use client";

import * as React from "react";
import { X, Loader2, Upload, ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateExtension, type Extension } from "@/lib/extensions";
import { resolveLucideIcon } from "@/lib/icon-resolver";
import type { LucideIcon } from "lucide-react";
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
  const [iconUrl, setIconUrl] = React.useState(extension.icon_url ?? "");
  const [iconDirty, setIconDirty] = React.useState(false);
  const [iconSearch, setIconSearch] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [allIcons, setAllIcons] = React.useState<[string, LucideIcon][] | null>(null);

  // Load icon list on mount so it's ready when the user types
  React.useEffect(() => {
    import("@/lib/lucide-all")
      .then((m) => setAllIcons(m.allLucideIconEntries))
      .catch((err) => console.error("[icon picker] failed to load lucide-all:", err));
  }, []);

  const filteredIcons = React.useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q || !allIcons) return [];
    return allIcons
      .filter(([name]) => name.toLowerCase().includes(q))
      .slice(0, 48);
  }, [iconSearch, allIcons]);
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
                {(() => {
                  const LI = iconUrl ? resolveLucideIcon(iconUrl) : null;
                  if (LI) return (
                    <div className="flex h-full w-full items-center justify-center">
                      <LI className="h-5 w-5 text-primary/70" strokeWidth={1.5} />
                    </div>
                  );
                  if (iconUrl) return (
                    <Image src={iconUrl} alt="icon preview" fill className="object-cover" unoptimized />
                  );
                  return (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  );
                })()}
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
                value={iconUrl.startsWith("lucide:") ? "" : iconUrl}
                onChange={(e) => { setIconUrl(e.target.value); setIconDirty(true); }}
                placeholder={iconUrl.startsWith("lucide:") ? iconUrl : "or paste a URL"}
                className="text-xs"
              />
            </div>

            {/* lucide icon search */}
            <div className="mt-2 space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
                <Input
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="or search Lucide icons…"
                  className="pl-7 text-xs"
                />
              </div>
              {filteredIcons.length > 0 && (
                <div className="grid grid-cols-8 gap-0.5 max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1">
                  {filteredIcons.map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      className={`flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted ${
                        iconUrl === `lucide:${name}` ? "bg-primary/15 ring-1 ring-primary/40" : ""
                      }`}
                      onClick={() => {
                        setIconUrl(`lucide:${name}`);
                        setIconDirty(true);
                        setIconSearch("");
                      }}
                    >
                      <Icon className="h-3.5 w-3.5 text-foreground/70" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              )}
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
