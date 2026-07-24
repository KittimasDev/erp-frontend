"use client";

import ProductionOutputApprovalsPage from "@/components/production-output/ProductionOutputApprovalsPage";
import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";

export default function ProductionOutputApprovalsRoutePage() {
  return (
    <ProductionOutputFeatureGate>
      <ProductionOutputApprovalsPage />
    </ProductionOutputFeatureGate>
  );
}
