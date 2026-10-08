import { Wordmark } from "@/components/shared/wordmark";

/** Wordmark-only top bar for pages that don't need full navigation. */
export function SimpleHeader({ href = "/" }) {
  return (
    <header className="border-b px-6 py-5 md:px-12 md:py-6">
      <Wordmark href={href} className="text-lg" />
    </header>
  );
}
