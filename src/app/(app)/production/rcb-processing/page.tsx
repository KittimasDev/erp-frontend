"use client";

import StageRunsListPage from "@/components/production-stages/StageRunsListPage";
import { RCB_MODULE } from "@/components/production-stages/stage-modules";

export default function Page() {
  return <StageRunsListPage config={RCB_MODULE} />;
}
