"use client";

import { App } from "antd";
import { useCallback } from "react";

import {
  isStaleDocumentConflict,
  staleDocumentMessage,
} from "@/lib/api/conflict";

/**
 * กล่องแจ้ง "เอกสารถูกแก้ไขโดยผู้ใช้อื่น"
 *
 * ใช้ `modal.confirm` ไม่ใช่ `message.error` โดยเจตนา — toast ที่ปัดทิ้งเองได้
 * ไม่สมน้ำหนักกับเรื่องที่งานของผู้ใช้กำลังจะไม่ถูกบันทึก และเราต้องการให้เขา
 * ตัดสินใจก่อนจะทำอย่างอื่นต่อ
 *
 * **ไม่มีปุ่ม "บันทึกทับ"** — มีเมื่อไหร่ ผู้ใช้จะกลับไปเป็น last-write-wins
 * ทันทีที่จำได้ว่ามันอยู่ตรงไหน · ปุ่ม "ปิด" ปล่อยค่าที่พิมพ์ไว้บนจอให้คัดลอก
 * ออกไปได้ ห้ามล้างให้เอง
 */
export function useStaleDocumentPrompt() {
  const { modal } = App.useApp();

  return useCallback(
    (error: unknown, onReload: () => void | Promise<void>): boolean => {
      if (!isStaleDocumentConflict(error)) {
        return false;
      }
      modal.confirm({
        title: "เอกสารถูกแก้ไขโดยผู้ใช้อื่น",
        content: staleDocumentMessage(error),
        okText: "โหลดข้อมูลใหม่",
        cancelText: "ปิด",
        onOk: () => onReload(),
      });
      return true;
    },
    [modal],
  );
}
