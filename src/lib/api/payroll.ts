import { ApiError, apiFetch } from "./client";
import type {
  CreatePayrollRunRequest,
  PayBaseIssue,
  PayBaseValidationApiResponse,
  BulkPayrollPaymentsRequest,
  PayrollAdjustmentInput,
  PayrollCheckApiResponse,
  PayrollCheckItem,
  PayrollOverlapRun,
  PayrollPaymentExportApiResponse,
  PayrollPaymentInput,
  PayrollExclusionInput,
  PayrollRunApiResponse,
  PayrollRunListApiResponse,
  PayrollSettings,
  PayrollSettingsApiResponse,
  SalaryCertificateEmployeesApiResponse,
  WithholdingCertificatesApiResponse,
} from "@/types/payroll";

const BASE = "/api/hrm/payroll-runs";

export function getPayrollRuns(token: string) {
  return apiFetch<PayrollRunListApiResponse>(BASE, { method: "GET", token });
}

export function getPayrollRun(token: string, id: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}`, {
    method: "GET",
    token,
  });
}

export function createPayrollRun(token: string, body: CreatePayrollRunRequest) {
  return apiFetch<PayrollRunApiResponse>(BASE, { method: "POST", token, body });
}

/** ตรวจฐานเงินเดือน/ค่าแรงรายวันก่อนเริ่มคำนวณ (ไม่เขียนข้อมูล) */
export function validatePayrollRun(
  token: string,
  body: { periodStart: string; periodEnd: string; exclusions?: PayrollExclusionInput[] },
) {
  // ส่งเฉพาะฟิลด์ที่ endpoint รับ — backend ใช้ forbidNonWhitelisted จึงปฏิเสธ name/note ที่ติดมากับคำขอสร้างงวด
  const { periodStart, periodEnd, exclusions } = body;
  return apiFetch<PayBaseValidationApiResponse>(`${BASE}/validate`, {
    method: "POST",
    token,
    body: { periodStart, periodEnd, exclusions },
  });
}

/** ตั้งรายชื่อพนักงานที่ไม่คำนวณค่าจ้างในงวดนี้ (แทนที่ทั้งชุด) — ต้องคำนวณใหม่ต่อ */
export function setPayrollExclusions(token: string, id: string, items: PayrollExclusionInput[]) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/exclusions`, { method: "PUT", token, body: { items } });
}

/** รายชื่อพนักงานไม่มีฐานค่าจ้างจาก error 400 ของ create/recalculate/finalize (ถ้าเป็น error ชนิดนี้) */
export function payBaseIssuesFromError(error: unknown): PayBaseIssue[] | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: string; issues?: PayBaseIssue[] } | null;
  return body?.code === "PAYROLL_PAY_BASE_MISSING" && Array.isArray(body.issues) ? body.issues : null;
}

/** 409 งวดซ้ำตอนสร้าง: code + รายการงวดที่ทับ (ถ้าเป็น error ชนิดนี้) */
export function overlapFromError(
  error: unknown,
): { code: "PAYROLL_PERIOD_OVERLAP" | "PAYROLL_PERIOD_OVERLAP_FINALIZED"; message: string; runs: PayrollOverlapRun[] } | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: string; message?: string; runs?: PayrollOverlapRun[] } | null;
  if (
    (body?.code === "PAYROLL_PERIOD_OVERLAP" || body?.code === "PAYROLL_PERIOD_OVERLAP_FINALIZED") &&
    Array.isArray(body.runs)
  ) {
    return { code: body.code, message: body.message ?? "", runs: body.runs };
  }
  return null;
}

/** 400 ตรวจก่อนส่งอนุมัติไม่ผ่าน/มีคำเตือนที่ต้องรับทราบ */
export function checkFailureFromError(
  error: unknown,
): { code: "PAYROLL_CHECK_FAILED" | "PAYROLL_CHECK_WARNINGS"; message: string; errors: PayrollCheckItem[]; warnings: PayrollCheckItem[] } | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as {
    code?: string;
    message?: string;
    errors?: PayrollCheckItem[];
    warnings?: PayrollCheckItem[];
  } | null;
  if (body?.code === "PAYROLL_CHECK_FAILED" || body?.code === "PAYROLL_CHECK_WARNINGS") {
    return { code: body.code, message: body.message ?? "", errors: body.errors ?? [], warnings: body.warnings ?? [] };
  }
  return null;
}

/** 400 ส่งออกรายการจ่ายไม่ได้ เพราะพนักงานบางคนไม่มีข้อมูลธนาคาร */
export function bankMissingFromError(
  error: unknown,
): Array<{ userId: string; employeeCode?: string | null; displayName: string }> | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: string; items?: Array<{ userId: string; employeeCode?: string | null; displayName: string }> } | null;
  return body?.code === "PAYROLL_BANK_MISSING" && Array.isArray(body.items) ? body.items : null;
}

export function recalculatePayrollRun(token: string, id: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/recalculate`, {
    method: "POST",
    token,
  });
}

export function setPayrollAdjustments(
  token: string,
  id: string,
  userId: string,
  items: PayrollAdjustmentInput[],
) {
  return apiFetch<PayrollRunApiResponse>(
    `${BASE}/${id}/slips/${userId}/adjustments`,
    { method: "PUT", token, body: { items } },
  );
}

export function finalizePayrollRun(token: string, id: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/finalize`, {
    method: "POST",
    token,
  });
}

/** ยกเลิกงวด — ต้องมีเหตุผล (backend บังคับ) */
export function cancelPayrollRun(token: string, id: string, reason: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}

/** ตรวจงวดก่อนส่งอนุมัติ (ไม่เขียนข้อมูล) */
export function getPayrollChecks(token: string, id: string) {
  return apiFetch<PayrollCheckApiResponse>(`${BASE}/${id}/checks`, { method: "GET", token });
}

/** ส่งอนุมัติ — มีคำเตือนต้องส่ง acknowledgeWarnings + note */
export function submitPayrollRun(
  token: string,
  id: string,
  body: { acknowledgeWarnings?: boolean; note?: string } = {},
) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/submit`, { method: "POST", token, body });
}

export function approvePayrollRun(token: string, id: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/approve`, { method: "POST", token });
}

/** ส่งกลับแก้ไข (รออนุมัติ → ร่าง) พร้อมเหตุผล */
export function sendBackPayrollRun(token: string, id: string, reason: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/send-back`, { method: "POST", token, body: { reason } });
}

/** ถอนอนุมัติกลับเป็นร่าง (รอจ่ายเงิน → ร่าง) พร้อมเหตุผล */
export function returnPayrollRunToDraft(token: string, id: string, reason: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/return-to-draft`, { method: "POST", token, body: { reason } });
}

/** ส่งออกรายการจ่าย (backend บันทึกประวัติส่งออก ไม่เปลี่ยนสถานะ) */
export function exportPayrollPayments(token: string, id: string) {
  return apiFetch<PayrollPaymentExportApiResponse>(`${BASE}/${id}/payment-export`, { method: "POST", token });
}

export function recordPayrollPayments(token: string, id: string, items: PayrollPaymentInput[]) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/payments`, { method: "POST", token, body: { items } });
}

export function bulkRecordPayrollPayments(token: string, id: string, body: BulkPayrollPaymentsRequest) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/payments/bulk`, { method: "POST", token, body });
}

export function getPayrollSettings(token: string) {
  return apiFetch<PayrollSettingsApiResponse>(`${BASE}/settings`, {
    method: "GET",
    token,
  });
}

export function updatePayrollSettings(token: string, body: PayrollSettings) {
  return apiFetch<PayrollSettingsApiResponse>(`${BASE}/settings`, {
    method: "PUT",
    token,
    body,
  });
}

export function getSalaryCertificateEmployees(token: string) {
  return apiFetch<SalaryCertificateEmployeesApiResponse>(
    `${BASE}/salary-certificates`,
    { method: "GET", token },
  );
}

export function getWithholdingCertificates(token: string, year: number) {
  return apiFetch<WithholdingCertificatesApiResponse>(
    `${BASE}/withholding-certificates?year=${year}`,
    { method: "GET", token },
  );
}
