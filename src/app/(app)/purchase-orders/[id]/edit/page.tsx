"use client";

import { use } from "react";

import PurchaseOrderEditPage from "@/components/purchase-orders/PurchaseOrderEditPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PurchaseOrderEditPage id={id} />;
}
