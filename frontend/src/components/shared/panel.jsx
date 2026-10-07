import { cn } from "@/lib/utils";

/** White rounded surface used for cards and sections throughout the app. */
export function Panel({ as: Comp = "div", className, ...props }) {
  return <Comp className={cn("bg-card rounded-2xl border p-7", className)} {...props} />;
}

export function PanelTitle({ className, ...props }) {
  return <h2 className={cn("font-heading text-base font-bold", className)} {...props} />;
}
