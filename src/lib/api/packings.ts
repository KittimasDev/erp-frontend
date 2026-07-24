import { apiFetch } from "./client";
import type {
  CreatePackingFromPickingBody,
  PackingApiResponse,
  PackingListApiResponse,
  PackingQueryParams,
  ReadyPickingListApiResponse,
  UpdatePackingBody,
} from "@/types/packings";

function buildQuery(params?: PackingQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.status) search.set("status", params.status);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.customerId) search.set("customerId", params.customerId);
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function getPackings(token: string, params?: PackingQueryParams) {
  return apiFetch<PackingListApiResponse>(
    `/api/packings${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getReadyPickingsForPacking(token: string) {
  return apiFetch<ReadyPickingListApiResponse>(
    "/api/packings/pickings/ready",
    { method: "GET", token },
  );
}

export function getPacking(token: string, id: string) {
  return apiFetch<PackingApiResponse>(`/api/packings/${id}`, {
    method: "GET",
    token,
  });
}

export function createPackingFromPicking(
  token: string,
  pickingId: string,
  body: CreatePackingFromPickingBody = {},
) {
  return apiFetch<PackingApiResponse>(
    `/api/packings/from-picking/${pickingId}`,
    { method: "POST", token, body },
  );
}

export function updatePacking(
  token: string,
  id: string,
  body: UpdatePackingBody,
) {
  return apiFetch<PackingApiResponse>(`/api/packings/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmPacking(token: string, id: string) {
  return apiFetch<PackingApiResponse>(`/api/packings/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelPacking(token: string, id: string) {
  return apiFetch<PackingApiResponse>(`/api/packings/${id}/cancel`, {
    method: "POST",
    token,
  });
}
