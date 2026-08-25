import type { UseQueryOptions } from "@tanstack/react-query";

import { hasAccessToken } from "@/lib/auth/token";

/**
 * ตัวช่วยกลางสำหรับ query ที่ดึงมาแค่ "จำนวนคิวงานค้าง" เพื่อโชว์ badge
 *
 * เดิม boilerplate ชุดนี้ถูก copy-paste อยู่ 5 ไฟล์ (pickings / sales-orders /
 * stock-posting / production-output / purchase-requests) และแตกเป็นสองสำนัก
 * ที่ตั้งค่า retry กับ refetchOnMount ไม่เหมือนกัน — รวมไว้ที่นี่ที่เดียว
 *
 * คืนเป็น options object ไม่ใช่ hook เพราะ registry ของ badge ต้องเอาไปยัด
 * `useQueries` (เรียก hook ใน .map() ผิด Rules of Hooks)
 */

/** badge เป็นข้อมูลรับรู้ทั่ว ๆ ไม่ใช่คิวเรียลไทม์ — 60 วิพอ ไม่ต้องถี่ */
export const COUNT_POLL_MS = 60_000;

/** poll ต่อไปเรื่อย ๆ แต่หยุดถ้า error แล้ว ไม่ถล่ม backend ที่ล่มอยู่ */
export function countPollInterval(query: {
  state: { status: string };
}): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return COUNT_POLL_MS;
}

/** endpoint ที่ paginate — ยิง limit=1 แล้วอ่าน total (ต้องเป็น COUNT จริงฝั่ง backend) */
export function selectListTotal(res: {
  data?: { total?: number | string; items?: unknown[] };
}): number {
  const total = res?.data?.total;
  if (typeof total === "number" && Number.isFinite(total)) {
    return total;
  }
  if (typeof total === "string" && total.trim() !== "") {
    const parsed = Number(total);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return res?.data?.items?.length ?? 0;
}

/** endpoint ที่คืน array เปล่า ไม่รับ page/limit — ต้องดึงทั้งก้อนมานับ */
export function selectDataLength(res: { data?: unknown[] }): number {
  return res?.data?.length ?? 0;
}

export type PendingCountQueryInput<TRes> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<TRes>;
  select: (res: TRes) => number;
  /**
   * สิทธิ์เข้าหน้าจอที่คิวนี้อยู่ — ประเมินตอน build options ทุก render
   * ไม่มีสิทธิ์ = ไม่ยิง request เลย (กัน 403 รัว ๆ จาก badge)
   */
  canAccess: () => boolean;
  enabled?: boolean;
};

export function pendingCountQueryOptions<TRes>(
  input: PendingCountQueryInput<TRes>,
): UseQueryOptions<TRes, Error, number> {
  return {
    queryKey: input.queryKey,
    queryFn: input.queryFn,
    enabled:
      (input.enabled ?? true) && hasAccessToken() && input.canAccess(),
    refetchInterval: countPollInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    retry: 1,
    select: input.select,
  } as UseQueryOptions<TRes, Error, number>;
}
