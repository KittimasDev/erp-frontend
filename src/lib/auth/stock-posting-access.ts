"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getScreenActionPermissions,
  isMatrixPermissionMode,
  PERMISSIONS_UPDATED_EVENT,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { getStoredUser, isAdministrator, userHasRole } from "@/lib/auth/session";

/** Mirror backend WAREHOUSE_SUPERVISOR_ROLE_CODE — หัวหน้าคลังใน env นี้ */
export const WAREHOUSE_SUPERVISOR_ROLE_CODE = "WSHOW";

function hasWarehouseSupervisorRole(): boolean {
  const user = getStoredUser();
  return Boolean(
    user?.roles?.some((role) => role.roleCode === WAREHOUSE_SUPERVISOR_ROLE_CODE),
  );
}

/** อนุมัติรับยางเข้าคลัง — สอดคล้อง backend STOCK_POSTING_APPROVE_ROLES + matrix */
export function canApproveStockPostingApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }

  if (getScreenActionPermissions("STOCK_POSTING_APPROVALS").canApprove) {
    return true;
  }

  if (!isMatrixPermissionMode()) {
    return (
      userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
      userHasRole(WAREHOUSE_SUPERVISOR_ROLE_CODE)
    );
  }

  return hasWarehouseSupervisorRole();
}

/** Reactive — อัปเดตเมื่อ login / Permission Matrix เปลี่ยน */
export function useCanApproveStockPostingApprovals(): boolean {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setVersion((value) => value + 1);
    window.addEventListener(PERMISSIONS_UPDATED_EVENT, onUpdate);
    return () =>
      window.removeEventListener(PERMISSIONS_UPDATED_EVENT, onUpdate);
  }, []);

  return useMemo(() => canApproveStockPostingApprovals(), [version]);
}
