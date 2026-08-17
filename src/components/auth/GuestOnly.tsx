"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { hasAccessToken } from "@/lib/auth/token";

type GuestOnlyProps = {
  children: ReactNode;
};

/**
 * แสดงหน้าให้เลย แล้วค่อย redirect ถ้าพบว่า login อยู่แล้ว
 *
 * เดิมรอ `useEffect` เซ็ต state ก่อนถึงจะ render children ทำให้ HTML ที่ส่งมามีแต่ spinner
 * ฟอร์ม login จะโผล่ก็ต่อเมื่อ JS โหลดครบและ hydrate เสร็จ → LCP 5.7 วินาทีบน Lighthouse
 * หน้านี้เป็นหน้าสาธารณะ ไม่มีข้อมูลลับ จึง render ทันทีได้
 * คนที่ login อยู่แล้วยังถูก redirect เหมือนเดิม (เห็นฟอร์มแวบหนึ่งระหว่างเปลี่ยนหน้า)
 *
 * หมายเหตุ 1: ห้ามอ่าน `hasAccessToken()` ตอน render (เช่น `useState(() => ...)`)
 * เพราะฝั่ง server ไม่มี localStorage → hydration mismatch ต้องอ่านใน effect เท่านั้น
 *
 * หมายเหตุ 2: อ่าน `?next=` จาก `window.location` ไม่ใช่ `useSearchParams()` — hook ตัวนั้น
 * ทำให้ component tree ขึ้นไปถึง `<Suspense>` ที่ใกล้ที่สุดถูก render ฝั่ง client ทั้งหมด
 * (ดู node_modules/next/dist/docs — useSearchParams › Prerendering) ผลคือ HTML ที่ส่งมา
 * มีแต่ spinner ฟอร์ม login ต้องรอ JS ครบก่อนถึงจะขึ้น effect ทำงานฝั่ง client อยู่แล้ว
 * จึงอ่านจาก window ได้ตรงๆ โดยไม่เสีย prerender
 */
export default function GuestOnly({ children }: GuestOnlyProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasAccessToken()) {
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    // ต้องกัน `//evil.com` ด้วย — ขึ้นต้นด้วย "/" เหมือนกันแต่เป็น protocol-relative URL
    // ที่พาออกไปนอกโดเมนได้ (open redirect)
    const isSafeNext = Boolean(next?.startsWith("/") && !next.startsWith("//"));
    router.replace(isSafeNext ? (next as string) : "/");
  }, [router]);

  return children;
}
