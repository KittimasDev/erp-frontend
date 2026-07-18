"use client";

import { useQuery } from "@tanstack/react-query";

import { getUsers } from "@/lib/api/users";
import { getAccessToken } from "@/lib/auth/token";
import type { UserQueryParams } from "@/types/users";

export const usersQueryKey = ["users"] as const;

export function useUsersQuery(params: UserQueryParams = {}) {
  return useQuery({
    queryKey: [...usersQueryKey, params],
    queryFn: () => getUsers(getAccessToken(), params),
  });
}
