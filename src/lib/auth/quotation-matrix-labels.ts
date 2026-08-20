/** ต้องตรงกับ SCREEN_FUNCTION_NAME_OVERRIDES.QUOTATIONS ใน backend permission-seed-data */
export const QUOTATION_MATRIX_ACTION_LABELS = {
  VIEW: "ดูข้อมูล",
  VIEW_ALL: "ดูทุกรายการ",
  ADD: "สร้างใบเสนอราคา",
  EDIT: "แก้ไข / ส่ง / ยกเลิก",
  DELETE: "ลบข้อมูล",
  APPROVE: "บันทึกลูกค้าตอบรับ",
} as const;

export type QuotationMatrixVisibleActionKey =
  | "VIEW"
  | "VIEW_ALL"
  | "ADD"
  | "EDIT"
  | "APPROVE";

export const QUOTATION_MATRIX_ACTION_ORDER: QuotationMatrixVisibleActionKey[] =
  ["VIEW", "VIEW_ALL", "ADD", "EDIT", "APPROVE"];
