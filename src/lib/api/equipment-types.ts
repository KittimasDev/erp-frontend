import type {
  EquipmentType,
  EquipmentTypeQuery,
  SaveEquipmentTypeRequest,
} from "@/types/equipment-types";

import { apiFetch } from "./client";

const BASE = "/api/master-data/equipment-types";

type Res<T> = { statusCode: number; message: string; data: T };

export function getEquipmentTypes(token: string, params?: EquipmentTypeQuery) {
  const query =
    params?.isActive === undefined ? "" : `?isActive=${String(params.isActive)}`;
  return apiFetch<Res<EquipmentType[]>>(`${BASE}${query}`, { token });
}

export function createEquipmentType(token: string, body: SaveEquipmentTypeRequest) {
  return apiFetch<Res<EquipmentType>>(BASE, { method: "POST", token, body });
}

export function updateEquipmentType(
  token: string,
  id: string,
  body: Partial<SaveEquipmentTypeRequest>,
) {
  return apiFetch<Res<EquipmentType>>(`${BASE}/${id}`, { method: "PATCH", token, body });
}

export function deleteEquipmentType(token: string, id: string) {
  return apiFetch<Res<EquipmentType>>(`${BASE}/${id}`, { method: "DELETE", token });
}
