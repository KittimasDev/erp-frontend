"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import AccessDenied from "@/components/auth/AccessDenied";
import PageLoading from "@/components/common/PageLoading";
import { useMeQuery } from "@/hooks/auth/useMeQuery";
import { useMyPermissionsQuery } from "@/hooks/auth/useMyPermissionsQuery";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { clearStoredPermissions } from "@/lib/auth/permissions-access";
import { resolveScreenCodesForPath } from "@/lib/auth/screen-routes";
import { hasAccessToken } from "@/lib/auth/token";

type AuthGuardProps = {
  children: ReactNode;
};

/**
 * ดึงผู้ใช้ + สิทธิ์ครั้งเดียว (react-query ถือค่าไว้) แล้วตรวจสิทธิ์ของหน้าปัจจุบันตอน render
 *
 * เดิมเช็คใหม่ทุกครั้งที่ pathname/searchParams เปลี่ยน และสลับเป็นหน้า loading ระหว่างนั้น
 * ทำให้ AppShell ถูก unmount แล้ว mount ใหม่ทุกการนำทาง — ตัวนับงานค้างกับ notifications
 * ยิงใหม่ทั้งชุดทุกครั้ง
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const meQuery = useMeQuery();
  const permsQuery = useMyPermissionsQuery();
  const hasToken = hasAccessToken();
  const failed = meQuery.isError || permsQuery.isError;

  useEffect(() => {
    if (hasToken && !failed) {
      return;
    }
    clearStoredPermissions();
    redirectToLogin(pathname && pathname !== "/" ? pathname : undefined);
  }, [hasToken, failed, pathname]);

  const me = meQuery.data?.data;
  const perms = permsQuery.data?.data;

  // ยังไม่มีข้อมูลสิทธิ์ = ห้ามปล่อยผ่าน (default-deny) แสดง loading จนกว่าจะรู้ผล
  if (!hasToken || failed || !me || !perms) {
    return <PageLoading label="กำลังตรวจสอบสิทธิ์..." />;
  }

  const screenCodes = resolveScreenCodesForPath(pathname, searchParams);
  const isAdmin = (me.roles ?? []).some((r) => r.roleCode === "ADMINISTRATOR");

  const hasScreenAccess = (codes: string[]) => {
    if (perms.permissionCodes.includes("*")) {
      return true;
    }
    return codes.some(
      (code) =>
        perms.screenCodes.includes(code) ||
        perms.permissionCodes.some((p) => p.startsWith(`${code}.`)),
    );
  };

  if (
    perms.mode === "matrix" &&
    !isAdmin &&
    screenCodes &&
    screenCodes.length > 0 &&
    !hasScreenAccess(screenCodes)
  ) {
    return <AccessDenied screenCodes={screenCodes} />;
  }

  return children;
}
