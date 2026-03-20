import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
