import { apiFetch } from "./client";
import type {
  CreateTireClassificationRequest,
  TireClassificationApiResponse,
  TireClassificationListApiResponse,
  TireClassificationQueryParams,
  UpdateTireClassificationRequest,
} from "@/types/tire-classifications";

function buildTireClassificationsQuery(
  params?: TireClassificationQueryParams,
) {
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

export function getTireClassifications(
  token: string,
  params?: TireClassificationQueryParams,
) {
  return apiFetch<TireClassificationListApiResponse>(
    `/api/master-data/tire-classifications${buildTireClassificationsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createTireClassification(
  token: string,
  body: CreateTireClassificationRequest,
) {
  return apiFetch<TireClassificationApiResponse>(
    "/api/master-data/tire-classifications",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateTireClassification(
  token: string,
  id: string,
  body: UpdateTireClassificationRequest,
) {
  return apiFetch<TireClassificationApiResponse>(
    `/api/master-data/tire-classifications/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteTireClassification(token: string, id: string) {
  return apiFetch<TireClassificationApiResponse>(
    `/api/master-data/tire-classifications/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
