"use client";

import { use } from "react";

import MaterialConversionJobDetailPage from "@/components/material-conversions/MaterialConversionJobDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <MaterialConversionJobDetailPage jobId={id} />;
}
