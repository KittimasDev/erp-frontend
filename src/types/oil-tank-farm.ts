type Envelope<T> = { statusCode?: number; message: string; data: T };

export const OIL_DOC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "รออนุมัติ",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export const OIL_TANK_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "ใช้งาน",
  MAINTENANCE: "ซ่อมบำรุง",
  INACTIVE: "ปิดใช้งาน",
};

export type OilTankReadingBrief = {
  id: string;
  measuredAt: string;
  measuredLiters: string;
  varianceLiters: string;
  status: string;
};

export type OilTank = {
  id: string;
  tankNo: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  warehouseId: string;
  warehouseCode?: string;
  locationId: string;
  locationCode?: string;
  capacityLiters: string;
  currentVolumeLiters?: string;
  availableLiters?: string;
  reservedLiters?: string;
  holdLiters?: string;
  fillPercent?: number;
  status: string;
  remark?: string;
  lastReading?: OilTankReadingBrief;
};

export type CreateOilTankBody = {
  tankNo: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  capacityLiters: number;
  remark?: string;
};

export type UpdateOilTankBody = { capacityLiters?: number; status?: string; remark?: string };

export type OilTankReading = {
  id: string;
  tankId: string;
  measuredAt: string;
  measuredLiters: string;
  bookLiters: string;
  varianceLiters: string;
  status: "RECORDED" | "ADJUSTED" | "IGNORED";
  note?: string;
  measuredByName?: string;
  resolvedAt?: string;
  resolveNote?: string;
};

export type TankBalanceRow = { period: string; opening: number; in: number; out: number; loss: number; closing: number };
export type TankBalanceReport = {
  from: string;
  to: string;
  granularity: string;
  tanks: Array<{ tankId: string; tankNo: string; capacityLiters: number; currentOnHand: number; rows: TankBalanceRow[] }>;
};

export type OilReceiving = {
  id: string;
  receivingNo: string;
  receivingDate: string;
  tankId: string;
  tankNo?: string;
  quantityLiters: string;
  unitId: string;
  unitCode?: string;
  status: string;
  lotId?: string;
  qcStatus?: string;
  batchNo?: string;
  productionOrderId?: string;
  productionOrderNo?: string;
  labSampleId?: string;
  labSampleNo?: string;
  labSampleStatus?: string;
  remark?: string;
  postedAt?: string;
};

export type CreateOilReceivingBody = {
  receivingDate: string;
  tankId: string;
  quantityLiters: number;
  unitId: string;
  batchNo?: string;
  productionOrderId?: string;
  remark?: string;
};

export type OilTransfer = {
  id: string;
  transferNo: string;
  transferDate: string;
  fromTankId: string;
  fromTankNo?: string;
  toTankId: string;
  toTankNo?: string;
  quantityLiters: string;
  lossLiters: string;
  lossReason?: string;
  receivedLiters: string;
  unitId: string;
  unitCode?: string;
  status: string;
  remark?: string;
  postedAt?: string;
};

export type CreateOilTransferBody = {
  transferDate: string;
  fromTankId: string;
  toTankId: string;
  quantityLiters: number;
  unitId: string;
  lossLiters?: number;
  lossReason?: string;
  remark?: string;
};

export type OilDispatch = {
  id: string;
  dispatchNo: string;
  dispatchDate: string;
  tankId: string;
  tankNo?: string;
  quantityLiters: string;
  unitId: string;
  unitCode?: string;
  status: string;
  customerId?: string;
  customerName?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  truckId?: string;
  truckLicensePlate?: string;
  driverName?: string;
  weighbridgeTicketNo?: string;
  weighbridgeNetKg?: string;
  referenceDocNo?: string;
  remark?: string;
  postedAt?: string;
};

export type CreateOilDispatchBody = {
  dispatchDate: string;
  tankId: string;
  quantityLiters: number;
  unitId: string;
  salesOrderId?: string;
  customerId?: string;
  truckId?: string;
  truckLicensePlate?: string;
  driverName?: string;
  weighbridgeTicketNo?: string;
  remark?: string;
};

export type OilTankListApiResponse = Envelope<OilTank[]>;
export type OilTankApiResponse = Envelope<OilTank>;
export type OilTankReadingListApiResponse = Envelope<OilTankReading[]>;
export type OilTankReadingApiResponse = Envelope<OilTankReading>;
export type TankBalanceReportApiResponse = Envelope<TankBalanceReport>;
export type OilReceivingListApiResponse = Envelope<OilReceiving[]>;
export type OilReceivingApiResponse = Envelope<OilReceiving>;
export type OilTransferListApiResponse = Envelope<OilTransfer[]>;
export type OilTransferApiResponse = Envelope<OilTransfer>;
export type OilDispatchListApiResponse = Envelope<OilDispatch[]>;
export type OilDispatchApiResponse = Envelope<OilDispatch>;
