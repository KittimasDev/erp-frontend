import type { ScreenActionPermissions } from "@/lib/auth/permissions-access";

export type SalesFulfillmentNavPermissions = {
  stockVerification: ScreenActionPermissions;
  picking: ScreenActionPermissions;
  packing: ScreenActionPermissions;
  delivery: ScreenActionPermissions;
  salesOrder: ScreenActionPermissions;
  quotation?: ScreenActionPermissions;
};

/** เปิดหน้ารายละเอียดใบสั่งขายได้เมื่อทำงานใน flow ขาย/คลัง (ไม่ต้องมี SALES_ORDERS แยก) */
export function canAccessSalesOrderDetail(
  perms: Pick<
    SalesFulfillmentNavPermissions,
    "salesOrder" | "stockVerification" | "picking" | "packing" | "delivery"
  >,
): boolean {
  return (
    perms.salesOrder.canView ||
    perms.stockVerification.canView ||
    perms.picking.canView ||
    perms.packing.canView ||
    perms.delivery.canView
  );
}

/** เปิดหน้าตรวจสต๊อกได้เมื่อมีสิทธิ์ดูผลตรวจ หรือมีสิทธิ์สร้างใบจ่าย */
export function canOpenStockVerification(
  perms: Pick<SalesFulfillmentNavPermissions, "stockVerification" | "picking">,
): boolean {
  return perms.stockVerification.canView || perms.picking.canAdd;
}

/** ยืนยันผลตรวจสต๊อกได้เมื่อมี APPROVE ของหน้าตรวจ หรือมีสิทธิ์สร้างใบจ่าย */
export function canApproveStockVerification(
  perms: Pick<SalesFulfillmentNavPermissions, "stockVerification" | "picking">,
): boolean {
  return perms.stockVerification.canApprove || perms.picking.canAdd;
}

/** สร้างใบส่งจาก packing ได้เมื่อมีสิทธิ์สร้างใบส่งสินค้า — หน้าสร้างกันด้วย canAdd อยู่แล้ว */
export function canCreateDeliveryFromPacking(
  perms: Pick<SalesFulfillmentNavPermissions, "delivery" | "salesOrder">,
): boolean {
  return perms.delivery.canAdd;
}

/** สิทธิ์ที่ต้องมีเพื่อเปิด URL ขั้นถัดไปของ flow ขาย (ตรวจสต๊อก / จ่าย / บรรจุ / ส่ง) */
export function canNavigateSalesFulfillmentHref(
  href: string,
  perms: SalesFulfillmentNavPermissions,
): boolean {
  const path = href.split("?")[0] ?? href;

  if (path.includes("/stock-verification")) {
    return canOpenStockVerification(perms);
  }
  if (path.includes("/pickings/create-from-sales-order")) {
    return perms.picking.canAdd;
  }
  if (path.includes("/packings/create-from-picking")) {
    return perms.packing.canAdd;
  }
  if (path.includes("/delivery-orders/create-from-packing")) {
    return canCreateDeliveryFromPacking(perms);
  }
  if (path.startsWith("/pickings/") && path.endsWith("/edit")) {
    return perms.picking.canEdit;
  }
  if (path.startsWith("/packings/") && path.endsWith("/edit")) {
    return perms.packing.canEdit;
  }
  if (path.startsWith("/delivery-orders/") && path.endsWith("/edit")) {
    return perms.delivery.canEdit;
  }
  if (path.startsWith("/pickings")) {
    return perms.picking.canView;
  }
  if (path.startsWith("/packings")) {
    return perms.packing.canView;
  }
  if (path.startsWith("/delivery-orders")) {
    return perms.delivery.canView;
  }
  if (path.startsWith("/quotations")) {
    return perms.quotation?.canView === true;
  }
  if (path.startsWith("/sales-orders")) {
    return perms.salesOrder.canView;
  }
  return true;
}
