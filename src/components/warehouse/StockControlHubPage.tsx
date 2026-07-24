"use client";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function StockControlHubPage() {
  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · STOCK CONTROL"
      title="นับและปรับปรุงสต๊อก"
      subtitle="งานนับสต๊อกและปรับปรุงยอดให้ตรงกับของจริง"
      cards={[
        {
          key: "stock-counts",
          title: "นับสต๊อก",
          description: "สร้างและติดตามเอกสารนับสต๊อก (Stock Count)",
          href: "/inventory/stock-counts",
        },
        {
          key: "stock-adjustment",
          title: "ปรับปรุงสต๊อก",
          description: "เอกสารปรับยอดสต๊อก (Stock Adjustment)",
          href: "/inventory/stock-adjustments",
        },
      ]}
    />
  );
}
