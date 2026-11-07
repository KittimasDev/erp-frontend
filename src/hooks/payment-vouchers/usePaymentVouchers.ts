"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/payment-vouchers";
import { useT } from "@/lib/i18n/useT";
import { getAccessToken } from "@/lib/auth/token";
import { advanceRequestsKey } from "@/hooks/advance-payment-requests/useAdvanceRequests";
import type {
  CreatedVoucherQuery,
  CreateVoucherFormBody,
  IssueWhtBody,
  PayableVoucherQuery,
  PaymentRecordQuery,
  PaymentVoucherQueueQuery,
  RecordPaymentForm,
  UpdateVoucherFormBody,
} from "@/types/payment-vouchers";

export const paymentVouchersKey = ["payment-vouchers"] as const;

/** ตารางรอสร้างใบสำคัญจ่าย — query แยกจากตารางที่สร้างแล้ว */
export const usePaymentVoucherQueueQuery = (params?: PaymentVoucherQueueQuery) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "queue", params ?? {}],
    queryFn: () => api.getPaymentVoucherQueue(getAccessToken(), params),
    placeholderData: keepPreviousData,
  });

export const useCreatedPaymentVouchersQuery = (params?: CreatedVoucherQuery) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "created", params ?? {}],
    queryFn: () => api.getCreatedPaymentVouchers(getAccessToken(), params),
    placeholderData: keepPreviousData,
  });

export const useQueueContextQuery = (queueItemId?: string) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "queue-context", queueItemId],
    queryFn: () => api.getQueueContext(getAccessToken(), queueItemId as string),
    enabled: Boolean(queueItemId),
  });

export const usePaymentVoucherDetailQuery = (id?: string) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "detail", id],
    queryFn: () => api.getPaymentVoucherDetail(getAccessToken(), id as string),
    enabled: Boolean(id),
  });

export const usePayableVouchersQuery = (params?: PayableVoucherQuery) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "payable", params ?? {}],
    queryFn: () => api.getPayableVouchers(getAccessToken(), params),
    placeholderData: keepPreviousData,
  });

export const usePaymentRecordDetailQuery = (paymentId?: string) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "payment-detail", paymentId],
    queryFn: () => api.getPaymentRecordDetail(getAccessToken(), paymentId as string),
    enabled: Boolean(paymentId),
  });

export const usePaymentRecordsQuery = (params?: PaymentRecordQuery) =>
  useQuery({
    queryKey: [...paymentVouchersKey, "payments", params ?? {}],
    queryFn: () => api.getPaymentRecords(getAccessToken(), params),
    placeholderData: keepPreviousData,
  });

function useHelpers() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: paymentVouchersKey });
    // รายการขอจ่ายล่วงหน้าเปลี่ยนสถานะตาม PV (สร้างแล้ว/คืนเป็นรอสร้าง)
    void queryClient.invalidateQueries({ queryKey: advanceRequestsKey });
  };
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { message, refresh, fail, t };
}

export function useCreateVoucherFromQueueMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { queueItemId: string; body: CreateVoucherFormBody }) =>
      api.createVoucherFromQueue(getAccessToken(), v.queueItemId, v.body),
    onSuccess: (res, v) => {
      refresh();
      message.success(
        v.body.submit
          ? t("สร้าง {no} และส่งอนุมัติแล้ว", { no: res.data.voucher.voucherNo })
          : t("บันทึกร่าง {no} แล้ว", { no: res.data.voucher.voucherNo }),
      );
    },
    onError: (e) => fail(e, t("สร้างใบสำคัญจ่ายไม่สำเร็จ")),
  });
}

export function useUpdateVoucherMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateVoucherFormBody }) =>
      api.updatePaymentVoucher(getAccessToken(), v.id, v.body),
    onSuccess: () => {
      refresh();
      message.success(t("บันทึกใบสำคัญจ่ายแล้ว"));
    },
    onError: (e) => fail(e, t("บันทึกไม่สำเร็จ")),
  });
}

/** action ของ workflow: ส่งอนุมัติ / ตรวจสอบ / อนุมัติ / ไม่อนุมัติ / ยกเลิก / บันทึกจ่ายเงิน */
export function useVoucherActionMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: {
      id: string;
      action: "submit" | "review" | "approve" | "reject" | "cancel";
      reason?: string;
    }) => {
      const t = getAccessToken();
      switch (v.action) {
        case "submit":
          return api.submitPaymentVoucher(t, v.id);
        case "review":
          return api.reviewPaymentVoucher(t, v.id, v.reason);
        case "approve":
          return api.approvePaymentVoucher(t, v.id);
        case "reject":
          return api.rejectPaymentVoucher(t, v.id, v.reason ?? "");
        default:
          return api.cancelPaymentVoucher(t, v.id, v.reason ?? "");
      }
    },
    onSuccess: (_res, v) => {
      refresh();
      const done: Record<string, string> = {
        submit: t("ส่งอนุมัติแล้ว"),
        review: t("บันทึกการตรวจสอบแล้ว"),
        approve: t("อนุมัติแล้ว — ไปบันทึกจ่ายเงินได้ที่เมนูบันทึกจ่ายเงิน"),
        reject: t("บันทึกการไม่อนุมัติแล้ว"),
        cancel: t("ยกเลิกใบสำคัญจ่ายแล้ว"),
      };
      message.success(done[v.action]);
    },
    onError: (e) => fail(e, t("ดำเนินการไม่สำเร็จ")),
  });
}

/** คำนวณ WHT ของ PV ใหม่จากใบตั้งหนี้ (ร่าง/ไม่อนุมัติ) */
export function useRecalculateWhtMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (id: string) => api.recalculatePaymentVoucherWht(getAccessToken(), id),
    onSuccess: () => {
      refresh();
      message.success(t("คำนวณ WHT ใหม่แล้ว — ตรวจยอด WHT และยอดโอนสุทธิก่อนส่งอนุมัติ"));
    },
    onError: (e) => fail(e, t("คำนวณ WHT ใหม่ไม่สำเร็จ")),
  });
}

/** ยืนยันการจ่ายเงิน (multipart พร้อมหลักฐาน) */
export function useRecordPaymentMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { voucherId: string; form: RecordPaymentForm; files: File[] }) =>
      api.recordVoucherPayment(getAccessToken(), v.voucherId, v.form, v.files),
    onSuccess: (res) => {
      refresh();
      message.success(t("บันทึกจ่ายเงิน {no} แล้ว — PV เป็นจ่ายแล้ว", { no: res.data.paymentNo ?? "" }));
    },
    onError: (e) => fail(e, t("บันทึกจ่ายเงินไม่สำเร็จ")),
  });
}

export function useCancelPaymentMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { paymentId: string; reason: string }) =>
      api.cancelPaymentRecord(getAccessToken(), v.paymentId, v.reason),
    onSuccess: () => {
      refresh();
      message.success(t("ยกเลิกรายการจ่ายแล้ว — PV กลับไปรอบันทึกจ่ายเงิน"));
    },
    onError: (e) => fail(e, t("ยกเลิกรายการจ่ายไม่สำเร็จ")),
  });
}

export function useIssueWhtMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { paymentId: string; body: IssueWhtBody }) =>
      api.issueWhtCertificate(getAccessToken(), v.paymentId, v.body),
    onSuccess: (res) => {
      refresh();
      message.success(t("ออกหนังสือรับรอง {no} แล้ว", { no: res.data.certNo }));
    },
    onError: (e) => fail(e, t("ออกหนังสือรับรองหัก ณ ที่จ่ายไม่สำเร็จ")),
  });
}

export function useVoucherAttachmentMutations(voucherId: string) {
  const { message, refresh, fail, t } = useHelpers();
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadVoucherAttachment(getAccessToken(), voucherId, file),
    onSuccess: () => {
      refresh();
      message.success(t("แนบไฟล์แล้ว"));
    },
    onError: (e) => fail(e, t("แนบไฟล์ไม่สำเร็จ")),
  });
  const remove = useMutation({
    mutationFn: (attachmentId: string) =>
      api.deleteVoucherAttachment(getAccessToken(), voucherId, attachmentId),
    onSuccess: () => {
      refresh();
      message.success(t("ลบไฟล์แล้ว"));
    },
    onError: (e) => fail(e, t("ลบไฟล์ไม่สำเร็จ")),
  });
  return { upload, remove };
}
