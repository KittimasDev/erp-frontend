"use client";

import StageRunCreatePage from "@/components/production-stages/StageRunCreatePage";
import { TIRE_PREP_MODULE } from "@/components/production-stages/stage-modules";

export default function Page() {
  return <StageRunCreatePage config={TIRE_PREP_MODULE} />;
}
