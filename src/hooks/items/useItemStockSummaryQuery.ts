"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getItemStockSummary } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";

import { itemsQueryKey } from "./useItemsQuery";

/**
 * ยอดคงเหลือรวมทุกคลังเทียบสต๊อกขั้นต่ำ ของสินค้าในหน้าที่แสดง + จำนวนที่ต่ำกว่าขั้นต่ำทั้งระบบ
 * ยอดสต๊อกเปลี่ยนบ่อยจึงรีเฟรชทุก 60 วินาที (ไม่ได้ cache ฝั่ง backend)
 */
export function useItemStockSummaryQuery(itemIds: string[]) {
  return useQuery({
    queryKey: [...itemsQueryKey, "stock-summary", itemIds],
    queryFn: async () => (await getItemStockSummary(getAccessToken(), itemIds)).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
