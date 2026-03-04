"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AddExtension } from "@/components/AddExtension";

export function ConnectModal() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Connect
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect extension</DialogTitle>
            <DialogDescription>
              Paste the base URL of a deployed extension to register it with the hub.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <AddExtension onDone={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
