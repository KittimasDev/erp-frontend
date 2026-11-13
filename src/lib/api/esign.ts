import { apiFetch } from "./client";
import type {
  ESignMode,
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
