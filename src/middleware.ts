import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // status.paradigmjp.com → infra dashboard (same Docker network)
  if (host.startsWith("status.")) {
    return NextResponse.rewrite(
      new URL(request.nextUrl.pathname + request.nextUrl.search, "http://infra-dashboard:9877")
    );
  }

  // demo.paradigmjp.com root → demo index page
  if (host.startsWith("demo.") && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/en/demo", request.url));
  }

  // demo.paradigmjp.com/demo/[slug]?lang=xx → /[lang]/demo/[slug]
  if (host.startsWith("demo.") && request.nextUrl.pathname.startsWith("/demo/")) {
    const lang = request.nextUrl.searchParams.get("lang") ?? "en";
    const slug = request.nextUrl.pathname.replace("/demo/", "");
    if (slug) {
      return NextResponse.redirect(new URL(`/${lang}/demo/${slug}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|static|favicon|_next).*)",
};
