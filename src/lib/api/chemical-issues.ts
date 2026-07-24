import { apiFetch } from "./client";
import type {
  ChemicalConsumptionReportApiResponse,
  ChemicalConsumptionReportQueryParams,
  ChemicalIssueApiResponse,
  ChemicalIssueListApiResponse,
  ChemicalIssueQueryParams,
  CreateChemicalIssueBody,
  UpdateChemicalIssueBody,
} from "@/types/chemical-issues";

function buildQuery(params?: ChemicalIssueQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.issueNo?.trim()) search.set("issueNo", params.issueNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.purpose?.trim()) search.set("purpose", params.purpose.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function buildReportQuery(params?: ChemicalConsumptionReportQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.itemId) search.set("itemId", params.itemId);
  if (params.purpose?.trim()) search.set("purpose", params.purpose.trim());
  if (params.warehouseId) search.set("warehouseId", params.warehouseId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getChemicalIssues(
  token: string,
  params?: ChemicalIssueQueryParams,
) {
  return apiFetch<ChemicalIssueListApiResponse>(
    `/api/chemical-issues${buildQuery(params)}`,
    { token },
  );
}

export function getChemicalIssue(token: string, id: string) {
  return apiFetch<ChemicalIssueApiResponse>(`/api/chemical-issues/${id}`, {
    token,
  });
}

export function createChemicalIssue(
  token: string,
  body: CreateChemicalIssueBody,
) {
  return apiFetch<ChemicalIssueApiResponse>("/api/chemical-issues", {
    method: "POST",
    token,
    body,
  });
}

export function updateChemicalIssue(
  token: string,
  id: string,
  body: UpdateChemicalIssueBody,
) {
  return apiFetch<ChemicalIssueApiResponse>(`/api/chemical-issues/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function cancelChemicalIssue(token: string, id: string) {
  return apiFetch<ChemicalIssueApiResponse>(
    `/api/chemical-issues/${id}/cancel`,
    { method: "POST", token },
  );
}

export function approveChemicalIssue(token: string, id: string) {
  return apiFetch<ChemicalIssueApiResponse>(
    `/api/chemical-issues/${id}/approve`,
    { method: "POST", token },
  );
}

export function getChemicalConsumptionReport(
  token: string,
  params?: ChemicalConsumptionReportQueryParams,
) {
  return apiFetch<ChemicalConsumptionReportApiResponse>(
    `/api/chemical-issues/reports/consumption${buildReportQuery(params)}`,
    { token },
  );
}
