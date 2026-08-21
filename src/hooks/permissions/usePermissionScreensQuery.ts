"use client";

import { useQuery } from "@tanstack/react-query";

import { getPermissionScreens } from "@/lib/api/permissions";
import { getAccessToken } from "@/lib/auth/token";

export const permissionScreensQueryKey = ["permission-screens"] as const;

export function usePermissionScreensQuery() {
  return useQuery({
    queryKey: permissionScreensQueryKey,
    queryFn: () => getPermissionScreens(getAccessToken()),
    staleTime: 0,
    refetchOnMount: "always",
  });
}
