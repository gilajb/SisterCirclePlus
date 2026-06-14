import { NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/symptom-check", "/results", "/chw"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const url = new URL("/signup", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/symptom-check/:path*",
    "/results/:path*",
    "/chw/:path*",
  ],
};