import { apiDownloadBlob, apiFetch } from "./client";
import type { WeighbridgeTicketDetailApiResponse } from "@/types/weighbridge-tickets";
import type {
  ConfirmFromT2900Request,
  ImportFromT2900Request,
  T2900ErpTicketDetailApiResponse,
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

export function getT2900ErpTicketDetail(token: string, tckNo: string) {
  return apiFetch<T2900ErpTicketDetailApiResponse>(
    `/api/weighbridge/t2900/outbound-weighing-tickets/${encodeURIComponent(tckNo)}`,
    { method: "GET", token },
  );
}

export function getT2900CameraPhotoBlob(
  token: string,
  tckNo: string,
  key: string,
) {
  return apiDownloadBlob(
    `/api/weighbridge/t2900/outbound-weighing-tickets/${encodeURIComponent(tckNo)}/photos/${encodeURIComponent(key)}`,
    { token },
  );
}

/** เปิดตั๋ว + ยืนยันใบรับซื้อจากบัตร T2900 ในคลิกเดียว (ข้ามหน้าคัดแยก) */
export function confirmWeighbridgeTicketFromT2900(
  token: string,
  body: ConfirmFromT2900Request,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    "/api/weighbridge/tickets/from-t2900/confirm",
    { method: "POST", token, body },
  );
}
