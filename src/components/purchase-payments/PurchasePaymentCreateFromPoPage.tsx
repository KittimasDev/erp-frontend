"use client";

import Link from "next/link";
import { Alert, Button, Card, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import styles from "./PurchasePaymentFormPage.module.css";

type Props = { purchaseOrderId: string };

/**
 * Flow จ่ายจาก PO เดิมปิดแล้ว — ชี้ไปเมนูการเงิน
 * คง route ไว้เพื่อไม่ให้ลิงก์เก่าพัง
 */
export default function PurchasePaymentCreateFromPoPage({
  purchaseOrderId,
}: Props) {
  return (
    <div className={styles.page}>
      <Card>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            title="การบันทึกจ่ายเงินจากใบสั่งซื้อโดยตรงปิดใช้งานแล้ว"
            description="กรุณาใช้เมนูการเงิน: สร้าง/อนุมัติใบสำคัญจ่าย แล้วบันทึกจ่ายเงินจริงที่หน้าบันทึกจ่ายเงิน ประวัติเดิมยังดูได้ที่รายการใบสำคัญจ่าย"
          />
          <Space wrap>
            <Link href={`/purchase-orders/${purchaseOrderId}`}>
              <Button icon={<ArrowLeftOutlined />}>กลับใบสั่งซื้อ</Button>
            </Link>
            <Link href="/finance/payables/payment-vouchers">
              <Button type="primary">ไปใบสำคัญจ่าย</Button>
            </Link>
            <Link href="/finance/payables/payment-records">
              <Button>ไปบันทึกจ่ายเงิน</Button>
            </Link>
            <Link href="/purchase-payments">
              <Button>ดูประวัติใบสำคัญจ่าย</Button>
            </Link>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
