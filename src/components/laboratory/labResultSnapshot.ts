import type { LabTestResult } from "@/types/laboratory";

/**
 * ข้อมูลผลตรวจ ณ เวลาที่บันทึก (Snapshot) — ชื่อพารามิเตอร์ หน่วย Min/Max และผลตัดสิน
 * เก็บอยู่ที่แถวผลตรวจเอง (lab_test_results) ไม่เปลี่ยนเมื่อมีการแก้ Spec ภายหลัง
 *
 * ใช้ตัวเดียวกันทั้งหน้ารายละเอียด Sample และ COA เพื่อให้แสดงตรงกันเสมอ
 * ห้ามเอา Spec ปัจจุบันมาเติมแทนค่าที่ไม่มี: ข้อมูลเก่าที่ไม่มี Snapshot แสดงเป็น "—" ตามที่เก็บไว้
 * (ไม่สร้างหรือคำนวณเกณฑ์ย้อนหลังเอง)
 */
export function labResultSnapshot(r: LabTestResult) {
  return {
    parameterName: r.parameterName,
    resultValue: r.resultValue,
    unit: r.unit && r.unit.length > 0 ? r.unit : "—",
    specMin: r.specMin && r.specMin.length > 0 ? r.specMin : "—",
    specMax: r.specMax && r.specMax.length > 0 ? r.specMax : "—",
    judgement: r.judgement,
  };
}
