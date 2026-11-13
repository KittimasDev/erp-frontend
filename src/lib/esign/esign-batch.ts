import { getESignRequirement } from "@/lib/api/esign";
import { getAccessToken } from "@/lib/auth/token";
import type { ESignAction, ESignMode } from "@/types/esign";

import {
  ESignCancelledError,
  registerESignBatch,
  requestESignGrant,
} from "./esign-gate";

export type ESignBatchInput = {
  screenCode: string;
  action: ESignAction;
  documentIds: string[];
};

/**
 * อนุมัติ/ปฏิเสธหลายเอกสารด้วยการยืนยันตัวตนครั้งเดียว
 *
 * 1. ถาม requirement ของหน้าจอ — OFF → run() เลย
 * 2. เปิด modal ครั้งเดียว (บอกจำนวนเอกสาร) → verify ทั้งชุด + action
 * 3. ลงทะเบียน grant ใน batch registry ระหว่าง run() — apiFetch เจอ 428 ของเอกสารในชุดจะแนบ grant ให้เอง
 *    (ใบละครั้ง) แล้วถอนทะเบียนเสมอเมื่อ run() จบ (สำเร็จหรือ error) จึงใช้ซ้ำกับชุดถัดไปไม่ได้
 * ผู้ใช้กดยกเลิก → ไม่รัน run() และ throw ESignCancelledError (เช็กด้วย isESignCancelled)
 * เอกสารนอกชุด/ต่าง action ที่โดน 428 ระหว่าง run() ยังต้องยืนยันเองทีละใบ
 */
export async function withESignBatch<T>(
  input: ESignBatchInput,
  run: () => Promise<T>,
): Promise<T> {
  const documentIds = [...new Set(input.documentIds)];
  if (documentIds.length === 0) return run();

  const accessToken = getAccessToken();
  let mode: ESignMode;
  try {
    mode = (await getESignRequirement(accessToken, input.screenCode)).data.mode;
  } catch {
    // ถามโหมดไม่ได้ — ปล่อยให้ backend เป็นด่านตัดสิน (428 ต่อเอกสารจะขอยืนยันทีละใบ)
    return run();
  }
  if (mode === "OFF") return run();

  const grant = await requestESignGrant({
    screenCode: input.screenCode,
    mode,
    action: input.action,
    documentIds,
  });
  if (!grant.grantToken) throw new ESignCancelledError();

  const unregister = registerESignBatch({
    accessToken,
    screenCode: input.screenCode,
    action: input.action,
    grantToken: grant.grantToken,
    documentIds,
  });
  try {
    return await run();
  } finally {
    unregister();
  }
}
