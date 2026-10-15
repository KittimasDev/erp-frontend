"use client";

import { use } from "react";

import AdvanceRequestFormPage from "@/components/advance-requests/AdvanceRequestFormPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdvanceRequestFormPage id={id} />;
}
