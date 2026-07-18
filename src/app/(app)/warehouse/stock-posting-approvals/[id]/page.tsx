"use client";

import { use } from "react";

import StockPostingApprovalDetailPage from "@/components/warehouse/StockPostingApprovalDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function StockPostingApprovalDetailRoutePage({ params }: Props) {
  const { id } = use(params);
  return <StockPostingApprovalDetailPage requestId={id} />;
}
