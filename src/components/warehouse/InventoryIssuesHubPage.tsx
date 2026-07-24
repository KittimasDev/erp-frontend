"use client";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function InventoryIssuesHubPage() {
  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · ISSUES"
      title="เบิกจ่ายสินค้า"
      subtitle="เลือกประเภทใบเบิกที่ต้องการทำรายการ"
      cards={[
        {
          key: "material-issues",
          title: "เบิกของออกจากคลัง",
          description: "ใบเบิกวัสดุ/สินค้าทั่วไปออกจากคลัง",
          href: "/inventory/material-issues",
        },
        {
          key: "chemical-issues",
          title: "เบิกจ่ายสารเคมี",
          description: "ใบเบิกสารเคมีพร้อมบันทึกวัตถุประสงค์การใช้",
          href: "/inventory/chemical-issues",
        },
      ]}
    />
  );
}
