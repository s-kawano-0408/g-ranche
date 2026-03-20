import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 本番デモ環境では緩めのCSP（Oracle移行時にnonce方式に戻す）
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

// 静的ファイル（画像・CSS等）にはCSPを付けない
export const config = {
  matcher: [
    { source: '/((?!_next/static|_next/image|favicon.ico).*)' },
  ],
};
