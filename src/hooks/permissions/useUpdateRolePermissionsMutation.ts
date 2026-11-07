"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  getMyPermissions,
  updateRolePermissions,
} from "@/lib/api/permissions";
import {
  setStoredPermissionsAndNotify,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { RolePermissionAssignment } from "@/types/permissions";

import { rolePermissionsQueryKey } from "./useRolePermissionsQuery";

type RoleMeta = {
  roleCode?: string;
  roleName?: string;
};

export function useUpdateRolePermissionsMutation(
  roleId: string,
  roleMeta?: RoleMeta,
) {
  const t = useT();
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignments: RolePermissionAssignment[]) =>
      updateRolePermissions(getAccessToken(), roleId, { assignments }),
    onSuccess: async (res) => {
      message.success(res.message || t("บันทึกสิทธิ์สำเร็จ"));
      // endpoint คืนสิทธิ์ชุดล่าสุดมาแล้ว (shape เดียวกับ GET) — เขียนลง cache ตรง ๆ
      // ดีกว่า invalidate เพราะไม่ต้องยิงซ้ำ และไม่มีช่วงที่ response เก่ามาทับ
      // ค่าที่ผู้ใช้ติ๊กต่อระหว่างรอ refetch
      queryClient.setQueryData(rolePermissionsQueryKey(roleId), res);

      try {
        const token = getAccessToken();
        if (token) {
          const mePerms = await getMyPermissions(token);
          setStoredPermissionsAndNotify(mePerms.data);
        }
        const roleLabel =
          roleMeta?.roleCode && roleMeta?.roleName
            ? `${roleMeta.roleCode} (${roleMeta.roleName})`
            : roleMeta?.roleCode || roleMeta?.roleName || t("role นี้");
        notification.success({
          title: t("อัปเดตสิทธิ์แล้ว"),
          description: t("เมนูรีเฟรชจาก Permission Matrix แล้ว — มีผลกับผู้ใช้ที่ถูกผูก {role}", { role: roleLabel }),
          duration: 5,
        });
      } catch {
        notification.warning({
          title: t("บันทึกแล้ว แต่รีเฟรชเมนูไม่สำเร็จ"),
          description: t("ลองเปลี่ยนหน้าหรือ login ใหม่เพื่อโหลดสิทธิ์ล่าสุด"),
          duration: 6,
        });
      }
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("บันทึกสิทธิ์ไม่สำเร็จ"),
      );
    },
  });
}
