"use client";

import StageRunCreatePage from "@/components/production-stages/StageRunCreatePage";
import { RCB_MODULE } from "@/components/production-stages/stage-modules";

export default function Page() {
  return <StageRunCreatePage config={RCB_MODULE} />;
}
