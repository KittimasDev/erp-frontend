"use client";

import { Alert, Tag } from "antd";

import { money } from "@/components/ap-documents/apDocumentConfig";
import { useSalesOrderFinanceQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { SO_FINANCIAL_STATUS_COLOR, SO_FINANCIAL_STATUS_LABEL } from "@/types/ar-receipts";

/**
 * สถานะการเงินของใบสั่งขาย (ตั้งหนี้/รับชำระ/ค้าง) + สถานะปิด SO
 * SO ปิดเองอัตโนมัติ (COMPLETED) เมื่อส่งครบ · ตั้งหนี้ครบ · รับชำระครบ · ไม่มีเอกสารค้าง และเปิดกลับเมื่อมีอะไรค้างอีก
 * แสดงเมื่อส่งครบแล้ว หรือมีการตั้งหนี้แล้วเท่านั้น · ผู้ใช้ที่ไม่มีสิทธิ์ดูการเงินจะไม่เห็น
 */
export default function SalesOrderFinanceCard({ salesOrderId }: { salesOrderId: string }) {
  const t = useT();
  const query = useSalesOrderFinanceQuery(salesOrderId);
  const d = query.data;
  if (!d) return null;
  const delivered = d.status === "DELIVERED" || d.status === "COMPLETED";
  const hasDeposit = Number(d.depositReceived ?? 0) > 0;
  // แสดงเมื่อส่งครบ / มีตั้งหนี้ / หรือมีมัดจำแล้ว (ไม่ต้องรอส่งของ)
  if (!delivered && d.financialStatus === "NOT_BILLED" && !hasDeposit) return null;

  return (
    <div
      style={{
        background: "var(--ant-color-bg-container, #fff)",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{t("สถานะการเงิน")}</strong>
        <Tag color={SO_FINANCIAL_STATUS_COLOR[d.financialStatus] ?? "default"}>
          {t(SO_FINANCIAL_STATUS_LABEL[d.financialStatus] ?? d.financialStatus)}
        </Tag>
        {d.status === "COMPLETED" ? <Tag color="green">{t("ปิดใบสั่งขายแล้ว")}</Tag> : null}
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <span>{t("ตั้งหนี้แล้ว")}: <strong>{money.format(Number(d.billedAmount))}</strong></span>
        <span>{t("รับชำระแล้ว")}: <strong>{money.format(Number(d.paidAmount))}</strong></span>
        <span>{t("ค้างชำระ")}: <strong>{money.format(Number(d.outstandingAmount))}</strong></span>
        {Number(d.depositReceived) > 0 ? (
          <span>{t("มัดจำที่รับ")}: <strong>{money.format(Number(d.depositReceived))}</strong></span>
        ) : null}
      </div>
      {d.status === "DELIVERED" && d.blockers.length > 0 ? (
        <Alert
          type="info"
          showIcon
          title={t("ยังปิดใบสั่งขายไม่ได้ เพราะ:")}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {d.blockers.map((b) => (
                <li key={b}>{t(b)}</li>
              ))}
            </ul>
          }
        />
      ) : null}
    </div>
  );
}
