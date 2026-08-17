"use client";

import { useQuery } from "@tanstack/react-query";

import { getRolePermissions } from "@/lib/api/permissions";
import { getAccessToken } from "@/lib/auth/token";

export function rolePermissionsQueryKey(roleId: string) {
  return ["role-permissions", roleId] as const;
}

export function useRolePermissionsQuery(roleId?: string) {
  return useQuery({
    queryKey: rolePermissionsQueryKey(roleId ?? ""),
    queryFn: () => getRolePermissions(getAccessToken(), roleId as string),
    enabled: Boolean(roleId),
    // เข้าหน้า matrix ใหม่ให้ดึงของจริงทุกครั้ง — ค่าที่ติ๊กคือของที่จะเขียนทับทั้งชุดตอนบันทึก
    // จะโชว์ค่าเก่าจาก cache ไม่ได้
    refetchOnMount: "always",
    // ห้าม refetch ตอนสลับหน้าต่างกลับมา ไม่งั้นสิทธิ์ที่ติ๊กค้างไว้ยังไม่บันทึกจะถูกทับหาย
    refetchOnWindowFocus: false,
  });
}
