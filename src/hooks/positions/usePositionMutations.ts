"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  createPosition,
  deletePosition,
  updatePosition,
} from "@/lib/api/positions";
import { getAccessToken } from "@/lib/auth/token";
import { usersQueryKey } from "@/hooks/users/useUsersQuery";
import type {
  CreatePositionRequest,
  UpdatePositionRequest,
} from "@/types/positions";
import { positionsQueryKey } from "./usePositionsQuery";

/** แก้ชื่อตำแหน่งแล้วชื่อตำแหน่งในรายการพนักงานเปลี่ยนตาม → ล้าง cache ผู้ใช้ด้วย */
function useRefresh() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: positionsQueryKey });
    await queryClient.invalidateQueries({ queryKey: usersQueryKey });
  };
}

function errorText(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreatePositionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "positions", "create"],
    mutationFn: (payload: CreatePositionRequest) =>
      createPosition(getAccessToken(), payload),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("สร้างตำแหน่งสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("สร้างตำแหน่งไม่สำเร็จ"))),
  });
}

export function useUpdatePositionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "positions", "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdatePositionRequest }) =>
      updatePosition(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("แก้ไขตำแหน่งสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("แก้ไขตำแหน่งไม่สำเร็จ"))),
  });
}

export function useDeletePositionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "positions", "delete"],
    mutationFn: (id: string) => deletePosition(getAccessToken(), id),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("ลบตำแหน่งสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("ลบตำแหน่งไม่สำเร็จ"))),
  });
}
