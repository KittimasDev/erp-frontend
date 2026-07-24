"use client";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function StockInquiryHubPage() {
  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · STOCK INQUIRY"
      title="ตรวจสอบสต๊อก"
      subtitle="ดูยอดคงเหลือ แยกตาม Lot และประวัติการเคลื่อนไหวสต๊อก"
      cards={[
        {
          key: "balances",
          title: "ยอดคงเหลือ",
          description: "ยอดสินค้าคงเหลือตามคลังและตำแหน่งจัดเก็บ",
          href: "/inventory/stock-balances",
        },
        {
          key: "lots",
          title: "ยอดคงเหลือแยก Lot",
          description: "ติดตามยอดคงเหลือแยกตาม Lot / เอกสารต้นทาง",
          href: "/inventory/lots",
        },
        {
          key: "movements",
          title: "ประวัติสต๊อก",
          description: "ประวัติการรับเข้า เบิกออก โอนย้าย และปรับปรุง",
          href: "/inventory/stock-movements",
        },
      ]}
    />
  );
}
