import { apiFetch } from "@/lib/api/client";
import type {
  CreateRouteBody,
  CreateRouteStepBody,
  MaterialConversionRouteApiResponse,
  MaterialConversionRouteListApiResponse,
  MaterialConversionRouteStepApiResponse,
  UpdateRouteBody,
  UpdateRouteStepBody,
} from "@/types/material-conversion";

const BASE = "/api/master-data/material-conversion-routes";

export function getMaterialConversionRoutes(
  token: string,
  params?: { search?: string; isActive?: boolean },
) {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set("search", params.search.trim());
  if (params?.isActive !== undefined)
    search.set("isActive", String(params.isActive));
  const query = search.toString();
  return apiFetch<MaterialConversionRouteListApiResponse>(
    `${BASE}${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getMaterialConversionRoute(token: string, id: string) {
  return apiFetch<MaterialConversionRouteApiResponse>(`${BASE}/${id}`, {
    token,
  });
}

export function createMaterialConversionRoute(
  token: string,
  body: CreateRouteBody,
) {
  return apiFetch<MaterialConversionRouteApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

export function updateMaterialConversionRoute(
  token: string,
  id: string,
  body: UpdateRouteBody,
) {
  return apiFetch<MaterialConversionRouteApiResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteMaterialConversionRoute(token: string, id: string) {
  return apiFetch<{ statusCode: number; message: string }>(`${BASE}/${id}`, {
    method: "DELETE",
    token,
  });
}

export function createRouteStep(
  token: string,
  routeId: string,
  body: CreateRouteStepBody,
) {
  return apiFetch<MaterialConversionRouteStepApiResponse>(
    `${BASE}/${routeId}/steps`,
    { method: "POST", token, body },
  );
}

export function updateRouteStep(
  token: string,
  routeId: string,
  stepId: string,
  body: UpdateRouteStepBody,
) {
  return apiFetch<MaterialConversionRouteStepApiResponse>(
    `${BASE}/${routeId}/steps/${stepId}`,
    { method: "PATCH", token, body },
  );
}

export function deleteRouteStep(
  token: string,
  routeId: string,
  stepId: string,
) {
  return apiFetch<{ statusCode: number; message: string }>(
    `${BASE}/${routeId}/steps/${stepId}`,
    { method: "DELETE", token },
  );
}
