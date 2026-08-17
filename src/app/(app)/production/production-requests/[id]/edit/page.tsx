"use client";

import { use } from "react";

import ProductionRequestCreatePage from "@/components/production/ProductionRequestCreatePage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductionRequestEditRoutePage({ params }: Props) {
  const { id } = use(params);
  return <ProductionRequestCreatePage requestId={id} />;
}
