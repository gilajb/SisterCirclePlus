import Link from "next/link";
import { ArrowRight, ClipboardList, Home, Search, User } from "lucide-react";
import { Wordmark } from "@/components/shared/wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/symptom-check", label: "Symptom Check" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/#why-sistercircle", label: "Mission" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

const QUICK_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/symptom-check", label: "Symptom check", icon: Search },
  { href: "/signup", label: "Account", icon: User },
  { href: "/dashboard", label: "Dashboard", icon: ClipboardList },
];

function ColumnTitle({ children }) {
  return (
    <h2 className="text-primary text-[11px] font-bold tracking-[1px] uppercase">{children}</h2>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-foreground px-6 pt-10 pb-20 md:px-12 md:pt-12 md:pb-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-2.5 md:col-span-1">
            <Wordmark className="text-lg" />
            <p className="text-[13px] leading-relaxed text-[#999]">
              Medical Clarity through Clinical Warmth. We bridge the gap between diagnostic data
              and the human heart.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-2.5">
              <ColumnTitle>{column.title}</ColumnTitle>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] text-[#999] hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-2.5">
            <ColumnTitle>Contact</ColumnTitle>
            <span className="text-[13px] break-all text-[#999]">
              sistercircleplus@protonmail.com
            </span>
            <Link
              href="/contact"
              className="text-pink-light flex items-center gap-1 text-[13px] font-semibold"
            >
              Send us a message <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Quick links — phone only */}
        <nav
          aria-label="Quick links"
          className="mt-2 flex justify-around border-t border-[#333] py-4 md:hidden"
        >
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex size-11 items-center justify-center text-[#999] hover:text-white"
            >
              <Icon className="size-[22px]" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div className="mt-2 border-t border-[#333] pt-5 md:mt-0">
          <p className="text-xs text-[#777]">
            © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
          </p>
        </div>
      </div>
    </footer>
  );
}
