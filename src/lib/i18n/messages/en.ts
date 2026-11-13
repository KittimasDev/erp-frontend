import { EN_COMMON_UI } from "./modules/common-ui";
import { EN_CORE } from "./modules/core";
import { EN_PURCHASE_REQUESTS } from "./modules/purchase-requests";
import { EN_PURCHASING } from "./modules/purchasing";
import { EN_RECEIVING_DETAIL } from "./modules/receiving-detail";
import { EN_RECEIVING_OTHER } from "./modules/receiving-other";
import { EN_SALES_ORDERS } from "./modules/sales-orders";
import { EN_SALES_DOCS } from "./modules/sales-docs";
import { EN_SALES_FULFILLMENT } from "./modules/sales-fulfillment";
import { EN_INVENTORY_CORE } from "./modules/inventory-core";
import { EN_INVENTORY_STOCK } from "./modules/inventory-stock";
import { EN_PRODUCTION_ORDERS } from "./modules/production-orders";
import { EN_PRODUCTION_PLANNING } from "./modules/production-planning";
import { EN_PRODUCTION_CONVERSION } from "./modules/production-conversion";
import { EN_PRODUCTION_CYCLES } from "./modules/production-cycles";
import { EN_PRODUCTION_OUTPUT } from "./modules/production-output";
import { EN_FINANCE_AP_DOCS } from "./modules/finance-ap-docs";
import { EN_FINANCE_VOUCHERS } from "./modules/finance-vouchers";
import { EN_FINANCE_PAYABLES } from "./modules/finance-payables";
import { EN_MASTERS_ITEMS } from "./modules/masters-items";
import { EN_MASTERS_PARTIES } from "./modules/masters-parties";
import { EN_MASTERS_PRODUCTION } from "./modules/masters-production";
import { EN_MASTERS_ADMIN } from "./modules/masters-admin";
import { EN_MASTERS_NTFY } from "./modules/masters-ntfy";
import { EN_HRM_SHIFTS } from "./modules/hrm-shifts";
import { EN_HRM_TIME } from "./modules/hrm-time";
import { EN_HRM_PAYROLL } from "./modules/hrm-payroll";
import { EN_REPORTS } from "./modules/reports";
import { EN_DASHBOARDS } from "./modules/dashboards";
import { EN_ESIGN } from "./modules/esign";
import { EN_LAB } from "./modules/lab";
import { EN_MAINTENANCE } from "./modules/maintenance";
import { EN_MISC } from "./modules/misc";
import { EN_USERS } from "./modules/users";

/**
 * ข้อความภาษาอังกฤษทั้งหมด — คีย์คือข้อความไทยตามที่เขียนในโค้ด (ดู `../translate.ts`)
 * ไม่มีคีย์ = แสดงไทยตามเดิม จึงทยอยเพิ่มได้ทีละหน้า
 *
 * แยกไฟล์ตามโมดูลใน `./modules/` (ไฟล์ใหม่ต้องเพิ่มบรรทัด spread ด้านล่าง) · คีย์ซ้ำข้ามไฟล์ = ไฟล์ท้ายสุดชนะ
 * ตรวจคีย์ขาด/ซ้ำด้วย `npm run i18n:check`
 */
export const EN_MESSAGES: Record<string, string> = {
  ...EN_CORE,
  ...EN_COMMON_UI,
  ...EN_PURCHASE_REQUESTS,
  ...EN_PURCHASING,
  ...EN_RECEIVING_DETAIL,
  ...EN_RECEIVING_OTHER,
  ...EN_SALES_ORDERS,
  ...EN_SALES_DOCS,
  ...EN_SALES_FULFILLMENT,
  ...EN_INVENTORY_CORE,
  ...EN_INVENTORY_STOCK,
  ...EN_PRODUCTION_ORDERS,
  ...EN_PRODUCTION_PLANNING,
  ...EN_PRODUCTION_CONVERSION,
  ...EN_PRODUCTION_CYCLES,
  ...EN_PRODUCTION_OUTPUT,
  ...EN_FINANCE_AP_DOCS,
  ...EN_FINANCE_VOUCHERS,
  ...EN_FINANCE_PAYABLES,
  ...EN_MASTERS_ITEMS,
  ...EN_MASTERS_PARTIES,
  ...EN_MASTERS_PRODUCTION,
  ...EN_MASTERS_ADMIN,
  ...EN_MASTERS_NTFY,
  ...EN_HRM_SHIFTS,
  ...EN_HRM_TIME,
  ...EN_HRM_PAYROLL,
  ...EN_REPORTS,
  ...EN_DASHBOARDS,
  ...EN_ESIGN,
  ...EN_LAB,
  ...EN_MAINTENANCE,
  ...EN_MISC,
  ...EN_USERS,
};
