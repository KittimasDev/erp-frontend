import { apiFetch } from "./client";
import type {
  CreatePurchaseRequestBody,
  PurchaseRequestApiResponse,
  PurchaseRequestListApiResponse,
  PurchaseRequestQueryParams,
  RejectPurchaseRequestBody,
  UpdatePurchaseRequestBody,
} from "@/types/purchase-requests";

function buildPurchaseRequestsQuery(params?: PurchaseRequestQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.prNo?.trim()) {
    search.set("prNo", params.prNo.trim());
  }

  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }

  if (params.prDateFrom) {
    search.set("prDateFrom", params.prDateFrom);
  }

  if (params.prDateTo) {
    search.set("prDateTo", params.prDateTo);
  }

  if (params.page != null) {
    search.set("page", String(params.page));
  }

  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPurchaseRequests(
  token: string,
  params?: PurchaseRequestQueryParams,
) {
  return apiFetch<PurchaseRequestListApiResponse>(
    `/api/purchase-requests${buildPurchaseRequestsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getPendingPurchaseRequestApprovals(
  token: string,
  params?: PurchaseRequestQueryParams,
) {
  return apiFetch<PurchaseRequestListApiResponse>(
    `/api/purchase-requests/approvals/pending${buildPurchaseRequestsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

/** PR ที่อนุมัติแล้ว รอสร้าง PO — ใช้ที่หน้ารายการใบสั่งซื้อ */
export function getPurchaseOrdersPendingFromPr(
  token: string,
  params?: PurchaseRequestQueryParams,
) {
  return apiFetch<PurchaseRequestListApiResponse>(
    `/api/purchase-orders/pending-from-pr${buildPurchaseRequestsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getPurchaseRequest(token: string, id: string) {
  return apiFetch<PurchaseRequestApiResponse>(`/api/purchase-requests/${id}`, {
    method: "GET",
    token,
  });
}

export function createPurchaseRequest(
  token: string,
  body: CreatePurchaseRequestBody,
) {
  return apiFetch<PurchaseRequestApiResponse>("/api/purchase-requests", {
    method: "POST",
    token,
    body,
  });
}

export function updatePurchaseRequest(
  token: string,
  id: string,
  body: UpdatePurchaseRequestBody,
) {
  return apiFetch<PurchaseRequestApiResponse>(`/api/purchase-requests/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function submitPurchaseRequest(token: string, id: string) {
  return apiFetch<PurchaseRequestApiResponse>(
    `/api/purchase-requests/${id}/submit`,
    {
      method: "POST",
      token,
    },
  );
}

export function approvePurchaseRequest(token: string, id: string) {
  return apiFetch<PurchaseRequestApiResponse>(
    `/api/purchase-requests/${id}/approve`,
    {
      method: "POST",
      token,
    },
  );
}

export function rejectPurchaseRequest(
  token: string,
  id: string,
  body?: RejectPurchaseRequestBody,
) {
  return apiFetch<PurchaseRequestApiResponse>(
    `/api/purchase-requests/${id}/reject`,
    {
      method: "POST",
      token,
      body: body ?? {},
    },
  );
}

export function cancelPurchaseRequest(token: string, id: string) {
  return apiFetch<PurchaseRequestApiResponse>(
    `/api/purchase-requests/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}
