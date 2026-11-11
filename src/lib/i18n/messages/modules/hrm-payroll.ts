/** ข้อความอังกฤษของ Flow อนุมัติ/จ่าย/ปิดงวดเงินเดือน — คีย์ = ข้อความไทยในโค้ด (ดู ../../translate.ts) */
export const EN_HRM_PAYROLL: Record<string, string> = {
  /* ---------- หน้ารายการงวด ---------- */
  "คำนวณเงินเดือน/ค่าแรง + OT เป็นงวด → ส่งอนุมัติ → อนุมัติ → ส่งออกรายการจ่าย/บันทึกผลจ่าย → ปิดงวด":
    "Calculate payroll/wages + OT per period → submit for approval → approve → export payment list / record payments → finalize",
  "กดชื่องวดเพื่อดูสลิป ปรับรายการ ส่งอนุมัติ บันทึกผลจ่าย และปิดงวด":
    "Click a period to view payslips, adjust, submit for approval, record payments and finalize",
  "เลือกเดือน/ปี": "Select month/year",
  "กำหนดช่วงวันที่เอง": "Custom date range",
  "เดือน/ปี": "Month/year",
  "เลือกเดือน": "Select a month",
  "ช่วงวันที่ของงวด (กำหนดให้อัตโนมัติตามเดือนที่เลือก)": "Period dates (set automatically from the selected month)",
  "ช่วงวันที่ทับกับงวดที่มีอยู่แล้ว": "Dates overlap an existing period",
  "ทับกับงวดที่ปิดแล้ว — สร้างงวดซ้อนไม่ได้ (กันจ่ายค่าจ้างวันเดียวกันสองรอบ)":
    "Overlaps a finalized period — cannot create an overlapping period (prevents paying the same days twice)",
  "พบงวดที่ช่วงวันที่ทับกัน — ตรวจว่าไม่ใช่งวดซ้ำ ก่อนสร้างซ้อน":
    "Periods with overlapping dates found — make sure this is not a duplicate before creating an overlapping one",
  "กลับไปแก้ช่วงวันที่": "Back to edit dates",
  "ยืนยันสร้างซ้อน": "Create anyway",
  "เปิดงวดนี้": "Open this period",

  /* ---------- หน้ารายละเอียดงวด ---------- */
  "ตรวจและส่งอนุมัติ": "Check & submit for approval",
  "อนุมัติงวดนี้?": "Approve this period?",
  "อนุมัติแล้วระบบสร้างรายการจ่ายรายพนักงาน และแก้ยอดโดยตรงไม่ได้":
    "After approval the system creates a payment line per employee and amounts can no longer be edited directly",
  "ถอนกลับเป็นร่าง": "Revert to draft",
  "ถอนอนุมัติกลับเป็นร่าง": "Revert approval to draft",
  "ยืนยันถอนกลับเป็นร่าง": "Confirm revert to draft",
  "ยืนยันส่งกลับแก้ไข": "Confirm send back",
  "ปิดแล้วล็อกทุกอย่าง และข้อมูลงวดนี้ใช้ออก 50 ทวิ ได้": "Finalizing locks everything, and this period's data can be used for Form 50 Tawi",
  "ปิดหน้าต่าง": "Close",
  "ถูกส่งกลับแก้ไข": "Sent back for correction",
  "แก้ไข/คำนวณใหม่ตามเหตุผล แล้วส่งอนุมัติอีกครั้ง": "Correct / recalculate according to the reason, then submit again",
  "รออนุมัติ — แก้รายการปรับ/คำนวณใหม่ถูกล็อก ผู้อนุมัติตรวจยอดแล้วอนุมัติ หรือส่งกลับแก้ไขพร้อมเหตุผล":
    "Pending approval — adjustments and recalculation are locked. The approver reviews the totals, then approves or sends back with a reason",
  "จ่ายเงินครบทุกรายการแล้ว — ตรวจยอดแล้วปิดงวด": "All payments completed — verify the totals, then finalize",
  "ส่งอนุมัติไม่ได้ — {n} สลิปมียอดสุทธิติดลบ: {names} (แก้รายการหัก/รายการปรับก่อน)":
    "Cannot submit — {n} payslip(s) have a negative net amount: {names} (fix deductions/adjustments first)",
  "ส่งอนุมัติไม่ได้ — {n} สลิปมียอดสุทธิเป็น 0: {names} (แก้ไข หรือระบุว่าไม่คำนวณค่าจ้างงวดนี้)":
    "Cannot submit — {n} payslip(s) have a net amount of 0: {names} (fix, or mark as not paid this period)",
  "มี {n} สลิปที่มีคำเตือน (เช่น ไม่มีฐานค่าจ้าง, OT คิดเงินไม่ได้) — ตรวจก่อนส่งอนุมัติ":
    "{n} payslip(s) have warnings (e.g. no pay base, unpriced OT) — review before submitting",
  "สลิปเงินเดือน": "Payslips",
  "ผลกระทบของการยกเลิก": "Effects of cancelling",
  "สลิปของงวดนี้ ({n} ใบ) ใช้ไม่ได้ และไม่นับในรายงาน": "This period's payslips ({n}) become invalid and are excluded from reports",
  "ข้อมูลของงวดนี้จะไม่ถูกนำไปออก 50 ทวิ": "This period's data will not be used for Form 50 Tawi",
  "รายการจ่ายที่สร้างไว้ (ถ้ามี) จะถูกลบ — ยกเลิกไม่ได้เมื่อมีรายการจ่ายแล้ว":
    "Any payment lines created are deleted — cancelling is not allowed once a payment has been recorded",
  "งวดที่ยกเลิกแล้วไม่บล็อกการสร้างงวดใหม่ในช่วงวันเดียวกัน": "A cancelled period does not block creating a new one for the same dates",
  "เหตุผลที่ส่งกลับแก้ไข (บังคับ)": "Reason for sending back (required)",
  "เหตุผลที่ถอนกลับเป็นร่าง (บังคับ)": "Reason for reverting to draft (required)",
  "เหตุผลที่ยกเลิก (บังคับ)": "Reason for cancelling (required)",
  "รายการจ่ายที่สร้างไว้จะถูกลบ และต้องส่งอนุมัติใหม่ — ทำได้เฉพาะเมื่อยังไม่มีรายการจ่ายสำเร็จ/บางส่วน":
    "Payment lines already created are deleted and the period must be submitted again — only possible when no payment has been recorded",

  /* ---------- ตรวจก่อนส่งอนุมัติ ---------- */
  "ตรวจงวดก่อนส่งอนุมัติ": "Pre-submission checks",
  "ตรวจงวดไม่สำเร็จ": "Checking the period failed",
  "ตรวจผ่านทุกข้อ — พร้อมส่งอนุมัติ": "All checks passed — ready to submit",
  "ส่งอนุมัติไม่ได้ — ต้องแก้ {n} ข้อ": "Cannot submit — {n} issue(s) must be fixed",
  "มี {n} คำเตือน — ตรวจแล้วต้องรับทราบพร้อมเหตุผล": "{n} warning(s) — review, then acknowledge with a reason",
  "ตั้งค่าข้อมูลพนักงาน": "Edit employee",
  "ตรวจแล้วและรับทราบคำเตือนทั้งหมด": "I have reviewed and acknowledge all warnings",
  "เหตุผลที่รับทราบ (บังคับ) เช่น ตรวจยอด OT แล้วถูกต้อง": "Reason for acknowledging (required), e.g. OT amounts verified",
  "ส่งอนุมัติแล้วจะแก้รายการปรับ/คำนวณใหม่ไม่ได้ จนกว่าผู้อนุมัติจะส่งกลับ":
    "After submitting, adjustments and recalculation are locked until the approver sends it back",

  /* ---------- แท็บการจ่ายเงิน ---------- */
  "ประวัติ": "History",
  "ต้องจ่ายรวม": "Total due",
  "จ่ายแล้วรวม": "Total paid",
  "บางส่วน": "Partial",
  "ไม่สำเร็จ": "Failed",
  "จ่ายสำเร็จ": "Paid",
  "จ่ายไม่สำเร็จ": "Payment failed",
  "จ่ายบางส่วน": "Partially paid",
  "บัญชีธนาคาร": "Bank account",
  "ยังไม่มีข้อมูลธนาคาร": "No bank details",
  "ยอดที่ต้องจ่าย": "Amount due",
  "วันที่จ่าย / วิธี / อ้างอิง": "Paid date / method / reference",
  "บันทึกโดย": "Recorded by",
  "บันทึกผลจ่าย": "Record payment",
  "บันทึกผลจ่าย — {name}": "Record payment — {name}",
  "ผลการจ่าย": "Payment result",
  "ยอดที่จ่ายรวมจริง (น้อยกว่ายอดที่ต้องจ่าย = จ่ายบางส่วน)": "Total actually paid (less than the amount due = partial payment)",
  "ใส่ยอดที่จ่าย": "Enter the amount paid",
  "ยอดจ่ายเกินยอดที่ต้องจ่าย": "Paid amount exceeds the amount due",
  "ต้องมากกว่ายอดที่จ่ายไปแล้ว": "Must be greater than the amount already paid",
  "งวดนี้ไม่มีรายการจ่าย (งวดที่ปิดก่อนมีขั้นตอนบันทึกการจ่ายเงิน)":
    "This period has no payment lines (it was closed before payment recording existed)",
  "รายการจ่ายจะถูกสร้างเมื่ออนุมัติงวด": "Payment lines are created when the period is approved",
  "ส่งออกรายการจ่ายให้ฝ่ายการเงินโอน แล้วกลับมาบันทึกผลที่นี่ — การส่งออกไม่เปลี่ยนสถานะเป็นจ่ายแล้ว งวดจะเป็น \"จ่ายเงินแล้ว\" เมื่อทุกรายการจ่ายสำเร็จครบ":
    "Export the payment list for Finance to transfer, then record the results here — exporting does not mark it as paid. The period becomes \"Paid\" once every line is paid successfully",
  "ส่งออกรายการจ่าย (Excel)": "Export payment list (Excel)",
  "ส่งออกรายการจ่าย (CSV)": "Export payment list (CSV)",
  "ส่งออกรายการจ่ายไม่สำเร็จ": "Exporting the payment list failed",
  "บันทึกผลจ่ายทีเดียว": "Record payments in bulk",
  "เลขอ้างอิงธุรกรรม (ถ้ามี)": "Transaction reference (optional)",
  "จ่ายสำเร็จทุกคนที่เหลือ ({n})": "Mark all remaining as paid ({n})",
  "บันทึกว่าจ่ายสำเร็จทุกคนที่ยังเหลือ {n} คน?": "Mark all {n} remaining employees as paid?",
  "วันที่/วิธี/เลขอ้างอิงตามที่กรอกด้านบน": "Date/method/reference as entered above",
  "จ่ายสำเร็จที่เลือก ({n})": "Mark selected as paid ({n})",
  "จ่ายไม่สำเร็จที่เลือก ({n})": "Mark selected as failed ({n})",
  "บันทึกว่าจ่ายไม่สำเร็จ {n} คน?": "Mark {n} employee(s) as payment failed?",
  "จ่ายบางส่วนหรือกรอกรายคน กดปุ่ม บันทึกผล ที่แถวของพนักงาน": "For partial payments or per-person entry, use Record payment on the employee's row",
  "จ่ายบางส่วน → กรอกรายคน": "Partial payment → enter per person",
  "วันที่/วิธี/เลขอ้างอิง ใช้ตามที่กรอกในกล่องบันทึกทีเดียว": "Date/method/reference use the values from the bulk box",
  "ส่งออกไม่ได้ — ยังไม่มีข้อมูลบัญชีธนาคาร": "Cannot export — bank details are missing",
  "พนักงานต่อไปนี้ยังไม่มีธนาคาร/เลขบัญชี ตั้งค่าในข้อมูลพนักงานแล้วส่งออกใหม่":
    "These employees have no bank/account number. Set it in the employee record, then export again",
  "โอนผ่านธนาคาร": "Bank transfer",

  /* ---------- แท็บประวัติ ---------- */
  "ส่งอนุมัติ": "Submit for approval",
  "ยกเลิกงวด": "Cancel period",
  "ส่งออกรายการจ่าย": "Export payment list",
  "จ่ายครบทุกรายการ": "All payments completed",
  "ประวัติส่งออกรายการจ่าย": "Payment export history",
  "ยังไม่มีประวัติเปลี่ยนสถานะ (งวดที่ทำก่อนมีขั้นตอนอนุมัติจะไม่มีประวัติย้อนหลัง)":
    "No status history yet (periods created before the approval flow have no history)",

  /* ---------- ตั้งค่า / ฟอร์มพนักงาน ---------- */
  "การอนุมัติและการจ่ายเงิน": "Approval & payment",
  "แยกหน้าที่: ผู้ส่งอนุมัติ/ผู้จัดทำ ≠ ผู้อนุมัติ ≠ ผู้บันทึกจ่ายเงิน (ใช้กับทุกคนรวมผู้ดูแลระบบ)":
    "Segregation of duties: submitter/preparer ≠ approver ≠ payer (applies to everyone, including administrators)",
  "ตรวจยอดผิดปกติก่อนส่งอนุมัติ: ยอดสุทธิเกินค่าจ้างปกติกี่เท่า (0 = ไม่ตรวจ)":
    "Anomaly check before submitting: net pay exceeding regular pay by how many times (0 = off)",
  "ธนาคารรับเงินเดือน": "Salary bank",
  "ใช้ส่งออกรายการจ่ายเงินเดือนให้ฝ่ายการเงิน": "Used for the payroll payment list sent to Finance",
  "เช่น กสิกรไทย": "e.g. Kasikornbank",
  "เลขบัญชีธนาคาร": "Bank account number",
  "เลขบัญชีต้องเป็นตัวเลข 8-20 หลัก": "Account number must be 8–20 digits",
  "ชื่อบัญชี": "Account name",
};
