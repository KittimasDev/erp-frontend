"use client";

import { useParams } from "next/navigation";

import ReturnInspectionDetailPage from "@/components/return-notes/ReturnInspectionDetailPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ReturnInspectionDetailPage id={params.id} />;
}
