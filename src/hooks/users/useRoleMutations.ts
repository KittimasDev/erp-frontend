"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createRole, deleteRole } from "@/lib/api/roles";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateRoleRequest } from "@/types/users";

import { rolesQueryKey } from "./useRolesQuery";

export function useCreateRoleMutation() {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoleRequest) =>
      createRole(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("สร้างบทบาทสำเร็จ"));
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างบทบาทไม่สำเร็จ"),
      );
    },
  });
}

export function useDeleteRoleMutation() {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ลบบทบาทสำเร็จ"));
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบบทบาทไม่สำเร็จ"),
      );
    },
  });
}
