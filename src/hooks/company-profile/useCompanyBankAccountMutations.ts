"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  createCompanyBankAccount,
  deleteCompanyBankAccount,
  updateCompanyBankAccount,
} from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";
import { invalidateCompanyInfo } from "@/lib/company/company-info";
import type {
  CreateCompanyBankAccountRequest,
  UpdateCompanyBankAccountRequest,
} from "@/types/company-profile";
import { companyProfileQueryKey } from "./useCompanyProfileQuery";

/**
 * บัญชีธนาคารถูกส่งกลับมาพร้อมข้อมูลบริษัทใน query เดียว
 * ทุก mutation จึงล้าง key เดียวกัน ไม่ต้องมี query แยกของบัญชี
 */
function useBankAccountFeedback(fallbackError: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return {
    onSuccess: async (response: { message: string }) => {
      // เอกสารกลุ่มขายโชว์บัญชีหลัก — ล้าง snapshot ที่ PDF ใช้ด้วย
      invalidateCompanyInfo();
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      message.success(response.message);
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : fallbackError,
      );
    },
  };
}

export function useCreateCompanyBankAccountMutation() {
  const feedback = useBankAccountFeedback("เพิ่มบัญชีธนาคารไม่สำเร็จ");

  return useMutation({
    mutationKey: ["master-data", "company-profile", "bank-accounts", "create"],
    mutationFn: (body: CreateCompanyBankAccountRequest) =>
      createCompanyBankAccount(getAccessToken(), body),
    ...feedback,
  });
}

export function useUpdateCompanyBankAccountMutation() {
  const feedback = useBankAccountFeedback("แก้ไขบัญชีธนาคารไม่สำเร็จ");

  return useMutation({
    mutationKey: ["master-data", "company-profile", "bank-accounts", "update"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateCompanyBankAccountRequest;
    }) => updateCompanyBankAccount(getAccessToken(), id, body),
    ...feedback,
  });
}

export function useDeleteCompanyBankAccountMutation() {
  const feedback = useBankAccountFeedback("ลบบัญชีธนาคารไม่สำเร็จ");

  return useMutation({
    mutationKey: ["master-data", "company-profile", "bank-accounts", "delete"],
    mutationFn: (id: string) => deleteCompanyBankAccount(getAccessToken(), id),
    ...feedback,
  });
}
