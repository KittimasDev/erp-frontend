import { permanentRedirect } from "next/navigation";

/** ย้ายไปโมดูลการผลิตแล้ว — คงเส้นทางเดิมไว้กัน bookmark / ลิงก์เก่าพัง */
export default function LegacyReceivingProductionOutputStockRequestsPage() {
  permanentRedirect("/production/output-stock-requests");
}
