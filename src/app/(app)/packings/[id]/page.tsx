"use client";

import { use } from "react";

import PackingFormPage from "@/components/packings/PackingFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PackingFormPage id={id} mode="view" />;
}
