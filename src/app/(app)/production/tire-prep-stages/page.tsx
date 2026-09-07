"use client";

import StageRunsListPage from "@/components/production-stages/StageRunsListPage";
import { TIRE_PREP_MODULE } from "@/components/production-stages/stage-modules";

export default function Page() {
  return <StageRunsListPage config={TIRE_PREP_MODULE} />;
}
