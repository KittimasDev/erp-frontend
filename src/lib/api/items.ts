import { apiFetch } from "./client";
import type {
  CreateItemRequest,
  ItemApiResponse,
  ItemListApiResponse,
  ItemQueryParams,
  ItemStockSummary,
  UpdateItemRequest,
} from "@/types/items";

function buildItemsQuery(params?: ItemQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.code?.trim()) {
    search.set("code", params.code.trim());
  }

  if (params.name?.trim()) {
    search.set("name", params.name.trim());
  }

  if (params.description?.trim()) {
    search.set("description", params.description.trim());
  }

  if (params.itemCategoryId) {
    search.set("itemCategoryId", params.itemCategoryId);
  }

  if (params.itemCategoryCode?.trim()) {
    search.set("itemCategoryCode", params.itemCategoryCode.trim());
  }

  if (params.unitId) {
    search.set("unitId", params.unitId);
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  if (
    params.isPurchaseItem !== undefined &&
    params.isPurchaseItem !== null
  ) {
    search.set("isPurchaseItem", String(params.isPurchaseItem));
  }

  if (params.isStockItem !== undefined && params.isStockItem !== null) {
    search.set("isStockItem", String(params.isStockItem));
  }

  if (params.isSalesItem !== undefined && params.isSalesItem !== null) {
    search.set("isSalesItem", String(params.isSalesItem));
  }

  if (params.isFinishedGood !== undefined && params.isFinishedGood !== null) {
    search.set("isFinishedGood", String(params.isFinishedGood));
  }

  if (params.lowStock === true) {
    search.set("lowStock", "true");
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** ยอดคงเหลือรวมทุกคลังเทียบสต๊อกขั้นต่ำของสินค้าที่ระบุ + จำนวนที่ต่ำทั้งระบบ */
export function getItemStockSummary(token: string, itemIds: string[]) {
  const qs = itemIds.length ? `?itemIds=${itemIds.join(",")}` : "";
  return apiFetch<{ message: string; data: ItemStockSummary }>(
    `/api/master-data/items/stock-summary${qs}`,
    { method: "GET", token },
  );
}

export function getItems(token: string, params?: ItemQueryParams) {
  return apiFetch<ItemListApiResponse>(
    `/api/master-data/items${buildItemsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createItem(token: string, body: CreateItemRequest) {
  return apiFetch<ItemApiResponse>("/api/master-data/items", {
    method: "POST",
    token,
    body,
  });
}

export function updateItem(
  token: string,
  id: string,
  body: UpdateItemRequest,
) {
  return apiFetch<ItemApiResponse>(`/api/master-data/items/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteItem(token: string, id: string) {
  return apiFetch<ItemApiResponse>(`/api/master-data/items/${id}`, {
    method: "DELETE",
    token,
  });
}
