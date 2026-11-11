import { ApiError, apiFetch } from "./client";
import type {
  CreatePayrollRunRequest,
  PayBaseIssue,
  PayBaseValidationApiResponse,
  PayrollAdjustmentInput,
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

export function cancelPayrollRun(token: string, id: string, reason?: string) {
  return apiFetch<PayrollRunApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
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
