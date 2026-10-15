"use client";

import { use } from "react";

import PayablePurchaseOrderDetailPage from "@/components/finance/payable-purchase-orders/PayablePurchaseOrderDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PayablePurchaseOrderDetailPage id={id} />;
}
