"use client";

import { AuditOutlined, EditOutlined } from "@ant-design/icons";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function StockControlHubPage() {
  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · STOCK CONTROL"
      title="นับและปรับปรุงสต๊อก"
      subtitle="งานนับสต๊อกและปรับปรุงยอดให้ตรงกับของจริง"
      icon={<AuditOutlined />}
      cards={[
        {
          key: "stock-counts",
          title: "นับสต๊อก",
          description: "สร้างและติดตามเอกสารนับสต๊อก (Stock Count)",
          href: "/inventory/stock-counts",
          icon: <AuditOutlined />,
          screenCodes: ["STOCK_COUNTS"],
        },
        {
          key: "stock-adjustment",
          title: "ปรับปรุงสต๊อก",
          description: "เอกสารปรับยอดสต๊อก (Stock Adjustment)",
          href: "/inventory/stock-adjustments",
          icon: <EditOutlined />,
          screenCodes: ["STOCK_ADJUSTMENTS"],
          // badge ของเมนูนี้รวมทั้งใบปรับปรุงและใบตรวจนับ
          badgeMenuKeys: ["rm-stock-control"],
        },
      ]}
    />
  );
}
