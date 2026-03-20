import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // リクエストごとにランダムなnonceを生成
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // nonceを含んだCSPヘッダーを構築
  const csp = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`,
  ].join('; ');

  // リクエストヘッダーにnonceを付与（Next.jsが<script>タグに自動で付ける）
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // レスポンスにCSPヘッダーをセット
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

// 静的ファイル（画像・CSS等）にはCSPを付けない
export const config = {
  matcher: [
    { source: '/((?!_next/static|_next/image|favicon.ico).*)' },
  ],
};
