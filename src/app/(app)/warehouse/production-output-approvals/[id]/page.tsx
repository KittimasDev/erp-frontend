"use client";

import { use } from "react";

import ProductionOutputApprovalDetailPage from "@/components/production-output/ProductionOutputApprovalDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductionOutputApprovalDetailRoutePage({
  params,
}: Props) {
  const { id } = use(params);
  return <ProductionOutputApprovalDetailPage requestId={id} />;
}
