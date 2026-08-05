import { apiFetch } from "./client";
import type {
  InventoryLotBalanceListApiResponse,
  InventoryLotQueryParams,
  LowStockListApiResponse,
  LowStockQueryParams,
  StockBalanceByItemListApiResponse,
  StockBalanceListApiResponse,
  StockBalanceQueryParams,
  StockBalanceSummaryApiResponse,
  StockMovementApiResponse,
  StockMovementListApiResponse,
  StockMovementQueryParams,
} from "@/types/inventory";

function toQuery(params?: Record<string, string | boolean | undefined>) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getStockBalances(
  token: string,
  params?: StockBalanceQueryParams,
) {
  return apiFetch<StockBalanceListApiResponse>(
    `/api/inventory/stock-balances${toQuery(params)}`,
    { method: "GET", token },
  );
}

export function getStockBalancesByItem(
  token: string,
  params?: StockBalanceQueryParams,
) {
  return apiFetch<StockBalanceByItemListApiResponse>(
    `/api/inventory/stock-balances/by-item${toQuery(params)}`,
    { method: "GET", token },
  );
}

export function getStockBalanceSummary(
  token: string,
  params?: StockBalanceQueryParams,
) {
  return apiFetch<StockBalanceSummaryApiResponse>(
    `/api/inventory/stock-balances/summary${toQuery(params)}`,
    { method: "GET", token },
  );
}

export function getStockMovements(
  token: string,
  params?: StockMovementQueryParams,
) {
  return apiFetch<StockMovementListApiResponse>(
    `/api/inventory/stock-movements${toQuery(params)}`,
    { method: "GET", token },
  );
}

export function getStockMovement(token: string, id: string) {
  return apiFetch<StockMovementApiResponse>(
    `/api/inventory/stock-movements/${id}`,
    { method: "GET", token },
  );
}

export function getInventoryLots(
  token: string,
  params?: InventoryLotQueryParams,
) {
  return apiFetch<InventoryLotBalanceListApiResponse>(
    `/api/inventory/lots${toQuery(params)}`,
    { method: "GET", token },
  );
}

export function getLowStockItems(
  token: string,
  params?: LowStockQueryParams,
) {
  return apiFetch<LowStockListApiResponse>(
    `/api/inventory/stock-balances/low-stock${toQuery(params)}`,
    { method: "GET", token },
  );
}
