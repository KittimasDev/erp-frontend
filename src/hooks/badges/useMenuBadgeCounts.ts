"use client";

import { useQueries } from "@tanstack/react-query";

import {
  MENU_BADGE_REGISTRY,
  type MenuBadgeKind,
} from "./menu-badge-registry";

export type MenuBadgeCounts = Record<string, number>;

export type MenuBadgeBreakdownItem = {
  menuKey: string;
  label: string;
  kind: MenuBadgeKind;
  count: number;
};

/**
 * จำนวนคิวงานค้างของทุกเมนูที่ลงทะเบียนไว้ คืนเป็น `{ [menuKey]: count }`
 *
 * ใช้ `useQueries` เพราะเรียก hook ทีละ entry ใน .map() ผิด Rules of Hooks
 * (eslint-config-next ตั้งเป็น error) — `useQueries` รับ array แบบ dynamic ได้
 * และลงทะเบียน observer แบบเดียวกับ useQuery จึงยัง dedupe ตาม queryKey
 * ทำให้ sidebar กับหน้าแรกที่ mount พร้อมกันยิง request ชุดเดียว
 *
 * ไม่ memoize array ของ options เพราะ `enabled` ของแต่ละตัวคำนวณจากสิทธิ์
 * ตอน build options — ถ้า memo ข้ามการเปลี่ยนสิทธิ์ gate จะค้าง
 */
export function useMenuBadgeCounts(options?: {
  enabled?: boolean;
}): MenuBadgeCounts {
  const enabled = options?.enabled ?? true;

  return useQueries({
    queries: MENU_BADGE_REGISTRY.map((entry) =>
      entry.options({ enabled: enabled && !entry.hidden }),
    ),
    combine: (results) => {
      const counts: MenuBadgeCounts = {};
      MENU_BADGE_REGISTRY.forEach((entry, index) => {
        if (entry.hidden) {
          return;
        }
        counts[entry.menuKey] = (results[index]?.data as number) ?? 0;
      });
      return counts;
    },
  });
}

/**
 * แยกยอดของกล่องโมดูลว่ามาจากเมนูไหนเท่าไร — ใช้ทำ tooltip และ aria-label
 * ที่กล่องหน้าแรก เอาเฉพาะเมนูที่มีของค้างจริง
 */
export function badgeBreakdownForScreenCodes(
  counts: MenuBadgeCounts,
  screenCodes: readonly string[],
): MenuBadgeBreakdownItem[] {
  const codes = new Set(screenCodes);
  return MENU_BADGE_REGISTRY.filter(
    (entry) => !entry.hidden && codes.has(entry.screenCode),
  )
    .map((entry) => ({
      menuKey: entry.menuKey,
      label: entry.label,
      kind: entry.kind,
      count: counts[entry.menuKey] ?? 0,
    }))
    .filter((item) => item.count > 0);
}

/** ป้ายกำกับ badge ของเมนูเดียว (aria-label ใน sidebar) */
export function badgeLabelForMenuKey(menuKey: string): string {
  const entry = MENU_BADGE_REGISTRY.find((row) => row.menuKey === menuKey);
  if (!entry) {
    return "รอดำเนินการ";
  }
  return entry.kind === "approval" ? "รออนุมัติ" : "รอดำเนินการ";
}

/**
 * ป้ายกำกับของเมนู hub ที่รวม badge ของหลายเมนูลูก — กติกาเดียวกับ badge รวม
 * ของกล่องหน้าแรก: มีงานที่ต้องทำเองปนอยู่ ใช้คำที่ครอบคลุมกว่า
 */
export function badgeLabelForMenuKeys(
  menuKeys: readonly string[],
): "รออนุมัติ" | "รอดำเนินการ" {
  const entries = MENU_BADGE_REGISTRY.filter((row) =>
    menuKeys.includes(row.menuKey),
  );
  if (entries.length === 0) {
    return "รอดำเนินการ";
  }
  return entries.some((entry) => entry.kind === "action")
    ? "รอดำเนินการ"
    : "รออนุมัติ";
}

/**
 * ป้ายกำกับของ badge รวม — กล่องที่มีงานต้องทำเอง (ไม่ใช่แค่รออนุมัติ)
 * หรือมีทั้งสองแบบปนกัน ใช้ "รอดำเนินการ" ที่ครอบคลุมกว่า
 */
export function badgeLabelForBreakdown(
  breakdown: MenuBadgeBreakdownItem[],
): "รออนุมัติ" | "รอดำเนินการ" {
  return breakdown.some((item) => item.kind === "action")
    ? "รอดำเนินการ"
    : "รออนุมัติ";
}
