import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // すべてのページに適用
        source: "/(.*)",
        headers: [
          {
            // CSP: 許可するスクリプト・スタイルの読み込み元を制限
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",          // 基本は自分のドメインだけ許可
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.jsが動作に必要
              "style-src 'self' 'unsafe-inline'",                // Tailwind CSSが必要
              "img-src 'self' data: blob:",   // 画像: 自ドメイン + data URI + blob
              "font-src 'self'",              // フォント: 自ドメインのみ
              "connect-src 'self' http://localhost:8000", // API接続先
            ].join("; "),
          },
          {
            // クリックジャッキング防止（iframeで埋め込まれるのを防ぐ）
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // MIMEタイプのスニッフィング防止
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // リファラー情報の制限（外部サイトにURLを漏らさない）
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
