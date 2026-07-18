"use client";

import { use } from "react";

import PurchasePaymentDetailPage from "@/components/purchase-payments/PurchasePaymentDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PurchasePaymentDetailPage id={id} />;
}
