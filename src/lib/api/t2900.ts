import { apiDownloadBlob, apiFetch } from "./client";
import type { WeighbridgeTicketDetailApiResponse } from "@/types/weighbridge-tickets";
import type {
  ConfirmFromT2900Request,
  ImportFromT2900Request,
  T2900DailyReportApiResponse,
  T2900DailyReportQuery,
  T2900ErpTicketDetailApiResponse,
  T2900ErpOutboundListApiResponse,
  T2900OutboundTicketsQuery,
  T2900QualityReportApiResponse,
  T2900QualityReportQuery,
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

/** รายงานรายวัน: บัตรชั่งครั้งสอง แยกตามสินค้า → ลูกค้า (หลังบ้านจัดกลุ่ม/รวมยอด/หาราคาให้) */
export function getT2900DailyReport(
  token: string,
  params: T2900DailyReportQuery,
) {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  if (params.custName?.trim()) {
    search.set("custName", params.custName.trim());
  }
  if (params.prodName?.trim()) {
    search.set("prodName", params.prodName.trim());
  }
  return apiFetch<T2900DailyReportApiResponse>(
    `/api/weighbridge/t2900/daily-report?${search.toString()}`,
    { method: "GET", token },
  );
}

/** รายงานคุณภาพสินค้า: ตารางแบน ลำดับ / ลูกค้า / ทะเบียน / สินค้า / น้ำหนักตัน / สถานที่ */
export function getT2900QualityReport(
  token: string,
  params: T2900QualityReportQuery,
) {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  if (params.prodId?.trim()) {
    search.set("prodId", params.prodId.trim());
  }
  return apiFetch<T2900QualityReportApiResponse>(
    `/api/weighbridge/t2900/quality-report?${search.toString()}`,
    { method: "GET", token },
  );
}
