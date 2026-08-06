"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  resetUserPassword,
  updateUser,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRequest,
} from "@/types/users";

import { usersQueryKey } from "./useUsersQuery";

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: usersQueryKey });
}

export function useCreateUserMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (body: CreateUserRequest) =>
      createUser(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างผู้ใช้งานสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างผู้ใช้งานไม่สำเร็จ",
      );
    },
  });
}

export function useUpdateUserMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      updateUser(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "แก้ไขผู้ใช้งานสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขผู้ใช้งานไม่สำเร็จ",
      );
    },
  });
}

export function useResetUserPasswordMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ResetPasswordRequest;
    }) => resetUserPassword(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "รีเซ็ตรหัสผ่านสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "รีเซ็ตรหัสผ่านไม่สำเร็จ",
      );
    },
  });
}

export function useActivateUserMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: string) => activateUser(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "เปิดใช้งานสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "เปิดใช้งานไม่สำเร็จ",
      );
    },
  });
}

export function useDeactivateUserMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: string) => deactivateUser(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ปิดใช้งานสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ปิดใช้งานไม่สำเร็จ",
      );
    },
  });
}

export function useDeleteUserMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: string) => deleteUser(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ลบผู้ใช้งานสำเร็จ");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบผู้ใช้งานไม่สำเร็จ",
      );
    },
  });
}
