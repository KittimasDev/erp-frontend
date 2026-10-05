"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getInspectionWarehouses,
  getInspectionDetail,
  getPendingInspections,
  getReturnNote,
  getSortDestinations,
  getReturnNotes,
  getReturnSourcePickingDetail,
  getReturnSourcePickings,
  getReturnSourceSalesOrders,
} from "@/lib/api/return-notes";
import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import { getAccessToken } from "@/lib/auth/token";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
import type { ReturnNoteQueryParams } from "@/types/return-notes";

export const returnNotesQueryKey = ["return-notes"] as const;

/** ใบคืนสินค้าที่รอคลังอนุมัติ สำหรับ badge */
export function pendingReturnNotesCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: [...returnNotesQueryKey, "pending", "count"],
    queryFn: () =>
      getReturnNotes(getAccessToken(), {
        status: "PENDING_APPROVAL",
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: () => canAccessBadgeScreen("RETURN_NOTES"),
    enabled: ctx?.enabled,
  });
}

export function useReturnNotesQuery(params?: ReturnNoteQueryParams) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "list", params ?? {}],
    queryFn: () => getReturnNotes(getAccessToken(), params),
  });
}

export function usePendingInspectionsQuery(params?: ReturnNoteQueryParams) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "inspections", params ?? {}],
    queryFn: () => getPendingInspections(getAccessToken(), params),
  });
}

export function useSortDestinationsQuery(enabled = true) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "inspection-destinations"],
    queryFn: () => getSortDestinations(getAccessToken()),
    enabled,
  });
}

export function useInspectionDetailQuery(id?: string) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "inspection", id],
    queryFn: () => getInspectionDetail(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReturnNoteQuery(id?: string) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "detail", id],
    queryFn: () => getReturnNote(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReturnSourceSalesOrdersQuery(
  keyword: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "source", "sales-orders", keyword],
    queryFn: () => getReturnSourceSalesOrders(getAccessToken(), keyword),
    enabled,
  });
}

export function useReturnSourcePickingsQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "source", "pickings", salesOrderId],
    queryFn: () =>
      getReturnSourcePickings(getAccessToken(), salesOrderId as string),
    enabled: Boolean(salesOrderId),
  });
}

export function useReturnSourcePickingDetailQuery(
  pickingId?: string,
  deliveryOrderId?: string,
) {
  return useQuery({
    queryKey: [
      ...returnNotesQueryKey,
      "source",
      "picking",
      pickingId,
      deliveryOrderId ?? null,
    ],
    queryFn: () =>
      getReturnSourcePickingDetail(
        getAccessToken(),
        pickingId as string,
        deliveryOrderId,
      ),
    enabled: Boolean(pickingId),
    retry: false,
  });
}

export function useInspectionWarehousesQuery(enabled = true) {
  return useQuery({
    queryKey: [...returnNotesQueryKey, "inspection-warehouses"],
    queryFn: () => getInspectionWarehouses(getAccessToken()),
    enabled,
  });
}
