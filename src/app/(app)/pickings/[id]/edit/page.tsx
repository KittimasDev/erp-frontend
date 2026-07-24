"use client";

import { use } from "react";

import PickingFormPage from "@/components/pickings/PickingFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PickingFormPage id={id} mode="edit" />;
}
