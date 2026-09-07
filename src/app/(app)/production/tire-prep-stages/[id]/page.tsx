"use client";

import { use } from "react";

import StageRunDetailPage from "@/components/production-stages/StageRunDetailPage";
import { TIRE_PREP_MODULE } from "@/components/production-stages/stage-modules";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <StageRunDetailPage config={TIRE_PREP_MODULE} runId={id} />;
}
