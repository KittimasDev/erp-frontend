import { apiFetch } from "./client";
import type {
  CreatePayrollRunRequest,
  PayrollAdjustmentInput,
  PayrollRunApiResponse,
  PayrollRunListApiResponse,
  PayrollSettings,
  PayrollSettingsApiResponse,
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

export function getWithholdingCertificates(token: string, year: number) {
  return apiFetch<WithholdingCertificatesApiResponse>(
    `${BASE}/withholding-certificates?year=${year}`,
    { method: "GET", token },
  );
}
