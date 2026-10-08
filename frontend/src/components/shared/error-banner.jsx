import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorBanner({ message, className }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border border-danger-border bg-danger-bg px-4 py-3 text-left",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
      <span className="text-[13px] leading-normal text-danger">{message}</span>
    </div>
  );
}
