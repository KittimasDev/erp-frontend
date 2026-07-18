import { apiFetch } from "./client";
import type {
  ConfirmSupplierPaymentBody,
  CreateSupplierPaymentFromPoBody,
  PendingSupplierPaymentListApiResponse,
  SupplierPaymentApiResponse,
  SupplierPaymentByPoApiResponse,
  SupplierPaymentListApiResponse,
  SupplierPaymentQueryParams,
} from "@/types/purchase-payments";

function buildQuery(params?: SupplierPaymentQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.voucherNo?.trim()) search.set("voucherNo", params.voucherNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.purchaseOrderId)
    search.set("purchaseOrderId", params.purchaseOrderId);
  if (params.voucherDateFrom)
    search.set("voucherDateFrom", params.voucherDateFrom);
  if (params.voucherDateTo) search.set("voucherDateTo", params.voucherDateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getPendingPurchasePayments(
  token: string,
  params?: { page?: number; limit?: number },
) {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<PendingSupplierPaymentListApiResponse>(
    `/api/purchase-payments/pending${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export function getPurchasePayments(
  token: string,
  params?: SupplierPaymentQueryParams,
) {
  return apiFetch<SupplierPaymentListApiResponse>(
    `/api/purchase-payments${buildQuery(params)}`,
    { token },
  );
}

export function getPurchasePayment(token: string, id: string) {
  return apiFetch<SupplierPaymentApiResponse>(
    `/api/purchase-payments/${id}`,
    { token },
  );
}

export function getPurchasePaymentByPo(
  token: string,
  purchaseOrderId: string,
) {
  return apiFetch<SupplierPaymentByPoApiResponse>(
    `/api/purchase-payments/by-po/${purchaseOrderId}`,
    { token },
  );
}

export function createPurchasePaymentFromPo(
  token: string,
  purchaseOrderId: string,
  body: CreateSupplierPaymentFromPoBody,
) {
  return apiFetch<SupplierPaymentApiResponse>(
    `/api/purchase-payments/from-po/${purchaseOrderId}`,
    { method: "POST", token, body },
  );
}

export function confirmPurchasePayment(
  token: string,
  id: string,
  body?: ConfirmSupplierPaymentBody,
) {
  return apiFetch<SupplierPaymentApiResponse>(
    `/api/purchase-payments/${id}/confirm`,
    { method: "POST", token, body: body ?? {} },
  );
}

export function cancelPurchasePayment(token: string, id: string) {
  return apiFetch<SupplierPaymentApiResponse>(
    `/api/purchase-payments/${id}/cancel`,
    { method: "POST", token },
  );
}
