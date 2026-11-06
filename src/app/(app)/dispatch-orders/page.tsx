"use client";

import Link from "next/link";
import { Alert, Button } from "antd";
import { useT } from "@/lib/i18n/useT";

export default function Page() {
  const t = useT();
  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Alert
        type="warning"
        showIcon
        title={t("ใบจ่ายสินค้าแบบเดิม (Dispatch Order) เลิกใช้แล้ว")}
        description={t("ระบบเปลี่ยนเป็นเอกสารแยก: ตรวจสอบสต๊อก → ใบจ่ายสินค้า → ใบบรรจุ → ใบส่งสินค้า ข้อมูล Dispatch Order เก่ายังอยู่ในฐานข้อมูลสำหรับอ้างอิง แต่ไม่สร้างใหม่จากหน้านี้")}
      />
      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/sales-orders/stock-verification">
          <Button type="primary">{t("ไปตรวจสอบสต๊อกขาย")}</Button>
        </Link>
        <Link href="/pickings">
          <Button>{t("ไปใบจ่ายสินค้า")}</Button>
        </Link>
        <Link href="/packings">
          <Button>{t("ไปใบบรรจุสินค้า")}</Button>
        </Link>
        <Link href="/delivery-orders">
          <Button>{t("ไปใบส่งสินค้า")}</Button>
        </Link>
      </div>
    </div>
  );
}
