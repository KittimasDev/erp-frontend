"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelMaterialConversion,
  completeMaterialConversion,
  createMaterialConversion,
  startMaterialConversion,
} from "@/lib/api/material-conversions";
import {
  createMaterialConversionRoute,
  createRouteStep,
  deleteMaterialConversionRoute,
  deleteRouteStep,
  updateMaterialConversionRoute,
  updateRouteStep,
} from "@/lib/api/material-conversion-routes";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CancelMaterialConversionBody,
  CompleteMaterialConversionBody,
  CreateMaterialConversionBody,
  CreateRouteBody,
  CreateRouteStepBody,
  StartMaterialConversionBody,
  UpdateRouteBody,
  UpdateRouteStepBody,
} from "@/types/material-conversion";
import {
  materialConversionRoutesKey,
  materialConversionsKey,
} from "./useMaterialConversionQueries";

/**
 * ล้าง cache ของเอกสาร **และของคลัง** เพราะเริ่มงาน/ปิดงานตัดและรับสต๊อกจริง
 * ไม่ล้างแล้วหน้าสต๊อกจะค้างตัวเลขเก่า
 */
function useInvalidateRuns() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: materialConversionsKey }),
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-lots"] }),
    ]);
}

function useInvalidateRoutes() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: materialConversionRoutesKey });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateMaterialConversionMutation() {
  const invalidate = useInvalidateRuns();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionsKey, "create"],
    mutationFn: (body: CreateMaterialConversionBody) =>
      createMaterialConversion(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      // ข้อความจาก backend มีคำเตือนข้ามขั้นต่อท้ายอยู่แล้วถ้ามี
      if (res.data.stepSkipWarning) {
        message.warning(res.message);
      } else {
        message.success(res.message || "สร้างใบแปรสภาพวัตถุดิบสำเร็จ");
      }
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "สร้างใบแปรสภาพวัตถุดิบไม่สำเร็จ"));
    },
  });
}

export function useStartMaterialConversionMutation() {
  const invalidate = useInvalidateRuns();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionsKey, "start"],
    mutationFn: (vars: { id: string; body?: StartMaterialConversionBody }) =>
      startMaterialConversion(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "เริ่มงานและตัดสต๊อกวัตถุดิบสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "เริ่มงานไม่สำเร็จ"));
    },
  });
}

export function useCompleteMaterialConversionMutation() {
  const invalidate = useInvalidateRuns();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionsKey, "complete"],
    mutationFn: (vars: { id: string; body?: CompleteMaterialConversionBody }) =>
      completeMaterialConversion(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      // สมดุลมวลผิดปกติต้องขึ้นเป็นคำเตือน ไม่ใช่กลืนไปกับข้อความสำเร็จ
      if (res.data.massBalanceStatus === "EXCEEDS_INPUT") {
        message.warning(
          res.data.massBalanceMessage || "ผลผลิตเกินวัตถุดิบ — ตรวจตัวเลขอีกครั้ง",
        );
      } else {
        message.success(res.message || "ปิดงานและรับผลผลิตเข้าคลังสำเร็จ");
      }
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ปิดงานไม่สำเร็จ"));
    },
  });
}

export function useCancelMaterialConversionMutation() {
  const invalidate = useInvalidateRuns();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionsKey, "cancel"],
    mutationFn: (vars: { id: string; body?: CancelMaterialConversionBody }) =>
      cancelMaterialConversion(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกเอกสารสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ยกเลิกเอกสารไม่สำเร็จ"));
    },
  });
}

// ─── master data: เส้นทางแปรสภาพ ────────────────────────────────────────────

export function useCreateRouteMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "create"],
    mutationFn: (body: CreateRouteBody) =>
      createMaterialConversionRoute(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "สร้างเส้นทางสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "สร้างเส้นทางไม่สำเร็จ"));
    },
  });
}

export function useUpdateRouteMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "update"],
    mutationFn: (vars: { id: string; body: UpdateRouteBody }) =>
      updateMaterialConversionRoute(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "แก้ไขเส้นทางสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขเส้นทางไม่สำเร็จ"));
    },
  });
}

export function useDeleteRouteMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "delete"],
    mutationFn: (id: string) =>
      deleteMaterialConversionRoute(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ลบเส้นทางสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ลบเส้นทางไม่สำเร็จ"));
    },
  });
}

export function useCreateRouteStepMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "step-create"],
    mutationFn: (vars: { routeId: string; body: CreateRouteStepBody }) =>
      createRouteStep(getAccessToken(), vars.routeId, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "เพิ่มขั้นตอนสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "เพิ่มขั้นตอนไม่สำเร็จ"));
    },
  });
}

export function useUpdateRouteStepMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "step-update"],
    mutationFn: (vars: {
      routeId: string;
      stepId: string;
      body: UpdateRouteStepBody;
    }) => updateRouteStep(getAccessToken(), vars.routeId, vars.stepId, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "แก้ไขขั้นตอนสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขขั้นตอนไม่สำเร็จ"));
    },
  });
}

export function useDeleteRouteStepMutation() {
  const invalidate = useInvalidateRoutes();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionRoutesKey, "step-delete"],
    mutationFn: (vars: { routeId: string; stepId: string }) =>
      deleteRouteStep(getAccessToken(), vars.routeId, vars.stepId),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ลบขั้นตอนสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ลบขั้นตอนไม่สำเร็จ"));
    },
  });
}
