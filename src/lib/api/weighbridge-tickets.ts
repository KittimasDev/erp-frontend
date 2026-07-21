import { apiFetch } from "./client";
import type {
  CreateWeighbridgeTicketRequest,
  ManualOverrideTicketRequest,
  WeighbridgeAnalyticsApiResponse,
  WeighbridgeAnalyticsQuery,
  WeighbridgeDashboardApiResponse,
  WeighbridgeTicketApiResponse,
  WeighbridgeTicketDetailApiResponse,
  WeighTicketRequest,
} from "@/types/weighbridge-tickets";

export function getWeighbridgeDashboard(
  token: string,
  params?: { date?: string; from?: string; to?: string },
) {
  const search = new URLSearchParams();
  if (params?.from?.trim()) {
    search.set("from", params.from.trim());
  }
  if (params?.to?.trim()) {
    search.set("to", params.to.trim());
  }
  if (params?.date?.trim() && !params?.from && !params?.to) {
    search.set("date", params.date.trim());
  }
  const query = search.toString();
  return apiFetch<WeighbridgeDashboardApiResponse>(
    `/api/weighbridge/tickets/dashboard${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getWeighbridgeAnalytics(
  token: string,
  params: WeighbridgeAnalyticsQuery = {},
) {
  const search = new URLSearchParams();
  if (params.from?.trim()) {
    search.set("from", params.from.trim());
  }
  if (params.to?.trim()) {
    search.set("to", params.to.trim());
  }
  if (params.date?.trim()) {
    search.set("date", params.date.trim());
  }
  if (params.tireClassificationId?.trim()) {
    search.set("tireClassificationId", params.tireClassificationId.trim());
  }
  const query = search.toString();
  return apiFetch<WeighbridgeAnalyticsApiResponse>(
    `/api/weighbridge/tickets/analytics${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getWeighbridgeTicket(token: string, id: string) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}`,
    { method: "GET", token },
  );
}

export function createWeighbridgeTicket(
  token: string,
  body: CreateWeighbridgeTicketRequest,
) {
  return apiFetch<WeighbridgeTicketApiResponse>("/api/weighbridge/tickets", {
    method: "POST",
    token,
    body,
  });
}

export function weighInWeighbridgeTicket(
  token: string,
  id: string,
  body: WeighTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/weigh-in`,
    { method: "POST", token, body },
  );
}

export function weighOutWeighbridgeTicket(
  token: string,
  id: string,
  body: WeighTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/weigh-out`,
    { method: "POST", token, body },
  );
}

export function manualOverrideWeighbridgeTicket(
  token: string,
  id: string,
  body: ManualOverrideTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/manual-override`,
    { method: "POST", token, body },
  );
}

export function createPurchaseReceiptFromTicket(
  token: string,
  ticketId: string,
  body?: { tireClassificationId?: string; remark?: string },
) {
  return apiFetch<{
    statusCode?: number;
    message: string;
    data: { id: string; receiptNo: string };
  }>(`/api/weighbridge/tickets/${ticketId}/create-purchase-receipt`, {
    method: "POST",
    token,
    body: body ?? {},
  });
}
