"use client";

import SalesTaxReportPage from "@/components/reports/SalesTaxReportPage";

/**
 * เมนูการเงิน › รายงานภาษีขาย — ดึงจากใบกำกับภาษีจริง (ไม่ใช่สมุดรายวันขาย)
 * สิทธิ์: FINANCE_REPORT_SALES_TAX
 */
export default function Page() {
  return <SalesTaxReportPage />;
}
