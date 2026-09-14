/**
 * ผลการอ่านใบชั่งจากรูปด้วย OCR
 * ต้องตรงกับ backend/src/weighbridge/ocr/dto/weigh-ticket-ocr-response.dto.ts
 */

export type OcrFieldSource = "OCR" | "DERIVED";

export interface OcrNumberField {
  value: number | null;
  /** 0..1 */
  confidence: number;
  source: OcrFieldSource;
  rawText?: string;
  lineIndex?: number;
}

export interface OcrTextField {
  value: string | null;
  confidence: number;
  rawText?: string;
  lineIndex?: number;
}

export interface OcrClassificationCandidate {
  tireClassificationId: string;
  classificationCode: string;
  classificationName: string;
  score: number;
}

export interface OcrItemSuggestion {
  rawName: string;
  weightKg: number | null;
  pricePerKg: number | null;
  confidence: number;
  match: OcrClassificationCandidate | null;
  candidates: OcrClassificationCandidate[];
}

export interface OcrDeductionSuggestion {
  deductionType: string;
  description: string;
  deductionWeightKg: number | null;
  deductionAmount: number | null;
  confidence: number;
  rawText: string;
}

export interface WeighTicketOcrResult {
  attachmentId: string;
  engine: string;
  lang: string;
  durationMs: number;
  /** 0..100 */
  meanConfidence: number;
  /** true = รอบแรกอ่านได้ไม่ครบ ระบบอ่านซ้ำด้วยโหมดจัดหน้าอีกแบบแล้วใช้ผลรอบนั้นแทน */
  rescued?: boolean;
  warnings: string[];
  gross: OcrNumberField;
  tare: OcrNumberField;
  net: OcrNumberField;
  /** น้ำหนักหักที่พิมพ์แยกช่องบนใบ — ถูกเสนอเป็นรายการหักให้ด้วยแล้ว */
  deductWeight: OcrNumberField;
  /** ชื่อสินค้าบนหัวเอกสาร สำหรับใบที่มีสินค้าชนิดเดียวต่อใบ */
  productName: OcrTextField;
  /** ชื่อผู้ขาย/ลูกค้าบนหัวเอกสาร — ใช้ตั้งชื่อตอนต้องสร้างผู้ขายใหม่ */
  sellerName: OcrTextField;
  /** รหัสผู้ขายที่พิมพ์นำหน้าชื่อ — แสดงให้ดูเฉย ๆ ตัวอักษรอาจเพี้ยน */
  sellerCode: OcrTextField;
  pricePerKg: OcrNumberField;
  totalAmount: OcrNumberField;
  licensePlate: OcrTextField;
  driverName: OcrTextField;
  ticketNo: OcrTextField;
  weighInAt: OcrTextField;
  weighOutAt: OcrTextField;
  items: OcrItemSuggestion[];
  deductions: OcrDeductionSuggestion[];
  rawText: string;
  /** มีเฉพาะตอนสแกนโดยยังไม่มีตั๋ว — รหัสเอกสารชั่วคราวที่ผูกรูปไว้ */
  ocrDraftId?: string;
}

export interface WeighTicketOcrApiResponse {
  statusCode: number;
  message: string;
  data: WeighTicketOcrResult;
}

/** ค่าที่ผู้ใช้ติ๊กเลือกจาก modal แล้วจะถูกเติมลงฟอร์ม */
export interface OcrApplySelection {
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  itemsMode: "REPLACE" | "APPEND";
  items: Array<{
    tireClassificationId: string;
    weightKg?: number;
    pricePerKg?: number;
    description?: string;
  }>;
  deductionsMode: "REPLACE" | "APPEND";
  deductions: Array<{
    deductionType: string;
    description?: string;
    deductionWeightKg?: number;
    deductionAmount?: number;
  }>;
  /** จำนวนฟิลด์ที่ถูกเลือก ใช้บอกผู้ใช้หลังเติมค่า */
  count: number;
}

/** payload ของ POST /weighbridge/tickets/from-ocr */
export interface CreateTicketFromOcrRequest {
  ocrAttachmentId?: string;
  sellerId?: string;
  truckId?: string;
  scaleId?: string;
  licensePlate?: string;
  sellerName?: string;
  driverName?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  weighInAt?: string;
  weighOutAt?: string;
  items?: Array<{
    tireClassificationId: string;
    description?: string;
    weightKg?: number;
    pricePerKg?: number;
  }>;
  deductions?: Array<{
    deductionType: string;
    description?: string;
    deductionWeightKg?: number;
    deductionAmount?: number;
  }>;
  referenceDocNo?: string;
  remark?: string;
  allowDuplicateReference?: boolean;
}
