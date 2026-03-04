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
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary/75 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.2)] hover:border-primary/40 hover:bg-primary/15 hover:text-primary hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.35)] transition-all duration-200"
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
