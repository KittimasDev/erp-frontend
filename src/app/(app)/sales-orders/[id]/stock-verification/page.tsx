"use client";

import { use } from "react";

import StockVerificationDetailPage from "@/components/sales-orders/StockVerificationDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockVerificationDetailPage id={id} />;
}
