import { apiFetch } from "./client";
import type {
  ApproveReturnNoteBody,
  CreateReturnNoteBody,
  InspectionWarehouseListApiResponse,
  RejectReturnNoteBody,
  ReturnNoteApiResponse,
  ReturnNoteListApiResponse,
  ReturnNoteQueryParams,
  ReturnSourcePickingDetailApiResponse,
  ReturnSourcePickingListApiResponse,
  ReturnSourceSalesOrderListApiResponse,
} from "@/types/return-notes";

function buildQuery(params?: ReturnNoteQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.deliveryOrderId)
    search.set("deliveryOrderId", params.deliveryOrderId);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getReturnNotes(token: string, params?: ReturnNoteQueryParams) {
  return apiFetch<ReturnNoteListApiResponse>(
    `/api/return-notes${buildQuery(params)}`,
    { token },
  );
}

export function getReturnNote(token: string, id: string) {
  return apiFetch<ReturnNoteApiResponse>(`/api/return-notes/${id}`, { token });
}

export function createReturnNote(token: string, body: CreateReturnNoteBody) {
  return apiFetch<ReturnNoteApiResponse>("/api/return-notes", {
    method: "POST",
    token,
    body,
  });
}

export function approveReturnNote(
  token: string,
  id: string,
  body: ApproveReturnNoteBody,
) {
  return apiFetch<ReturnNoteApiResponse>(`/api/return-notes/${id}/approve`, {
    method: "POST",
    token,
    body,
  });
}

export function rejectReturnNote(
  token: string,
  id: string,
  body: RejectReturnNoteBody,
) {
  return apiFetch<ReturnNoteApiResponse>(`/api/return-notes/${id}/reject`, {
    method: "POST",
    token,
    body,
  });
}

export function getReturnSourceSalesOrders(token: string, keyword?: string) {
  const qs = keyword?.trim()
    ? `?${new URLSearchParams({ keyword: keyword.trim() }).toString()}`
    : "";
  return apiFetch<ReturnSourceSalesOrderListApiResponse>(
    `/api/return-notes/source/sales-orders${qs}`,
    { token },
  );
}

export function getReturnSourcePickings(token: string, salesOrderId: string) {
  return apiFetch<ReturnSourcePickingListApiResponse>(
    `/api/return-notes/source/pickings?${new URLSearchParams({ salesOrderId }).toString()}`,
    { token },
  );
}

export function getReturnSourcePickingDetail(
  token: string,
  pickingId: string,
  deliveryOrderId?: string,
) {
  const qs = deliveryOrderId
    ? `?${new URLSearchParams({ deliveryOrderId }).toString()}`
    : "";
  return apiFetch<ReturnSourcePickingDetailApiResponse>(
    `/api/return-notes/source/pickings/${pickingId}${qs}`,
    { token },
  );
}

export function getInspectionWarehouses(token: string) {
  return apiFetch<InspectionWarehouseListApiResponse>(
    "/api/return-notes/inspection-warehouses",
    { token },
  );
}
