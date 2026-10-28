"use client";

import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/lib/api/auth";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import { setStoredUser } from "@/lib/auth/session";

/** คีย์กลางของข้อมูลผู้ใช้ปัจจุบัน — AuthGuard, หน้าโปรไฟล์ และหน้าลายเซ็นใช้ร่วมกัน ยิง `/auth/me` ครั้งเดียว */
export const myProfileQueryKey = ["auth", "me"] as const;

/** ถือค่าไว้ 2 นาที: เปลี่ยนหน้า/เปลี่ยน tab ไม่ต้องยิงซ้ำ แก้โปรไฟล์แล้ว invalidate คีย์นี้ได้ทันที */
const ME_STALE_MS = 2 * 60_000;

export function useMeQuery() {
  return useQuery({
    queryKey: myProfileQueryKey,
    queryFn: async () => {
      const res = await getMe(getAccessToken());
      // เก็บลง localStorage ก่อนส่งข้อมูลให้ผู้เรียก — sidebar อ่านจากตรงนี้
      setStoredUser(res.data);
      return res;
    },
    enabled: hasAccessToken(),
    staleTime: ME_STALE_MS,
    retry: false,
  });
}
