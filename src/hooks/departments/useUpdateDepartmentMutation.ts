"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updateDepartment } from "@/lib/api/departments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateDepartmentRequest } from "@/types/departments";
import { departmentsQueryKey } from "./useDepartmentsQuery";

type UpdateDepartmentPayload = {
  id: string;
  body: UpdateDepartmentRequest;
};

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "departments", "update"],
    mutationFn: ({ id, body }: UpdateDepartmentPayload) =>
      updateDepartment(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
      message.success(response.message || t("แก้ไขแผนกสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขแผนกไม่สำเร็จ"),
      );
    },
  });
}
