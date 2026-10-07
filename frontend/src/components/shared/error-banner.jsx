import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorBanner({ message, className }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "border-danger-border bg-danger-bg flex items-start gap-2.5 rounded-[10px] border px-4 py-3 text-left",
        className
      )}
    >
      <TriangleAlert className="text-danger mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="text-danger text-[13px] leading-normal">{message}</span>
    </div>
  );
}
