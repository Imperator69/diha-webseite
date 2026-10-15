import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookie, negotiateLocale } from "@/lib/i18n/config";

const PUBLIC_FILE = /\.[a-z0-9]+$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (!isLocale(first) && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !PUBLIC_FILE.test(pathname)) {
    const cookieLocale = request.cookies.get(localeCookie)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers, pathname);
  return response;
}

export function applySecurityHeaders(headers: Headers, pathname: string) {
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  headers.set("X-Frame-Options", "DENY");
  if (/^\/(de|en)\/portal/.test(pathname)) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "private, no-store");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
