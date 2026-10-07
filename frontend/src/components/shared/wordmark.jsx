import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ href = "/", className }) {
  return (
    <Link href={href} className={cn("font-heading text-primary text-base font-bold", className)}>
      SisterCircle+
    </Link>
  );
}
