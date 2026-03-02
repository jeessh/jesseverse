"use client";

import * as React from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeExtension, type Extension } from "@/lib/extensions";
import { useRouter } from "next/navigation";
import { EditExtensionModal } from "./EditExtensionModal";

interface Props {
  extension: Extension;
}

export function ExtensionActions({ extension }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [showEdit, setShowEdit] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEdit(true)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
          aria-label="Edit extension"
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
          aria-label={confirming ? "Confirm remove" : "Remove extension"}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {confirming ? "Confirm remove" : "Remove"}
        </Button>
      </div>

      {showEdit && (
        <EditExtensionModal
          extension={extension}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
