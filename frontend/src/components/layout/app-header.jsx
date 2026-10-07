"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { Wordmark } from "@/components/shared/wordmark";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/symptom-check", label: "Symptom Check", match: ["/symptom-check", "/results"] },
];

/**
 * Top bar for the logged-in flow pages. On desktop it shows the main
 * navigation; on phones it becomes a compact three-slot bar whose start,
 * title and end are supplied by the page (back button, heading, action).
 */
export function AppHeader({ mobileStart, mobileTitle, mobileEnd }) {
  const pathname = usePathname();

  return (
    <header className="bg-card md:bg-background sticky top-0 z-50 border-b">
      <div className="flex min-h-14 items-center justify-between px-3 py-2 md:hidden">
        <div className="flex size-11 items-center justify-center">{mobileStart}</div>
        <div className="font-heading text-[17px] font-bold">
          {mobileTitle ?? <span className="text-primary">SisterCircle+</span>}
        </div>
        <div className="flex size-11 items-center justify-center">{mobileEnd}</div>
      </div>

      <div className="hidden items-center justify-between px-12 py-[18px] md:flex">
        <Wordmark className="text-xl" />
        <nav aria-label="Main" className="flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active = (link.match ?? [link.href]).includes(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:text-primary border-b-2 border-transparent pb-0.5 text-[15px]",
                  active && "border-primary font-semibold"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            aria-label="Account settings"
            className="text-plum hover:text-primary flex size-9 items-center justify-center rounded-full"
          >
            <CircleUserRound className="size-7" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
