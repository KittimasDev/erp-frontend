"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

/** @deprecated ย้ายไป /receiving/pending-production-output */
export default function ProductionOutputPendingTicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      PRODUCTION_OUTPUT_ENABLED
        ? "/receiving/pending-production-output"
        : "/receiving",
    );
  }, [router]);

  return <PageLoading />;
}
