import { apiFetch } from "./client";
import type {
  ChemicalApiResponse,
  ChemicalListApiResponse,
  ChemicalLotApiResponse,
  ChemicalLotListApiResponse,
  HazardClassApiResponse,
  HazardClassListApiResponse,
  IncompatibilitiesApiResponse,
  IncompatiblePair,
  UpsertChemicalProfileRequest,
} from "@/types/chemicals";

const BASE = "/api/master-data/chemicals";
const LOTS = "/api/inventory/lots";

export function getChemicals(token: string, q?: string) {
  const search = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiFetch<ChemicalListApiResponse>(`${BASE}${search}`, { method: "GET", token });
}

export function upsertChemicalProfile(
  token: string,
  itemId: string,
  body: UpsertChemicalProfileRequest,
) {
  return apiFetch<ChemicalApiResponse>(`${BASE}/${itemId}`, { method: "PUT", token, body });
}

export function getHazardClasses(token: string) {
  return apiFetch<HazardClassListApiResponse>(`${BASE}/hazard-classes`, { method: "GET", token });
}

export function createHazardClass(token: string, body: { code: string; nameTh: string }) {
  return apiFetch<HazardClassApiResponse>(`${BASE}/hazard-classes`, { method: "POST", token, body });
}

export function updateHazardClass(
  token: string,
  id: string,
  body: { nameTh?: string; isActive?: boolean; sortOrder?: number },
) {
  return apiFetch<HazardClassApiResponse>(`${BASE}/hazard-classes/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function getIncompatibilities(token: string) {
  return apiFetch<IncompatibilitiesApiResponse>(`${BASE}/incompatibilities`, { method: "GET", token });
}

export function setIncompatibilities(token: string, pairs: IncompatiblePair[]) {
  return apiFetch<IncompatibilitiesApiResponse>(`${BASE}/incompatibilities`, {
    method: "PUT",
    token,
    body: { pairs },
  });
}

export function getChemicalLots(
  token: string,
  params: { coaStatus?: string; q?: string; expiringWithinDays?: number },
) {
  const search = new URLSearchParams({ itemType: "CHEMICAL" });
  if (params.coaStatus) search.set("coaStatus", params.coaStatus);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.expiringWithinDays !== undefined) {
    search.set("expiringWithinDays", String(params.expiringWithinDays));
  }
  return apiFetch<ChemicalLotListApiResponse>(`${LOTS}/chemical?${search.toString()}`, { method: "GET", token });
}

export function verifyLotCoa(token: string, id: string, remark?: string) {
  return apiFetch<ChemicalLotApiResponse>(`${LOTS}/${id}/coa-verify`, {
    method: "POST",
    token,
    body: { remark },
  });
}

export function rejectLotCoa(token: string, id: string, reason: string) {
  return apiFetch<ChemicalLotApiResponse>(`${LOTS}/${id}/coa-reject`, {
    method: "POST",
    token,
    body: { reason },
  });
}
