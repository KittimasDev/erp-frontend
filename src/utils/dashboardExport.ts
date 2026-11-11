import dayjs from "dayjs";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import type { TabularReport } from "@/utils/downloadTabularReport";
import type {
  ExecutiveOverview,
  HrDashboard,
  LabDashboard,
  MaintenanceDashboard,
  ProductionDaily,
  SalesDashboard,
} from "@/types/dashboards";
import type { ControlRoomOverview } from "@/types/control-room";

/**
 * ส่งออกแดชบอร์ด (Excel / PDF / CSV) — ใช้ข้อมูลชุดเดียวกับที่แสดงบนจอ ไม่เรียก API ซ้ำ
 *
 * แดชบอร์ดมีหลายส่วนที่หัวคอลัมน์ต่างกัน แต่ตัวส่งออกกลางรองรับตารางเดียว จึงทำเป็น "ตารางหลายส่วน":
 * แถวชื่อส่วน (ตัวหนา) → แถวหัวคอลัมน์ของส่วนนั้น (ตัวหนา อ่อนกว่า) → แถวข้อมูล · ช่องไม่ใช้เว้นว่าง
 */

const COLS = 6;
const HEADERS = ["รายการ", "ข้อมูล 1", "ข้อมูล 2", "ข้อมูล 3", "ข้อมูล 4", "ข้อมูล 5"];
/** กว้างรวม 746px (พื้นที่ตารางของกระดาษ PDF) */
const PDF_COLUMNS = [
  { header: HEADERS[0], cells: [0], width: 226 },
  ...HEADERS.slice(1).map((header, i) => ({ header, cells: [i + 1], width: 104, align: "right" as const })),
];

const n = (v?: number | null, digits = 2) =>
  v === null || v === undefined ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: digits });
const kg = (v?: number | null) => n(v, 0);
const kindQty = (k: { quantityKg: number; quantities?: Array<{ unit: string; quantity: number }> }) =>
  k.quantities?.length ? k.quantities.map((q) => `${n(q.quantity, q.quantity % 1 === 0 ? 0 : 2)} ${q.unit}`).join(" · ") : `${kg(k.quantityKg)} KG`;
const pct = (v?: number | null) => (v === null || v === undefined ? "—" : `${n(v, 1)}%`);
const baht = (v?: number | null) => n(v, 2);

class SectionTable {
  rows: string[][] = [];
  groupRows: number[] = [];
  subGroupRows: number[] = [];

  private push(cells: Array<string | number | null | undefined>) {
    const row = cells.map((c) => (c === null || c === undefined ? "" : String(c)));
    while (row.length < COLS) row.push("");
    this.rows.push(row.slice(0, COLS));
    return this.rows.length - 1;
  }

  /** ชื่อส่วน (เว้นแถวว่างก่อนส่วนที่สอง) */
  section(title: string) {
    if (this.rows.length > 0) this.push([]);
    this.groupRows.push(this.push([title]));
  }

  header(...cols: string[]) {
    this.subGroupRows.push(this.push(cols));
  }

  row(...cells: Array<string | number | null | undefined>) {
    this.push(cells);
  }

  /** ส่วนที่ไม่มีข้อมูล */
  empty(text: string) {
    this.push([text]);
  }
}

function finish(
  title: string,
  filename: string,
  meta: string[],
  t: SectionTable,
): TabularReport {
  return {
    title,
    filename: `${filename}-${dayjs().format("YYYYMMDD-HHmm")}`,
    meta: [`ออกรายงาน ${dayjs().format("DD/MM/BBBB HH:mm")}`, ...meta],
    headers: HEADERS,
    rows: t.rows,
    groupRows: t.groupRows,
    subGroupRows: t.subGroupRows,
    pdfColumns: PDF_COLUMNS,
  };
}

const range = (from: string, to: string) => `ช่วงวันที่ ${formatThaiDate(from)} – ${formatThaiDate(to)}`;

const MASS_BALANCE_TEXT: Record<string, string> = {
  OK: "ปกติ",
  NO_DATA: "ไม่มีข้อมูลเทียบ",
  NOT_COMPARABLE: "เทียบไม่ได้",
  EXCEEDS_INPUT: "ผลผลิตเกินยางป้อน",
};
const LIGHT_TEXT: Record<string, string> = { GREEN: "ปกติ", YELLOW: "เฝ้าระวัง", RED: "หยุด/เสีย", IDLE: "ไม่มีการผลิต" };

// ─── Production (รายวัน) ──────────────────────────────────────────────────

function addProductionDaily(t: SectionTable, d: ProductionDaily) {
  t.section("สรุปช่วงที่เลือก");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("Input Tire (ยางป้อน) kg", kg(d.totals.inputKg), `บันทึกกะ ${d.totals.recordedDays} วัน`);
  t.row("ผลผลิตรับเข้าคลัง (หน่วย kg)", kg(d.totals.outputKg));
  t.row(
    "Mass Balance ส่วนต่าง",
    d.totals.status === "NO_DATA" ? "ไม่มีข้อมูลเทียบ" : `${kg(d.totals.lossKg)} kg (${pct(d.totals.lossPercent)})`,
    MASS_BALANCE_TEXT[d.totals.status],
  );
  t.row("Efficiency เฉลี่ย", pct(d.totals.averageEfficiencyPercent), "ชั่วโมงเดินเครื่อง ÷ 24");
  t.row("ชั่วโมงเดินเครื่อง", n(d.totals.operatingHours, 1));

  t.section("ผลผลิตแยกชนิด (ตามหน่วยจริง ไม่บวกข้ามหน่วย)");
  t.header("ชนิด", "ปริมาณ", "% ของยางป้อน (เฉพาะ kg)");
  for (const k of d.outputKinds) t.row(k.label, kindQty(k), pct(k.yieldPercentOfInput));
  for (const o of d.nonKgOutputs) t.row(`${o.itemName} (ไม่นับใน Mass Balance)`, n(o.quantity, 0), o.unit);

  if (d.cycle) {
    const c = d.cycle;
    t.section(`รอบผลิต ${c.cycleNo}`);
    t.header("รายการ", "ค่า", "หมายเหตุ");
    t.row("ความคืบหน้า", c.phase === "NOT_STARTED" ? "ยังไม่เริ่มรอบ" : `วันที่ ${c.runDay} จาก ${c.runDays}`, pct(c.progressPercent));
    t.row(
      "Shutdown",
      c.daysToShutdown !== undefined ? `อีก ${c.daysToShutdown} วัน` : "—",
      `${formatThaiDate(c.shutdownStartDate)} – ${formatThaiDate(c.shutdownEndDate)}`,
    );
    t.row("ยางป้อนสะสมรอบ (kg)", kg(c.balance.inputKg));
    t.row("ผลผลิตสะสมรอบ (kg)", kg(c.balance.outputKg));
    t.row(
      "Mass Balance รายรอบ",
      c.balance.status === "NO_DATA" ? "ไม่มีข้อมูลเทียบ" : `${kg(c.balance.lossKg)} kg (${pct(c.balance.lossPercent)})`,
      MASS_BALANCE_TEXT[c.balance.status],
    );
    for (const k of c.outputKinds) t.row(`· ${k.label} (kg)`, kg(k.quantityKg), pct(k.yieldPercentOfInput));
  }

  t.section("รายวัน");
  t.header("วันที่", "ยางป้อน (kg)", "ผลผลิต (kg)", "ส่วนต่าง (kg)", "Efficiency", "Mass Balance");
  for (const day of d.days) {
    t.row(
      formatThaiDate(day.date),
      kg(day.inputKg),
      kg(day.outputKg),
      day.massBalanceStatus === "NO_DATA" ? "—" : `${kg(day.lossKg)} (${pct(day.lossPercent)})`,
      pct(day.efficiencyPercent),
      MASS_BALANCE_TEXT[day.massBalanceStatus],
    );
  }
}

export function buildProductionDailyReport(d: ProductionDaily): TabularReport {
  const t = new SectionTable();
  addProductionDaily(t, d);
  return finish("แดชบอร์ดการผลิต — Input / ผลผลิต / Mass Balance", "production-dashboard", [range(d.from, d.to)], t);
}

// ─── Executive ────────────────────────────────────────────────────────────

export function buildExecutiveReport(d: ExecutiveOverview): TabularReport {
  const t = new SectionTable();

  t.section("KPI");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("ผลผลิตรับเข้าคลัง (kg)", kg(d.production.outputKg), `ยางป้อน ${kg(d.production.inputKg)} kg`);
  t.row("Yield เฉลี่ย", pct(d.kpi.averageYieldPercent), `ปิดงาน ${d.kpi.completedOrders} ใบ · กำลังเดิน ${d.kpi.inProgressOrders} ใบ`);
  t.row("รับซื้อยาง (น้ำหนักจ่ายเงิน kg)", kg(d.rawTire.payableKg), `${d.rawTire.receipts} ใบรับ · ${baht(d.rawTire.amount)} บาท`);
  t.row("ยอดขาย (ยืนยันแล้ว) บาท", baht(d.sales.soldAmount), `${d.sales.orders} ใบสั่งขาย`);
  t.row("ยอดส่งมอบแล้ว บาท", baht(d.sales.deliveredAmount), `ค้างส่งมอบ ${d.sales.openOrders} ใบ · รอลูกค้ายืนยัน ${d.sales.awaitingConfirm} ใบ`);
  t.row("มูลค่าสต๊อก บาท", baht(d.inventory.totalValue), `ต่ำกว่าขั้นต่ำ ${d.inventory.lowCount} รายการ (หมด ${d.inventory.outCount})`);
  t.row("Downtime (ชม.)", n(d.downtime.totalHours, 1), `ยังไม่ปิด ${d.kpi.openDowntimeCount} รายการ`);
  t.row("ใบรออนุมัติ (ทุกโมดูล)", d.kpi.pendingApprovalsCount);

  if (d.cycle) {
    t.section(`Cycle Progress — ${d.cycle.cycleNo}`);
    t.header("รายการ", "ค่า", "หมายเหตุ");
    t.row("ความคืบหน้า", d.cycle.phase === "NOT_STARTED" ? "ยังไม่เริ่มรอบ" : `วันที่ ${d.cycle.runDay} จาก ${d.cycle.runDays}`, pct(d.cycle.progressPercent));
    t.row("ถึง Shutdown", d.cycle.daysToShutdown !== undefined ? `อีก ${d.cycle.daysToShutdown} วัน` : "—", formatThaiDate(d.cycle.shutdownStartDate));
  }

  t.section("ผลผลิตสะสมของช่วง แยกชนิด");
  t.header("ชนิด", "ปริมาณ (kg)", "% ของยางป้อน");
  for (const k of d.production.outputKinds) t.row(k.label, kg(k.quantityKg), pct(k.yieldPercentOfInput));

  t.section("สถานะเครื่องจักร");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("สถานะรวม", LIGHT_TEXT[d.machines.overallLight] ?? d.machines.overallLight);
  t.row("จำนวน", `หยุด/เสีย ${d.machines.counts.red} · เฝ้าระวัง ${d.machines.counts.yellow} · ปกติ ${d.machines.counts.green}`);
  for (const m of d.machines.issues) t.row(`${m.code} ${m.name}`, LIGHT_TEXT[m.light], m.reasons.join(" · "));

  t.section("สินค้าสำเร็จรูปคงเหลือ");
  t.header("สินค้า", "คงเหลือ", "หน่วย");
  if (d.inventory.finishedGoods.length === 0) t.empty("ไม่มีสินค้าสำเร็จรูปคงเหลือ");
  for (const g of d.inventory.finishedGoods) t.row(`${g.itemCode} ${g.itemName}`, n(g.quantity, 0), g.unit);

  t.section("Downtime ตามหมวด");
  t.header("หมวด", "ชั่วโมง", "สะสม %");
  if (d.downtime.byCategory.length === 0) t.empty("ไม่มี Downtime ในช่วงนี้");
  for (const c of d.downtime.byCategory) t.row(c.label, n(c.hours, 1), pct(c.cumulativePercent));

  t.section("การผลิตรายวัน");
  t.header("วันที่", "ยางป้อน (kg)", "ผลผลิต (kg)");
  for (const day of d.production.days) t.row(formatThaiDate(day.date), kg(day.inputKg), kg(day.outputKg));

  t.section("ปริมาณรับซื้อยางรายวัน");
  t.header("วันที่", "จ่ายเงิน (kg)", "สุทธิ (kg)", "มูลค่า (บาท)", "ใบรับ");
  for (const day of d.rawTire.days) t.row(formatThaiDate(day.date), kg(day.payableKg), kg(day.netKg), baht(day.amount), day.receipts);

  t.section("ยอดขายรายวัน");
  t.header("วันที่", "ยอดขาย (บาท)", "ส่งมอบแล้ว (บาท)", "ใบสั่งขาย");
  for (const day of d.sales.days) t.row(formatThaiDate(day.date), baht(day.soldAmount), baht(day.deliveredAmount), day.orders);

  return finish("ภาพรวมผู้บริหาร (Executive Dashboard)", "executive-dashboard", [range(d.from, d.to)], t);
}

// ─── แผนก ─────────────────────────────────────────────────────────────────

export function buildLabReport(d: LabDashboard): TabularReport {
  const t = new SectionTable();
  t.section("ตัวอย่างค้างทั้งระบบ");
  t.header("รายการ", "จำนวน");
  t.row("ลงทะเบียน รอตรวจ", d.pending.registered);
  t.row("กำลังตรวจ", d.pending.testing);
  t.row("รออนุมัติ (ตรวจทานแล้ว)", d.pending.awaitingApproval);
  t.row("ค้างนานเกิน 3 วัน", d.pending.overdue);

  t.section("ผลตรวจและ COA (ช่วงที่เลือก)");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("อัตราผ่าน", pct(d.results.passRatePercent), "ไม่นับผลที่ไม่มีเกณฑ์");
  t.row("ผ่าน / ไม่ผ่าน / ไม่มีเกณฑ์", `${d.results.pass} / ${d.results.fail} / ${d.results.na}`);
  t.row("COA ที่ออก / ยกเลิก", `${d.coa.issued} / ${d.coa.voided}`);
  t.row("เวลาเฉลี่ยลงทะเบียน → ตรวจทาน (ชม.)", d.avgTurnaroundHours != null ? n(d.avgTurnaroundHours, 1) : "—");

  t.section("สถานะตัวอย่าง");
  t.header("สถานะ", "จำนวน");
  if (d.byStatus.length === 0) t.empty("ไม่มีตัวอย่างในช่วงนี้");
  for (const s of d.byStatus) t.row(s.label, s.count);

  t.section("ประเภทตัวอย่าง");
  t.header("ประเภท", "จำนวน");
  if (d.byType.length === 0) t.empty("ไม่มีตัวอย่างในช่วงนี้");
  for (const s of d.byType) t.row(s.label, s.count);

  t.section("พารามิเตอร์ที่ไม่ผ่านบ่อย");
  t.header("พารามิเตอร์", "ไม่ผ่าน (ครั้ง)");
  if (d.topFailParameters.length === 0) t.empty("ไม่มีผลไม่ผ่านในช่วงนี้");
  for (const p of d.topFailParameters) t.row(p.parameter, p.failCount);

  t.section("ตัวอย่างที่เก็บรายวัน");
  t.header("วันที่", "ตัวอย่าง");
  for (const day of d.days) t.row(formatThaiDate(day.date), day.samples);

  return finish("แดชบอร์ดห้องแล็บ", "lab-dashboard", [range(d.from, d.to)], t);
}

export function buildMaintenanceReport(d: MaintenanceDashboard): TabularReport {
  const t = new SectionTable();
  t.section("ใบสั่งงานและ Downtime");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("ใบสั่งงาน PM ที่เปิดอยู่", d.openWorkOrders.pm);
  t.row("ใบสั่งงาน CM (ซ่อม) ที่เปิดอยู่", d.openWorkOrders.cm);
  t.row("ใบสั่งงานเลยกำหนด", d.openWorkOrders.overdue, `PM เลยกำหนด ${d.pmOverdueCount} แผน`);
  t.row("เสร็จในช่วง PM / CM", `${d.completed.pm} / ${d.completed.cm}`, `PM ทันกำหนด ${pct(d.completed.pmOnTimePercent)}`);
  t.row("Downtime (ชม.)", n(d.downtime.hours, 1), `${d.downtime.occurrences} ครั้ง`);
  t.row("เวลาซ่อมเฉลี่ย (ชม.)", d.downtime.avgRepairHours != null ? n(d.downtime.avgRepairHours, 1) : "—", "เฉพาะครั้งที่ปิดแล้ว");

  t.section("สถานะเครื่องจักร");
  t.header("สถานะ", "จำนวน");
  if (d.equipmentByStatus.length === 0) t.empty("ยังไม่มีทะเบียนเครื่องจักร");
  for (const s of d.equipmentByStatus) t.row(s.label, s.count);

  t.section("ใบสั่งงานเลยกำหนด");
  t.header("ใบสั่งงาน", "ประเภท", "เครื่อง", "กำหนด", "เลย (วัน)");
  if (d.overdueList.length === 0) t.empty("ไม่มีใบสั่งงานเลยกำหนด");
  for (const w of d.overdueList) t.row(w.workOrderNo, w.type, w.equipment, formatThaiDate(w.plannedDate), w.daysOverdue);

  t.section("PM ที่เลยกำหนด / ถึงกำหนดใน 14 วัน");
  t.header("เครื่อง", "แผน", "ครบกำหนด", "เหลือ (วัน)");
  if (d.pmDue.length === 0) t.empty("ไม่มี PM ใกล้ถึงกำหนด");
  for (const p of d.pmDue) t.row(p.equipment, p.title, formatThaiDate(p.nextDueDate), p.daysUntilDue);

  t.section("เครื่องที่หยุดนานสุด");
  t.header("เครื่อง", "ชั่วโมง", "ครั้ง");
  if (d.topDowntimeEquipment.length === 0) t.empty("ไม่มี Downtime ในช่วงนี้");
  for (const e of d.topDowntimeEquipment) t.row(e.equipment, n(e.hours, 1), e.occurrences);

  t.section("ใบสั่งงานรายวัน");
  t.header("วันที่", "เปิดใบสั่งงาน", "ปิดงานแล้ว");
  for (const day of d.days) t.row(formatThaiDate(day.date), day.created, day.completed);

  return finish("แดชบอร์ดซ่อมบำรุง", "maintenance-dashboard", [range(d.from, d.to)], t);
}

export function buildHrReport(d: HrDashboard): TabularReport {
  const t = new SectionTable();
  t.section("ภาพรวม");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("พนักงานที่ใช้งาน", d.headcount);
  t.row(
    "ลงเวลาวันนี้",
    `มา ${d.today.present} · สาย ${d.today.late} · ขาด ${d.today.absent} · ลา ${d.today.onLeave}`,
    `ยังไม่ลงเวลา ${d.today.notRecorded} (ไม่ได้แปลว่าขาดงาน)`,
  );
  t.row("สายเฉลี่ย (นาที)", d.avgLateMinutes != null ? n(d.avgLateMinutes, 1) : "—", "เฉพาะคนที่สาย");
  t.row("คำขอลารออนุมัติ", d.leave.pending, `ลาที่จะเริ่มใน 7 วัน ${d.leave.upcoming7Days} ราย`);
  t.row("ลาที่อนุมัติในช่วง (วัน)", n(d.leave.approvedDays, 0));
  t.row("โอทีรออนุมัติ", d.overtime.pending);
  t.row("โอทีอนุมัติในช่วง", `${n(d.overtime.approvedHours, 1)} ชม.`, `${baht(d.overtime.approvedAmount)} บาท`);
  if (d.nextShutdown) {
    t.row("แผน Shutdown ถัดไป", `อีก ${d.nextShutdown.daysUntil} วัน`, `${d.nextShutdown.name} ${formatThaiDate(d.nextShutdown.dateFrom)} – ${formatThaiDate(d.nextShutdown.dateTo)}`);
  }

  t.section("การลาที่อนุมัติ (ตามประเภท)");
  t.header("ประเภท", "จำนวนใบ");
  if (d.leave.byType.length === 0) t.empty("ไม่มีการลาในช่วงนี้");
  for (const s of d.leave.byType) t.row(s.label, s.count);

  t.section("โอทีสูงสุด");
  t.header("พนักงาน", "ชั่วโมง");
  if (d.overtime.topEmployees.length === 0) t.empty("ไม่มีโอทีที่อนุมัติในช่วงนี้");
  for (const e of d.overtime.topEmployees) t.row(e.name, n(e.hours, 1));

  t.section("การมาทำงานรายวัน");
  t.header("วันที่", "มาทำงาน", "สาย");
  for (const day of d.days) t.row(formatThaiDate(day.date), day.present, day.late);

  return finish("แดชบอร์ดบุคคล (HR)", "hr-dashboard", [range(d.from, d.to)], t);
}

export function buildSalesReport(d: SalesDashboard): TabularReport {
  const t = new SectionTable();
  t.section("ภาพรวม");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("ยอดขาย (ยืนยันแล้ว) บาท", baht(d.orders.soldAmount), `${d.orders.count} ใบสั่งขาย`);
  t.row("ส่งมอบแล้ว บาท", baht(d.orders.deliveredAmount));
  t.row("ใบเสนอราคา", d.quotations.count, `มูลค่า ${baht(d.quotations.amount)} บาท`);
  t.row("ออกเป็นใบสั่งขายแล้ว", pct(d.quotations.conversionPercent), `${d.quotations.converted} จาก ${d.quotations.count} ใบ`);
  t.row("ใบสั่งขายค้างส่งมอบ", d.pipeline.openOrders, `กำลังจัดส่ง ${d.pipeline.dispatchInProgress} งาน`);
  t.row("รอลูกค้ายืนยัน / ร่าง", `${d.pipeline.awaitingConfirm} / ${d.pipeline.draft}`);
  t.row("เลยวันขอส่งแล้ว", d.lateOrderCount);

  t.section("ลูกค้ายอดขายสูงสุด");
  t.header("ลูกค้า", "ยอดขาย (บาท)", "ใบสั่งขาย");
  if (d.topCustomers.length === 0) t.empty("ไม่มียอดขายในช่วงนี้");
  for (const c of d.topCustomers) t.row(c.customer, baht(c.amount), c.orders);

  t.section("ใบสั่งขายที่เลยวันขอส่ง");
  t.header("ใบสั่งขาย", "ลูกค้า", "วันขอส่ง", "สถานะ", "เลย (วัน)");
  if (d.lateOrders.length === 0) t.empty("ไม่มีใบสั่งขายเลยวันขอส่ง");
  for (const o of d.lateOrders) t.row(o.soNo, o.customer, formatThaiDate(o.requestedDeliveryDate), o.status, o.daysLate);
  if (d.lateOrderCount > d.lateOrders.length) t.row(`และอีก ${d.lateOrderCount - d.lateOrders.length} ใบ`);

  t.section("สถานะใบสั่งขาย");
  t.header("สถานะ", "จำนวน");
  for (const s of d.orders.byStatus) t.row(s.label, s.count);

  t.section("สถานะใบเสนอราคา");
  t.header("สถานะ", "จำนวน");
  for (const s of d.quotations.byStatus) t.row(s.label, s.count);

  t.section("ยอดขายรายวัน");
  t.header("วันที่", "ยอดขาย (บาท)", "ใบสั่งขาย");
  for (const day of d.days) t.row(formatThaiDate(day.date), baht(day.soldAmount), day.orders);

  return finish("แดชบอร์ดฝ่ายขาย", "sales-dashboard", [range(d.from, d.to)], t);
}

// ─── Control Room (ภาพถ่ายสถานะ ณ ตอนนั้น) ────────────────────────────────

export function buildControlRoomReport(d: ControlRoomOverview): TabularReport {
  const t = new SectionTable();
  t.section("ภาพรวม");
  t.header("รายการ", "ค่า", "หมายเหตุ");
  t.row("สถานะรวม", LIGHT_TEXT[d.overallLight] ?? d.overallLight, `หยุด/เสีย ${d.counts.red} · เฝ้าระวัง ${d.counts.yellow} · ปกติ ${d.counts.green}`);
  if (d.cycle) {
    t.row("รอบผลิต", `${d.cycle.cycleNo} · ${d.cycle.phase === "NOT_STARTED" ? "ยังไม่เริ่ม" : `วันที่ ${d.cycle.runDay} จาก ${d.cycle.runDays}`}`, d.cycle.daysToShutdown !== undefined ? `อีก ${d.cycle.daysToShutdown} วันถึง Shutdown` : "");
  }
  const feed = d.production.feedRate;
  t.row("Feed Rate", feed.value == null ? "—" : `${n(feed.value, 1)} ${feed.unit}`, feed.source === "LIVE" ? "ค่าสดจากอุปกรณ์" : feed.source === "SHIFT" ? "จากบันทึกกะล่าสุด" : "ยังไม่มีข้อมูล");
  t.row("ยางที่ป้อนวันนี้ (kg)", kg(d.production.inputTodayKg));
  t.row("ชั่วโมงเดินเครื่องวันนี้", n(d.production.operatingHoursToday, 1));

  t.section("ผลผลิตวันนี้ / สะสมรอบ");
  t.header("สินค้า", "วันนี้", "สะสมรอบ", "หน่วย");
  const names = new Map<string, { today?: number; cycle?: number; unit?: string }>();
  for (const o of d.outputs.today) names.set(o.itemName, { ...names.get(o.itemName), today: o.quantity, unit: o.unit });
  for (const o of d.outputs.cycleTotal) names.set(o.itemName, { ...names.get(o.itemName), cycle: o.quantity, unit: o.unit });
  if (names.size === 0) t.empty("ยังไม่มีผลผลิตรับเข้าคลัง");
  for (const [name, v] of names) t.row(name, v.today != null ? n(v.today, 0) : "—", v.cycle != null ? n(v.cycle, 0) : "—", v.unit);

  t.section("ใบสั่งผลิตที่กำลังเดิน");
  t.header("ใบสั่งผลิต", "สถานะ", "เดินมาแล้ว (ชม.)", "คืบหน้า", "เหตุผล");
  if (d.production.runningOrders.length === 0) t.empty("ไม่มีการผลิตตอนนี้");
  for (const o of d.production.runningOrders) {
    t.row(o.orderNo, LIGHT_TEXT[o.light], n(o.elapsedHours, 1), o.cycleProgressPercent != null ? pct(o.cycleProgressPercent) : "—", o.reasons.join(" · "));
  }

  t.section("Downtime ที่ยังไม่ปิด");
  t.header("รายการ", "ประเภท", "เหตุผล", "หยุดมาแล้ว (นาที)");
  if (d.downtimeAlerts.length === 0) t.empty("ไม่มี Downtime ค้างอยู่");
  for (const a of d.downtimeAlerts) t.row(a.ref, a.source === "PRODUCTION" ? "การผลิต" : "เครื่องจักร", a.reason ?? "ไม่ระบุ", a.minutesOpen);

  t.section("สถานะเครื่องจักรแต่ละชุด");
  t.header("เครื่อง", "สถานะ", "เหตุผล");
  if (d.equipment.length === 0) t.empty("ยังไม่มีทะเบียนเครื่องจักร");
  for (const e of d.equipment) t.row(`${e.code} ${e.name}`, LIGHT_TEXT[e.light], e.reasons.join(" · "));

  return finish("Control Room — ห้องควบคุมการผลิต", "control-room", [`ข้อมูล ณ ${dayjs(d.asOf).format("DD/MM/BBBB HH:mm:ss")}`], t);
}
