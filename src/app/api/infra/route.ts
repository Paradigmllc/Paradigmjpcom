import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return new Response(
    `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=http://178.105.138.55:9877/">
<title>Paradigm Infrastructure</title></head>
<body><p>Redirecting to <a href="http://178.105.138.55:9877/">Infrastructure Dashboard</a>...</p></body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
