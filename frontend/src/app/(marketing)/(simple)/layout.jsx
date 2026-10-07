import { SimpleHeader } from "@/components/layout/simple-header";

/** Plain header and footer for the text-first public pages: contact, terms, privacy. */
export default function SimpleLayout({ children }) {
  return (
    <div className="min-h-screen">
      <SimpleHeader />
      <main className="mx-auto max-w-[720px] px-6 pt-12 pb-24 has-data-narrow:max-w-[560px]">
        {children}
        <p className="text-muted-foreground mt-12 text-xs">
          © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
        </p>
      </main>
    </div>
  );
}
