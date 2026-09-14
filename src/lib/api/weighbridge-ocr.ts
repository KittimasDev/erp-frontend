import type { WeighTicketOcrApiResponse } from "@/types/weighbridge-ocr";
import { apiUpload } from "./client";

/**
 * ส่งรูปใบชั่งไปให้ backend อ่านด้วย OCR
 * ผลที่ได้เป็นข้อเสนอเท่านั้น ยังไม่ถูกบันทึกลงตั๋ว
 */
export function scanWeighTicketOcr(
  token: string | null,
  params: {
    ticketId: string;
    file: File;
    lang?: string;
    mode?: "FULL" | "WEIGHTS_ONLY";
  },
): Promise<WeighTicketOcrApiResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.lang) {
    formData.append("lang", params.lang);
  }
  if (params.mode) {
    formData.append("mode", params.mode);
  }
  return apiUpload<WeighTicketOcrApiResponse>(
    `/api/weighbridge/tickets/${params.ticketId}/ocr-scan`,
    formData,
    { token },
  );
}

/**
 * สแกนรูปใบชั่งโดยยังไม่มีตั๋ว — ใช้ตอนอัปรูปจากหน้ารายการรับซื้อเพื่อเปิดตั๋วใหม่
 * ผลที่ได้เป็นข้อเสนอ ยังไม่มีตั๋วเกิดขึ้น จนกว่าจะเรียก createWeighbridgeTicketFromOcr
 */
export function scanWeighTicketOcrStandalone(
  token: string | null,
  params: {
    file: File;
    lang?: string;
    mode?: "FULL" | "WEIGHTS_ONLY";
  },
): Promise<WeighTicketOcrApiResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.lang) {
    formData.append("lang", params.lang);
  }
  if (params.mode) {
    formData.append("mode", params.mode);
  }
  return apiUpload<WeighTicketOcrApiResponse>(
    "/api/weighbridge/tickets/ocr-scan",
    formData,
    { token },
  );
}
