"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyPermissions } from "@/lib/api/permissions";
import { setStoredPermissionsAndNotify } from "@/lib/auth/permissions-access";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

export const myPermissionsQueryKey = ["auth", "permissions", "me"] as const;

/** สิทธิ์เปลี่ยนนาน ๆ ครั้ง — ถือไว้ 2 นาที (รีเฟรชหน้าได้ค่าใหม่ทันที) */
const PERMISSIONS_STALE_MS = 2 * 60_000;

export function useMyPermissionsQuery() {
  return useQuery({
    queryKey: myPermissionsQueryKey,
    queryFn: async () => {
      const res = await getMyPermissions(getAccessToken());
      // เก็บลง localStorage ก่อนปล่อยให้หน้าเรนเดอร์ — เมนู/ปุ่มกรองสิทธิ์จากตรงนี้
      setStoredPermissionsAndNotify(res.data);
      return res;
    },
    enabled: hasAccessToken(),
    staleTime: PERMISSIONS_STALE_MS,
    retry: false,
  });
}
