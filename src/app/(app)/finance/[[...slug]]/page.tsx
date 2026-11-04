"use client";

import { use } from "react";
import PageHeader from "@/components/common/PageHeader";

const FINANCE_PAGE_TITLES: Record<string, string> = {
  "": "การเงิน",
  dashboard: "ภาพรวมการเงิน",
  payables: "การจ่ายเงิน",
  "payables/creditors": "รายการจ่ายเงิน",
  "payables/adjustment-documents": "เอกสารปรับหนี้",
  "payables/ap-invoices": "ใบตั้งหนี้เจ้าหนี้",
  "payables/debit-notes": "ใบเพิ่มหนี้",
  "payables/credit-notes": "ใบลดหนี้",
  "payables/billing-and-vouchers": "วางบิลและใบสำคัญจ่าย",
  "payables/billing-notes": "ใบวางบิล",
  "payables/payment-vouchers": "ใบสำคัญจ่าย",
  "payables/payment-records": "บันทึกจ่ายเงิน",
  "payables/payment-history": "ประวัติการจ่ายเงิน",
  receivables: "การรับเงิน",
  "receivables/customers": "รายการรับเงิน",
  "receivables/sales-tax-documents": "เอกสารขายและภาษี",
  "receivables/ar-invoices": "ใบตั้งลูกหนี้",
  "receivables/tax-invoices": "ใบกำกับภาษี",
  "receivables/adjustment-documents": "เอกสารปรับหนี้",
  "receivables/debit-notes": "ใบเพิ่มหนี้",
  "receivables/collections-and-receipts": "รับชำระและใบเสร็จ",
  "receivables/payment-receipts": "รับชำระเงิน",
  "receivables/receipts": "ใบเสร็จรับเงิน",
  "receivables/refunds": "คืนเงิน",
  "receivables/payment-history": "ประวัติการรับชำระ",
  reports: "รายงานการเงิน",
  "reports/payables": "รายงานเจ้าหนี้",
  "reports/receivables": "รายงานลูกหนี้",
  "reports/payments": "รายงานการจ่ายเงิน",
  "reports/collections": "รายงานการรับเงิน",
  "reports/debit-credit-notes": "รายงานใบเพิ่มหนี้ / ใบลดหนี้",
  "reports/sales-tax": "รายงานภาษีขาย",
};

export default function FinanceSectionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = use(params);
  const title = FINANCE_PAGE_TITLES[slug.join("/")] ?? "การเงิน";

  return (
    <section>
      <PageHeader title={title} subtitle="ยังไม่มีรายการ" />
    </section>
  );
}
