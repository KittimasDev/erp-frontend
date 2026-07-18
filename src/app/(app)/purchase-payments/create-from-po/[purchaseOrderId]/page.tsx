"use client";

import { use } from "react";

import PurchasePaymentCreateFromPoPage from "@/components/purchase-payments/PurchasePaymentCreateFromPoPage";

export default function Page({
  params,
}: {
  params: Promise<{ purchaseOrderId: string }>;
}) {
  const { purchaseOrderId } = use(params);
  return (
    <PurchasePaymentCreateFromPoPage purchaseOrderId={purchaseOrderId} />
  );
}
