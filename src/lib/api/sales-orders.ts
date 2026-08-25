import { apiFetch } from "./client";
import type {
  CreateSalesOrderFromQuotationBody,
  SalesOrderApiResponse,
  SalesOrderAvailableWarehouseListApiResponse,
  SalesOrderListApiResponse,
  SalesOrderQueryParams,
  SalesOrderReservationStatusApiResponse,
  SalesOrderStockVerificationApiResponse,
  StockVerificationPendingListApiResponse,
  UpdateSalesOrderCustomerPoBody,
  UpdateSalesOrderItemsBody,
} from "@/types/sales-orders";

function buildSalesOrdersQuery(params?: SalesOrderQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.soNo?.trim()) {
    search.set("soNo", params.soNo.trim());
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

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getSalesOrders(
  token: string,
  params?: SalesOrderQueryParams,
) {
  return apiFetch<SalesOrderListApiResponse>(
    `/api/sales-orders${buildSalesOrdersQuery(params)}`,
    { method: "GET", token },
  );
}

export function getSalesOrder(token: string, id: string) {
  return apiFetch<SalesOrderApiResponse>(`/api/sales-orders/${id}`, {
    method: "GET",
    token,
  });
}

export function createSalesOrderFromQuotation(
  token: string,
  quotationId: string,
  body: CreateSalesOrderFromQuotationBody = {},
) {
  return apiFetch<SalesOrderApiResponse>(
    `/api/sales-orders/from-quotation/${quotationId}`,
    { method: "POST", token, body },
  );
}

export function getPendingStockVerification(token: string) {
  return apiFetch<StockVerificationPendingListApiResponse>(
    "/api/sales-orders/stock-verification/pending",
    { method: "GET", token },
  );
}

export function getSalesOrderStockVerification(token: string, id: string) {
  return apiFetch<SalesOrderStockVerificationApiResponse>(
    `/api/sales-orders/${id}/stock-verification`,
    { method: "GET", token },
  );
}

export function confirmStockVerification(token: string, id: string) {
  return apiFetch<SalesOrderStockVerificationApiResponse>(
    `/api/sales-orders/${id}/stock-verification`,
    { method: "POST", token },
  );
}

export function getSalesOrderAvailableWarehouses(token: string, id: string) {
  return apiFetch<SalesOrderAvailableWarehouseListApiResponse>(
    `/api/sales-orders/${id}/available-warehouses`,
    { method: "GET", token },
  );
}

export function confirmSalesOrder(token: string, id: string) {
  return apiFetch<SalesOrderApiResponse>(`/api/sales-orders/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelSalesOrder(token: string, id: string) {
  return apiFetch<SalesOrderApiResponse>(`/api/sales-orders/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export function updateSalesOrderCustomerPo(
  token: string,
  id: string,
  body: UpdateSalesOrderCustomerPoBody,
) {
  return apiFetch<SalesOrderApiResponse>(
    `/api/sales-orders/${id}/customer-po`,
    { method: "PATCH", token, body },
  );
}

/** แก้จำนวน / ราคา / ส่วนลด ของรายการสินค้า (ก่อนยืนยันใบสั่งขายเท่านั้น) */
export function updateSalesOrderItems(
  token: string,
  id: string,
  body: UpdateSalesOrderItemsBody,
) {
  return apiFetch<SalesOrderApiResponse>(`/api/sales-orders/${id}/items`, {
    method: "PATCH",
    token,
    body,
  });
}

export function getSalesOrderReservationStatus(token: string, id: string) {
  return apiFetch<SalesOrderReservationStatusApiResponse>(
    `/api/sales-orders/${id}/reservation-status`,
    { method: "GET", token },
  );
}

export function reserveSalesOrderLine(
  token: string,
  salesOrderId: string,
  itemId: string,
) {
  return apiFetch<SalesOrderReservationStatusApiResponse>(
    `/api/sales-orders/${salesOrderId}/items/${itemId}/reserve`,
    { method: "POST", token },
  );
}

export function releaseSalesOrderLineReservation(
  token: string,
  salesOrderId: string,
  itemId: string,
) {
  return apiFetch<SalesOrderReservationStatusApiResponse>(
    `/api/sales-orders/${salesOrderId}/items/${itemId}/release-reservation`,
    { method: "POST", token },
  );
}

export function reserveAllEligibleSalesOrderLines(token: string, id: string) {
  return apiFetch<SalesOrderReservationStatusApiResponse>(
    `/api/sales-orders/${id}/reserve-all-eligible`,
    { method: "POST", token },
  );
}
