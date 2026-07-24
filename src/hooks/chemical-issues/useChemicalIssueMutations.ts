"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveChemicalIssue,
  cancelChemicalIssue,
  createChemicalIssue,
  updateChemicalIssue,
} from "@/lib/api/chemical-issues";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateChemicalIssueBody,
  UpdateChemicalIssueBody,
} from "@/types/chemical-issues";
import { chemicalIssuesQueryKey } from "./useChemicalIssuesQuery";

export function useCreateChemicalIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateChemicalIssueBody) =>
      createChemicalIssue(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างใบเบิกจ่ายสารเคมีสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: chemicalIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "สร้างใบเบิกจ่ายสารเคมีไม่สำเร็จ");
    },
  });
}

export function useUpdateChemicalIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateChemicalIssueBody;
    }) => updateChemicalIssue(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบเบิกจ่ายสารเคมีสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: chemicalIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบเบิกจ่ายสารเคมีไม่สำเร็จ");
    },
  });
}

export function useCancelChemicalIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelChemicalIssue(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกใบเบิกจ่ายสารเคมีแล้ว");
      void queryClient.invalidateQueries({ queryKey: chemicalIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ยกเลิกใบเบิกจ่ายสารเคมีไม่สำเร็จ");
    },
  });
}

export function useApproveChemicalIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => approveChemicalIssue(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "อนุมัติและตัดสต๊อกสารเคมีสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: chemicalIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "อนุมัติใบเบิกจ่ายสารเคมีไม่สำเร็จ");
    },
  });
}
