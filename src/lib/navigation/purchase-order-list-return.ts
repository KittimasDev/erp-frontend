/**
 * จำ URL (รวมหน้า/ตัวกรอง) ของหน้ารายการใบสั่งซื้อไว้ใน sessionStorage
 * เพื่อให้ปุ่ม "กลับ" ในหน้ารายละเอียด/แก้ไข พากลับมาหน้าเดิมแทนที่จะเริ่มที่หน้า 1
 * (ปุ่มย้อนกลับของเบราว์เซอร์ใช้ URL ที่หน้ารายการเขียนไว้เองอยู่แล้ว)
 */
export const PO_LIST_PATH = "/purchase-orders";
export const PO_APPROVALS_PATH = "/purchase-orders/approvals";

const KEY_LIST = "po-list-href";
const KEY_APPROVALS = "po-approvals-href";
/** หน้ารายการล่าสุดที่ผู้ใช้อยู่ (รายการหรือรออนุมัติ) — ใช้เป็นปลายทางของปุ่มกลับ */
const KEY_LAST = "po-back-href";

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* sessionStorage ใช้ไม่ได้ (โหมดส่วนตัว ฯลฯ) — ปุ่มกลับจะไปหน้า 1 ตามเดิม */
  }
}

/** รับเฉพาะ path ของหน้ารายการเอง กันค่าแปลก ๆ ที่ถูกเขียนทับใน storage */
function safe(value: string | null, base: string): string | null {
  if (!value) return null;
  if (value === base || value.startsWith(`${base}?`)) return value;
  return null;
}

export function rememberPurchaseOrderListHref(href: string) {
  write(KEY_LIST, href);
  write(KEY_LAST, href);
}

export function rememberPurchaseOrderApprovalsHref(href: string) {
  write(KEY_APPROVALS, href);
  write(KEY_LAST, href);
}

/** ปลายทางปุ่มกลับจากหน้ารายละเอียด/แก้ไข — หน้ารายการที่ผู้ใช้มาจากล่าสุด */
export function getPurchaseOrderBackHref(): string {
  const last = read(KEY_LAST);
  return (
    safe(last, PO_LIST_PATH) ?? safe(last, PO_APPROVALS_PATH) ?? PO_LIST_PATH
  );
}

/** กลับหน้ารายการใบสั่งซื้อ (ไม่ใช่รออนุมัติ) พร้อมหน้า/ตัวกรองเดิม */
export function getPurchaseOrderListHref(): string {
  return safe(read(KEY_LIST), PO_LIST_PATH) ?? PO_LIST_PATH;
}
