import { apiFetch } from "./client";
import type {
  AuditLogListApiResponse,
  AuditLogQueryParams,
} from "@/types/audit-logs";

export function getAuditLogs(
  token: string,
  params: AuditLogQueryParams = {},
) {
  const search = new URLSearchParams();
  if (params.action?.trim()) {
    search.set("action", params.action.trim());
  }
  if (params.moduleCode?.trim()) {
    search.set("moduleCode", params.moduleCode.trim());
  }
  if (params.screenCode?.trim()) {
    search.set("screenCode", params.screenCode.trim());
  }
  if (params.documentType?.trim()) {
    search.set("documentType", params.documentType.trim());
  }
  if (params.documentId?.trim()) {
    search.set("documentId", params.documentId.trim());
  }
  if (params.performedById?.trim()) {
    search.set("performedById", params.performedById.trim());
  }
  if (params.dateFrom) {
    search.set("dateFrom", params.dateFrom);
  }
  if (params.dateTo) {
    search.set("dateTo", params.dateTo);
  }
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 20));

  const query = search.toString();
  return apiFetch<AuditLogListApiResponse>(
    `/api/audit-logs${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}
