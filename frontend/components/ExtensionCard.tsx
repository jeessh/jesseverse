"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { removeExtension, type Extension } from "@/lib/extensions";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  extension: Extension;
  isOnline?: boolean;
}

export function ExtensionCard({ extension, isOnline }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeExtension(extension.name);
      toast(`Removed "${extension.name}"`, "default");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove", "destructive");
    }
  }

  return (
    <Link href={`/extensions/${encodeURIComponent(extension.name)}`} className="group block focus:outline-none">
      <Card className="h-full transition-colors hover:border-border/80 hover:bg-accent/30 focus-within:ring-1 focus-within:ring-ring">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isOnline !== undefined && (
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`}
                  title={isOnline ? "Online" : "Unreachable"}
                />
              )}
              <CardTitle className="text-base group-hover:underline underline-offset-2 truncate">
                {extension.name}
              </CardTitle>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
                aria-label="Remove extension"
                tabIndex={-1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {extension.description && (
            <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
              {extension.description}
            </p>
          )}
          <Badge variant="outline" className="max-w-full font-mono text-[10px]">
            <span className="truncate">{extension.url}</span>
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
