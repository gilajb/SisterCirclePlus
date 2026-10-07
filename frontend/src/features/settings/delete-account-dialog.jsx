"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Field } from "@/components/shared/field";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountDialog({ open, username, onOpenChange, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      await api.delete("/api/user/delete/");
      onDeleted();
    } catch {
      setError("Couldn't delete your account right now. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={deleting ? undefined : onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-4 rounded-2xl p-8 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-danger text-lg font-bold">
            Delete your account?
          </DialogTitle>
          <DialogDescription className="text-body text-sm leading-relaxed">
            This permanently deletes <strong>{username}</strong>'s account and every symptom check
            you've ever submitted. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Field
          label={
            <span className="text-[13px]">
              Type <strong>{CONFIRM_PHRASE}</strong> to confirm
            </span>
          }
        >
          {(id) => (
            <Input
              id={id}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              className="border-border h-11 rounded-lg text-sm"
            />
          )}
        </Field>
        <ErrorBanner message={error} />
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            size="xl"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="bg-card text-body h-11 flex-1 rounded-lg text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            size="xl"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="bg-danger hover:bg-danger/90 h-11 flex-1 rounded-lg text-sm"
          >
            {deleting ? (
              <>
                <Spinner /> Deleting…
              </>
            ) : (
              "Delete My Account"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
