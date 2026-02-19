import { notFound } from "next/navigation";
import Link from "next/link";
import { getExtensions, getExtensionCapabilities } from "@/lib/extensions";
import { ExtensionActionRunner } from "@/components/ExtensionActionRunner";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Blocks } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ExtensionDetailPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Find the extension by name from the registry
  const extensions = await getExtensions();
  const ext = extensions.find((e) => e.name === decodedName);
  if (!ext) notFound();

  // Fetch live capabilities — may be null if the extension is down
  const capabilities = await getExtensionCapabilities(ext.url);
  const isOnline = capabilities !== null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All extensions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Blocks className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{ext.name}</h1>
            </div>
            {/* Status badge */}
            <Badge
              variant={isOnline ? "default" : "outline"}
              className={`shrink-0 mt-1 text-xs ${isOnline ? "bg-green-500/15 text-green-600 border-green-500/30" : "text-muted-foreground"}`}
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`}
              />
              {isOnline ? "Online" : "Unreachable"}
            </Badge>
          </div>

          {ext.description && (
            <p className="mt-2 text-sm text-muted-foreground">{ext.description}</p>
          )}

          <a
            href={ext.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {ext.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Divider */}
        <div className="mb-8 border-t border-border" />

        {/* Capabilities */}
        <section>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
            {capabilities && capabilities.length > 0 && ` · ${capabilities.length}`}
          </p>

          {!isOnline ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">Extension is unreachable.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Make sure the server at{" "}
                <span className="font-mono">{ext.url}</span> is running.
              </p>
            </div>
          ) : capabilities && capabilities.length > 0 ? (
            <div className="space-y-2">
              {capabilities.map((cap) => (
                <ExtensionActionRunner
                  key={cap.name}
                  extensionName={ext.name}
                  capability={cap}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This extension returned no capabilities.
            </p>
          )}
        </section>

        {/* Metadata footer */}
        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground/60">
          Registered{" "}
          {new Date(ext.registered_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
    </main>
  );
}
