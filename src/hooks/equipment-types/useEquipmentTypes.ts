"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/equipment-types";
import { getAccessToken } from "@/lib/auth/token";
import type { EquipmentTypeQuery, SaveEquipmentTypeRequest } from "@/types/equipment-types";

export const equipmentTypesQueryKey = ["master-data", "equipment-types"] as const;

export function useEquipmentTypesQuery(params?: EquipmentTypeQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...equipmentTypesQueryKey, params ?? {}],
    queryFn: async () => (await api.getEquipmentTypes(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSaveEquipmentTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveEquipmentTypeRequest | Partial<SaveEquipmentTypeRequest> }) =>
      id
        ? api.updateEquipmentType(getAccessToken(), id, body)
        : api.createEquipmentType(getAccessToken(), body as SaveEquipmentTypeRequest),
    onSuccess: async (response) => {
      // ชื่อประเภทเปลี่ยนแล้ว category ของเครื่องตามไปด้วย — รายการเครื่องต้องโหลดใหม่
      await queryClient.invalidateQueries({ queryKey: equipmentTypesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, "บันทึกประเภทเครื่องจักรไม่สำเร็จ")),
  });
}

export function useDeleteEquipmentTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => api.deleteEquipmentType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: equipmentTypesQueryKey });
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, "ลบประเภทเครื่องจักรไม่สำเร็จ")),
  });
}
