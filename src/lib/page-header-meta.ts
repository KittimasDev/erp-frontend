import type { PortalModuleKey } from "@/lib/auth/portal-module";

/**
 * ข้อความป้ายเล็ก (eyebrow) เหนือชื่อหน้า — สร้างอัตโนมัติจากโมดูลของเมนูที่หน้านั้นสังกัด
 * หน้าที่ต้องการป้ายเฉพาะ (เช่น "Reports · Raw Tire Purchase") ส่ง `eyebrow` ให้ PageHeader เองได้
 */
export const PAGE_HEADER_EYEBROW: Record<PortalModuleKey, string> = {
  dashboard: "Dashboard",
  "raw-tire": "Raw Tire Receiving",
  purchase: "Procurement",
  "rm-warehouse": "Raw Material Warehouse",
  production: "Production",
  "fg-warehouse": "Finished Goods Warehouse",
  sales: "Sales & Delivery",
  laboratory: "Laboratory",
  "oil-tank-farm": "Oil Tank Farm",
  maintenance: "Maintenance",
  hrm: "Human Resources",
  finance: "Finance",
  reports: "Reports",
  master: "Master Data",
};
