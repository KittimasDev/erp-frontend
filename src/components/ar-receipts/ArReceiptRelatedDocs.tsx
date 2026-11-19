"use client";

import Link from "next/link";
import { Descriptions, Typography } from "antd";

import { useT } from "@/lib/i18n/useT";
import { arBillingRoutes, arRoutes } from "@/lib/sales/ar-routes";
import type { ArReceipt, ArReceiptRef } from "@/types/ar-receipts";

/** เส้นทางหน้ารายละเอียดของเอกสารต้นทางฝั่งขาย */
const soHref = (id: string) => `/sales-orders/${id}`;
const dnHref = (id: string) => `/delivery-orders/${id}`;
const quotationHref = (id: string) => `/quotations/${id}`;

type DocGroup = {
  key: string;
  label: string;
  refs: ArReceiptRef[];
  href: (id: string) => string;
};

/** กลุ่มเอกสารที่เกี่ยวข้องของใบรับชำระ เรียงตามลำดับ flow: ใบเสนอราคา → SO → DN → AR → ใบวางบิล */
function buildGroups(r: ArReceipt, t: (k: string) => string): DocGroup[] {
  return [
    { key: "qt", label: t("ใบเสนอราคา"), refs: r.quotations ?? [], href: quotationHref },
    { key: "so", label: t("ใบสั่งขาย (SO)"), refs: r.salesOrders ?? [], href: soHref },
    { key: "dn", label: t("ใบส่งสินค้า (DN)"), refs: r.deliveryOrders ?? [], href: dnHref },
    { key: "ar", label: t("ใบตั้งลูกหนี้ (AR)"), refs: r.invoices ?? [], href: arRoutes.detail },
    { key: "bl", label: t("ใบวางบิล"), refs: r.billingNotes ?? [], href: arBillingRoutes.detail },
  ];
}

function RefLinks({ refs, href }: { refs: ArReceiptRef[]; href: (id: string) => string }) {
  if (refs.length === 0) return <>—</>;
  return (
    <>
      {refs.map((ref, i) => (
        <span key={ref.id}>
          {i > 0 ? ", " : null}
          <Link href={href(ref.id)} onClick={(e) => e.stopPropagation()}>
            {ref.no}
          </Link>
        </span>
      ))}
    </>
  );
}

/** หน้ารายการ: เอกสารที่เกี่ยวข้องแบบย่อ (SO / DN / AR / ใบวางบิล) — แสดงเฉพาะกลุ่มที่มี */
export function ArReceiptRelatedDocsInline({ receipt }: { receipt: ArReceipt }) {
  const t = useT();
  const groups = buildGroups(receipt, t).filter((g) => g.key !== "qt" && g.refs.length > 0);
  if (groups.length === 0) return <>—</>;
  return (
    <div style={{ display: "grid", gap: 2, fontSize: 13 }}>
      {groups.map((g) => (
        <div key={g.key}>
          <Typography.Text type="secondary">{g.label.replace(/\s*\(.*\)$/, "")}: </Typography.Text>
          <RefLinks refs={g.refs} href={g.href} />
        </div>
      ))}
    </div>
  );
}

/** หน้ารายละเอียด: การ์ดเอกสารที่เกี่ยวข้องทั้งหมด พร้อมลิงก์ไปหน้าเอกสารนั้น */
export function ArReceiptRelatedDocsCard({ receipt }: { receipt: ArReceipt }) {
  const t = useT();
  const groups = buildGroups(receipt, t);
  return (
    <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>{t("เอกสารที่เกี่ยวข้อง")}</h3>
      <Descriptions
        column={{ xs: 1, md: 2, xl: 3 }}
        size="small"
        items={groups.map((g) => ({
          key: g.key,
          label: g.label,
          children: <RefLinks refs={g.refs} href={g.href} />,
        }))}
      />
    </div>
  );
}
