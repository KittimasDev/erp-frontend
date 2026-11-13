import type { ESignAction, ESignMode } from "@/types/esign";

/**
 * ตัวกลาง E-Signature ฝั่ง client — apiFetch เรียกเมื่อ backend ตอบ 428 ESIGN_REQUIRED
 *
 * grant ผูกกับ User + Session + หน้าจอ + การกระทำ + ชุดเอกสาร และใช้ได้เอกสารละครั้งเท่านั้น
 * ฝั่ง client จึง **ไม่ cache grant ข้ามเอกสาร/การกระทำ** เด็ดขาด:
 * - เอกสารเดี่ยว: 428 แต่ละใบขอ grant ของตัวเอง (modal ทีละอัน) — คำขอที่เหมือนกันทุกอย่าง
 *   (screen + action + documentId) ที่ชนกันขณะ modal เปิดอยู่ ใช้ prompt เดียวกัน
 * - อนุมัติหลายใบ (batch): withESignBatch ขอ grant ครั้งเดียวทั้งชุด แล้วลงทะเบียนใน batch registry
 *   ระหว่าง run() เท่านั้น — เอกสารในชุดใช้ได้ใบละครั้ง
 */

export type ESignGrant = { grantToken: string; expiresInSeconds: number };

export type ESignRequest = {
  screenCode: string;
  mode: ESignMode;
  action: ESignAction;
  /** เอกสารที่ grant นี้จะครอบคลุม (เดี่ยว = 1 ใบ) */
  documentIds: string[];
};

export type ESignRequester = (request: ESignRequest) => Promise<ESignGrant>;

/** ผู้ใช้กดยกเลิก modal */
export class ESignCancelledError extends Error {
  readonly esignCancelled = true;
  constructor() {
    super("ยกเลิกการยืนยันตัวตน");
    this.name = "ESignCancelledError";
  }
}

/** true เมื่อ error มาจากการกดยกเลิก E-Signature (ทั้งแบบตรงและที่ apiFetch แปลงเป็น ApiError 428) */
export function isESignCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { esignCancelled?: unknown }).esignCancelled === true
  );
}

let requester: ESignRequester | null = null;
const pending = new Map<string, Promise<string>>();

export function registerESignRequester(next: ESignRequester | null) {
  requester = next;
}

export function hasESignRequester() {
  return requester !== null;
}

/** เปิด modal ขอ grant (ไม่ผ่าน dedupe) — ใช้โดย withESignBatch */
export function requestESignGrant(request: ESignRequest): Promise<ESignGrant> {
  if (!requester) return Promise.reject(new ESignCancelledError());
  return requester(request);
}

const pendingKey = (accessToken: string, request: ESignRequest) =>
  [
    accessToken,
    request.screenCode,
    request.action,
    request.documentIds.join(","),
  ].join("\u0000");

/**
 * ขอ grant สำหรับเอกสารเดี่ยว — เปิด modal ทุกครั้ง (ไม่มี cache)
 * คำขอที่ (screen, action, documentId) เดียวกันและ modal ยังเปิดอยู่ ใช้ prompt เดียวกัน
 */
export function obtainESignGrant(
  accessToken: string,
  request: ESignRequest,
): Promise<string> {
  const key = pendingKey(accessToken, request);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const promise = requestESignGrant(request)
    .then((grant) => grant.grantToken)
    .finally(() => {
      pending.delete(key);
    });
  pending.set(key, promise);
  return promise;
}

// ───────────────────────── batch registry ─────────────────────────

type Batch = {
  accessToken: string;
  screenCode: string;
  action: ESignAction;
  grantToken: string;
  documentIds: Set<string>;
  used: Set<string>;
};

const batches = new Set<Batch>();

/** ลงทะเบียน grant ของชุดเอกสาร — คืนฟังก์ชันถอนทะเบียน (เรียกตอน run() จบ) */
export function registerESignBatch(input: {
  accessToken: string;
  screenCode: string;
  action: ESignAction;
  grantToken: string;
  documentIds: string[];
}): () => void {
  const batch: Batch = {
    accessToken: input.accessToken,
    screenCode: input.screenCode,
    action: input.action,
    grantToken: input.grantToken,
    documentIds: new Set(input.documentIds),
    used: new Set(),
  };
  batches.add(batch);
  return () => {
    batches.delete(batch);
  };
}

/**
 * หา grant ของ batch ที่ครอบคลุม (screen + action + documentId) และเอกสารนั้นยังไม่ถูกใช้
 * เจอ = ทำเครื่องหมายว่าใช้แล้วและคืน token; ไม่เจอ = null (ให้ไปขอ grant เดี่ยว)
 */
export function takeBatchGrant(
  accessToken: string,
  screenCode: string,
  action: ESignAction,
  documentId: string,
): string | null {
  for (const batch of batches) {
    if (
      batch.accessToken === accessToken &&
      batch.screenCode === screenCode &&
      batch.action === action &&
      batch.documentIds.has(documentId) &&
      !batch.used.has(documentId)
    ) {
      batch.used.add(documentId);
      return batch.grantToken;
    }
  }
  return null;
}

/** คืนสิทธิ์ใช้เอกสารนั้นใน batch (backend ปล่อย grant คืนเมื่อคำขอล้มด้วย business error) */
export function releaseBatchGrant(
  accessToken: string,
  screenCode: string,
  action: ESignAction,
  documentId: string,
  grantToken: string,
) {
  for (const batch of batches) {
    if (
      batch.accessToken === accessToken &&
      batch.screenCode === screenCode &&
      batch.action === action &&
      batch.grantToken === grantToken
    ) {
      batch.used.delete(documentId);
    }
  }
}
