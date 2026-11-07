"use client";
import { useT } from "@/lib/i18n/useT";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  createWarehouseType,
  deleteWarehouseType,
  updateWarehouseType,
} from "@/lib/api/warehouse-types";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateWarehouseTypeRequest,
  UpdateWarehouseTypeRequest,
} from "@/types/warehouse-types";

import { warehousesQueryKey } from "@/hooks/warehouses/useWarehousesQuery";

import { warehouseTypesQueryKey } from "./useWarehouseTypesQuery";

function useInvalidateWarehouseTypes() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: warehouseTypesQueryKey }),
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
    ]);
}

export function useCreateWarehouseTypeMutation() {
  const invalidate = useInvalidateWarehouseTypes();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "warehouse-types", "create"],
    mutationFn: (body: CreateWarehouseTypeRequest) =>
      createWarehouseType(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || t("สร้างประเภทคลังสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างประเภทคลังไม่สำเร็จ"),
      );
    },
  });
}

export function useUpdateWarehouseTypeMutation() {
  const invalidate = useInvalidateWarehouseTypes();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "warehouse-types", "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdateWarehouseTypeRequest }) =>
      updateWarehouseType(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || t("แก้ไขประเภทคลังสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขประเภทคลังไม่สำเร็จ"),
      );
    },
  });
}

export function useDeleteWarehouseTypeMutation() {
  const invalidate = useInvalidateWarehouseTypes();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "warehouse-types", "delete"],
    mutationFn: (id: string) => deleteWarehouseType(getAccessToken(), id),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || t("ลบประเภทคลังสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบประเภทคลังไม่สำเร็จ"),
      );
    },
  });
}
