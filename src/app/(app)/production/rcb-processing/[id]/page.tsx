"use client";

import { use } from "react";

import StageRunDetailPage from "@/components/production-stages/StageRunDetailPage";
import { RCB_MODULE } from "@/components/production-stages/stage-modules";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <StageRunDetailPage config={RCB_MODULE} runId={id} />;
}
