"use client";

import { use } from "react";

import AdvanceRequestDetailPage from "@/components/advance-requests/AdvanceRequestDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdvanceRequestDetailPage id={id} />;
}
