/** ข้อความอังกฤษของโมดูล lab — คีย์ = ข้อความไทยในโค้ด (ดู ../../translate.ts) */
export const EN_LAB: Record<string, string> = {
  /* ---------- sample list ---------- */
  "ตัวอย่างตรวจสอบ": "Test samples",
  "ลงทะเบียนตัวอย่างจากการผลิต วัตถุดิบ สารเคมี สินค้าสำเร็จรูป พร้อมผูก Lot · พิมพ์ Certificate of Analysis (COA)":
    "Register samples from production, raw materials, chemicals and finished goods, link them to a lot, and print the Certificate of Analysis (COA)",
  "ลงทะเบียนตัวอย่าง": "Register sample",
  "ประวัติ COA": "COA history",
  "เลขที่ตัวอย่าง": "Sample no.",
  "สินค้า / Lot": "Item / Lot",
  "วันที่เก็บ": "Collected date",
  "ผลตรวจ": "Test results",
  "เช่น LS-20260723": "e.g. LS-20260723",
  "ยังไม่มีตัวอย่าง": "No samples yet",
  "กดปุ่มลงทะเบียนตัวอย่างเพื่อเริ่มต้น": "Click Register sample to get started",

  /* ---------- sample types (render-time) ---------- */
  "ตัวอย่างจากการผลิต": "Production sample",
  "น้ำมัน": "Oil",

  /* ---------- judgement / lot QC (render-time) ---------- */
  "ไม่ผ่าน": "Fail",
  "ไม่มีเกณฑ์": "No criteria",
  "รอ QC": "Pending QC",
  "ผ่าน (Approved)": "Passed (Approved)",
  "ไม่ผ่าน (Rejected)": "Failed (Rejected)",

  /* ---------- create modal ---------- */
  "ลงทะเบียนตัวอย่างส่งตรวจ": "Register sample for testing",
  "ประเภทตัวอย่าง": "Sample type",
  "เลือกประเภทตัวอย่าง": "Select a sample type",
  "เลือกประเภท": "Select a type",
  "วันที่เก็บตัวอย่าง": "Sample collection date",
  "Lot ต้นทาง": "Source lot",
  "ค้นด้วยเลข Lot / ชื่อสินค้า / Batch — เลือกแล้วระบบดึงสินค้าและเลข Batch ให้ · ผล Lab อนุมัติจะปล่อย Lot ที่รอ QC ให้อัตโนมัติ":
    "Search by lot no. / item name / batch. The item and batch no. are filled in automatically. Approving the lab result releases a lot that is pending QC.",
  "ค้นหา Lot": "Search lots",
  "Lot นี้ QC สถานะ {status} แล้ว — ผล Lab จะไม่เปลี่ยนสถานะ QC ของ Lot":
    "This lot already has QC status {status}. The lab result will not change the lot's QC status.",

  /* ---------- COA ---------- */
  "เลขที่ COA": "COA no.",
  "ฉบับที่ {n}": "Version {n}",
  "ออกเมื่อ": "Issued at",
  "ผู้ออก": "Issued by",
  "เช่น COA-20261013": "e.g. COA-20261013",
  "ยังไม่มี COA ที่ออก": "No COA issued yet",
  "วันที่ออก": "Issue date",

  /* ---------- sample detail ---------- */
  "ไม่พบตัวอย่าง": "Sample not found",
  "กลับรายการ": "Back to list",
  "เปิด PDF COA แล้ว": "COA PDF opened",
  "พิมพ์ COA ไม่สำเร็จ": "Could not print COA",
  "ตีกลับผลตรวจ": "Return test results",
  "อนุมัติผลตรวจ": "Approve test results",
  "พิมพ์ COA": "Print COA",
  "ผลรีวิว": "Review result",
  "ไฟล์แนบ / รูปภาพผลตรวจ": "Attachments / test result images",
  "ยังไม่มีไฟล์แนบ (ผลวิเคราะห์ ภาพถ่ายตัวอย่าง ฯลฯ)":
    "No attachments yet (analysis results, sample photos, etc.)",
  "แนบไฟล์ / รูปภาพ": "Attach file / image",
  "สถานะสินค้า (Lot)": "Item status (lot)",
  "ผล Lab อนุมัติ → ปล่อย Lot ที่รอ QC · ตีกลับ → ปฏิเสธ Lot · Lot ที่ QC ตัดสินไปแล้วไม่ถูกทับ":
    "Lab approval releases a lot pending QC. Returning the results rejects the lot. A lot already decided by QC is not overwritten.",
  "จัดการสถานะ QC / Hold ของ Lot": "Manage lot QC / Hold status",
  "ลายเซ็นอิเล็กทรอนิกส์และ COA": "Electronic signatures and COA",
  "อนุมัติทั้งที่มีค่านอกเกณฑ์": "Approved despite out-of-spec values",
  "ออก COA ใหม่ (ยกเลิกฉบับเดิม)": "Reissue COA (void the previous version)",
  "ออกเลขที่ COA": "Issue COA no.",
  "ออก COA ใหม่": "Reissue COA",
  "ฉบับเดิม {no} จะถูกยกเลิกและเก็บไว้ในประวัติ":
    "The previous version {no} will be voided and kept in the history.",
  "ตัวอย่างนี้อนุมัติไปก่อนมีระบบเลขที่ COA — ออกเลขที่ให้ตอนนี้":
    "This sample was approved before COA numbering existed. Issue a COA number now.",
  "เหตุผล (อย่างน้อย 5 ตัวอักษร)": "Reason (at least 5 characters)",

  /* ---------- results section ---------- */
  "บันทึกผลตรวจ": "Record test results",
  "บันทึกผล": "Save results",
  "ตาม Spec: {name}": "Per spec: {name}",
  "บันทึกครบทุกพารามิเตอร์ของ Spec แล้ว": "All spec parameters have been recorded",
  "จำเป็น": "Required",
  "เกณฑ์ {min} – {max}": "Limits {min} – {max}",
  "ยังไม่ตั้งเกณฑ์": "No limits set",
  "ผลที่วัดได้": "Measured result",
  "ยังไม่มี Spec ของประเภท/สินค้านี้": "No spec for this type / item yet",
  "กรอกพารามิเตอร์และเกณฑ์เองด้านล่างได้ หรือให้ผู้ดูแลตั้ง Spec ที่หน้า Spec การตรวจ":
    "You can enter parameters and limits manually below, or ask an administrator to set up a spec on the Test specifications page.",
  "พารามิเตอร์อื่น (กรอกเอง)": "Other parameters (manual entry)",
  "พารามิเตอร์": "Parameter",
  "ลบแถว": "Delete row",
  "เพิ่มแถว": "Add row",
  "แก้ผล — {name}": "Edit result — {name}",
  "ใส่ผล": "Enter the result",
  "ผลตัดสิน": "Judgement",
  "แก้ผล": "Edit result",
  "ลบผลบรรทัดนี้?": "Delete this result line?",
  "ลบผล": "Delete result",
  "มี {n} พารามิเตอร์ไม่ผ่านเกณฑ์: {names}": "{n} parameter(s) failed the criteria: {names}",
  "อนุมัติได้ แต่ต้องระบุเหตุผล · หรือตีกลับเพื่อปฏิเสธ Lot":
    "You may approve, but a reason is required, or return the results to reject the lot.",
  "ยังไม่มีผลพารามิเตอร์ที่จำเป็น: {names}": "Required parameters without results: {names}",
  "เตือนเท่านั้น ไม่บล็อกการอนุมัติ": "Warning only; approval is not blocked",
  "ยังไม่มีผลตรวจ": "No test results yet",

  /* ---------- sign modal ---------- */
  "อนุมัติผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)": "Approve test results (electronic signature)",
  "ตีกลับผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)": "Return test results (electronic signature)",
  "อนุมัติและออก COA": "Approve and issue COA",
  "ตัวอย่าง {no} · ผลตรวจ {n} รายการ": "Sample {no} · {n} test result(s)",
  " — อนุมัติแล้วระบบออกเลขที่ COA และปล่อย Lot ที่รอ QC ให้อัตโนมัติ":
    " — after approval the system issues a COA number and releases any lot pending QC automatically",
  " — ตีกลับแล้ว Lot ที่รอ QC จะถูกปฏิเสธ (ยอดถูก Block)":
    " — after returning, a lot pending QC will be rejected (its stock is blocked)",
  "เหตุผลที่อนุมัติทั้งที่ไม่ผ่านเกณฑ์ (บังคับ)": "Reason for approving despite failing criteria (required)",
  "ยืนยันด้วยรหัสผ่านของคุณ": "Confirm with your password",

  /* ---------- specs ---------- */
  "Spec การตรวจ": "Test specifications",
  "กำหนดพารามิเตอร์และเกณฑ์ผ่าน/ไม่ผ่านตามประเภทตัวอย่าง (หรือสินค้าเฉพาะ) — ตอนคีย์ผลระบบตัดสินให้อัตโนมัติ":
    "Define parameters and pass/fail limits by sample type (or specific item). The system judges results automatically when they are entered.",
  "เพิ่ม Spec": "Add spec",
  "ยังไม่มี Spec — กด เพิ่ม Spec": "No specs yet. Click Add spec.",
  "เฉพาะ {code} {name}": "Only {code} {name}",
  "ทั้งประเภท": "Whole type",
  "ลบ Spec นี้?": "Delete this spec?",
  "ผลตรวจที่บันทึกไปแล้วไม่ได้รับผลกระทบ": "Test results already recorded are not affected",
  "แก้ไข Spec — {name}": "Edit spec — {name}",
  "เพิ่ม Spec การตรวจ": "Add test specification",
  "สินค้าเฉพาะ (ไม่ใส่ = ใช้กับทั้งประเภท)": "Specific item (leave blank = applies to the whole type)",
  "สินค้าที่มี Spec เฉพาะจะใช้อันนั้น ไม่ใช้ของทั้งประเภท":
    "An item with its own spec uses that one instead of the type-wide spec",
  "ชื่อ Spec": "Spec name",
  "ใส่ชื่อ Spec": "Enter the spec name",
  "เช่น น้ำมันไพโรไลซิส": "e.g. Pyrolysis oil",
  "พารามิเตอร์และเกณฑ์": "Parameters and limits",
  "เกณฑ์เว้นว่างได้ (ไม่จำกัด) — ผลที่ไม่มีเกณฑ์จะไม่ถูกตัดสินผ่าน/ไม่ผ่าน · ติ๊ก \"จำเป็น\" = เตือนตอนคีย์ผลถ้ายังไม่มีพารามิเตอร์นี้":
    "Limits may be left blank (unlimited). Results without limits are not judged pass/fail. Ticking \"Required\" warns when results are entered without this parameter.",
  "พารามิเตอร์ เช่น Viscosity": "Parameter, e.g. Viscosity",
  "ลบพารามิเตอร์": "Delete parameter",
  "เพิ่มพารามิเตอร์": "Add parameter",

  /* ---------- hook toasts ---------- */
  "ลงทะเบียนตัวอย่าง {no} แล้ว": "Sample {no} registered",
  "ลงทะเบียนตัวอย่างไม่สำเร็จ": "Could not register the sample",
  "บันทึกผลตรวจแล้ว": "Test results saved",
  "บันทึกผลตรวจไม่สำเร็จ": "Could not save test results",
  "แก้ผลตรวจแล้ว": "Test result updated",
  "แก้ผลตรวจไม่สำเร็จ": "Could not update the test result",
  "ลบผลตรวจแล้ว": "Test result deleted",
  "ลบผลตรวจไม่สำเร็จ": "Could not delete the test result",
  "อนุมัติผลตรวจและออก COA แล้ว": "Test results approved and COA issued",
  "ตีกลับผลตรวจแล้ว": "Test results returned",
  "ออก COA เลขที่ {no} แล้ว": "COA no. {no} issued",
  "ออก COA ใหม่ไม่สำเร็จ": "Could not reissue the COA",
  "สร้าง Spec การตรวจแล้ว": "Test specification created",
  "สร้าง Spec ไม่สำเร็จ": "Could not create the spec",
  "บันทึก Spec การตรวจแล้ว": "Test specification saved",
  "บันทึก Spec ไม่สำเร็จ": "Could not save the spec",
  "ลบ Spec การตรวจแล้ว": "Test specification deleted",
  "ลบ Spec ไม่สำเร็จ": "Could not delete the spec",
};
