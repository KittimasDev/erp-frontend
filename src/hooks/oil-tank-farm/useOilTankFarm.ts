"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/oil-tank-farm";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type {
  CreateOilDispatchBody,
  CreateOilReceivingBody,
  CreateOilTankBody,
  CreateOilTransferBody,
  UpdateOilTankBody,
} from "@/types/oil-tank-farm";

export const oilKey = ["oil-tank-farm"] as const;

export const useOilTanksQuery = () =>
  useQuery({ queryKey: [...oilKey, "tanks"], queryFn: () => api.getOilTanks(getAccessToken()) });

export const useTankReadingsQuery = (tankId?: string) =>
  useQuery({
    queryKey: [...oilKey, "readings", tankId],
    queryFn: () => api.getTankReadings(getAccessToken(), tankId as string),
    enabled: Boolean(tankId),
  });

export const useTankBalanceReportQuery = (params: { from: string; to: string; granularity: string; tankId?: string }) =>
  useQuery({
    queryKey: [...oilKey, "balance-report", params],
    queryFn: () => api.getTankBalanceReport(getAccessToken(), params),
  });

export const useOilReceivingsQuery = () =>
  useQuery({ queryKey: [...oilKey, "receivings"], queryFn: () => api.getOilReceivings(getAccessToken()) });
export const useOilTransfersQuery = () =>
  useQuery({ queryKey: [...oilKey, "transfers"], queryFn: () => api.getOilTransfers(getAccessToken()) });
export const useOilDispatchesQuery = () =>
  useQuery({ queryKey: [...oilKey, "dispatches"], queryFn: () => api.getOilDispatches(getAccessToken()) });

function useOilMutation<TVars, TRes extends { message: string }>(
  fn: (vars: TVars) => Promise<TRes>,
  fallbackError: string,
) {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      message.success(res.message);
      // ยอดถัง/Lot/สต๊อกเปลี่ยนจากเกือบทุกการกระทำ — ล้างทั้งโมดูลและยอดคงเหลือทั่วไป
      void queryClient.invalidateQueries({ queryKey: oilKey });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t(fallbackError));
    },
  });
}

export const useCreateOilTankMutation = () =>
  useOilMutation((b: CreateOilTankBody) => api.createOilTank(getAccessToken(), b), "สร้างถังไม่สำเร็จ");
export const useUpdateOilTankMutation = () =>
  useOilMutation(
    (v: { id: string; body: UpdateOilTankBody }) => api.updateOilTank(getAccessToken(), v.id, v.body),
    "แก้ไขถังไม่สำเร็จ",
  );
export const useRecordTankReadingMutation = () =>
  useOilMutation(
    (v: { tankId: string; measuredAt: string; measuredLiters: number; note?: string }) =>
      api.recordTankReading(getAccessToken(), v.tankId, {
        measuredAt: v.measuredAt,
        measuredLiters: v.measuredLiters,
        note: v.note,
      }),
    "บันทึกค่าที่วัดไม่สำเร็จ",
  );
export const useAdjustTankReadingMutation = () =>
  useOilMutation(
    (v: { readingId: string; note?: string }) => api.adjustTankReading(getAccessToken(), v.readingId, v.note),
    "ปรับยอดไม่สำเร็จ",
  );
export const useIgnoreTankReadingMutation = () =>
  useOilMutation(
    (v: { readingId: string; note?: string }) => api.ignoreTankReading(getAccessToken(), v.readingId, v.note),
    "ปิดรายการวัดไม่สำเร็จ",
  );

export const useCreateOilReceivingMutation = () =>
  useOilMutation((b: CreateOilReceivingBody) => api.createOilReceiving(getAccessToken(), b), "สร้างใบรับน้ำมันไม่สำเร็จ");
export const usePostOilReceivingMutation = () =>
  useOilMutation((id: string) => api.postOilReceiving(getAccessToken(), id), "รับน้ำมันเข้าถังไม่สำเร็จ");
export const useCancelOilReceivingMutation = () =>
  useOilMutation((id: string) => api.cancelOilReceiving(getAccessToken(), id), "ยกเลิกใบรับไม่สำเร็จ");
export const useSendLabSampleMutation = () =>
  useOilMutation(
    (v: {
      collectedDate: string;
      referenceDocId: string;
      referenceDocNo: string;
      itemId?: string;
      lotId?: string;
    }) =>
      api.createLabSampleForReceiving(getAccessToken(), v),
    "ส่งตัวอย่าง Lab ไม่สำเร็จ",
  );

export const useCreateOilTransferMutation = () =>
  useOilMutation((b: CreateOilTransferBody) => api.createOilTransfer(getAccessToken(), b), "สร้างใบโอนไม่สำเร็จ");
export const useApproveOilTransferMutation = () =>
  useOilMutation((id: string) => api.approveOilTransfer(getAccessToken(), id), "อนุมัติใบโอนไม่สำเร็จ");
export const useCancelOilTransferMutation = () =>
  useOilMutation((id: string) => api.cancelOilTransfer(getAccessToken(), id), "ยกเลิกใบโอนไม่สำเร็จ");

export const useCreateOilDispatchMutation = () =>
  useOilMutation((b: CreateOilDispatchBody) => api.createOilDispatch(getAccessToken(), b), "สร้างใบจ่ายไม่สำเร็จ");
export const useApproveOilDispatchMutation = () =>
  useOilMutation((id: string) => api.approveOilDispatch(getAccessToken(), id), "อนุมัติใบจ่ายไม่สำเร็จ");
export const useCancelOilDispatchMutation = () =>
  useOilMutation((id: string) => api.cancelOilDispatch(getAccessToken(), id), "ยกเลิกใบจ่ายไม่สำเร็จ");
