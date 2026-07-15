import { apiFetch } from "./client";
import type {
  CreateItemRequest,
  ItemApiResponse,
  ItemListApiResponse,
  ItemQueryParams,
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

  if (params.itemCategoryId) {
    search.set("itemCategoryId", params.itemCategoryId);
  }

  if (params.unitId) {
    search.set("unitId", params.unitId);
  }

  if (params.itemType?.trim()) {
    search.set("itemType", params.itemType.trim());
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

  const query = search.toString();
  return query ? `?${query}` : "";
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
