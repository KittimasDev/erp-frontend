"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { App } from "antd";

import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { LoginApiResponse, LoginRequest } from "@/types/auth";

const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export function useLoginMutation() {
  const router = useRouter();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (response: LoginApiResponse) => {
      const data = response.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      message.success(response.message || "เข้าสู่ระบบสำเร็จ");

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
    },
    onError: (error: Error) => {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      message.error(errorMessage);
    },
  });
}
