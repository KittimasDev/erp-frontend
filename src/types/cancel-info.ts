/** ข้อมูลการยกเลิกเอกสาร — ไม่มี/ว่าง (เอกสารเก่า) ให้แสดง "ไม่ได้ระบุเหตุผล" */
export type CancelInfo = {
  reason?: string;
  cancelledByName?: string;
  /** ISO 8601 */
  cancelledAt?: string;
};

/** เหตุผลยกเลิกเอกสารฝั่งจัดซื้อ ต้องยาวอย่างน้อยเท่านี้ (หลังตัดช่องว่าง) — ตรงกับ backend */
export const MIN_CANCEL_REASON_LENGTH = 5;
