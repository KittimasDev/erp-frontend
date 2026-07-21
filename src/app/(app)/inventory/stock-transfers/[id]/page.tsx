"use client";

import { use } from "react";

import StockTransferDetailPage from "@/components/stock-transfers/StockTransferDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockTransferDetailPage id={id} />;
}
