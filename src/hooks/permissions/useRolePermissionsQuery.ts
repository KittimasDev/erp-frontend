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
  });
}
