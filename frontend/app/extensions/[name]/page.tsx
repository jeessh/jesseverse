import { notFound } from "next/navigation";
import Link from "next/link";
import { getExtensions, getExtensionCapabilities, getExtensionLogs } from "@/lib/extensions";
import { ExtensionActionRunner } from "@/components/ExtensionActionRunner";
import { ExtensionDetailHeader } from "@/components/ExtensionDetailHeader";
import { ExtensionActionLog } from "@/components/ExtensionActionLog";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ExtensionRelevantLinks } from "@/components/ExtensionRelevantLinks";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExtensionDetailPage({ params, searchParams }: Props) {
  const { name } = await params;
  const sp = await searchParams;
  const startEditing = sp.edit === "1";
  const decodedName = decodeURIComponent(name);

  // find by name, 404 if not registered
  const extensions = await getExtensions();
  const ext = extensions.find((e) => e.name === decodedName);
  if (!ext) notFound();

  // fetch live capabilities — may be null if the extension is down
  const [capabilities, initialLogsResult] = await Promise.all([
    getExtensionCapabilities(ext.url),
    getExtensionLogs(ext.name),
  ]);
  const isOnline = capabilities !== null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All extensions
        </Link>

        {/* header */}
        <ExtensionDetailHeader extension={ext} isOnline={isOnline} startEditing={startEditing} />

        {/* audit log */}
        <CollapsibleSection label="Audit log">
          <ExtensionActionLog extensionName={ext.name} initialLogs={initialLogsResult.data} initialTotal={initialLogsResult.total} />
        </CollapsibleSection>

        {/* endpoints */}
        <CollapsibleSection
          label="Endpoints"
          count={capabilities?.length ?? 0}
        >
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
        </CollapsibleSection>

        {/* relevant links */}
        <CollapsibleSection label="Relevant links">
          <ExtensionRelevantLinks
            supabaseUrl={ext.supabase_url}
            vercelUrl={ext.vercel_url}
          />
        </CollapsibleSection>

        {/* metadata footer */}
        <div className="mt-12 border-t border-border pt-6">
          <span className="text-xs text-muted-foreground/60">
            Last updated{" "}
            {new Date(ext.updated_at ?? ext.registered_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </main>
  );
}
