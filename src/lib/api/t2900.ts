import { apiFetch } from "./client";
import type { WeighbridgeTicketDetailApiResponse } from "@/types/weighbridge-tickets";
import type {
  ImportFromT2900Request,
  T2900ErpOutboundListApiResponse,
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

export function importWeighbridgeTicketFromT2900(
  token: string,
  body: ImportFromT2900Request,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    "/api/weighbridge/tickets/from-t2900",
    { method: "POST", token, body },
  );
}
