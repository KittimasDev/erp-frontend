import { apiFetch, apiUpload } from "./client";
import type {
  CreateStockAdjustmentBody,
  DocumentAttachmentApiResponse,
  DocumentAttachmentListApiResponse,
  RejectStockAdjustmentBody,
  StockAdjustmentApiResponse,
  StockAdjustmentListApiResponse,
  StockAdjustmentQueryParams,
  UpdateStockAdjustmentBody,
} from "@/types/stock-adjustments";

function buildQuery(params?: StockAdjustmentQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.adjustmentNo?.trim())
    search.set("adjustmentNo", params.adjustmentNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.warehouseId) search.set("warehouseId", params.warehouseId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getStockAdjustments(
  token: string,
  params?: StockAdjustmentQueryParams,
) {
  return apiFetch<StockAdjustmentListApiResponse>(
    `/api/inventory/stock-adjustments${buildQuery(params)}`,
    { token },
  );
}

export function getStockAdjustment(token: string, id: string) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}`,
    { token },
  );
}

export function createStockAdjustment(
  token: string,
  body: CreateStockAdjustmentBody,
) {
  return apiFetch<StockAdjustmentApiResponse>(
    "/api/inventory/stock-adjustments",
    { method: "POST", token, body },
  );
}

export function updateStockAdjustment(
  token: string,
  id: string,
  body: UpdateStockAdjustmentBody,
) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}`,
    { method: "PATCH", token, body },
  );
}

export function submitStockAdjustment(token: string, id: string) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}/submit`,
    { method: "POST", token },
  );
}

export function cancelStockAdjustment(token: string, id: string) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}/cancel`,
    { method: "POST", token },
  );
}

export function approveStockAdjustment(token: string, id: string) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}/approve`,
    { method: "POST", token },
  );
}

export function rejectStockAdjustment(
  token: string,
  id: string,
  body?: RejectStockAdjustmentBody,
) {
  return apiFetch<StockAdjustmentApiResponse>(
    `/api/inventory/stock-adjustments/${id}/reject`,
    { method: "POST", token, body: body ?? {} },
  );
}

export function getDocumentAttachments(
  token: string,
  params: { documentType: string; documentId: string },
) {
  const search = new URLSearchParams({
    documentType: params.documentType,
    documentId: params.documentId,
  });
  return apiFetch<DocumentAttachmentListApiResponse>(
    `/api/documents/attachments?${search.toString()}`,
    { token },
  );
}

export function uploadDocumentAttachment(
  token: string,
  params: {
    file: File;
    documentType: string;
    documentId: string;
    description?: string;
  },
) {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("documentType", params.documentType);
  formData.append("documentId", params.documentId);
  if (params.description) {
    formData.append("description", params.description);
  }
  return apiUpload<DocumentAttachmentApiResponse>(
    "/api/documents/attachments",
    formData,
    { token },
  );
}
