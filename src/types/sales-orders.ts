export type SalesOrderStatus =
  | "DRAFT"
  | "AWAITING_CONFIRM"
  | "CONFIRMED"
  | "STOCK_CHECKED"
  | "PICKING"
  | "PACKED"
  | "DELIVERED"
  | "PARTIALLY_ISSUED"
  | "COMPLETED"
  | "CANCELLED";

export function isPreConfirmSalesOrderStatus(status?: string): boolean {
  return status === "DRAFT" || status === "AWAITING_CONFIRM";
}

export const SALES_ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  DRAFT: "ร่าง",
  AWAITING_CONFIRM: "รอยืนยันใบสั่งขาย",
  CONFIRMED: "ยืนยันแล้ว",
  STOCK_CHECKED: "ตรวจสต๊อกแล้ว",
  PICKING: "จ่ายสินค้าแล้ว",
  PACKED: "บรรจุแล้ว",
  DELIVERED: "ส่งแล้ว",
  PARTIALLY_ISSUED: "จ่ายสินค้าบางส่วน",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export type SalesOrderCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  creditLimit?: string;
};

export type SalesOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type SalesOrderItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  reservedQuantity: string;
  issuedQuantity: string;
  deliveredQuantity: string;
  sortOrder: number;
};

export type SalesOrder = {
  id: string;
  soNo: string;
  soDate: string;
  salesQuotationId?: string;
  salesQuotationNo?: string;
  customerId: string;
  customer?: SalesOrderCustomerSummary;
  paymentTermId?: string;
  taxRateId?: string;
  status: SalesOrderStatus | string;
  requestedDeliveryDate?: string;
  deliveryStatus?: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  remark?: string;
  customerPoNo?: string;
  createdById?: string;
  createdBy?: SalesOrderUserSummary;
  items: SalesOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrderQueryParams = {
  soNo?: string;
  customerId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateSalesOrderFromQuotationBody = {
  remark?: string;
};

export type UpdateSalesOrderCustomerPoBody = {
  customerPoNo: string;
};

export type StockVerificationAvailableLot = {
  lotId: string;
  lotNo?: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  locationId: string;
  locationCode?: string;
  availableQty: string;
};

export type StockVerificationAvailableLocation = {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  locationId: string;
  locationCode?: string;
  availableQty: string;
};

export type SalesOrderStockVerificationLine = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  orderedQty: string;
  reservedQty?: string;
  availableQty: string;
  shortageQty: string;
  isAvailable: boolean;
  availableLots?: StockVerificationAvailableLot[];
  availableLocations?: StockVerificationAvailableLocation[];
};

export type SalesOrderReservationLine = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  orderedQty: string;
  reservedQty: string;
  availableQty: string;
  shortageQty: string;
  canReserve: boolean;
  canRelease: boolean;
  isFullyReserved: boolean;
};

export type SalesOrderReservationStatus = {
  salesOrderId: string;
  soNo?: string;
  status: string;
  isAllFullyReserved: boolean;
  hasShortage: boolean;
  lines: SalesOrderReservationLine[];
};

export type SalesOrderReservationStatusApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderReservationStatus;
};

export type SalesOrderStockVerification = {
  salesOrderId: string;
  soNo?: string;
  status: string;
  isAllAvailable: boolean;
  lines: SalesOrderStockVerificationLine[];
};

export type SalesOrderStockVerificationApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderStockVerification;
};

export type StockVerificationPendingOrder = {
  id: string;
  soNo: string;
  soDate: string;
  requestedDeliveryDate?: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type StockVerificationPendingListApiResponse = {
  statusCode?: number;
  message: string;
  data: StockVerificationPendingOrder[];
};

export type SalesOrderAvailableWarehouse = {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
};

export type SalesOrderAvailableWarehouseListApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderAvailableWarehouse[];
};

export type SalesOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrder;
};

export type SalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrder[];
};
