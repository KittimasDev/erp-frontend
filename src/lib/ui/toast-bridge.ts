/**
 * สะพานให้โค้ดที่อยู่นอก React แจ้งเตือนผู้ใช้ได้
 *
 * ฟังก์ชันสร้าง PDF เป็นฟังก์ชันเปล่า เรียก hook ไม่ได้ และ call site หลายจุด
 * เรียกแบบ fire-and-forget ไม่มี catch — ถ้าพลาดแล้วไม่บอกอะไร ผู้ใช้จะกดปุ่ม
 * พิมพ์แล้วเงียบหายไปเลย จึงให้ `ToastBridge` ลงทะเบียน message ของ antd ไว้ที่นี่
 */
type ToastFn = (content: string) => void;

let errorToast: ToastFn | null = null;

export function setErrorToast(fn: ToastFn | null) {
  errorToast = fn;
}

export function reportUserError(content: string) {
  if (errorToast) {
    errorToast(content);
    return;
  }
  // ยังไม่ได้ลงทะเบียน (เช่นเรียกก่อน mount) — อย่างน้อยต้องไม่หายเงียบ
  console.error(content);
}
