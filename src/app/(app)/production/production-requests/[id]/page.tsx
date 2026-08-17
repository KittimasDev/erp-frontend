"use client";

import { use } from "react";

import ProductionRequestDetailPage from "@/components/production/ProductionRequestDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductionRequestDetailRoutePage({ params }: Props) {
  const { id } = use(params);
  return <ProductionRequestDetailPage requestId={id} />;
}
