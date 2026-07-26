"use client";

import { use } from "react";

import ProductionOrderDetailPage from "@/components/production/ProductionOrderDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductionOrderDetailRoutePage({ params }: Props) {
  const { id } = use(params);
  return <ProductionOrderDetailPage orderId={id} />;
}
