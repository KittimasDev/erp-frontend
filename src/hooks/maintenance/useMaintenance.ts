"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/maintenance";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type {
  BreakdownBody,
  CompleteWorkOrderBody,
  CreateWorkOrderBody,
  EquipmentBody,
  EquipmentQuery,
  PmScheduleBody,
  ShutdownItemBody,
  WorkOrderQuery,
} from "@/types/maintenance";

export const maintenanceKey = ["maintenance"] as const;

export const useEquipmentQuery = (q: EquipmentQuery = {}) =>
  useQuery({ queryKey: [...maintenanceKey, "equipment", q], queryFn: () => api.getEquipmentList(getAccessToken(), q) });

export const useEquipmentHistoryQuery = (id?: string) =>
  useQuery({
    queryKey: [...maintenanceKey, "history", id],
    queryFn: () => api.getEquipmentHistory(getAccessToken(), id as string),
    enabled: Boolean(id),
  });

export const useDowntimeSummaryQuery = (from?: string, to?: string) =>
  useQuery({
    queryKey: [...maintenanceKey, "downtime-summary", from, to],
    queryFn: () => api.getDowntimeSummary(getAccessToken(), from, to),
  });

export const usePmSchedulesQuery = () =>
  useQuery({ queryKey: [...maintenanceKey, "pm"], queryFn: () => api.getPmSchedules(getAccessToken()) });

export const useWorkOrdersQuery = (q: WorkOrderQuery = {}) =>
  useQuery({ queryKey: [...maintenanceKey, "wo", q], queryFn: () => api.getWorkOrders(getAccessToken(), q) });

export const useShutdownPlansQuery = () =>
  useQuery({ queryKey: [...maintenanceKey, "shutdown"], queryFn: () => api.getShutdownPlans(getAccessToken()) });

export const useShutdownPlanQuery = (id?: string) =>
  useQuery({
    queryKey: [...maintenanceKey, "shutdown", id],
    queryFn: () => api.getShutdownPlan(getAccessToken(), id as string),
    enabled: Boolean(id),
  });

function useMaintenanceMutation<TVars, TRes extends { message: string }>(
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
      void queryClient.invalidateQueries({ queryKey: maintenanceKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t(fallbackError));
    },
  });
}

export const useCreateEquipmentMutation = () =>
  useMaintenanceMutation((b: EquipmentBody) => api.createEquipment(getAccessToken(), b), "สร้างอุปกรณ์ไม่สำเร็จ");

export const useUpdateEquipmentMutation = () =>
  useMaintenanceMutation(
    (v: { id: string; body: EquipmentBody }) => api.updateEquipment(getAccessToken(), v.id, v.body),
    "แก้ไขอุปกรณ์ไม่สำเร็จ",
  );

export const useRecordDowntimeMutation = () =>
  useMaintenanceMutation(
    (v: { equipmentId: string; body: { startAt: string; reason: string; category?: string; rootCauseCategory?: string } }) =>
      api.recordDowntime(getAccessToken(), v.equipmentId, v.body),
    "บันทึก Downtime ไม่สำเร็จ",
  );

export const useEndDowntimeMutation = () =>
  useMaintenanceMutation(
    (v: {
      equipmentId: string;
      downtimeId: string;
      body: { endAt?: string; repairStartedAt?: string; rootCauseCategory?: string; rootCause?: string };
    }) => api.endDowntime(getAccessToken(), v.equipmentId, v.downtimeId, v.body),
    "ปิด Downtime ไม่สำเร็จ",
  );

export const useCreatePmScheduleMutation = () =>
  useMaintenanceMutation((b: PmScheduleBody) => api.createPmSchedule(getAccessToken(), b), "สร้างแผน PM ไม่สำเร็จ");

export const useUpdatePmScheduleMutation = () =>
  useMaintenanceMutation(
    (v: { id: string; body: PmScheduleBody }) => api.updatePmSchedule(getAccessToken(), v.id, v.body),
    "แก้ไขแผน PM ไม่สำเร็จ",
  );

export const useGeneratePmWorkOrderMutation = () =>
  useMaintenanceMutation((id: string) => api.generatePmWorkOrder(getAccessToken(), id), "สร้างใบสั่งงาน PM ไม่สำเร็จ");

export const useRunPmCheckMutation = () =>
  useMaintenanceMutation(() => api.runPmCheck(getAccessToken()), "ตรวจแผน PM ไม่สำเร็จ");

export const useCreateWorkOrderMutation = () =>
  useMaintenanceMutation((b: CreateWorkOrderBody) => api.createWorkOrder(getAccessToken(), b), "สร้างใบสั่งงานไม่สำเร็จ");

export const useReportBreakdownMutation = () =>
  useMaintenanceMutation((b: BreakdownBody) => api.reportBreakdown(getAccessToken(), b), "แจ้งเสียไม่สำเร็จ");

export const useAssignWorkOrderMutation = () =>
  useMaintenanceMutation(
    (v: { id: string; assignedToId: string; assistantIds?: string[] }) =>
      api.assignWorkOrder(getAccessToken(), v.id, { assignedToId: v.assignedToId, assistantIds: v.assistantIds }),
    "มอบหมายช่างไม่สำเร็จ",
  );

export const useStartWorkOrderMutation = () =>
  useMaintenanceMutation((id: string) => api.startWorkOrder(getAccessToken(), id), "เริ่มงานไม่สำเร็จ");

export const useCompleteWorkOrderMutation = () =>
  useMaintenanceMutation(
    (v: { id: string; body: CompleteWorkOrderBody }) => api.completeWorkOrder(getAccessToken(), v.id, v.body),
    "ปิดงานไม่สำเร็จ",
  );

export const useCancelWorkOrderMutation = () =>
  useMaintenanceMutation((id: string) => api.cancelWorkOrder(getAccessToken(), id), "ยกเลิกใบสั่งงานไม่สำเร็จ");

export const useReturnPartMutation = () =>
  useMaintenanceMutation(
    (v: { id: string; usageId: string; quantity: number; remark?: string }) =>
      api.returnWorkOrderPart(getAccessToken(), v.id, v.usageId, { quantity: v.quantity, remark: v.remark }),
    "คืนอะไหล่ไม่สำเร็จ",
  );

export const useAddShutdownWorkOrdersMutation = () =>
  useMaintenanceMutation(
    (v: { planId: string; items: ShutdownItemBody[] }) =>
      api.addShutdownWorkOrders(getAccessToken(), v.planId, v.items),
    "วางใบสั่งงานช่วง Shutdown ไม่สำเร็จ",
  );
