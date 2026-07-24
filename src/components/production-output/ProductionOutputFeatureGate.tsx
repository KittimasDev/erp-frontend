"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

type Props = {
  children: ReactNode;
};

/** Redirect กลับ /receiving เมื่อปิด feature แปลงรูป/รับผลผลิต */
export default function ProductionOutputFeatureGate({ children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!PRODUCTION_OUTPUT_ENABLED) {
      router.replace("/receiving");
    }
  }, [router]);

  if (!PRODUCTION_OUTPUT_ENABLED) {
    return null;
  }

  return children;
}
