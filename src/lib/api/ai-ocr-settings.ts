import { apiFetch } from "./client";
import type {
  AiOcrAvailabilityApiResponse,
  AiOcrConnectionTestApiResponse,
  AiOcrSettingsApiResponse,
  UpdateAiOcrSettingsRequest,
} from "@/types/ai-ocr-settings";

const BASE = "/api/settings/ai-ocr";

export function getAiOcrSettings(token: string) {
  return apiFetch<AiOcrSettingsApiResponse>(BASE, { method: "GET", token });
}

/** เปิดตั๋วจากรูปได้หรือยัง — ไม่ดึงคีย์ และเจ้าหน้าที่รับซื้อเรียกได้ */
export function getAiOcrAvailability(token: string) {
  return apiFetch<AiOcrAvailabilityApiResponse>(`${BASE}/availability`, {
    method: "GET",
    token,
  });
}

export function updateAiOcrSettings(
  token: string,
  body: UpdateAiOcrSettingsRequest,
) {
  return apiFetch<AiOcrSettingsApiResponse>(BASE, {
    method: "PUT",
    token,
    body,
  });
}

export function deleteAiOcrApiKey(token: string) {
  return apiFetch<AiOcrSettingsApiResponse>(`${BASE}/api-key`, {
    method: "DELETE",
    token,
  });
}

export function testAiOcrConnection(token: string) {
  return apiFetch<AiOcrConnectionTestApiResponse>(`${BASE}/test`, {
    method: "POST",
    token,
  });
}
