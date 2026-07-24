"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createRole, deleteRole } from "@/lib/api/roles";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateRoleRequest } from "@/types/users";

import { rolesQueryKey } from "./useRolesQuery";

export function useCreateRoleMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoleRequest) =>
      createRole(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างบทบาทสำเร็จ");
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างบทบาทไม่สำเร็จ",
      );
    },
  });
}

export function useDeleteRoleMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ลบบทบาทสำเร็จ");
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบบทบาทไม่สำเร็จ",
      );
    },
  });
}
