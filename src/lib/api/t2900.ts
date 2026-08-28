import { apiFetch } from "./client";
import type { WeighbridgeTicketDetailApiResponse } from "@/types/weighbridge-tickets";
import type {
  GenerateT2900BatchRequest,
  ImportFromT2900Request,
  T2900DeletedTicketApiResponse,
  T2900ErpOutboundListApiResponse,
  T2900GeneratedBatchApiResponse,
  T2900OutboundTicketsQuery,
} from "@/types/t2900";

export function getT2900OutboundTickets(
  token: string,
  params: T2900OutboundTicketsQuery,
) {
  const search = new URLSearchParams();
  search.set("dateFrom", params.dateFrom);
  search.set("dateTo", params.dateTo);
  if (params.updatedAfter?.trim()) {
    search.set("updatedAfter", params.updatedAfter.trim());
  }
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.page) {
    search.set("page", String(params.page));
  }
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  return apiFetch<T2900ErpOutboundListApiResponse>(
    `/api/weighbridge/t2900/outbound-weighing-tickets?${search.toString()}`,
    { method: "GET", token },
  );
}

export function deleteT2900OutboundTicket(token: string, tckNo: string) {
  return apiFetch<T2900DeletedTicketApiResponse>(
    `/api/weighbridge/t2900/outbound-weighing-tickets/${encodeURIComponent(tckNo)}`,
    { method: "DELETE", token },
  );
}

export function generateT2900OutboundTickets(
  token: string,
  body?: GenerateT2900BatchRequest,
) {
  return apiFetch<T2900GeneratedBatchApiResponse>(
    "/api/weighbridge/t2900/outbound-weighing-tickets/batch",
    { method: "POST", token, body: body ?? {} },
  );
}

export function importWeighbridgeTicketFromT2900(
  token: string,
  body: ImportFromT2900Request,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    "/api/weighbridge/tickets/from-t2900",
    { method: "POST", token, body },
  );
}
