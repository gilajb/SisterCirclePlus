import { Suspense } from "react";
import { DoctorPortal } from "@/features/doctor/doctor-portal";

export const metadata = { title: "Doctor portal" };

export default function DoctorPortalPage() {
  return (
    <Suspense fallback={null}>
      <DoctorPortal />
    </Suspense>
  );
}
