import { ApiError } from "./client";

/**
 * เอกสารถูกคนอื่นแก้ไปแล้วระหว่างที่เราเปิดค้างไว้
 *
 * backend คืน 409 เมื่อเลขรุ่นที่ส่งมาทาง `If-Match` ไม่ตรงกับของจริง
 * ต่างจาก 400 (ข้อมูลไม่ถูกต้อง) ตรงที่สิ่งที่ผู้ใช้กรอกอาจไม่ได้ผิดอะไรเลย
 * แค่ฐานที่กรอกมาเปลี่ยนไป — จึงต้องให้โหลดใหม่แล้วดูก่อน ไม่ใช่ให้แก้ค่า
 */
export function isStaleDocumentConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409;
}

/** ข้อความสำรองกรณี backend ไม่ได้ส่งรายละเอียดมา */
export const STALE_DOCUMENT_FALLBACK_MESSAGE =
  "มีคนอื่นแก้เอกสารนี้หลังจากคุณเปิดหน้านี้ — กรุณาโหลดข้อมูลใหม่แล้วตรวจก่อนบันทึกอีกครั้ง";

export function staleDocumentMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }
  return STALE_DOCUMENT_FALLBACK_MESSAGE;
}
