"use client";

import { use } from "react";

import PurchaseOrderCreateFromPrPage from "@/components/purchase-orders/PurchaseOrderCreateFromPrPage";

export default function Page({
  params,
}: {
  params: Promise<{ purchaseRequestId: string }>;
}) {
  const { purchaseRequestId } = use(params);
  return (
    <PurchaseOrderCreateFromPrPage purchaseRequestIds={[purchaseRequestId]} />
  );
}
