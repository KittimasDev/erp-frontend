import { apiFetch } from "./client";
import type {
  CreatePositionRequest,
  PositionApiResponse,
  PositionListApiResponse,
  PositionQueryParams,
  UpdatePositionRequest,
} from "@/types/positions";

function buildPositionsQuery(params?: PositionQueryParams) {
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
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPositions(token: string, params?: PositionQueryParams) {
  return apiFetch<PositionListApiResponse>(
    `/api/master-data/positions${buildPositionsQuery(params)}`,
    { method: "GET", token },
  );
}

export function createPosition(token: string, body: CreatePositionRequest) {
  return apiFetch<PositionApiResponse>("/api/master-data/positions", {
    method: "POST",
    token,
    body,
  });
}

export function updatePosition(
  token: string,
  id: string,
  body: UpdatePositionRequest,
) {
  return apiFetch<PositionApiResponse>(`/api/master-data/positions/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deletePosition(token: string, id: string) {
  return apiFetch<PositionApiResponse>(`/api/master-data/positions/${id}`, {
    method: "DELETE",
    token,
  });
}
