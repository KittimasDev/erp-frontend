export type ChemicalIssueStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;

export const CHEMICAL_ISSUE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export const CHEMICAL_ISSUE_PURPOSE_LABEL: Record<string, string> = {
  PRODUCTION: "ใช้ในการผลิต",
  CLEANING: "ทำความสะอาด",
  QC_TESTING: "ตรวจสอบคุณภาพ (QC)",
  MAINTENANCE: "งานซ่อมบำรุง",
  OTHER: "อื่น ๆ",
};

export const CHEMICAL_ISSUE_PURPOSE_OPTIONS = Object.entries(
  CHEMICAL_ISSUE_PURPOSE_LABEL,
).map(([value, label]) => ({ value, label }));

export type ChemicalIssueUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type ChemicalIssueWarehouseSummary = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export type ChemicalIssueLocationSummary = {
  id: string;
  locationCode: string;
  locationName: string;
};

export type ChemicalIssueItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  warehouseId: string;
  warehouse?: ChemicalIssueWarehouseSummary;
  locationId: string;
  location?: ChemicalIssueLocationSummary;
  lotId: string;
  lotNo?: string;
  remark?: string;
  sortOrder: number;
};

export type ChemicalIssue = {
  id: string;
  issueNo: string;
  issueDate: string;
  purpose: string;
  purposeDetail?: string;
  status: ChemicalIssueStatus;
  requestedById?: string;
  requestedBy?: ChemicalIssueUserSummary;
  issuedById?: string;
  issuedBy?: ChemicalIssueUserSummary;
  postedAt?: string;
  remark?: string;
  items: ChemicalIssueItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChemicalIssueListData = {
  items: ChemicalIssue[];
  total: number;
  page: number;
  limit: number;
};

export type ChemicalIssueQueryParams = {
  issueNo?: string;
  status?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateChemicalIssueItemBody = {
  itemId: string;
  quantity: number;
  unitId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  remark?: string;
  sortOrder?: number;
};

export type CreateChemicalIssueBody = {
  issueDate: string;
  purpose: string;
  purposeDetail?: string;
  remark?: string;
  items: CreateChemicalIssueItemBody[];
};

export type UpdateChemicalIssueItemBody = {
  id?: string;
  itemId?: string;
  quantity?: number;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  remark?: string;
  sortOrder?: number;
};

export type UpdateChemicalIssueBody = {
  issueDate?: string;
  purpose?: string;
  purposeDetail?: string;
  remark?: string;
  items?: UpdateChemicalIssueItemBody[];
};

export type ChemicalIssueApiResponse = {
  statusCode: number;
  message: string;
  data: ChemicalIssue;
};

export type ChemicalIssueListApiResponse = {
  statusCode: number;
  message: string;
  data: ChemicalIssueListData;
};

export type ChemicalConsumptionReportRow = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  purpose: string;
  totalQuantity: string;
  unitCode?: string;
  issueCount: number;
};

export type ChemicalConsumptionReportSummary = {
  totalIssues: number;
  distinctItems: number;
};

export type ChemicalConsumptionReportData = {
  items: ChemicalConsumptionReportRow[];
  summary: ChemicalConsumptionReportSummary;
};

export type ChemicalConsumptionReportQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  itemId?: string;
  purpose?: string;
  warehouseId?: string;
};

export type ChemicalConsumptionReportApiResponse = {
  statusCode: number;
  message: string;
  data: ChemicalConsumptionReportData;
};
