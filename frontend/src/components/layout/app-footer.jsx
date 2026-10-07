import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";

const COLUMNS = [
  {
    title: "Company",
    links: [
      { href: "/#why-sistercircle", label: "Mission" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
];

/** Footer for the logged-in flow pages. Hidden on phones, where a fixed action bar sits instead. */
export function AppFooter() {
  return (
    <footer className="hidden bg-[#e8e4e0] px-12 py-10 md:block">
      <div className="mx-auto flex max-w-[1100px] flex-wrap justify-between gap-6">
        <div>
          <Wordmark className="mb-2 block text-lg" />
          <p className="text-body max-w-xs text-[13px] leading-relaxed">
            © 2026 SisterCircle+. Medical Clarity through Clinical Warmth. Dedicated to reproductive
            health equity and empathetic diagnostic care.
          </p>
        </div>
        <div className="flex gap-12">
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-2">
              <h2 className="text-primary text-xs font-bold tracking-[1px] uppercase">
                {column.title}
              </h2>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-body hover:text-foreground text-[13px]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
