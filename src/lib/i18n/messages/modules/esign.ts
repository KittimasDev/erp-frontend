/** ข้อความอังกฤษของ E-Signature (modal กลาง + ตั้งค่าใน Permission Matrix) — คีย์ = ข้อความไทยในโค้ด */
export const EN_ESIGN: Record<string, string> = {
  "ยืนยันตัวตน (E-Signature)": "Confirm identity (E-Signature)",
  "ยืนยันรหัสผ่านของผู้ที่เข้าสู่ระบบอยู่": "Confirm the password of the signed-in user",
  "กรอก Username และรหัสผ่านเพื่อยืนยันการทำรายการ — Username ต้องเป็นของผู้ที่เข้าสู่ระบบอยู่เท่านั้น":
    "Enter your username and password to confirm this action — the username must be your own (the signed-in user)",
  "ไม่ได้รับโทเคนยืนยัน กรุณาลองใหม่": "No confirmation token received, please try again",
  "ยืนยันตัวตนไม่สำเร็จ": "Identity confirmation failed",
  "เหลือโอกาสอีก {n} ครั้ง — ถ้าผิดครบจะถูกออกจากระบบ":
    "{n} attempt(s) left — you will be signed out after too many wrong attempts",
  "ยืนยันตัวตนเพื่ออนุมัติ {n} รายการ": "Confirm identity to approve {n} items",
  "ยืนยันตัวตนเพื่อปฏิเสธ {n} รายการ": "Confirm identity to reject {n} items",
  "ยืนยันตัวตนเพื่อส่งกลับ {n} รายการ": "Confirm identity to return {n} items",
  "ไม่ต้องยืนยัน": "No confirmation",
  "รหัสผ่าน": "Password",
  "Username + รหัสผ่าน": "Username + password",
  "ตั้งค่าต่อหน้าจอ ใช้กับทุก Role และบันทึกทันที (ไม่ต้องกดบันทึกสิทธิ์) — กำหนดวิธียืนยันตัวตนตอนอนุมัติ":
    "Per-screen setting shared by all roles and saved immediately (no need to press Save) — how approvers must confirm their identity",
  "บันทึกโหมด E-Signature แล้ว — ใช้กับทุก Role": "E-Signature mode saved — applies to all roles",
  "บันทึกโหมด E-Signature ไม่สำเร็จ": "Could not save E-Signature mode",
};

Object.assign(EN_ESIGN, {
  "ประวัติ E-Signature": "E-Signature history",
  "อนุมัติเอกสาร": "Document approved",
  "ไม่อนุมัติเอกสาร": "Document rejected",
  "ตีกลับเอกสาร": "Document returned",
  "ยืนยันเอกสาร": "Document confirmed",
  "วิธีเซ็น": "Signing method",
  "ไม่มีประวัติ E-Signature": "No E-Signature history",
  "หน้านี้ปิดการยืนยันตัวตน หรือยังไม่มีการอนุมัติ":
    "Identity confirmation is off for this page, or nothing has been approved yet",
});
