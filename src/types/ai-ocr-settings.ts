/**
 * ตั้งค่า AI อ่านเอกสาร
 * ต้องตรงกับ backend/src/settings/ai-ocr/dto/ai-ocr-settings-response.dto.ts
 *
 * **ไม่มีฟิลด์ `apiKey` ใน type ฝั่งอ่านโดยตั้งใจ** — คีย์ที่บันทึกแล้วไม่เคยถูกส่งกลับมา
 * จากเซิร์ฟเวอร์ การไม่มีฟิลด์นี้ทำให้ไม่มีทางเผลอ render ออกมาได้เลย
 */

/**
 * ตัวเลือกที่ขึ้นให้กดในหน้าตั้งค่า — **เป็นแค่คำแนะนำ พิมพ์ชื่ออื่นเองได้**
 * ผู้ให้บริการเปลี่ยนชื่อและเลิกให้เรียกโมเดลเก่าเป็นระยะ ถ้าล็อกเป็นรายการตายตัว
 * วันที่เขาเปลี่ยนจะใช้งานไม่ได้เลยจนกว่าจะ deploy ใหม่ (เกิดขึ้นจริงมาแล้ว)
 */
export const AI_OCR_SUGGESTED_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

export type AiOcrStatus =
  | "READY"
  | "DISABLED"
  | "NO_API_KEY"
  | "MASTER_KEY_MISSING"
  | "COOLDOWN";

export interface AiOcrSettings {
  provider: string;
  isEnabled: boolean;
  model: string;
  timeoutMs: number;
  hasApiKey: boolean;
  /** เช่น `AIza••••••7f3B` — ค่าเต็มไม่เคยออกจากเซิร์ฟเวอร์ */
  apiKeyMasked?: string | null;
  apiKeyUpdatedAt?: string | null;
  apiKeyUpdatedById?: string | null;
  /** เซิร์ฟเวอร์ตั้งกุญแจเข้ารหัสไว้แล้วหรือยัง — ถ้ายังจะบันทึกคีย์ไม่ได้ */
  masterKeyConfigured: boolean;
  status: AiOcrStatus;
  lastTestAt?: string | null;
  lastTestSuccess?: boolean | null;
  lastTestMessage?: string | null;
  updatedAt: string;
}

export interface AiOcrConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  model: string;
}

/** payload ของ PUT — ไม่ส่ง `apiKey` มา = ใช้คีย์เดิม */
export interface UpdateAiOcrSettingsRequest {
  isEnabled?: boolean;
  model?: string;
  timeoutMs?: number;
  apiKey?: string;
}

export interface AiOcrSettingsApiResponse {
  statusCode: number;
  message: string;
  data: AiOcrSettings;
}

export interface AiOcrConnectionTestApiResponse {
  statusCode: number;
  message: string;
  data: AiOcrConnectionTestResult;
}
