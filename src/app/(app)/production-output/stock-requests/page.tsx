"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

/** @deprecated ย้ายไป /receiving/production-output/stock-requests */
export default function ProductionOutputStockRequestsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      PRODUCTION_OUTPUT_ENABLED
        ? "/receiving/production-output/stock-requests"
        : "/receiving",
    );
  }, [router]);

  return <PageLoading />;
}
