"use client";

import { use } from "react";

import StockTransferFormPage from "@/components/stock-transfers/StockTransferFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockTransferFormPage mode="edit" id={id} />;
}
