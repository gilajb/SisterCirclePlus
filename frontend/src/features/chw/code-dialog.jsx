"use client";

import { useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Shows a freshly generated patient access code with a copy button. */
export function CodeDialog({ code, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code stays visible to copy by hand.
    }
  }

  return (
    <Dialog open={Boolean(code)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-5 rounded-[20px] px-9 py-10 text-center sm:max-w-[400px]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-[14px] bg-gold-light text-gold-dark">
          <KeyRound className="size-7" aria-hidden="true" />
        </div>
        <DialogHeader className="items-center">
          <DialogTitle className="font-heading text-xl font-bold">Patient Access Code</DialogTitle>
          <DialogDescription className="text-sm">
            Share this code with the patient to grant access.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy code ${code}`}
          className="cursor-pointer rounded-xl border-[1.5px] border-dashed border-gold bg-background p-5 font-mono text-[28px] font-extrabold tracking-[6px]"
        >
          {code}
        </button>
        <Button
          variant="mauve"
          size="xl"
          onClick={copy}
          className={copied ? "bg-success hover:bg-success" : undefined}
        >
          {copied ? (
            <>
              <Check aria-hidden="true" /> Copied!
            </>
          ) : (
            "Copy Code"
          )}
        </Button>
        <p className="text-xs text-muted-foreground">This code expires in 24 hours.</p>
      </DialogContent>
    </Dialog>
  );
}
