/** ฐานค่าจ้างพนักงาน — รายเดือน = เงินเดือน · รายวัน = ค่าแรงต่อวัน */
export type CompensationRow = {
  userId: string;
  employeeCode?: string;
  displayName: string;
  position?: string;
  departmentName?: string;
  employmentType?: string;
  /** MONTHLY | DAILY — ตามประเภทการจ้างของพนักงาน */
  payType: "MONTHLY" | "DAILY";
  basePay?: number | null;
  /** ค่าแรงต่อชั่วโมงตามสูตรปัจจุบัน (ตั้งค่าที่หน้า OT) */
  hourlyRate?: number | null;
  isActive: boolean;
  /** หักประกันสังคมในเงินเดือนหรือไม่ */
  socialSecurityEnabled?: boolean;
};

export type CompensationListApiResponse = {
  statusCode?: number;
  message: string;
  data: CompensationRow[];
};

export type CompensationRowApiResponse = {
  statusCode?: number;
  message: string;
  data: CompensationRow;
};

export type UpdateCompensationRequest = {
  /** null = เคลียร์ฐานค่าจ้าง */
  basePay?: number | null;
  socialSecurityEnabled?: boolean;
};
