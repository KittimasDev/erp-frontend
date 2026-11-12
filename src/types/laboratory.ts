import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";

export type LabSampleStatus =
  | "REGISTERED"
  | "TESTING"
  | "APPROVED"
  | "REJECTED"
  | string;

export const LAB_SAMPLE_STATUS_LABEL: Record<string, string> = {
  REGISTERED: "ลงทะเบียน",
  TESTING: "กำลังตรวจ",
  APPROVED: standardStatusLabel("APPROVED"),
  REJECTED: standardStatusLabel("REJECTED"),
};

/** สี Tag สถานะตัวอย่าง — ผลอนุมัติ/ไม่อนุมัติใช้สีมาตรฐาน (ใช้ร่วม list / detail) */
export const LAB_SAMPLE_STATUS_COLOR: Record<string, string> = {
  REGISTERED: "default",
  TESTING: "blue",
  APPROVED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
};

/** ประเภทตัวอย่าง (M8.1) — ต้องตรงกับ `lab-sample-types.ts` ฝั่ง backend */
export const LAB_SAMPLE_TYPES = [
  "PRODUCTION",
  "RAW_MATERIAL",
  "CHEMICAL",
  "FINISHED_GOODS",
  "OIL",
] as const;

export const LAB_SAMPLE_TYPE_LABEL: Record<string, string> = {
  PRODUCTION: "ตัวอย่างจากการผลิต",
  RAW_MATERIAL: "วัตถุดิบ",
  CHEMICAL: "สารเคมี",
  FINISHED_GOODS: "สินค้าสำเร็จรูป",
  OIL: "น้ำมัน",
};

/** หมวดสินค้าที่ใช้กรองรายการ Lot ตอนเลือกประเภท */
export const LAB_SAMPLE_TYPE_ITEM_CATEGORY: Record<string, string> = {
  RAW_MATERIAL: "RAW_MATERIAL",
  CHEMICAL: "CHEMICAL",
  FINISHED_GOODS: "FINISHED_GOODS",
};

export type CreateLabSampleBody = {
  sampleType: string;
  itemId: string;
  specId: string;
  collectedDate: string;
  lotId?: string;
  remark?: string;
};

/** ผลตัดสินเทียบเกณฑ์ (M8.3) */
export const LAB_JUDGEMENT_LABEL: Record<string, string> = {
  PASS: "ผ่าน",
  FAIL: "ไม่ผ่าน",
  NA: "ไม่มีเกณฑ์",
};

export const LAB_JUDGEMENT_COLOR: Record<string, string> = {
  PASS: "success",
  FAIL: "error",
  NA: "default",
};

export const LOT_QC_LABEL: Record<string, string> = {
  PENDING: "รอ QC",
  HOLD: "พักไว้ (Hold)",
  APPROVED: "ผ่าน (Approved)",
  REJECTED: "ไม่ผ่าน (Rejected)",
};

export const LOT_QC_COLOR: Record<string, string> = {
  PENDING: "gold",
  HOLD: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

export type LabSignature = {
  id: string;
  action: "APPROVE" | "REJECT" | string;
  signedByName: string;
  signedAt: string;
  meaning: string;
  resultsHash: string;
  remark?: string;
};

export type LabCoa = {
  id: string;
  coaNo: string;
  sampleId: string;
  sampleNo: string;
  version: number;
  status: "ISSUED" | "VOIDED" | string;
  lotId?: string;
  lotNo?: string;
  issuedAt: string;
  issuedByName?: string;
  voidReason?: string;
  voidedAt?: string;
};

export type LabSpecParameter = {
  id: string;
  /** false = ถูกนำออกจาก Spec แล้ว (ยังมีผลตรวจอ้างอิง) */
  isActive?: boolean;
  parameterName: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  isRequired: boolean;
  sortOrder: number;
};

export type LabSpec = {
  id: string;
  sampleType: string;
  itemId?: string;
  itemCode?: string;
  itemNameTh?: string;
  nameTh: string;
  isActive: boolean;
  parameters: LabSpecParameter[];
};

export type LabSpecParameterInput = {
  /** id พารามิเตอร์เดิมตอนแก้ Spec — พารามิเตอร์ใหม่ไม่ต้องส่ง */
  id?: string;
  parameterName: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  isRequired?: boolean;
  sortOrder?: number;
};

export type CreateLabSpecBody = {
  sampleType: string;
  itemId?: string;
  nameTh: string;
  parameters: LabSpecParameterInput[];
};

export type UpdateLabSpecBody = {
  nameTh?: string;
  isActive?: boolean;
  parameters?: LabSpecParameterInput[];
};

/** บันทึกผลตาม Spec — ชื่อ/หน่วย/Min/Max backend ดึงจาก Spec เสมอ (ส่งมาไม่ได้) */
export type AddLabResultLine = {
  specParameterId: string;
  resultValue: string;
  remark?: string;
};

/** แก้ได้เฉพาะค่าผลตรวจและหมายเหตุ */
export type UpdateLabResultBody = {
  resultValue?: string;
  remark?: string;
};

export type ReviewLabSampleBody = {
  password: string;
  remark?: string;
  failReason?: string;
};

export type LabCoaQueryParams = {
  coaNo?: string;
  lotNo?: string;
  sampleNo?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type LabTestResult = {
  id: string;
  parameterName: string;
  resultValue: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  judgement: "PASS" | "FAIL" | "NA" | string;
  specParameterId?: string;
  remark?: string;
  testedById?: string;
  testedAt: string;
};

export type LabSample = {
  id: string;
  sampleNo: string;
  sampleType: string;
  referenceDocType?: string;
  referenceDocId?: string;
  referenceDocNo?: string;
  lotId?: string;
  lotNo?: string;
  batchNo?: string;
  itemId?: string;
  itemCode?: string;
  itemNameTh?: string;
  /** คำเตือนตอนสร้าง เช่น ประเภทไม่ตรงหมวดสินค้าของ Lot */
  warning?: string;
  specId?: string;
  /** Spec ที่เลือกไว้พร้อมพารามิเตอร์ทั้งหมด (ตอนดูรายละเอียด) */
  spec?: LabSpec;
  failApproveReason?: string;
  /** สถานะ QC ของ Lot ต้นทาง */
  lotQcStatus?: string;
  signatures?: LabSignature[];
  coas?: LabCoa[];
  collectedDate: string;
  status: LabSampleStatus;
  remark?: string;
  collectedById?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewRemark?: string;
  results: LabTestResult[];
  createdAt: string;
  updatedAt: string;
};

export type LabSampleCoa = {
  sample: LabSample;
  approvedByName?: string;
  approvedAt?: string;
  coaNo?: string;
  coaVersion?: number;
  coaIssuedAt?: string;
  signature?: LabSignature;
};

export type LabSampleQrCode = {
  sampleNo: string;
  qrCodeDataUri: string;
};

export type LabSampleQueryParams = {
  sampleNo?: string;
  status?: string;
  sampleType?: string;
  lotId?: string;
  referenceDocId?: string;
};

export type LabSampleListApiResponse = {
  statusCode: number;
  message: string;
  data: LabSample[];
};

export type LabSampleApiResponse = {
  statusCode: number;
  message: string;
  data: LabSample;
};

export type LabSampleCoaApiResponse = {
  statusCode: number;
  message: string;
  data: LabSampleCoa;
};

export type LabSampleQrCodeApiResponse = {
  statusCode: number;
  message: string;
  data: LabSampleQrCode;
};

/** ป้ายสถานะตัวอย่างตามภาษา — ไทยใช้ LAB_SAMPLE_STATUS_LABEL เดิม ("ปฏิเสธ"/"ลงทะเบียน" ชนกับคำกริยาใน dictionary) */
export function labSampleStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = {
      REGISTERED: "Registered",
      TESTING: "Testing",
      APPROVED: standardStatusLabel("APPROVED", "en"),
      REJECTED: standardStatusLabel("REJECTED", "en"),
    };
    return en[status] ?? status;
  }
  return LAB_SAMPLE_STATUS_LABEL[status] ?? status;
}

/** ป้ายสถานะ COA ตามภาษา — "ยกเลิก" ในไทยคือ Voided ไม่ใช่ปุ่ม Cancel */
export function labCoaStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") return status === "VOIDED" ? "Voided" : "Active";
  return status === "VOIDED" ? "ยกเลิก" : "ใช้งานอยู่";
}

/** ป้ายสถานะ Spec ตามภาษา — "ปิด" = ปิดใช้งาน (Inactive) ไม่ใช่ปุ่ม Close */
export function labSpecActiveLabel(isActive: boolean, lang: "th" | "en"): string {
  if (lang === "en") return isActive ? "Active" : "Inactive";
  return isActive ? "ใช้งาน" : "ปิด";
}

/** นำเข้า Spec จาก Excel/CSV — ตรงกับ `SpecImportAnalysis` / `SpecImportResult` ฝั่ง backend */
/** นำเข้าตัวอย่าง + ผลตรวจ — ตรงกับ `SampleImportAnalysis` / `SampleImportResult` ฝั่ง backend */
export type LabSampleImportResultLine = {
  row: number;
  parameterName: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  resultValue: string;
  judgement: string;
  analysisDate: string;
  analystName?: string;
};

export type LabSampleImportSample = {
  seq: number;
  firstRow: number;
  status: "OK" | "ERROR" | "DUPLICATE";
  messages: string[];
  sampleType?: string;
  collectedDate?: string;
  itemCode?: string;
  itemNameTh?: string;
  specName?: string;
  lotNo?: string;
  moNo?: string;
  results: LabSampleImportResultLine[];
};

export type LabSampleImportAnalysis = {
  totalRows: number;
  samples: LabSampleImportSample[];
  errors: { row: number; message: string }[];
  sampleCount: number;
  resultCount: number;
  importableSampleCount: number;
  importableResultCount: number;
  duplicateSampleCount: number;
  errorSampleCount: number;
  errorRowCount: number;
};

export type LabSampleImportResult = {
  importId: string;
  createdSamples: number;
  createdResults: number;
  skippedDuplicates: number;
  samples: { seq: number; sampleNo: string; results: number }[];
};

export type LabSpecImportStatus = "OK" | "ERROR" | "DUPLICATE";

export type LabSpecImportParameter = {
  row: number;
  parameterName: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  isRequired: boolean;
};

export type LabSpecImportSpec = {
  sampleType: string;
  itemId?: string;
  itemCode?: string;
  itemNameTh?: string;
  nameTh: string;
  status: LabSpecImportStatus;
  firstRow: number;
  parameters: LabSpecImportParameter[];
  messages: string[];
};

export type LabSpecImportAnalysis = {
  totalRows: number;
  specs: LabSpecImportSpec[];
  errors: { row: number; message: string }[];
  specCount: number;
  parameterCount: number;
  importableSpecCount: number;
  importableParameterCount: number;
  duplicateSpecCount: number;
  errorSpecCount: number;
  errorRowCount: number;
};

export type LabSpecImportResult = {
  totalSpecs: number;
  createdSpecs: number;
  createdParameters: number;
  failedSpecs: number;
  failures: { nameTh: string; row: number; reason: string }[];
};
