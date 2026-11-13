import type {
  LabSample,
  LabSpecCheck,
  LabSpecField,
  LabTestResult,
} from "@/types/laboratory";

/** ป้ายชื่อฟิลด์เกณฑ์ (ข้อความไทย — ผู้ใช้แปลด้วย t()) */
export const LAB_SPEC_FIELD_LABEL: Record<LabSpecField, string> = {
  parameterName: "ชื่อพารามิเตอร์",
  unit: "หน่วย",
  specMin: "Min",
  specMax: "Max",
};

export const showCriterion = (v: string | null | undefined) =>
  v && v.length > 0 ? v : "—";

/** ผลตรวจพร้อมผลเทียบเกณฑ์ ที่ต้องแจ้งผู้ใช้ (เกณฑ์เปลี่ยน/หน่วยเปลี่ยน) */
export type ChangedResult = LabTestResult & { specCheck: LabSpecCheck };

export function isCriteriaChanged(r: LabTestResult): r is ChangedResult {
  const s = r.specCheck?.status;
  return s === "CHANGED" || s === "UNIT_CONFLICT";
}

/** ผลที่ใช้เกณฑ์ปัจจุบันได้โดยตรง (เกณฑ์ต่างและเทียบกันได้) */
export const canApplyDirectly = (r: LabTestResult): boolean =>
  r.specCheck?.status === "CHANGED";

export type SpecNotices = {
  /** เกณฑ์เปลี่ยน (รวมหน่วยเปลี่ยน) */
  changed: ChangedResult[];
  /** ไม่มี Snapshot เดิมให้เทียบ */
  unknown: LabTestResult[];
  /** พารามิเตอร์ถูกนำออกจาก Spec แล้ว (ยังมีผลตรวจเดิม) */
  removed: LabTestResult[];
  /** พารามิเตอร์ที่เพิ่มเข้า Spec ภายหลังและยังไม่มีผลตรวจ */
  addedLater: Array<{ id: string; parameterName: string }>;
};

/** รวบรวมสิ่งที่ Spec เปลี่ยนไปจากตอนบันทึกผล — ใช้ใน Modal อนุมัติ (เฉพาะตัวอย่างที่ยังไม่ตัดสิน) */
export function collectSpecNotices(sample: LabSample): SpecNotices {
  const open = sample.status === "REGISTERED" || sample.status === "TESTING";
  const empty: SpecNotices = {
    changed: [],
    unknown: [],
    removed: [],
    addedLater: [],
  };
  if (!open) return empty;
  const results = sample.results ?? [];
  const resulted = new Set(
    results.map((r) => r.specParameterId).filter((v): v is string => !!v),
  );
  return {
    changed: results.filter(isCriteriaChanged),
    unknown: results.filter((r) => r.specCheck?.status === "UNKNOWN"),
    removed: results.filter((r) => r.specCheck?.status === "REMOVED"),
    addedLater: (sample.spec?.parameters ?? [])
      .filter((p) => p.addedLater && !resulted.has(p.id))
      .map((p) => ({ id: p.id, parameterName: p.parameterName })),
  };
}

export const hasSpecNotices = (n: SpecNotices) =>
  n.changed.length + n.unknown.length + n.removed.length + n.addedLater.length >
  0;
