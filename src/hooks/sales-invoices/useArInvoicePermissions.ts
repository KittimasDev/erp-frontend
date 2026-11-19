"use client";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";

/**
 * สิทธิ์หน้าใบตั้งลูกหนี้ (AR) — รวมสิทธิ์หน้าเดิม (SALES_INVOICES / SALES_INVOICES_PENDING)
 * กับหน้าใหม่ในเมนูการรับเงิน (FINANCE_AR_INVOICES) · ฝั่ง backend รับสิทธิ์แบบ "รหัสใดรหัสหนึ่ง" เหมือนกัน
 */
export function useArInvoicePermissions() {
  const legacy = useScreenActionPermissions("SALES_INVOICES");
  const pending = useScreenActionPermissions("SALES_INVOICES_PENDING");
  const finance = useScreenActionPermissions("FINANCE_AR_INVOICES");
  return {
    canView: legacy.canView || pending.canView || finance.canView,
    /** สร้าง AR จาก DN */
    canCreate: finance.canAdd || legacy.canAdd || pending.canEdit,
    /** แก้ร่าง / เพิ่ม-ลบ DN / ยกเลิก / รับชำระ */
    canEdit: legacy.canEdit || finance.canEdit,
    /** ยืนยัน (E-Sign) */
    canApprove: legacy.canApprove || finance.canApprove,
  };
}
