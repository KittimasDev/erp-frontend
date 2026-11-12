"use client";

import Link from "next/link";
import { Tag, Typography } from "antd";

import StatusTag from "@/components/common/StatusTag";
import { AP_DOCUMENT_CONFIG } from "@/components/ap-documents/apDocumentConfig";
import { useT } from "@/lib/i18n/useT";
import { STANDARD_STATUS, type StandardStatus } from "@/lib/status/standard-status";
import { ADVANCE_STATUS_LABEL } from "@/types/advance-payment-requests";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import { tStatus } from "@/types/purchase-orders";
import type {
  PurchaseOrderRelatedDocumentRef,
  PurchaseOrderRelatedDocuments,
} from "@/types/purchase-orders";

/** สถานะที่ตรงกับมาตรฐานใช้ป้ายมาตรฐาน ที่เหลือ (เช่น CONFIRMED, PAID) แสดงชื่อเดิมของเอกสารนั้น */
function DocStatus({ status }: { status: string }) {
  if (status in STANDARD_STATUS) return <StatusTag status={status as StandardStatus} />;
  return (
    <Tag>
      {tStatus(
        GOODS_RECEIPT_STATUS_LABEL[status] ?? ADVANCE_STATUS_LABEL[status] ?? status,
      )}
    </Tag>
  );
}

type GroupProps = {
  title: string;
  rows: PurchaseOrderRelatedDocumentRef[];
  hrefOf: (row: PurchaseOrderRelatedDocumentRef) => string;
  /** เปิดลิงก์ในแท็บใหม่ — ใช้ใน Dialog เพื่อไม่ทิ้งฟอร์มยกเลิกที่กำลังกรอก */
  newTab?: boolean;
};

function Group({ title, rows, hrefOf, newTab }: GroupProps) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <Typography.Text strong>{title}</Typography.Text>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={hrefOf(row)}
              {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {row.docNo}
            </Link>{" "}
            <DocStatus status={row.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  related: PurchaseOrderRelatedDocuments;
  newTab?: boolean;
};

/** รายการเอกสารที่ผูกกับ PO (ใบรับของ / ใบตั้งหนี้ / ใบสำคัญจ่าย) พร้อมลิงก์เปิดแต่ละใบ */
export default function PurchaseOrderRelatedDocumentList({ related, newTab }: Props) {
  const t = useT();
  const total =
    related.goodsReceipts.length +
    related.apInvoices.length +
    related.paymentVouchers.length +
    related.advanceRequests.length +
    related.depositVouchers.length;
  if (total === 0) {
    return <Typography.Text type="secondary">{t("ไม่มีเอกสารที่เกี่ยวข้อง")}</Typography.Text>;
  }
  return (
    <div>
      <Group
        title={t("ใบรับของ (GRN)")}
        rows={related.goodsReceipts}
        hrefOf={(r) => `/goods-receipts/${r.id}`}
        newTab={newTab}
      />
      <Group
        title={t("ใบตั้งหนี้ (AP)")}
        rows={related.apInvoices}
        hrefOf={(r) => `${AP_DOCUMENT_CONFIG.invoice.basePath}/${r.id}`}
        newTab={newTab}
      />
      <Group
        title={t("รายการขอจ่ายล่วงหน้า/มัดจำ (APR)")}
        rows={related.advanceRequests}
        hrefOf={(r) => `/finance/payables/advance-requests/${r.id}`}
        newTab={newTab}
      />
      <Group
        title={t("ใบสำคัญจ่ายมัดจำ (PV)")}
        rows={related.depositVouchers}
        hrefOf={(r) => `/finance/payables/payment-vouchers/${r.id}`}
        newTab={newTab}
      />
      <Group
        title={t("ใบสำคัญจ่าย (PV)")}
        rows={related.paymentVouchers}
        hrefOf={(r) => `/finance/payables/payment-vouchers/${r.id}`}
        newTab={newTab}
      />
    </div>
  );
}
