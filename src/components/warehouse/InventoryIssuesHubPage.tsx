"use client";

import {
  ExperimentOutlined,
  ExportOutlined,
  ToolOutlined,
} from "@ant-design/icons";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function InventoryIssuesHubPage() {
  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · ISSUES"
      title="เบิกจ่ายสินค้า"
      subtitle="เลือกประเภทใบเบิกที่ต้องการทำรายการ"
      icon={<ExportOutlined />}
      cards={[
        {
          key: "material-issues",
          title: "เบิกของออกจากคลัง",
          description: "ใบเบิกวัสดุ/สินค้าทั่วไปออกจากคลัง",
          href: "/inventory/material-issues",
          icon: <ExportOutlined />,
          screenCodes: ["MATERIAL_ISSUES"],
          // registry row "inventory-issues" query หน้านี้ (getStockIssues)
          badgeMenuKeys: ["inventory-issues"],
        },
        {
          key: "chemical-issues",
          title: "เบิกจ่ายสารเคมี",
          description: "ใบเบิกสารเคมีพร้อมบันทึกวัตถุประสงค์การใช้",
          href: "/inventory/chemical-issues",
          icon: <ExperimentOutlined />,
          screenCodes: ["CHEMICAL_ISSUES"],
          badgeMenuKeys: ["chemical-issues"],
        },
        {
          key: "tire-prep-issues",
          title: "เบิกยางเข้ากระบวนการเตรียมยาง",
          description: "ใบเบิกยางจากคลังเข้าสายเตรียมยางก่อนผลิต",
          icon: <ToolOutlined />,
          screenCodes: ["TIRE_PREP_ISSUES"],
          disabled: true,
          disabledHint: "อยู่ระหว่างพัฒนา",
        },
      ]}
    />
  );
}
