"use client";

import { use } from "react";

import CycleSummaryPage from "@/components/production-cycles/CycleSummaryPage";

type Props = { params: Promise<{ id: string }> };

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <CycleSummaryPage id={id} />;
}
