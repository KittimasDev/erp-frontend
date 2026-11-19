"use client";

import { Alert } from "antd";

import { money } from "@/components/ap-documents/apDocumentConfig";
import { useDepositStatusQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";

/**
 * เตือนเมื่อ SO เงื่อนไข "ชำระล่วงหน้า/มัดจำ" ยังรับมัดจำไม่ครบ — เตือนอย่างเดียว ไม่บล็อกการจ่าย/ส่งของ
 * ผู้ใช้ที่ไม่มีสิทธิ์ดูสถานะ (403) หรือ SO ที่ไม่ต้องมัดจำ จะไม่เห็นอะไร
 */
export default function SalesOrderDepositAlert({ salesOrderId }: { salesOrderId: string }) {
  const t = useT();
  const query = useDepositStatusQuery(salesOrderId);
  const d = query.data;
  if (!d || (d.status !== "PENDING" && d.status !== "PARTIAL")) return null;
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
      message={
        d.status === "PENDING"
          ? t("ใบสั่งขายนี้ต้องรับมัดจำ {pct}% ({amount} บาท) — ยังไม่ได้รับมัดจำ", {
              pct: d.requiredPercent,
              amount: money.format(Number(d.requiredAmount)),
            })
          : t("รับมัดจำแล้ว {got} จากที่ต้องรับ {need} บาท ({pct}%) — ยังไม่ครบ", {
              got: money.format(Number(d.receivedAmount)),
              need: money.format(Number(d.requiredAmount)),
              pct: d.requiredPercent,
            })
      }
      description={t("เป็นการเตือนเท่านั้น ไม่บล็อกการจัดส่ง")}
    />
  );
}
