import { Suspense } from "react";
import { Results } from "@/features/results/results";

export const metadata = { title: "Your analysis" };

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <Results />
    </Suspense>
  );
}
