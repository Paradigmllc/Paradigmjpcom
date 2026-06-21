import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // status.paradigmjp.com → proxy to local dashboard server
  if (host.startsWith("status.")) {
    const url = new URL(request.url);
    url.protocol = "http:";
    url.hostname = "localhost";
    url.port = "9877";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|static|favicon).*)",
};
