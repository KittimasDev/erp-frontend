import { apiFetch } from "./client";
import type {
  CreateStockIssueBody,
  StockIssueApiResponse,
  StockIssueListApiResponse,
  StockIssueQueryParams,
  UpdateStockIssueBody,
} from "@/types/stock-issues";

function buildQuery(params?: StockIssueQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.issueNo?.trim()) search.set("issueNo", params.issueNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getStockIssues(token: string, params?: StockIssueQueryParams) {
  return apiFetch<StockIssueListApiResponse>(
    `/api/stock-issues${buildQuery(params)}`,
    { token },
  );
}

export function getStockIssue(token: string, id: string) {
  return apiFetch<StockIssueApiResponse>(`/api/stock-issues/${id}`, {
    token,
  });
}

export function createStockIssue(token: string, body: CreateStockIssueBody) {
  return apiFetch<StockIssueApiResponse>("/api/stock-issues", {
    method: "POST",
    token,
    body,
  });
}

export function updateStockIssue(
  token: string,
  id: string,
  body: UpdateStockIssueBody,
) {
  return apiFetch<StockIssueApiResponse>(`/api/stock-issues/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function cancelStockIssue(token: string, id: string) {
  return apiFetch<StockIssueApiResponse>(`/api/stock-issues/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export function approveStockIssue(token: string, id: string) {
  return apiFetch<StockIssueApiResponse>(`/api/stock-issues/${id}/approve`, {
    method: "POST",
    token,
  });
}
