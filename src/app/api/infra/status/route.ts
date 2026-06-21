import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sh(cmd: string): string {
  try { return execSync(cmd, { timeout: 8000, encoding: "utf-8" }).trim(); }
  catch { return ""; }
}

function parseDockerPs(): any[] {
  const out = sh("docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Size}}' --no-trunc");
  if (!out) return [];
  return out.split("\n").map(line => {
    const [name, status, image, size] = line.split("\t");
    return { name, running: status?.toLowerCase().includes("up") ?? false, image, size };
  });
}

export async function GET() {
  const diskRaw = sh("df -h / | tail -1");
  const diskParts = diskRaw.split(/\s+/);
  const diskTotal = diskParts[1] || "?";
  const diskUsed = diskParts[2] || "?";
  const diskPct = parseInt(diskParts[4]) || 0;

  const ps = parseDockerPs();
  const images = sh("docker images --format '{{.Repository}}\t{{.Size}}' | wc -l").trim();
  const imageSize = sh("docker system df --format '{{.Size}}' | head -1");

  // Disk usage by project
  const duLines = sh("du -sh /data/coolify/applications/*/ /opt/*/ /var/lib/docker/ 2>/dev/null");
  const diskUsage = duLines ? duLines.split("\n").map(line => {
    const [size, path] = line.split(/\s+/);
    const name = path?.split("/").pop() || path;
    const sizeGb = size?.includes("G") ? parseFloat(size) : size?.includes("M") ? parseFloat(size)/1024 : 0;
    let desc = "";
    if (name?.startsWith("n8i2")) desc = "paradigm-hp builds";
    else if (name === "docker") desc = "Docker data";
    else desc = name;
    return { path: name || path, size, desc, sizeGb: Math.round(sizeGb*10)/10 };
  }).filter(d => d.size && d.path) : [];

  const swap = sh("free -h | grep Swap | awk '{print $2}'") || "?";

  return NextResponse.json({
    disk: { total: diskTotal, used: diskUsed, pct: diskPct },
    docker: { containers: ps.length, images: parseInt(images)||0, imageSize },
    containers: ps,
    diskUsage,
    swap,
    uptime: sh("uptime -p") || "?",
    ok: true,
  });
}
