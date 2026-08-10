"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getScreenActionPermissions,
  PERMISSIONS_UPDATED_EVENT,
  type ScreenActionPermissions,
} from "@/lib/auth/permissions-access";

/** อ่านสิทธิ์ Matrix แบบ reactive — อัปเดตเมื่อ Permission Matrix เปลี่ยน */
export function useScreenActionPermissions(
  screenCode: string,
): ScreenActionPermissions {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setVersion((value) => value + 1);
    window.addEventListener(PERMISSIONS_UPDATED_EVENT, onUpdate);
    return () =>
      window.removeEventListener(PERMISSIONS_UPDATED_EVENT, onUpdate);
  }, []);

  return useMemo(
    () => getScreenActionPermissions(screenCode),
    [screenCode, version],
  );
}
