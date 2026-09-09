"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  createProductionFormula,
  deleteProductionFormula,
  updateProductionFormula,
} from "@/lib/api/production-formulas";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateProductionFormulaBody,
  UpdateProductionFormulaBody,
} from "@/types/production-formula";
import { productionFormulasKey } from "./useProductionFormulaQueries";

function useInvalidateFormulas() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: productionFormulasKey });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateProductionFormulaMutation() {
  const invalidate = useInvalidateFormulas();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionFormulasKey, "create"],
    mutationFn: (body: CreateProductionFormulaBody) =>
      createProductionFormula(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      /*
        คำเตือนของสูตร (สมดุลมวลไม่ปิด / มีวัสดุสิ้นเปลืองในสูตร) ไม่บล็อกการบันทึก
        แต่ต้องเห็น ไม่ใช่กลืนไปกับข้อความสำเร็จสีเขียว
      */
      if (res.data.warnings.length > 0) {
        message.warning(res.data.warnings.join(" · "));
      } else {
        message.success(res.message || "สร้างสูตรการผลิตสำเร็จ");
      }
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "สร้างสูตรการผลิตไม่สำเร็จ"));
    },
  });
}

export function useUpdateProductionFormulaMutation() {
  const invalidate = useInvalidateFormulas();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionFormulasKey, "update"],
    mutationFn: (vars: { id: string; body: UpdateProductionFormulaBody }) =>
      updateProductionFormula(getAccessToken(), vars.id, vars.body),
    onSuccess: async (res) => {
      await invalidate();
      if (res.data.warnings.length > 0) {
        message.warning(res.data.warnings.join(" · "));
      } else {
        message.success(res.message || "แก้ไขสูตรการผลิตสำเร็จ");
      }
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขสูตรการผลิตไม่สำเร็จ"));
    },
  });
}

export function useDeleteProductionFormulaMutation() {
  const invalidate = useInvalidateFormulas();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionFormulasKey, "delete"],
    mutationFn: (id: string) => deleteProductionFormula(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ลบสูตรการผลิตสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ลบสูตรการผลิตไม่สำเร็จ"));
    },
  });
}
