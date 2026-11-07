import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "@/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/onboarding", "/admin"];
const GUEST_ONLY_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  // 1. Every page lives under a locale prefix. Redirect bare paths using cookie → Accept-Language.
  if (!isLocale(firstSegment)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale: Locale = isLocale(cookieLocale) ? cookieLocale : matchLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Refresh the auth session and remember the locale.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const { response, userId } = await updateSession(request, requestHeaders);
  if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
    response.cookies.set(LOCALE_COOKIE, firstSegment, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }

  // 3. Optimistic route guards (real checks happen in the pages and in RLS).
  const rest = pathname.slice(firstSegment.length + 1) || "/";
  if (!userId && PROTECTED_PREFIXES.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${firstSegment}/sign-in`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (userId && GUEST_ONLY_PREFIXES.some((p) => rest === p)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${firstSegment}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip Next internals, route handlers under /api and /auth, and files with an extension.
  matcher: ["/((?!_next/|api/|auth/|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
