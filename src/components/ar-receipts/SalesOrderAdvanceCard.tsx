"use client";

import Link from "next/link";
import { Tag } from "antd";
import dayjs from "dayjs";

import { money } from "@/components/ap-documents/apDocumentConfig";
import { useAdvanceReceiptsQuery } from "@/hooks/advance-receipts/useAdvanceReceipts";
import { useDepositStatusQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { advanceReceiptRoutes } from "@/lib/sales/ar-routes";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
} from "@/types/advance-receipts";

/**
 * แสดงเงินล่วงหน้า/มัดจำของ SO ทันทีหลังรับเงิน — ไม่ต้องรอส่งของหรือตั้งหนี้
 * แยกจาก Customer Credit (เครดิตลูกค้าทั่วไป)
 */
export default function SalesOrderAdvanceCard({
  salesOrderId,
}: {
  salesOrderId: string;
}) {
  const t = useT();
  const deposit = useDepositStatusQuery(salesOrderId);
  const list = useAdvanceReceiptsQuery({
    salesOrderId,
    page: 1,
    limit: 50,
  });
  const d = deposit.data;
  const items = list.data?.data.items ?? [];
  if (!d && items.length === 0) return null;
  if (items.length === 0 && !(Number(d?.receivedAmount ?? 0) > 0)) return null;

  const active = items.filter((row) => row.status !== "CANCELLED");
  const received = active.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const applied = active.reduce((sum, row) => sum + Number(row.appliedAmount || 0), 0);
  const remaining = active.reduce(
    (sum, row) => sum + Number(row.remainingAmount || 0),
    0,
  );

  return (
    <div
      style={{
        background: "var(--ant-color-bg-container, #fff)",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{t("เงินล่วงหน้า / มัดจำ")}</strong>
        <span style={{ color: "#8a9199", fontSize: 13 }}>
          {t("แยกจากเครดิตลูกค้าทั่วไป")}
        </span>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <span>
          {t("รับแล้ว")}: <strong>{money.format(received)}</strong>
        </span>
        <span>
          {t("ใช้ไปแล้ว")}: <strong>{money.format(applied)}</strong>
        </span>
        <span>
          {t("คงเหลือ")}: <strong>{money.format(remaining)}</strong>
        </span>
      </div>
      {items.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((row) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <Link href={advanceReceiptRoutes.detail(row.id)}>{row.docNo}</Link>
              <span>{dayjs(row.receiptDate).format("DD/MM/BBBB")}</span>
              <Tag color={ADVANCE_STATUS_COLOR[row.status] ?? "default"}>
                {t(ADVANCE_STATUS_LABEL[row.status] ?? row.status)}
              </Tag>
              <span>
                {t("ยอด")} {money.format(Number(row.totalAmount))}
              </span>
              <span>
                {t("คงเหลือ")} {money.format(Number(row.remainingAmount))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
