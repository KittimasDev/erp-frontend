"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { createDepartment } from "@/lib/api/departments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateDepartmentRequest } from "@/types/departments";
import { departmentsQueryKey } from "./useDepartmentsQuery";

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "departments", "create"],
    mutationFn: (payload: CreateDepartmentRequest) =>
      createDepartment(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
      message.success(response.message || t("สร้างแผนกสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างแผนกไม่สำเร็จ"),
      );
    },
  });
}
