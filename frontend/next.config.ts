import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // 本番（Caddy経由）ではrewrite不要
    if (process.env.ENVIRONMENT === "production") {
      return [];
    }
    // ローカル開発用: Next.jsがAPIリクエストをバックエンドに転送
    const apiUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // すべてのページに適用
        source: "/(.*)",
        headers: [
          // CSPはmiddleware.tsでnonceベースで設定するため、ここでは設定しない
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
          {
            // HTTPS強制（ブラウザに「常にHTTPSで接続」と記憶させる）
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
