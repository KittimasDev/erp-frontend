"use client";

import { useQuery } from "@tanstack/react-query";

import { getNtfyTopics } from "@/lib/api/ntfy-topics";
import { getAccessToken } from "@/lib/auth/token";
import type { NtfyTopicQueryParams } from "@/types/ntfy-topics";

export const ntfyTopicsQueryKey = ["master-data", "ntfy-topics"] as const;

export function useNtfyTopicsQuery(
  params?: NtfyTopicQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ntfyTopicsQueryKey, params ?? {}],
    queryFn: () => getNtfyTopics(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}
