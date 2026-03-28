import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Cookieをそのまま転送
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${BACKEND_URL}/api/transcription/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000), // 30秒タイムアウト
  });

  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? "",
    },
  });
}
