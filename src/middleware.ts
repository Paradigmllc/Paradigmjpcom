import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // status.paradigmjp.com → proxy to infra dashboard on host
  if (host.startsWith("status.")) {
    try {
      const url = new URL(request.url);
      url.protocol = "http:";
      url.hostname = "host.docker.internal";
      url.port = "9877";
      return NextResponse.rewrite(url);
    } catch {
      return new NextResponse("Dashboard unavailable", { status: 502 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|static|favicon).*)",
};
