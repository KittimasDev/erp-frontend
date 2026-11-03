/** ประเภทค่าใช้จ่ายเพิ่มเติมของ PO (Master) — GL ของประเภทกำหนดบัญชีในสมุดรายวันซื้อ */
export type ExpenseType = {
  id: string;
  code: string;
  nameTh: string;
  glAccountId: string | null;
  glAccountCode: string | null;
  glAccountName: string | null;
  /** บัญชี GL ที่ผูกอยู่ยังเปิดใช้งานหรือไม่ (ถ้าปิด สมุดรายวันส่งออก Express ไม่ได้) */
  glAccountActive: boolean;
  isActive: boolean;
  sortOrder: number;
  /** รหัสระบบ (FREIGHT/SERVICE/OTHER) ลบ/เปลี่ยนรหัสไม่ได้ */
  isSystem: boolean;
};

export type ExpenseTypeQuery = { isActive?: boolean };

export type SaveExpenseTypeRequest = {
  code: string;
  name: string;
  glAccountId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};
