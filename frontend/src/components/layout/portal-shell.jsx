"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Wordmark } from "@/components/shared/wordmark";
import { removeToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const sideLink =
  "text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[13px]";

/**
 * Layout for the professional portals (CHW and doctor): a fixed sidebar on
 * desktop, a compact top bar on phones, and a sticky page heading.
 *
 * `nav` items are { icon, label, href, active }. `sidebarFooter` renders above
 * the settings and log-out links; `actions` renders at the right of the heading.
 */
export function PortalShell({
  name,
  subtitle,
  nav = [],
  sidebarFooter,
  title,
  description,
  actions,
  children,
}) {
  const router = useRouter();

  function logOut() {
    removeToken();
    router.push("/signup");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r bg-sidebar py-7 md:flex">
        <div className="border-b px-5 pb-6">
          <p className="mb-0.5 text-[13px] font-bold tracking-[0.5px] text-primary">{name}</p>
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        </div>
        <nav aria-label={name} className="flex flex-1 flex-col gap-1 px-3 py-4">
          {nav.map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-4 py-3 text-sm text-body hover:bg-gold-light/60",
                active && "bg-gold-light font-bold text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t px-3 pt-4">
          {sidebarFooter}
          <Link href="/settings" className={sideLink}>
            <Settings className="size-4" aria-hidden="true" /> Account Settings
          </Link>
          <button type="button" onClick={logOut} className={sideLink}>
            <LogOut className="size-4" aria-hidden="true" /> Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — phones only */}
        <div className="flex items-center justify-between border-b bg-card px-3 py-1.5 pl-5 md:hidden">
          <Wordmark href="/dashboard" className="text-lg" />
          <div className="flex">
            <Link
              href="/settings"
              aria-label="Account settings"
              className="flex size-11 items-center justify-center text-plum"
            >
              <Settings className="size-5" />
            </Link>
            <button
              type="button"
              onClick={logOut}
              aria-label="Log out"
              className="flex size-11 cursor-pointer items-center justify-center text-plum"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>

        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-4 md:px-8 md:py-5">
          <div>
            <p className="mb-1 text-[11px] font-bold tracking-[1px] text-primary uppercase md:hidden">
              {name}
            </p>
            <h1 className="font-heading text-lg font-extrabold md:text-[22px]">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>

        <main className="flex flex-col gap-5 p-5 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
