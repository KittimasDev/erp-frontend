import type { NextConfig } from "next";

/** ใช้ 127.0.0.1 แทน localhost — บน Windows ลดปัญหา proxy ไป ::1 แล้ว ECONNREFUSED */
function resolveApiUrl(raw?: string): string {
  const fallback = "http://127.0.0.1:8080";
  const value = raw?.trim() || fallback;
  try {
    const url = new URL(value);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

const apiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  // ปิดเครื่องหมาย Next.js (dev indicator) มุมจอตอนพัฒนา
  devIndicators: false,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;