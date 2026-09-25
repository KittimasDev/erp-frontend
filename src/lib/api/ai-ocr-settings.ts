import { apiFetch } from "./client";
import type {
  AiOcrConnectionTestApiResponse,
  AiOcrSettingsApiResponse,
  UpdateAiOcrSettingsRequest,
} from "@/types/ai-ocr-settings";

const BASE = "/api/settings/ai-ocr";

export function getAiOcrSettings(token: string) {
  return apiFetch<AiOcrSettingsApiResponse>(BASE, { method: "GET", token });
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
