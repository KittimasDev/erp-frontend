"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { updateRolePermissions } from "@/lib/api/permissions";
import { getAccessToken } from "@/lib/auth/token";
import type { RolePermissionAssignment } from "@/types/permissions";

import { rolePermissionsQueryKey } from "./useRolePermissionsQuery";

export function useUpdateRolePermissionsMutation(roleId: string) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignments: RolePermissionAssignment[]) =>
      updateRolePermissions(getAccessToken(), roleId, { assignments }),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกสิทธิ์สำเร็จ");
      queryClient.invalidateQueries({
        queryKey: rolePermissionsQueryKey(roleId),
      });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกสิทธิ์ไม่สำเร็จ",
      );
    },
  });
}
