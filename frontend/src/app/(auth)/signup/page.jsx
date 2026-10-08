import { Suspense } from "react";
import { AuthPanel } from "@/features/auth/auth-panel";

export const metadata = { title: "Sign up or log in" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Hero — desktop only */}
      <aside className="relative hidden basis-[52%] flex-col justify-end overflow-hidden bg-linear-160 from-[#c4a898] via-[#8a7060] via-40% to-[#6a5048] p-12 md:flex">
        <div className="absolute inset-0 bg-[#1e0f0a]/28" aria-hidden="true" />
        <div className="relative z-10">
          <p className="mb-5 font-heading text-lg font-bold text-pink-light">SisterCircle+</p>
          <h1 className="mb-4 font-heading text-[42px] leading-[1.2] font-extrabold text-white">
            Your body has been speaking...
          </h1>
          <p className="max-w-[380px] text-base leading-[1.7] text-white/85">
            We're here to listen. Join a supportive community where clinical expertise meets the
            warmth of sisterhood.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col justify-center px-6 py-10 md:px-[60px] md:py-12">
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-7">
          {/* Brand heading — phone only, where the hero is hidden */}
          <div className="text-center md:hidden">
            <p className="mb-1.5 font-heading text-2xl font-extrabold text-mauve">SisterCircle+</p>
            <p className="text-sm text-muted-foreground">
              Medical Clarity through Clinical Warmth.
            </p>
          </div>

          <Suspense fallback={null}>
            <AuthPanel />
          </Suspense>

          <p className="text-center text-xs text-muted-foreground">
            © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
          </p>
        </div>
      </main>
    </div>
  );
}
