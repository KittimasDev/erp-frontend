import type { ESignMode } from "@/types/esign";

/**
 * ตัวกลาง E-Signature ฝั่ง client — apiFetch เรียกเมื่อ backend ตอบ 428 ESIGN_REQUIRED
 *
 * - modal เดียวต่อ screenCode: คำขอที่ชนกัน (Promise.all / loop อนุมัติทีละใบ) ใช้ prompt เดียวกัน
 * - grant ที่ได้ถูกจำไว้ในหน่วยความจำต่อ (access token + screenCode) จนใกล้หมดอายุ
 *   → อนุมัติหลายเอกสารด้วยการยืนยันครั้งเดียว
 */

export type ESignGrant = { grantToken: string; expiresInSeconds: number };

export type ESignRequest = { screenCode: string; mode: ESignMode };

export type ESignRequester = (request: ESignRequest) => Promise<ESignGrant>;

/** ผู้ใช้กดยกเลิก modal */
export class ESignCancelledError extends Error {
  constructor() {
    super("ยกเลิกการยืนยันตัวตน");
    this.name = "ESignCancelledError";
  }
}

/** ตัดอายุ grant ก่อนหมดจริง (ms) กันส่งไปแล้วหมดกลางทาง */
const EXPIRY_MARGIN_MS = 10_000;

let requester: ESignRequester | null = null;
const cache = new Map<string, { token: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();

const cacheKey = (accessToken: string, screenCode: string) =>
  `${accessToken}\u0000${screenCode}`;

export function registerESignRequester(next: ESignRequester | null) {
  requester = next;
}

export function hasESignRequester() {
  return requester !== null;
}

export function invalidateESignGrant(accessToken: string, screenCode: string) {
  cache.delete(cacheKey(accessToken, screenCode));
}

export function clearESignGrants() {
  cache.clear();
}

function readCache(accessToken: string, screenCode: string): string | null {
  const key = cacheKey(accessToken, screenCode);
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.token;
}

/**
 * ขอ grant ของหน้าจอหนึ่ง — คืนจาก cache ถ้ายังใช้ได้, ถ้าไม่มีก็เปิด modal (ร่วมกันทุกคำขอที่รออยู่)
 * `forceFresh` = ข้าม cache (กรณี server ปฏิเสธ grant เดิม)
 */
export function obtainESignGrant(
  accessToken: string,
  request: ESignRequest,
  forceFresh = false,
): Promise<string> {
  if (!forceFresh) {
    const cached = readCache(accessToken, request.screenCode);
    if (cached) return Promise.resolve(cached);
  }

  const inFlightKey = cacheKey(accessToken, request.screenCode);
  const inFlight = pending.get(inFlightKey);
  if (inFlight) return inFlight;

  if (!requester) {
    return Promise.reject(new ESignCancelledError());
  }

  const promise = requester(request)
    .then((grant) => {
      cache.set(inFlightKey, {
        token: grant.grantToken,
        expiresAt: Date.now() + grant.expiresInSeconds * 1000 - EXPIRY_MARGIN_MS,
      });
      return grant.grantToken;
    })
    .finally(() => {
      pending.delete(inFlightKey);
    });
  pending.set(inFlightKey, promise);
  return promise;
}
