"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelSalesTaxInvoice,
  getSalesTaxInvoice,
  getSalesTaxInvoiceByAdvanceReceipt,
  getSalesTaxInvoiceBySalesInvoice,
  getSalesTaxInvoices,
  issueSalesTaxInvoice,
  issueSalesTaxInvoiceFromAdvance,
  type SalesTaxInvoiceQuery,
} from "@/lib/api/sales-tax-invoices";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";

export const salesTaxInvoicesQueryKey = ["sales-tax-invoices"] as const;

export function useSalesTaxInvoicesQuery(params: SalesTaxInvoiceQuery) {
  return useQuery({
    queryKey: [...salesTaxInvoicesQueryKey, "list", params],
    queryFn: () => getSalesTaxInvoices(getAccessToken(), params),
  });
}

export function useSalesTaxInvoiceQuery(id?: string) {
  return useQuery({
    queryKey: [...salesTaxInvoicesQueryKey, "detail", id],
    queryFn: () => getSalesTaxInvoice(getAccessToken(), id!),
    enabled: Boolean(id),
  });
}

export function useActiveSalesTaxInvoiceQuery(salesInvoiceId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesTaxInvoicesQueryKey, "by-invoice", salesInvoiceId],
    queryFn: () => getSalesTaxInvoiceBySalesInvoice(getAccessToken(), salesInvoiceId!),
    enabled: Boolean(salesInvoiceId) && enabled,
  });
}

export function useActiveAdvanceTaxInvoiceQuery(advanceReceiptId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesTaxInvoicesQueryKey, "by-advance", advanceReceiptId],
    queryFn: () => getSalesTaxInvoiceByAdvanceReceipt(getAccessToken(), advanceReceiptId!),
    enabled: Boolean(advanceReceiptId) && enabled,
  });
}

export function useIssueAdvanceTaxInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (advanceReceiptId: string) =>
      issueSalesTaxInvoiceFromAdvance(getAccessToken(), advanceReceiptId),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesTaxInvoicesQueryKey });
      message.success(res.message || t("ออกใบกำกับภาษีสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ออกใบกำกับภาษีไม่สำเร็จ"),
      );
    },
  });
}

export function useIssueSalesTaxInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (salesInvoiceId: string) =>
      issueSalesTaxInvoice(getAccessToken(), salesInvoiceId),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesTaxInvoicesQueryKey });
      message.success(res.message || t("ออกใบกำกับภาษีสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ออกใบกำกับภาษีไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelSalesTaxInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelSalesTaxInvoice(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesTaxInvoicesQueryKey });
      message.success(res.message || t("ยกเลิกใบกำกับภาษีสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกใบกำกับภาษีไม่สำเร็จ"),
      );
    },
  });
}
