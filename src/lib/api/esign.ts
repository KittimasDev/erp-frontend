import { apiFetch } from "./client";
import type {
  ESignatureHistoryApiResponse,
  ESignMode,
  ESignRequirementApiResponse,
  ESignSettingsApiResponse,
  ESignVerifyApiResponse,
  ESignVerifyBody,
  UpdateESignSettingApiResponse,
} from "@/types/esign";

export function verifyESign(token: string, body: ESignVerifyBody) {
  // ไม่ใส่ skipAuthRedirect — 401 (ESIGN_SESSION_REVOKED) ต้องพากลับหน้า login
  // ส่วน 403 ESIGN_INVALID ไม่ redirect อยู่แล้ว (redirect เฉพาะ 401)
  return apiFetch<ESignVerifyApiResponse>("/api/esign/verify", {
    method: "POST",
    token,
    body,
  });
}

export function getESignSettings(token: string) {
  return apiFetch<ESignSettingsApiResponse>("/api/esign/settings", {
    method: "GET",
    token,
  });
}

export function updateESignSetting(
  token: string,
  screenCode: string,
  mode: ESignMode,
) {
  return apiFetch<UpdateESignSettingApiResponse>(
    `/api/esign/settings/${encodeURIComponent(screenCode)}`,
    { method: "PUT", token, body: { mode } },
  );
}

/** โหมด E-Signature ของหน้าจอ (ผู้ใช้ที่ล็อกอินทุกคนเรียกได้) */
export function getESignRequirement(token: string, screenCode: string) {
  return apiFetch<ESignRequirementApiResponse>(
    `/api/esign/requirement/${encodeURIComponent(screenCode)}`,
    { method: "GET", token },
  );
}

/** ประวัติ E-Signature ของเอกสารหนึ่งใบ (ใหม่สุดก่อน) */
export function getESignatureHistory(token: string, documentId: string) {
  return apiFetch<ESignatureHistoryApiResponse>(
    `/api/documents/signatures?documentId=${encodeURIComponent(documentId)}`,
    { method: "GET", token },
  );
}
