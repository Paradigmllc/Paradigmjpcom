import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthorizedRequest,
  isProductionAuthConfigured,
  isStudioEnabled,
} from "@/lib/media-os/auth";

const publicPaths = new Set(["/api/health"]);

function bypassProxyAuthentication(pathname: string): boolean {
  return publicPaths.has(pathname) || pathname.startsWith("/api/review/masters/");
}

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" || bypassProxyAuthentication(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isStudioEnabled() || !isProductionAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Media OS Studio is not configured" },
      { status: 503 },
    );
  }

  if (isAuthorizedRequest(request)) return NextResponse.next();

  const headers = { "WWW-Authenticate": 'Basic realm="YouTube Media OS", charset="UTF-8"' };
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  return new NextResponse("Authentication required", { status: 401, headers });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
