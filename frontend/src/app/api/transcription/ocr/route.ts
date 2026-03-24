import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  // Cookieをそのまま転送
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${BACKEND_URL}/api/transcription/ocr`, {
    method: "POST",
    headers: { cookie },
    body: formData,
    signal: AbortSignal.timeout(90_000), // 90秒タイムアウト
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
