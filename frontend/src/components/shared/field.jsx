"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled form control. Pass a render function to receive the generated id
 * so the label is properly associated with the input.
 */
export function Field({ label, hint, className, children }) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5 text-left", className)}>
      <Label htmlFor={id}>{label}</Label>
      {typeof children === "function" ? children(id) : children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
