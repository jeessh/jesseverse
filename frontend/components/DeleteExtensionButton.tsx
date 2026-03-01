"use client";

import * as React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeExtension } from "@/lib/extensions";
import { useRouter } from "next/navigation";

interface Props {
  extensionName: string;
}

export function DeleteExtensionButton({ extensionName }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // auto-cancel confirm state after 4s
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    handleDelete();
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await removeExtension(extensionName);
      toast(`Removed "${extensionName}"`, "default");
      router.push("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove", "destructive");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="sm"
      className={`gap-1.5 text-xs transition-all duration-150 ${
        confirming
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      }`}
      onClick={handleClick}
      disabled={loading}
      aria-label={confirming ? "Confirm remove extension" : "Remove extension"}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {confirming ? "Confirm remove" : "Remove"}
    </Button>
  );
}
