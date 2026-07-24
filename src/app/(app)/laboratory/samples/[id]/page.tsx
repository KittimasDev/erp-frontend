"use client";

import { use } from "react";

import LabSampleDetailPage from "@/components/laboratory/LabSampleDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LabSampleDetailPage id={id} />;
}
