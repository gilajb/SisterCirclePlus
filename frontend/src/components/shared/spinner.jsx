import { cn } from "@/lib/utils";

/** Small ring spinner. Inherits its colour from the surrounding text. */
export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current/35 border-t-current",
        className
      )}
    />
  );
}
