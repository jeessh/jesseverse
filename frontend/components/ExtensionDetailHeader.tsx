"use client";

import * as React from "react";
import {
  Pencil,
  Trash2,
  Loader2,
  Upload,
  ImageIcon,
  Search,
  X,
  ExternalLink,
  Blocks,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateExtension, removeExtension, type Extension } from "@/lib/extensions";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

interface Props {
  extension: Extension;
  isOnline: boolean;
}

export function ExtensionDetailHeader({ extension, isOnline }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ── edit state ────────────────────────────────────────────────────
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(extension.name);
  const [url, setUrl] = React.useState(extension.url);
  const [description, setDescription] = React.useState(extension.description ?? "");
  const [iconUrl, setIconUrl] = React.useState(extension.icon_url ?? "");
  const [iconDirty, setIconDirty] = React.useState(false);
  const [iconSearch, setIconSearch] = React.useState("");
  const [allIcons, setAllIcons] = React.useState<[string, LucideIcon][] | null>(null);

  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // ── delete state ──────────────────────────────────────────────────
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Pre-load icon list when entering edit mode
  React.useEffect(() => {
    if (!editing) return;
    import("@/lib/lucide-all")
      .then((m) => setAllIcons(m.allLucideIconEntries))
      .catch((err) => console.error("[icon picker] failed to load lucide-all:", err));
  }, [editing]);

  const filteredIcons = React.useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q || !allIcons) return [];
    return allIcons.filter(([n]) => n.toLowerCase().includes(q)).slice(0, 48);
  }, [iconSearch, allIcons]);

  // ── icon resolution for thumbnail (view mode) ────────────────────────
  const [viewIcon, setViewIcon] = React.useState<LucideIcon | null>(null);
  React.useEffect(() => {
    const url = extension.icon_url;
    if (!url?.startsWith("lucide:")) return;
    import("@/lib/lucide-all").then((m) => {
      setViewIcon((m.lucideIconMap[url.slice(7)] as LucideIcon) ?? null);
    });
  }, [extension.icon_url]);

  // ── icon resolution for thumbnail (edit mode thumbnail) ──────────────
  const LucideThumb = React.useMemo(() => {
    if (!iconUrl.startsWith("lucide:") || !allIcons) return null;
    const name = iconUrl.slice(7);
    return allIcons.find(([n]) => n === name)?.[1] ?? null;
  }, [iconUrl, allIcons]);

  function cancelEdit() {
    setEditing(false);
    setName(extension.name);
    setUrl(extension.url);
    setDescription(extension.description ?? "");
    setIconUrl(extension.icon_url ?? "");
    setIconDirty(false);
    setIconSearch("");
    setError("");
  }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const updates: { name?: string; url?: string; description?: string; icon_url?: string } = {};
    if (name.trim() !== extension.name) updates.name = name.trim();
    if (url.trim() !== extension.url) updates.url = url.trim();
    if (description.trim() !== (extension.description ?? "")) updates.description = description.trim();
    if (iconDirty || (iconUrl ?? "").trim() !== (extension.icon_url ?? ""))
      updates.icon_url = (iconUrl ?? "").trim();

    if (Object.keys(updates).length === 0) { setEditing(false); return; }

    setSaving(true);
    try {
      const updated = await updateExtension(extension.name, updates);
      toast("Extension updated", "default");
      setEditing(false);
      router.push(`/extensions/${encodeURIComponent(updated.name)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update extension");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    handleDelete();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeExtension(extension.name);
      toast(`Removed "${extension.name}"`, "default");
      router.push("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove", "destructive");
      setDeleting(false);
      setConfirming(false);
    }
  }

  const busy = saving || uploading;
  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  // ── VIEW MODE ─────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            {/* icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {viewIcon ? (
                (() => { const VI = viewIcon; return <VI className="h-4 w-4 text-primary" strokeWidth={1.5} />; })()
              ) : extension.icon_url && !extension.icon_url.startsWith("lucide:") ? (
                <Image src={extension.icon_url} alt="" width={36} height={36} className="rounded-lg object-cover" unoptimized />
              ) : (
                <Blocks className="h-4 w-4 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{extension.name}</h1>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isOnline ? "default" : "outline"}
              className={`text-xs shrink-0 ${isOnline ? "bg-green-500/15 text-green-600 border-green-500/30" : "text-muted-foreground"}`}
            >
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              {isOnline ? "Online" : "Unreachable"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>

            <Button
              variant={confirming ? "destructive" : "ghost"}
              size="sm"
              onClick={handleDeleteClick}
              disabled={deleting}
              className={`gap-1.5 text-xs transition-all duration-150 ${
                confirming
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              }`}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirming ? "Confirm" : "Remove"}
            </Button>
          </div>
        </div>

        {extension.description && (
          <p className="mt-2 text-sm text-muted-foreground">{extension.description}</p>
        )}
        <a
          href={extension.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-primary/10 hover:border-primary/40 transition-colors group/url"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover/url:text-primary/70 transition-colors" />
          <span className="font-mono text-xs text-muted-foreground/70 truncate group-hover/url:text-primary/80 transition-colors">{extension.url}</span>
        </a>
      </div>
    );
  }

  // ── EDIT MODAL ────────────────────────────────────────────────────
  return (
    <>
      {/* always-visible header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {viewIcon ? (
                (() => { const VI = viewIcon; return <VI className="h-4 w-4 text-primary" strokeWidth={1.5} />; })()
              ) : extension.icon_url && !extension.icon_url.startsWith("lucide:") ? (
                <Image src={extension.icon_url} alt="" width={36} height={36} className="rounded-lg object-cover" unoptimized />
              ) : (
                <Blocks className="h-4 w-4 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{extension.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isOnline ? "default" : "outline"}
              className={`text-xs shrink-0 ${isOnline ? "bg-green-500/15 text-green-600 border-green-500/30" : "text-muted-foreground"}`}
            >
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              {isOnline ? "Online" : "Unreachable"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60" disabled>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant={confirming ? "destructive" : "ghost"}
              size="sm"
              onClick={handleDeleteClick}
              disabled={deleting}
              className={`gap-1.5 text-xs transition-all duration-150 ${
                confirming
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              }`}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirming ? "Confirm" : "Remove"}
            </Button>
          </div>
        </div>
        {extension.description && (
          <p className="mt-2 text-sm text-muted-foreground">{extension.description}</p>
        )}
        <a
          href={extension.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-primary/10 hover:border-primary/40 transition-colors group/url"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover/url:text-primary/70 transition-colors" />
          <span className="font-mono text-xs text-muted-foreground/70 truncate group-hover/url:text-primary/80 transition-colors">{extension.url}</span>
        </a>
      </div>

      {/* edit modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-modal-backdrop-in">
        <form onSubmit={handleSave} className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-modal-card-in">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold">Edit extension</h2>
            <button type="button" onClick={cancelEdit} className="rounded-lg p-1 text-muted-foreground hover:bg-muted/60 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-extension" required />
              </div>
              <div>
                <label className={labelCls}>URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this extension do?" />
            </div>

            {/* icon */}
            <div>
              <label className={labelCls}>Icon</label>
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/50">
                  {LucideThumb ? (
                    <div className="flex h-full w-full items-center justify-center">
                      {(() => { const LI = LucideThumb; return <LI className="h-5 w-5 text-primary/70" strokeWidth={1.5} />; })()}
                    </div>
                  ) : iconUrl && !iconUrl.startsWith("lucide:") ? (
                    <Image src={iconUrl} alt="icon preview" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={handleFileChange} disabled={busy} />
                  <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading…" : "Upload image"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground/50">PNG, JPG, WebP, SVG · max 512 KB</p>
                </div>
              </div>
              <div className="mt-2">
                <Input
                  value={iconUrl.startsWith("lucide:") ? "" : iconUrl}
                  onChange={(e) => { setIconUrl(e.target.value); setIconDirty(true); }}
                  placeholder={iconUrl.startsWith("lucide:") ? iconUrl : "or paste a URL"}
                  className="text-xs"
                />
              </div>
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
                    {filteredIcons.map(([n, Icon]) => (
                      <button
                        key={n}
                        type="button"
                        title={n}
                        className={`flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted ${
                          iconUrl === `lucide:${n}` ? "bg-primary/15 ring-1 ring-primary/40" : ""
                        }`}
                        onClick={() => { setIconUrl(`lucide:${n}`); setIconDirty(true); setIconSearch(""); }}
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
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
