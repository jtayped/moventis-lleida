import { routePublicPath } from "@moventis/shared";
import { NextResponse, type NextRequest } from "next/server";
import { PUBLISHED_LANGS } from "@/i18n/langs";

/**
 * Maps public URLs onto the `[lang]` routes: `/linies/20` is served by
 * `/ca/linies/20`, `/es/lineas/20` by `/es/linies/20`. The rules live in
 * `routePublicPath`, next to the `localePath` that builds links, so a URL the
 * site links to is always one this accepts.
 */
export function middleware(request: NextRequest) {
  const route = routePublicPath(request.nextUrl.pathname, PUBLISHED_LANGS);
  const url = request.nextUrl.clone();
  if ("redirect" in route) {
    url.pathname = route.redirect;
    return NextResponse.redirect(url, 308);
  }
  url.pathname = route.rewrite;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: tRPC and the health check, Next's own assets, and any file
  // with an extension (sitemap.xml, robots.txt, icons, the manifest).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
