"use client";

import { use } from "react";

import StockCountDetailPage from "@/components/stock-counts/StockCountDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockCountDetailPage id={id} />;
}
