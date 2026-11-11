"use client";

import { Tag } from "antd";
import type { ReactNode } from "react";

import { useLanguage } from "@/lib/i18n/language";
import { STANDARD_STATUS, type StandardStatus } from "@/lib/status/standard-status";

type StatusTagProps = {
  /** สถานะมาตรฐาน — ชื่อ/สีมาจาก lib/status/standard-status.ts */
  status: StandardStatus;
  /** ข้อความเฉพาะหน้า (เช่น มีตัวเลขต่อท้าย) — ไม่ใส่ = ใช้ชื่อมาตรฐานตามภาษา */
  children?: ReactNode;
};

/** ป้ายสถานะเอกสารมาตรฐาน — ใช้แทน <Tag color=...> ที่กำหนดชื่อ/สีเองรายหน้า */
export default function StatusTag({ status, children }: StatusTagProps) {
  const language = useLanguage();
  const meta = STANDARD_STATUS[status];
  return <Tag color={meta.color}>{children ?? (language === "en" ? meta.en : meta.th)}</Tag>;
}
