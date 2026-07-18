"use client";

import { use } from "react";

import PurchaseRequestDetailPage from "@/components/purchase-requests/PurchaseRequestDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PurchaseRequestDetailPage id={id} />;
}
