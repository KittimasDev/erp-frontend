"use client";

import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";
import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";
import type { WarehouseHubCard } from "@/components/warehouse/WarehouseHubPage";

export default function WarehouseApprovalsHubPage() {
  const cards: WarehouseHubCard[] = [
    {
      key: "stock-posting-approvals",
      title: "อนุมัติรับสินค้าเข้าคลัง",
      description: "อนุมัติคำขอรับเข้าคลังจากใบรับซื้อยาง (Stock Posting)",
      href: "/warehouse/stock-posting-approvals",
    },
  ];

  if (PRODUCTION_OUTPUT_ENABLED) {
    cards.push({
      key: "production-output-approvals",
      title: "อนุมัติรับผลผลิตเข้าคลัง",
      description: "อนุมัติคำขอรับผลผลิตเข้าคลังจากกระบวนการผลิต",
      href: "/warehouse/production-output-approvals",
    });
  }

  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · APPROVALS"
      title="อนุมัติงานคลัง"
      subtitle="รวมหน้ารออนุมัติของงานคลังไว้ที่เดียว"
      cards={cards}
    />
  );
}
