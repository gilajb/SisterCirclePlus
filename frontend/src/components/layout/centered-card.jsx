import { cn } from "@/lib/utils";

/** Full-height page with a single centred card: 404, email links, password reset. */
export function CenteredCard({ className, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div
        className={cn(
          "bg-card flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl border px-8 py-9 text-center",
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}
