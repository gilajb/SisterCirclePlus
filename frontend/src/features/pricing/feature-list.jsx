import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeatureList({ items, className }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[13px] text-body">
          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
