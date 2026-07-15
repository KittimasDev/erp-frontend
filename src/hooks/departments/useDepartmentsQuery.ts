"use client";

import { useQuery } from "@tanstack/react-query";

import { getDepartments } from "@/lib/api/departments";
import { getAccessToken } from "@/lib/auth/token";
import type { DepartmentQueryParams } from "@/types/departments";

export const departmentsQueryKey = [
  "master-data",
  "departments",
] as const;

export function useDepartmentsQuery(params?: DepartmentQueryParams) {
  return useQuery({
    queryKey: [...departmentsQueryKey, params ?? {}],
    queryFn: () => getDepartments(getAccessToken(), params),
  });
}
