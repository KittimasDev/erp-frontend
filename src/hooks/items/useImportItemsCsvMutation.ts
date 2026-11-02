"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { importItemsCsv } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";

import { itemsQueryKey } from "./useItemsQuery";

export function useImportItemsCsvMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["master-data", "items", "import-csv"],
    mutationFn: (file: File) => importItemsCsv(getAccessToken(), file),
    onSuccess: async (response) => {
      if (response.data.successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      }
    },
  });
}
