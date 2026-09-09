import type { NextConfig } from "next";

/** ใช้ 127.0.0.1 แทน localhost — บน Windows ลดปัญหา proxy ไป ::1 แล้ว ECONNREFUSED */
function resolveApiUrl(raw?: string): string {
  const fallback = "http://127.0.0.1:8081";
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
  // ให้เครื่องอื่นใน LAN เปิด dev ผ่าน IP ได้ (HMR /_next/*)
  allowedDevOrigins: ["192.168.1.135"],
  // ปิดเครื่องหมาย Next.js (dev indicator) มุมจอตอนพัฒนา
  devIndicators: false,
  experimental: {
    proxyClientMaxBodySize: "20mb",
  },

  // forward browser console (warn/error) ไปที่ terminal ตอน next dev — ดู client error ได้โดยไม่ต้องเปิด devtools
  logging: {
    browserToTerminal: "warn",
  },

  /**
   * เมนู "ขั้นตอนเตรียมยาง" กับ "กระบวนการผลิต rCB" ถูกยุบเข้า "ใบแปรสภาพวัตถุดิบ"
   * (เฟส 3, 2026-09-07)
   *
   * ทำที่นี่ไม่ใช่ใน `page.tsx` ที่เรียก `redirect()` เพราะ Next 16 อยู่ใน streaming
   * context — `redirect()` ในนั้นจะกลายเป็น redirect ฝั่ง client (HTTP ยัง 200)
   * ซึ่งทำให้เห็นโครงหน้าแวบหนึ่ง และแข่งกับ AuthGuard ที่เด้งไป /login ด้วย
   * `next=` เป็น path เก่า · redirect ระดับ config เกิดก่อน render จึงได้ 307 จริง
   *
   * **จับเฉพาะหน้ารายการ** — `/[id]` กับ `/create` ของเมนูเดิมยังเป็นหน้าจริง
   * เพื่อให้เปิดและเดินงานเอกสารเก่าได้ · และ API path เดิมไม่ถูกแตะเลย
   */
  async redirects() {
    return [
      {
        source: "/production/tire-prep-stages",
        destination: "/production/material-conversions?route=TIRE_PREP",
        permanent: false,
      },
      {
        source: "/production/rcb-processing",
        destination: "/production/material-conversions?route=RCB_PROCESSING",
        permanent: false,
      },
    ];
  },

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