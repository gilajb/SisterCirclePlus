import Link from "next/link";
import { Flower2 } from "lucide-react";
import { CenteredCard } from "@/components/layout/centered-card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <CenteredCard className="gap-4 py-12">
      <Flower2 className="mx-auto size-10 text-primary" aria-hidden="true" />
      <h1 className="font-heading text-xl font-bold">Page not found</h1>
      <p className="text-sm leading-relaxed text-body">
        The page you're looking for doesn't exist, or may have moved.
      </p>
      <Button asChild variant="mauve" size="xl" className="mt-2 w-full">
        <Link href="/">Back to Home</Link>
      </Button>
    </CenteredCard>
  );
}
