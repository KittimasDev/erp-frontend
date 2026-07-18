"use client";

import { use } from "react";

import PurchaseOrderDetailPage from "@/components/purchase-orders/PurchaseOrderDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PurchaseOrderDetailPage id={id} />;
}
