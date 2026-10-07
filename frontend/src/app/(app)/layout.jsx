import { AuthGuard } from "@/components/layout/auth-guard";

/** Every route in this group requires a logged-in user. */
export default function AppLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}
