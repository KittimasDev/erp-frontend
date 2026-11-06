import { getStoredLanguage } from "./language";
import type { TFunction } from "./useT";

/** ป้ายสถานะที่คำไทยเดียวกันมีความหมายต่างจากที่อื่น (ปุ่ม/ข้อความทั่วไป) — ใช้เฉพาะตอนแสดงเป็น "สถานะ" */
const STATUS_EN: Record<string, string> = {
  ยกเลิก: "Cancelled",
  ส่งแล้ว: "Delivered",
  ไม่อนุมัติ: "Rejected",
  ปฏิเสธ: "Rejected",
  รอดำเนินการ: "Pending",
  จ่ายบางส่วน: "Partially issued",
  รอยืนยัน: "Awaiting confirmation",
};

/**
 * แปลป้ายสถานะเอกสารฝั่งขาย/คลัง (ตัวคงที่ภาษาไทยใน `types/*`) ตอนเรนเดอร์
 * — ผู้เรียกต้องอยู่ในคอมโพเนนต์ที่ใช้ `useT()` อยู่แล้ว เพื่อให้เรนเดอร์ซ้ำเมื่อสลับภาษา
 */
export function statusT(t: TFunction, label: string): string {
  if (getStoredLanguage() === "en" && label in STATUS_EN) return STATUS_EN[label];
  return t(label);
}
