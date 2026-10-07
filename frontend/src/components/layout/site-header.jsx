import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#why-sistercircle", label: "About" },
  { href: "/contact", label: "Contact Us" },
  { href: "/pricing", label: "Pricing" },
];

/** Sticky navigation for the landing page. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-5 py-4 md:px-12 md:py-[18px]">
      <Wordmark className="text-xl" />
      <nav aria-label="Main" className="flex items-center gap-8">
        <Link
          href="/"
          aria-current="page"
          className="hidden border-b-2 border-primary pb-0.5 text-[15px] font-semibold md:block"
        >
          Home
        </Link>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hidden text-[15px] hover:text-primary md:block"
          >
            {link.label}
          </Link>
        ))}
        <Button
          asChild
          size="lg"
          className="h-9 px-3.5 text-[13px] font-semibold md:h-10 md:px-5 md:text-sm"
        >
          <Link href="/signup">
            Sign In<span className="hidden md:inline"> / Sign Up</span>
          </Link>
        </Button>
      </nav>
    </header>
  );
}
