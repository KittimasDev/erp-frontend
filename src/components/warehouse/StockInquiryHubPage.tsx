"use client";

import { useSearchParams } from "next/navigation";
import {
  BarChartOutlined,
  HistoryOutlined,
  TagsOutlined,
} from "@ant-design/icons";

import { isFgInventoryScope } from "@/components/inventory/inventory-page-copy";
import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";

export default function StockInquiryHubPage() {
  const searchParams = useSearchParams();
  /*
    เมนู "ตรวจสอบสต๊อก FG" ชี้มาที่ hub เดียวกันพร้อม `?isFinishedGood=true`
    ต้องส่ง scope ต่อไปให้การ์ดทุกใบ ไม่งั้นกดจาก FG แล้วไปโผล่หน้า RM
  */
  const isFg = isFgInventoryScope(searchParams);
  const scopeQuery = isFg ? "?isFinishedGood=true" : "";

  return (
    <WarehouseHubPage
      eyebrow={
        isFg ? "WAREHOUSE · FG STOCK INQUIRY" : "WAREHOUSE · STOCK INQUIRY"
      }
      title={isFg ? "ตรวจสอบสต๊อกสินค้าสำเร็จรูป" : "ตรวจสอบสต๊อก"}
      subtitle="ดูยอดคงเหลือ แยกตาม Lot และประวัติการเคลื่อนไหวสต๊อก"
      cards={[
        {
          key: "balances",
          title: "ยอดคงเหลือ",
          description: "ยอดสินค้าคงเหลือตามคลังและตำแหน่งจัดเก็บ",
          href: `/inventory/stock-balances${scopeQuery}`,
          icon: <BarChartOutlined />,
          screenCodes: [isFg ? "FG_STOCK_BALANCES" : "STOCK_BALANCES"],
        },
        {
          key: "lots",
          title: "ยอดคงเหลือแยก Lot",
          description: "ติดตามยอดคงเหลือแยกตาม Lot / เอกสารต้นทาง",
          href: `/inventory/lots${scopeQuery}`,
          icon: <TagsOutlined />,
          screenCodes: [isFg ? "FG_INVENTORY_LOTS" : "INVENTORY_LOTS"],
        },
        {
          key: "movements",
          title: "ประวัติสต๊อก",
          description: "ประวัติการรับเข้า เบิกออก โอนย้าย และปรับปรุง",
          href: `/inventory/stock-movements${scopeQuery}`,
          icon: <HistoryOutlined />,
          screenCodes: [isFg ? "FG_STOCK_MOVEMENTS" : "STOCK_MOVEMENTS"],
        },
      ]}
    />
  );
}
