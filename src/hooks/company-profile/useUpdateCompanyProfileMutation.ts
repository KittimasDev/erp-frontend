"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { updateCompanyProfile } from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";
import { invalidateCompanyInfo } from "@/lib/company/company-info";
import type { UpdateCompanyProfileRequest } from "@/types/company-profile";
import { companyProfileQueryKey } from "./useCompanyProfileQuery";

export function useUpdateCompanyProfileMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "company-profile", "update"],
    mutationFn: (body: UpdateCompanyProfileRequest) =>
      updateCompanyProfile(getAccessToken(), body),
    onSuccess: async (response) => {
      // เอกสาร PDF อ่านจาก snapshot คนละที่กับ react-query — ต้องล้างด้วย
      // ไม่งั้นพิมพ์ใบถัดไปยังได้ข้อมูลบริษัทเก่าจนกว่าจะ reload
      invalidateCompanyInfo();
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      message.success(response.message || "บันทึกข้อมูลบริษัทสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกข้อมูลบริษัทไม่สำเร็จ",
      );
    },
  });
}
