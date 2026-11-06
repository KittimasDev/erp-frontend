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
};
