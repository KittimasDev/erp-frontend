"use client";

import { use } from "react";

import StockPostingRequestPage from "@/components/warehouse/StockPostingRequestPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ReceiptStockPostingRequestRoutePage({ params }: Props) {
  const { id } = use(params);
  return <StockPostingRequestPage receiptId={id} />;
}
