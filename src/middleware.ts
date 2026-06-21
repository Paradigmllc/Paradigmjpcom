import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  if (host.startsWith("status.")) {
    try {
      // Docker gateway IP — always reaches the host
      return NextResponse.rewrite(
        new URL(request.nextUrl.pathname + request.nextUrl.search, "http://172.17.0.1:9877")
      );
    } catch {
      return new NextResponse("Dashboard unavailable", { status: 502 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|static|favicon).*)",
};
