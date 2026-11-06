/** ข้อความอังกฤษของโมดูล common-ui — คีย์ = ข้อความไทยในโค้ด (ดู ../../translate.ts) */
export const EN_COMMON_UI: Record<string, string> = {
  /* ---------- BaseQtyHint / QuantityUnitInput ---------- */
  "แปลง {from} เป็น {to} ไม่ได้ — ยังไม่มีกฎแปลงหน่วยคู่นี้":
    "Cannot convert {from} to {to} — no conversion rule for this unit pair yet",
  "หน่วยนี้": "this unit",
  "หลัก": "Base",
  "หน่วยเดิม": "Original unit",
  "ไม่ตรงหน่วยหลัก": "Not the base unit",
  "ไม่มีกฎแปลง": "No conversion rule",
  "แปลงหน่วยนี้เป็น {unit} ไม่ได้ — เลือกหน่วยใหม่ก่อนบันทึก":
    "Cannot convert this unit to {unit} — choose another unit before saving",
  "หน่วยหลัก": "base unit",
  "สูงสุด": "Max",
  "เลือกสินค้าก่อน": "Select an item first",
  "กรุณาเลือกหน่วย": "Please select a unit",
  "กรุณากรอกจำนวน": "Please enter a quantity",
  "กรุณากรอกจำนวนที่มากกว่า 0": "Please enter a quantity greater than 0",
  "หน่วยนี้ต้องเป็นจำนวนเต็มเท่านั้น (ไม่อนุญาตให้มีทศนิยม)":
    "This unit must be a whole number (decimals are not allowed)",
  "หน่วยนี้อนุญาตทศนิยมไม่เกิน {n} ตำแหน่ง":
    "This unit allows at most {n} decimal places",
  "หน่วยนี้ยังไม่มีกฎแปลงเป็น {unit} — เลือกหน่วยใหม่ก่อนบันทึก":
    "This unit has no conversion rule to {unit} — choose another unit before saving",
  "จำนวนเมื่อแปลงเป็นหน่วยหลัก ({unit}) ต้องเป็นจำนวนเต็ม (ได้ {n})":
    "The quantity converted to the base unit ({unit}) must be a whole number (got {n})",
  "จำนวนที่รับครั้งนี้เกินยอดคงเหลือของ PO (คงเหลือสูงสุด {text})":
    "The quantity received exceeds the PO remaining balance (maximum remaining {text})",

  /* ---------- StatusLight / RowActionsMenu ---------- */
  "สถานะ {text}": "Status {text}",
  "ปกติ": "Normal",
  "เฝ้าระวัง": "Warning",
  "หยุด / เสีย": "Stopped / Faulty",
  "ไม่มีการผลิต": "No production",
  "ยืนยัน": "Confirm",

  /* ---------- DocumentAttachmentsPanel ---------- */
  "แนบไฟล์แล้ว": "File attached",
  "แนบไฟล์ไม่สำเร็จ": "Failed to attach file",
  "ลบไฟล์แล้ว": "File deleted",
  "ลบไฟล์ไม่สำเร็จ": "Failed to delete file",
  "ดาวน์โหลดไฟล์ไม่สำเร็จ": "Failed to download file",
  "ยังไม่มีไฟล์แนบ": "No attachments yet",
  "ไฟล์": "File",
  "ดาวน์โหลด": "Download",
  "ลบไฟล์นี้?": "Delete this file?",
  "ลบไฟล์": "Delete file",
  "แนบไฟล์": "Attach file",

  /* ---------- DocumentAuditTrail ---------- */
  "ประวัติการดำเนินการ": "Activity history",
  "ยังไม่มีประวัติการดำเนินการ": "No activity history yet",
  "ระบบ": "System",
  "สร้างเอกสาร": "Created document",
  "ยืนยันใบสั่งขาย": "Confirmed sales order",
  "ยกเลิกรอบจัดส่ง": "Cancelled delivery round",
  "แก้รายการ/ยอด": "Edited items/amounts",
  "แก้เลข PO ลูกค้า": "Edited customer PO no.",
  "แก้หัวเอกสาร/การชำระ": "Edited header/payment",
  "เลื่อนกำหนดส่ง": "Rescheduled delivery",
  "ลูกค้าตีกลับสินค้า": "Customer returned goods",
  "อนุมัติ": "Approve",
  "ปฏิเสธ": "Reject",
  "ส่งอนุมัติ": "Submit for approval",
  "สรุป/ปิดรายการ": "Finalize/close",
  "พิมพ์": "Print",
  "ส่งออก": "Export",

  /* ---------- DocumentHtmlEditor ---------- */
  "จัดรูปแบบข้อความ": "Text formatting",
  "ตัวหนา": "Bold",
  "ตัวเอียง": "Italic",
  "ขีดเส้นใต้": "Underline",
  "ขีดฆ่า": "Strikethrough",
  "หัวข้อใหญ่": "Heading 1",
  "หัวข้อรอง": "Heading 2",
  "รายการหัวข้อ": "Bulleted list",
  "รายการลำดับ": "Numbered list",
  "เช็กลิสต์": "Checklist",
  "จัดชิดซ้าย": "Align left",
  "จัดกึ่งกลาง": "Align center",
  "จัดชิดขวา": "Align right",
  "จัดชิดเสม่อ": "Justify",
  "โค้ด": "Code",
  "ล้างรูปแบบ": "Clear formatting",
};
