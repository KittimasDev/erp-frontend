import { apiFetch } from "./client";
import type {
  CreateQuotationBody,
  QuotationApiResponse,
  QuotationItemAvailabilityListApiResponse,
  QuotationItemAvailabilityQueryParams,
  QuotationListApiResponse,
  QuotationQueryParams,
  UpdateQuotationBody,
} from "@/types/quotations";
import type { SalesApprovalReasonBody } from "@/types/sales-approval";

function buildQuotationsQuery(params?: QuotationQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.quotationNo?.trim()) {
    search.set("quotationNo", params.quotationNo.trim());
  }
  if (params.customerId) {
    search.set("customerId", params.customerId);
  }
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }
  if (params.dateFrom) {
    search.set("dateFrom", params.dateFrom);
  }
  if (params.dateTo) {
    search.set("dateTo", params.dateTo);
  }
  if (params.itemIds?.length) {
    for (const itemId of params.itemIds) {
      search.append("itemIds", itemId);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function buildQuotationItemAvailabilityQuery(
  params?: QuotationItemAvailabilityQueryParams,
) {
  const search = new URLSearchParams();
  if (params?.isFinishedGood !== undefined && params.isFinishedGood !== null) {
    search.set("isFinishedGood", String(params.isFinishedGood));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getQuotationItemAvailability(
  token: string,
  params?: QuotationItemAvailabilityQueryParams,
) {
  return apiFetch<QuotationItemAvailabilityListApiResponse>(
    `/api/quotations/item-availability${buildQuotationItemAvailabilityQuery(params)}`,
    { method: "GET", token },
  );
}

export function getQuotations(token: string, params?: QuotationQueryParams) {
  return apiFetch<QuotationListApiResponse>(
    `/api/quotations${buildQuotationsQuery(params)}`,
    { method: "GET", token },
  );
}

export function getQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}`, {
    method: "GET",
    token,
  });
}

export function createQuotation(token: string, body: CreateQuotationBody) {
  return apiFetch<QuotationApiResponse>("/api/quotations", {
    method: "POST",
    token,
    body,
  });
}

export function updateQuotation(
  token: string,
  id: string,
  body: UpdateQuotationBody,
) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

/** รายการรออนุมัติ — ไม่ส่ง status = รออนุมัติ */
export function getPendingQuotationApprovals(
  token: string,
  params?: QuotationQueryParams,
) {
  return apiFetch<QuotationListApiResponse>(
    `/api/quotations/approvals/pending${buildQuotationsQuery(params)}`,
    { method: "GET", token },
  );
}

/** DRAFT → รออนุมัติ */
export function submitQuotationForApproval(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/submit`, {
    method: "POST",
    token,
  });
}

/** อนุมัติภายใน (ไม่ใช่ลูกค้าตอบรับ) */
export function approveQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/approve`, {
    method: "POST",
    token,
  });
}

/** ไม่อนุมัติภายใน — เหตุผลบังคับ (คนละอย่างกับ rejectQuotation ที่ลูกค้าปฏิเสธ) */
export function rejectQuotationApproval(
  token: string,
  id: string,
  body: SalesApprovalReasonBody,
) {
  return apiFetch<QuotationApiResponse>(
    `/api/quotations/${id}/reject-approval`,
    { method: "POST", token, body },
  );
}

export function returnQuotationToDraft(
  token: string,
  id: string,
  body: SalesApprovalReasonBody,
) {
  return apiFetch<QuotationApiResponse>(
    `/api/quotations/${id}/return-to-draft`,
    { method: "POST", token, body },
  );
}

export function sendQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/send`, {
    method: "POST",
    token,
  });
}

export function acceptQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/accept`, {
    method: "POST",
    token,
  });
}

export function rejectQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/reject`, {
    method: "POST",
    token,
  });
}

export function cancelQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/cancel`, {
    method: "POST",
    token,
  });
}
