"use client";

import { use } from "react";

import MaterialConversionDetailPage from "@/components/material-conversions/MaterialConversionDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <MaterialConversionDetailPage runId={id} />;
}
