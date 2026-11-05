/** ชนิดข้อมูลของแดชบอร์ดที่เพิ่มใน M15 (Executive / Production รายวัน / ห้องแล็บ / ซ่อมบำรุง / HR / ฝ่ายขาย) */

export type DashboardRange = { from?: string; to?: string };

export type DashboardCount = { key: string; label: string; count: number };

// ─── Production (รายวัน / Mass Balance / รอบ) ─────────────────────────────

export type MassBalanceStatus = "OK" | "NO_DATA" | "NOT_COMPARABLE" | "EXCEEDS_INPUT";

export type ProductionOutputKind = {
  kind: "OIL" | "RCB" | "STEEL" | "SYNGAS" | "OTHER";
  label: string;
  quantityKg: number;
  /** ผลผลิตแยกตามหน่วยนับจริงทุกหน่วย (ไม่บวกข้ามหน่วย) — API เก่าอาจไม่มี */
  quantities?: Array<{ unit: string; quantity: number }>;
  /** % ของยางป้อน คิดเฉพาะส่วน KG — null/ไม่มี = เทียบไม่ได้ */
  yieldPercentOfInput?: number | null;
};

export type ProductionDailyDay = {
  date: string;
  inputKg: number;
  operatingHours: number;
  efficiencyPercent?: number | null;
  outputKg: number;
  outputByKind: Record<string, number>;
  lossKg: number;
  lossPercent?: number | null;
  massBalanceStatus: MassBalanceStatus;
};

export type KgBalance = {
  inputKg: number;
  outputKg: number;
  lossKg: number;
  lossPercent: number | null;
  status: MassBalanceStatus;
  message?: string;
};

export type ProductionCycleBalance = {
  id: string;
  cycleNo: string;
  phase: string;
  runDay: number;
  runDays: number;
  progressPercent: number;
  daysToShutdown?: number;
  startDate: string;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
  balance: KgBalance;
  outputKinds: ProductionOutputKind[];
};

export type ProductionDaily = {
  from: string;
  to: string;
  days: ProductionDailyDay[];
  totals: KgBalance & {
    operatingHours: number;
    averageEfficiencyPercent?: number | null;
    recordedDays: number;
  };
  outputKinds: ProductionOutputKind[];
  nonKgOutputs: Array<{ itemName: string; unit: string; quantity: number }>;
  /** สินค้าในกลุ่ม "อื่น ๆ" แยกสินค้า+หน่วย — API เก่าอาจไม่มี */
  otherOutputs?: Array<{ itemCode: string; itemName: string; unit: string; quantity: number }>;
  cycle?: ProductionCycleBalance | null;
};

// ─── Executive ────────────────────────────────────────────────────────────

export type ExecutiveOverview = {
  from: string;
  to: string;
  asOf: string;
  kpi: {
    completedOrders: number;
    inProgressOrders: number;
    averageYieldPercent?: number | null;
    totalDowntimeHours: number;
    openDowntimeCount: number;
    pendingApprovalsCount: number;
  };
  cycle?: ProductionCycleBalance | null;
  production: {
    days: Array<{ date: string; inputKg: number; outputKg: number }>;
    inputKg: number;
    outputKg: number;
    lossPercent?: number | null;
    massBalanceStatus: MassBalanceStatus;
    outputKinds: ProductionOutputKind[];
  };
  rawTire: {
    days: Array<{ date: string; payableKg: number; netKg: number; amount: number; receipts: number }>;
    payableKg: number;
    netKg: number;
    amount: number;
    receipts: number;
  };
  inventory: {
    totalValue: number;
    lowCount: number;
    outCount: number;
    finishedGoods: Array<{ itemCode: string; itemName: string; unit?: string; quantity: number }>;
  };
  sales: {
    days: Array<{ date: string; soldAmount: number; deliveredAmount: number; orders: number }>;
    soldAmount: number;
    deliveredAmount: number;
    orders: number;
    openOrders: number;
    awaitingConfirm: number;
  };
  machines: {
    overallLight: "GREEN" | "YELLOW" | "RED" | "IDLE";
    counts: { red: number; yellow: number; green: number };
    issues: Array<{ code: string; name: string; light: "RED" | "YELLOW"; reasons: string[] }>;
  };
  downtime: {
    totalHours: number;
    byCategory: Array<{ category?: string | null; label: string; hours: number; cumulativePercent: number }>;
  };
  summary: {
    totalSalesAmount: string;
    totalProcurementAmount: string;
    totalInventoryValue: string;
    pendingApprovalsCount: number;
    pendingApprovalsBreakdown: Record<string, number>;
  };
};

// ─── แผนก ─────────────────────────────────────────────────────────────────

export type LabDashboard = {
  from: string;
  to: string;
  pending: { registered: number; testing: number; awaitingApproval: number; overdue: number };
  byStatus: DashboardCount[];
  byType: DashboardCount[];
  days: Array<{ date: string; samples: number }>;
  results: { pass: number; fail: number; na: number; passRatePercent: number | null };
  topFailParameters: Array<{ parameter: string; failCount: number }>;
  coa: { issued: number; voided: number };
  avgTurnaroundHours?: number | null;
};

export type MaintenanceDashboard = {
  from: string;
  to: string;
  equipmentByStatus: DashboardCount[];
  openWorkOrders: { pm: number; cm: number; overdue: number };
  overdueList: Array<{
    workOrderNo: string;
    equipment: string;
    type: string;
    priority?: string;
    plannedDate: string;
    daysOverdue: number;
  }>;
  completed: { pm: number; cm: number; pmOnTimePercent: number | null };
  pmDue: Array<{ equipment: string; title?: string; nextDueDate: string; daysUntilDue: number }>;
  pmOverdueCount: number;
  downtime: { hours: number; occurrences: number; avgRepairHours: number | null };
  topDowntimeEquipment: Array<{ equipment: string; hours: number; occurrences: number }>;
  days: Array<{ date: string; created: number; completed: number }>;
};

export type HrDashboard = {
  from: string;
  to: string;
  headcount: number;
  today: { present: number; late: number; absent: number; onLeave: number; notRecorded: number };
  days: Array<{ date: string; present: number; late: number }>;
  avgLateMinutes?: number | null;
  leave: { pending: number; approvedDays: number; upcoming7Days: number; byType: DashboardCount[] };
  overtime: {
    pending: number;
    approvedHours: number;
    approvedAmount: number;
    topEmployees: Array<{ name: string; hours: number }>;
  };
  nextShutdown?: { name: string; dateFrom: string; dateTo: string; daysUntil: number } | null;
};

export type SalesDashboard = {
  from: string;
  to: string;
  quotations: {
    count: number;
    amount: number;
    converted: number;
    conversionPercent: number | null;
    byStatus: DashboardCount[];
  };
  orders: { soldAmount: number; deliveredAmount: number; count: number; byStatus: DashboardCount[] };
  days: Array<{ date: string; soldAmount: number; orders: number }>;
  topCustomers: Array<{ customer: string; amount: number; orders: number }>;
  pipeline: { draft: number; awaitingConfirm: number; openOrders: number; dispatchInProgress: number };
  lateOrders: Array<{ soNo: string; customer: string; requestedDeliveryDate: string; status: string; daysLate: number }>;
  lateOrderCount: number;
};
