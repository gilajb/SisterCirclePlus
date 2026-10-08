import { cn } from "@/lib/utils";

/** White rounded surface used for cards and sections throughout the app. */
export function Panel({ as: Comp = "div", className, ...props }) {
  return <Comp className={cn("rounded-2xl border bg-card p-7", className)} {...props} />;
}

export function PanelTitle({ className, ...props }) {
  return <h2 className={cn("font-heading text-base font-bold", className)} {...props} />;
}
