"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelMaterialConversionJob,
  closeMaterialConversionJob,
  createMaterialConversionJob,
  getMaterialConversionJob,
  getMaterialConversionJobs,
  reopenMaterialConversionJob,
} from "@/lib/api/material-conversion-jobs";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CancelMaterialConversionJobBody,
  CloseMaterialConversionJobBody,
  CreateMaterialConversionJobBody,
  QueryMaterialConversionJobsParams,
} from "@/types/material-conversion";
import { materialConversionsKey } from "./useMaterialConversionQueries";

export const materialConversionJobsKey = ["material-conversion-jobs"] as const;

export function useMaterialConversionJobsQuery(
  params?: QueryMaterialConversionJobsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...materialConversionJobsKey, "list", params ?? {}],
    queryFn: () => getMaterialConversionJobs(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useMaterialConversionJobQuery(id?: string) {
  return useQuery({
    queryKey: [...materialConversionJobsKey, "detail", id],
    queryFn: () => getMaterialConversionJob(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

/**
 * ล้าง cache ของ **ทั้งใบงานและเอกสารขั้นตอน**
 *
 * ความคืบหน้าของใบงานคิดจากสถานะเอกสารขั้นตอน ล้างข้างเดียวจะเห็นตัวเลข
 * "3/6" ค้างอยู่ทั้งที่เพิ่งปิดงานขั้นที่ 4 ไป
 */
function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: materialConversionJobsKey }),
      queryClient.invalidateQueries({ queryKey: materialConversionsKey }),
    ]);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateMaterialConversionJobMutation() {
  const invalidate = useInvalidateJobs();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionJobsKey, "create"],
    mutationFn: (body: CreateMaterialConversionJobBody) =>
      createMaterialConversionJob(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      /*
        backend ต่อคำเตือน Batch ซ้ำไว้ท้ายข้อความให้แล้ว — ถ้ายาวกว่าข้อความ
        สำเร็จเปล่า ๆ แปลว่ามีคำเตือน ให้ขึ้นเป็นสีเหลืองไม่ใช่กลืนไปกับสีเขียว
      */
      if (res.message.includes("—")) {
        message.warning(res.message);
      } else {
        message.success(res.message || "เปิดใบงานแปรสภาพสำเร็จ");
      }
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "เปิดใบงานแปรสภาพไม่สำเร็จ"));
    },
  });
}

export function useCloseMaterialConversionJobMutation() {
  const invalidate = useInvalidateJobs();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionJobsKey, "close"],
    mutationFn: (vars: { id: string; body?: CloseMaterialConversionJobBody }) =>
      closeMaterialConversionJob(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ปิดใบงานสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ปิดใบงานไม่สำเร็จ"));
    },
  });
}

export function useReopenMaterialConversionJobMutation() {
  const invalidate = useInvalidateJobs();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionJobsKey, "reopen"],
    mutationFn: (id: string) =>
      reopenMaterialConversionJob(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "เปิดใบงานกลับมาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "เปิดใบงานกลับมาไม่สำเร็จ"));
    },
  });
}

export function useCancelMaterialConversionJobMutation() {
  const invalidate = useInvalidateJobs();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...materialConversionJobsKey, "cancel"],
    mutationFn: (vars: { id: string; body?: CancelMaterialConversionJobBody }) =>
      cancelMaterialConversionJob(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกใบงานสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ยกเลิกใบงานไม่สำเร็จ"));
    },
  });
}
