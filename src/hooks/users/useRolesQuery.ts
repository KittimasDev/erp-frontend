"use client";

import { useQuery } from "@tanstack/react-query";

import { getRoles } from "@/lib/api/roles";
import { getAccessToken } from "@/lib/auth/token";

export const rolesQueryKey = ["roles"] as const;

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: () => getRoles(getAccessToken()),
  });
}
