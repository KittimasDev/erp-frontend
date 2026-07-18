import { apiFetch } from "./client";
import type {
  ProductionOutputPendingTicketListApiResponse,
  ProductionOutputPendingTicketQueryParams,
} from "@/types/production-output-pending-tickets";

function buildQuery(params?: ProductionOutputPendingTicketQueryParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.from?.trim()) {
    search.set("from", params.from.trim());
  }
  if (params.to?.trim()) {
    search.set("to", params.to.trim());
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getProductionOutputPendingTickets(
  token: string,
  params?: ProductionOutputPendingTicketQueryParams,
) {
  return apiFetch<ProductionOutputPendingTicketListApiResponse>(
    `/api/production-output/pending-tickets${buildQuery(params)}`,
    { method: "GET", token },
  );
}
