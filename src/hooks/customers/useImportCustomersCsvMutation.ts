"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { importCustomersCsv } from "@/lib/api/customers";
import { getAccessToken } from "@/lib/auth/token";

import { customersQueryKey } from "./useCustomersQuery";

export function useImportCustomersCsvMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["master-data", "customers", "import-csv"],
    mutationFn: (file: File) => importCustomersCsv(getAccessToken(), file),
    onSuccess: async (response) => {
      if (response.data.successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      }
    },
  });
}
