"use client";

import type { CSSProperties, ReactNode } from "react";
import { useT } from "@/lib/i18n/useT";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  MinusCircleFilled,
  WarningFilled,
} from "@ant-design/icons";

export type StatusLightValue = "GREEN" | "YELLOW" | "RED" | "IDLE";

const META: Record<StatusLightValue, { label: string; color: string; icon: ReactNode }> = {
  GREEN: { label: "ปกติ", color: "#389e0d", icon: <CheckCircleFilled /> },
  YELLOW: { label: "เฝ้าระวัง", color: "#d48806", icon: <WarningFilled /> },
  RED: { label: "หยุด / เสีย", color: "#cf1322", icon: <CloseCircleFilled /> },
  IDLE: { label: "ไม่มีการผลิต", color: "#8c8c8c", icon: <MinusCircleFilled /> },
};

/**
 * ไฟสถานะ เขียว=ปกติ / เหลือง=เฝ้าระวัง / แดง=หยุด-เสีย (+เทา=ไม่มีการผลิต)
 * ทุกสีมีไอคอนรูปทรงต่างกันและข้อความกำกับเสมอ — ไม่พึ่งสีอย่างเดียว (ตาบอดสี/จอ TV ไกล)
 */
export default function StatusLight({
  light,
  size = "sm",
  showText = true,
  label,
}: {
  light: StatusLightValue;
  size?: "sm" | "lg";
  showText?: boolean;
  /** ข้อความแทนค่าเริ่มต้นของสถานะ */
  label?: string;
}) {
  const t = useT();
  const meta = META[light];
  const text = label ?? t(meta.label);
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: size === "lg" ? 12 : 6,
    color: meta.color,
    fontWeight: 600,
    fontSize: size === "lg" ? 28 : 14,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
  return (
    <span style={style} role="img" aria-label={t("สถานะ {text}", { text })}>
      <span style={{ fontSize: size === "lg" ? 40 : 16, display: "inline-flex" }}>{meta.icon}</span>
      {showText ? <span>{text}</span> : null}
    </span>
  );
}
