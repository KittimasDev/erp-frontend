import { apiFetch } from "./client";
import type {
  CreateItemCategoryRequest,
  ItemCategoryApiResponse,
  ItemCategoryListApiResponse,
  ItemCategoryQueryParams,
  UpdateItemCategoryRequest,
} from "@/types/item-categories";

function buildItemCategoriesQuery(params?: ItemCategoryQueryParams) {
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

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getItemCategories(
  token: string,
  params?: ItemCategoryQueryParams,
) {
  return apiFetch<ItemCategoryListApiResponse>(
    `/api/master-data/item-categories${buildItemCategoriesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createItemCategory(
  token: string,
  body: CreateItemCategoryRequest,
) {
  return apiFetch<ItemCategoryApiResponse>(
    "/api/master-data/item-categories",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateItemCategory(
  token: string,
  id: string,
  body: UpdateItemCategoryRequest,
) {
  return apiFetch<ItemCategoryApiResponse>(
    `/api/master-data/item-categories/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteItemCategory(token: string, id: string) {
  return apiFetch<ItemCategoryApiResponse>(
    `/api/master-data/item-categories/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
