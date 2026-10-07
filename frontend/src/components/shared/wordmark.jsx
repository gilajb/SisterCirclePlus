import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ href = "/", className }) {
  return (
    <Link href={href} className={cn("font-heading text-base font-bold text-primary", className)}>
      SisterCircle+
    </Link>
  );
}
