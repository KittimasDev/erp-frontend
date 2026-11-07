"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  createSection,
  deleteSection,
  updateSection,
} from "@/lib/api/sections";
import { getAccessToken } from "@/lib/auth/token";
import { usersQueryKey } from "@/hooks/users/useUsersQuery";
import type {
  CreateSectionRequest,
  UpdateSectionRequest,
} from "@/types/sections";
import { sectionsQueryKey } from "./useSectionsQuery";

function useRefresh() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
    await queryClient.invalidateQueries({ queryKey: usersQueryKey });
  };
}

function errorText(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateSectionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "sections", "create"],
    mutationFn: (payload: CreateSectionRequest) =>
      createSection(getAccessToken(), payload),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("สร้างแผนกย่อยสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("สร้างแผนกย่อยไม่สำเร็จ"))),
  });
}

export function useUpdateSectionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "sections", "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdateSectionRequest }) =>
      updateSection(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("แก้ไขแผนกย่อยสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("แก้ไขแผนกย่อยไม่สำเร็จ"))),
  });
}

export function useDeleteSectionMutation() {
  const refresh = useRefresh();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationKey: ["master-data", "sections", "delete"],
    mutationFn: (id: string) => deleteSection(getAccessToken(), id),
    onSuccess: async (response) => {
      await refresh();
      message.success(response.message || t("ลบแผนกย่อยสำเร็จแล้ว"));
    },
    onError: (error: Error) => message.error(errorText(error, t("ลบแผนกย่อยไม่สำเร็จ"))),
  });
}
