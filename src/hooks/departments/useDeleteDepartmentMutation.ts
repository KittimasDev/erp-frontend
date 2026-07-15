"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteDepartment } from "@/lib/api/departments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { departmentsQueryKey } from "./useDepartmentsQuery";

export function useDeleteDepartmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "departments", "delete"],
    mutationFn: (id: string) => deleteDepartment(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
      message.success(response.message || "ลบแผนกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบแผนกไม่สำเร็จ",
      );
    },
  });
}
