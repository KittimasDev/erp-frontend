"use client";

import ArJournalPage from "@/components/reports/ArJournalPage";

/**
 * เมนูการเงิน › รายงานภาษีขาย — ใช้สมุดรายวันขายชุดเดียวกับ /reports/journals/sales
 * รายละเอียดรายการยังอยู่ที่ /reports/journals/sales/[id] (basePath ค่าเริ่มต้น)
 */
export default function Page() {
  return <ArJournalPage kind="SALES" screen="FINANCE_REPORT_SALES_TAX" />;
}
