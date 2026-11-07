"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, DatePicker, Pagination, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChartOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useProcurementSalesByItemReportQuery } from "@/hooks/procurement-reports/useProcurementReportQueries";
import { exportProcurementSalesByItemReport } from "@/lib/api/procurement-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type {
  SalesDeliveryStatusFilter,
  SalesSummaryCustomerGroup,
  SalesSummaryReportQuery,
  SalesSummaryTotals,
} from "@/types/procurement-reports";
import {
  SALES_ORDER_STATUS_LABEL,
  tSoStatus,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import { useLanguage } from "@/lib/i18n/language";
import type { Language } from "@/lib/i18n/translate";
import { useT, type TFunction } from "@/lib/i18n/useT";
import {
  downloadTabularReport,
  type TabularPdfColumn,
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./RawTirePurchaseReportPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const TITLE = "รายงานสรุปยอดขาย";

const CONFIRMED_STATUSES: SalesOrderStatus[] = [
  "CONFIRMED",
  "STOCK_CHECKED",
  "PICKING",
  "PACKED",
  "DELIVERED",
  "PARTIALLY_ISSUED",
  "COMPLETED",
];

const DELIVERY_STATUS_OPTIONS: {
  value: SalesDeliveryStatusFilter;
  label: string;
}[] = [
  { value: "ALL", label: "สถานะการส่งทั้งหมด" },
  { value: "NOT_DELIVERED", label: "ยังไม่ส่ง" },
  { value: "PARTIAL", label: "ส่งบางส่วน" },
  { value: "DELIVERED", label: "ส่งครบ" },
];

type CancelledFilter = "ACTIVE" | "INCLUDE";

const CANCELLED_OPTIONS: { value: CancelledFilter; label: string }[] = [
  { value: "ACTIVE", label: "เฉพาะรายการที่มียอดขาย" },
  { value: "INCLUDE", label: "แสดงรายการที่ยกเลิกด้วย" },
];

const QTY_COLUMNS = [
  ["จำนวนสั่งขาย", "orderedQty"],
  ["จำนวนส่งแล้ว", "deliveredQty"],
  ["จำนวนค้างส่ง", "outstandingQty"],
] as const;

const MONEY_COLUMNS = [
  ["มูลค่ายอดขาย", "salesAmount"],
  ["มูลค่าส่งแล้ว", "deliveredAmount"],
  ["มูลค่าค้างส่ง", "outstandingAmount"],
] as const;

const EXPORT_HEADERS = [
  "ลำดับ",
  "ลูกค้า / SO / สินค้า",
  "วันที่ SO",
  "หน่วยนับ",
  ...QTY_COLUMNS.map(([title]) => title),
  ...MONEY_COLUMNS.map(([title]) => title),
];

/** index ใน cells ตรงกับลำดับช่องของ EXPORT_HEADERS */
/* ความกว้างรวมต้องคงที่ 746 — ขยาย "ลำดับ" ให้พ้นการตัดบรรทัด แล้วหักคืนจากช่องชื่อ */
const PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 36, align: "center" },
  { header: "ลูกค้า / SO / สินค้า", cells: [1], width: 154 },
  { header: "วันที่ SO", cells: [2], width: 66, align: "center" },
  { header: "หน่วย", cells: [3], width: 40, align: "center" },
  ...QTY_COLUMNS.map(([title], index) => ({
    header: title,
    cells: [4 + index],
    width: 70,
    numeric: true,
  })),
  ...MONEY_COLUMNS.map(([title], index) => ({
    header: title,
    cells: [7 + index],
    width: 80,
    numeric: true,
  })),
];

type RowKind = "customer" | "order" | "line";

type SummaryRow = {
  key: string;
  kind: RowKind;
  seq?: number;
  label: string;
  salesOrderId?: string;
  soDate?: string;
  cancelled: boolean;
  cancelledQty?: string;
  /** null = หน่วยปนกัน ไม่แสดงจำนวนรวม */
  unitCode: string | null;
  orderedQty: string | null;
  deliveredQty: string | null;
  outstandingQty: string | null;
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
  children?: SummaryRow[];
};

const SAMPLE_GROUPS: SalesSummaryCustomerGroup[] = [
  {
    customerCode: "C-A",
    customerName: "บริษัท A",
    unitCode: null,
    orderedQty: null,
    deliveredQty: null,
    outstandingQty: null,
    salesAmount: "600000.00",
    deliveredAmount: "350000.00",
    outstandingAmount: "250000.00",
    orders: [
      {
        salesOrderId: "",
        soNo: "SO-2026-10-0001",
        soDate: "2026-10-01",
        status: "CONFIRMED",
        cancelled: false,
        unitCode: null,
        orderedQty: null,
        deliveredQty: null,
        outstandingQty: null,
        salesAmount: "500000.00",
        deliveredAmount: "350000.00",
        outstandingAmount: "150000.00",
        lines: [
          {
            itemCode: "FG-CB",
            itemName: "Carbon Black",
            itemCategoryName: "สินค้าสำเร็จรูป",
            unitCode: "กก.",
            orderedQty: "10000.000",
            deliveredQty: "7000.000",
            outstandingQty: "3000.000",
            salesAmount: "200000.00",
            deliveredAmount: "140000.00",
            outstandingAmount: "60000.00",
            cancelled: false,
            cancelledQty: "0.000",
          },
          {
            itemCode: "FG-OIL",
            itemName: "Pyrolysis Oil",
            itemCategoryName: "สินค้าสำเร็จรูป",
            unitCode: "ลิตร",
            orderedQty: "10000.000",
            deliveredQty: "7000.000",
            outstandingQty: "3000.000",
            salesAmount: "300000.00",
            deliveredAmount: "210000.00",
            outstandingAmount: "90000.00",
            cancelled: false,
            cancelledQty: "0.000",
          },
        ],
      },
      {
        salesOrderId: "",
        soNo: "SO-2026-10-0004",
        soDate: "2026-10-05",
        status: "CONFIRMED",
        cancelled: false,
        unitCode: "กก.",
        orderedQty: "5000.000",
        deliveredQty: "0.000",
        outstandingQty: "5000.000",
        salesAmount: "100000.00",
        deliveredAmount: "0.00",
        outstandingAmount: "100000.00",
        lines: [
          {
            itemCode: "FG-CB",
            itemName: "Carbon Black",
            itemCategoryName: "สินค้าสำเร็จรูป",
            unitCode: "กก.",
            orderedQty: "5000.000",
            deliveredQty: "0.000",
            outstandingQty: "5000.000",
            salesAmount: "100000.00",
            deliveredAmount: "0.00",
            outstandingAmount: "100000.00",
            cancelled: false,
            cancelledQty: "0.000",
          },
        ],
      },
    ],
  },
  {
    customerCode: "C-B",
    customerName: "บริษัท B",
    unitCode: "กก.",
    orderedQty: "10000.000",
    deliveredQty: "5000.000",
    outstandingQty: "5000.000",
    salesAmount: "200000.00",
    deliveredAmount: "100000.00",
    outstandingAmount: "100000.00",
    orders: [
      {
        salesOrderId: "",
        soNo: "SO-2026-10-0002",
        soDate: "2026-10-02",
        status: "CONFIRMED",
        cancelled: false,
        unitCode: "กก.",
        orderedQty: "10000.000",
        deliveredQty: "5000.000",
        outstandingQty: "5000.000",
        salesAmount: "200000.00",
        deliveredAmount: "100000.00",
        outstandingAmount: "100000.00",
        lines: [
          {
            itemCode: "FG-CB",
            itemName: "Carbon Black",
            itemCategoryName: "สินค้าสำเร็จรูป",
            unitCode: "กก.",
            orderedQty: "10000.000",
            deliveredQty: "5000.000",
            outstandingQty: "5000.000",
            salesAmount: "200000.00",
            deliveredAmount: "100000.00",
            outstandingAmount: "100000.00",
            cancelled: false,
            cancelledQty: "0.000",
          },
        ],
      },
    ],
  },
];

const SAMPLE_SUMMARY: SalesSummaryTotals = {
  unitCode: null,
  orderedQty: null,
  deliveredQty: null,
  outstandingQty: null,
  salesAmount: "800000.00",
  deliveredAmount: "450000.00",
  outstandingAmount: "350000.00",
  salesOrderCount: 3,
};

function formatQty(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** จำนวนที่รวมไม่ได้ (หน่วยปนกัน) เว้นว่าง — ค่า 0 จริงยังแสดง 0 */
const qtyText = (value: string | null | undefined) =>
  value === null || value === undefined ? "" : formatQty(value);

/** 01/10/2569 — วัน/เดือน/ปี พ.ศ. (lang = "en" → ค.ศ.; ไฟล์ส่งออกไม่ส่ง lang = พ.ศ. เสมอ) */
function formatBeDate(isoDate: string, lang: Language = "th") {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  if (lang === "en") return d.format("DD/MM/YYYY");
  return `${d.format("DD/MM/")}${d.year() + 543}`;
}

/** สถานะการส่งมอบ (ตัวกรอง) ตามภาษา */
function deliveryStatusLabel(value: SalesDeliveryStatusFilter, thai: string, lang: Language) {
  if (lang !== "en") return thai;
  const en: Record<SalesDeliveryStatusFilter, string> = {
    ALL: "All delivery statuses",
    NOT_DELIVERED: "Not delivered",
    PARTIAL: "Partially delivered",
    DELIVERED: "Delivered",
  };
  return en[value] ?? thai;
}

/** "ยกเลิก" ในความหมายสถานะ (Cancelled) — ต่างจากปุ่ม Cancel */
const cancelledWord = (lang: Language) => (lang === "en" ? "Cancelled" : "ยกเลิก");

function rangeLabel(dateFrom: string, dateTo: string) {
  return `ช่วงวันที่ ${formatBeDate(dateFrom)} – ${formatBeDate(dateTo)}`;
}

function hasCancelledQty(row: SummaryRow) {
  return Number(row.cancelledQty ?? 0) > 0;
}

function toTableRows(
  groups: SalesSummaryCustomerGroup[],
  startSeq: number,
  prefix: string,
): SummaryRow[] {
  return groups.flatMap((group, index) => {
    const key = `${prefix}-${index + 1}`;
    return [
      {
        key,
        kind: "customer" as const,
        seq: startSeq + index,
        label: group.customerName,
        cancelled: false,
        unitCode: group.unitCode,
        orderedQty: group.orderedQty,
        deliveredQty: group.deliveredQty,
        outstandingQty: group.outstandingQty,
        salesAmount: group.salesAmount,
        deliveredAmount: group.deliveredAmount,
        outstandingAmount: group.outstandingAmount,
      },
      ...group.orders.flatMap((order, orderIndex) => {
        const orderKey = `${key}-so-${orderIndex + 1}`;
        return [
          {
            key: orderKey,
            kind: "order" as const,
            label: order.soNo,
            salesOrderId: order.salesOrderId,
            soDate: order.soDate,
            cancelled: order.cancelled,
            unitCode: order.unitCode,
            orderedQty: order.orderedQty,
            deliveredQty: order.deliveredQty,
            outstandingQty: order.outstandingQty,
            salesAmount: order.salesAmount,
            deliveredAmount: order.deliveredAmount,
            outstandingAmount: order.outstandingAmount,
          },
          ...order.lines.map((line, lineIndex) => ({
            key: `${orderKey}-line-${lineIndex + 1}`,
            kind: "line" as const,
            label: line.itemName,
            cancelled: line.cancelled,
            cancelledQty: line.cancelledQty,
            unitCode: line.unitCode,
            orderedQty: line.orderedQty,
            deliveredQty: line.deliveredQty,
            outstandingQty: line.outstandingQty,
            salesAmount: line.salesAmount,
            deliveredAmount: line.deliveredAmount,
            outstandingAmount: line.outstandingAmount,
          })),
        ];
      }),
    ];
  });
}

/** ลูกค้า → SO → สินค้า เป็น children — ตารางบนจอขยาย/ยุบได้ทั้งสองชั้น */
function toTreeRows(
  groups: SalesSummaryCustomerGroup[],
  startSeq: number,
  prefix: string,
): SummaryRow[] {
  const customers: SummaryRow[] = [];
  let order: SummaryRow | undefined;
  for (const row of toTableRows(groups, startSeq, prefix)) {
    if (row.kind === "customer") {
      customers.push({ ...row, children: [] });
      order = undefined;
    } else if (row.kind === "order") {
      order = { ...row, children: [] };
      customers[customers.length - 1]?.children?.push(order);
    } else {
      order?.children?.push(row);
    }
  }
  const pruneEmpty = (row: SummaryRow): SummaryRow =>
    row.children?.length
      ? { ...row, children: row.children.map(pruneEmpty) }
      : { ...row, children: undefined };
  return customers.map(pruneEmpty);
}

function expandableRowKeys(rows: SummaryRow[]): string[] {
  return rows.flatMap((row) =>
    row.children ? [row.key, ...expandableRowKeys(row.children)] : [],
  );
}

/** ข้อความช่อง ลูกค้า / SO / สินค้า สำหรับไฟล์ — หน้าจอใช้ Tag แทนวงเล็บ */
function exportLabel(row: SummaryRow, includeCancelled: boolean) {
  if (row.kind === "customer") return row.label;
  const cancelled = row.cancelled ? " (ยกเลิก)" : "";
  if (row.kind === "order") return `${row.label}${cancelled}`;
  const cancelledQty =
    includeCancelled && hasCancelledQty(row)
      ? ` · ยกเลิก ${formatQty(row.cancelledQty ?? "0")} ${row.unitCode ?? ""}`
      : "";
  return `↳ ${row.label}${cancelled}${cancelledQty}`.trimEnd();
}

function toSheet(
  groups: SalesSummaryCustomerGroup[],
  summary: SalesSummaryTotals,
  dateFrom: string,
  dateTo: string,
  includeCancelled: boolean,
): TabularReport {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  const subGroupRows: number[] = [];
  toTableRows(groups, 1, "export").forEach((row) => {
    if (row.kind === "customer") groupRows.push(rows.length);
    if (row.kind === "order") subGroupRows.push(rows.length);
    rows.push([
      row.seq === undefined ? "" : String(row.seq),
      exportLabel(row, includeCancelled),
      row.soDate ? formatBeDate(row.soDate) : "",
      row.unitCode ?? "",
      ...QTY_COLUMNS.map(([, field]) => qtyText(row[field])),
      ...MONEY_COLUMNS.map(([, field]) => formatMoney(row[field])),
    ]);
  });
  groupRows.push(rows.length);
  rows.push([
    "",
    "รวมทั้งหมด",
    "",
    summary.unitCode ?? "",
    ...QTY_COLUMNS.map(([, field]) => qtyText(summary[field])),
    ...MONEY_COLUMNS.map(([, field]) => formatMoney(summary[field])),
  ]);
  return {
    title: TITLE,
    filename: `sales-summary-${dateFrom}-${dateTo}`,
    meta: [
      rangeLabel(dateFrom, dateTo),
      `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
      includeCancelled
        ? "แสดงรายการที่ยกเลิกด้วย (ไม่นับในยอด)"
        : "เฉพาะรายการที่มียอดขาย",
      `มูลค่ายอดขาย: ${formatMoney(summary.salesAmount)} บาท`,
      `มูลค่าส่งมอบแล้ว: ${formatMoney(summary.deliveredAmount)} บาท`,
      `มูลค่าค้างส่ง: ${formatMoney(summary.outstandingAmount)} บาท`,
      `จำนวนใบสั่งขาย: ${summary.salesOrderCount.toLocaleString("th-TH")} ใบ`,
    ],
    headers: EXPORT_HEADERS,
    rows,
    groupRows,
    subGroupRows,
    pdfColumns: PDF_COLUMNS,
  };
}

function labelCell(row: SummaryRow, includeCancelled: boolean, t: TFunction, lang: Language) {
  const CANCELLED_TAG = (
    <Tag color="default" style={{ marginInlineStart: 8 }}>
      {cancelledWord(lang)}
    </Tag>
  );
  if (row.kind === "customer") return <strong>{row.label}</strong>;
  if (row.kind === "order") {
    return (
      <span style={{ paddingInlineStart: 16 }}>
        {row.salesOrderId ? (
          <Link href={`/sales-orders/${row.salesOrderId}`}>
            <strong>{row.label}</strong>
          </Link>
        ) : (
          <strong>{row.label}</strong>
        )}
        {row.cancelled ? CANCELLED_TAG : null}
      </span>
    );
  }
  return (
    <span
      style={{
        paddingInlineStart: 32,
        color: row.cancelled ? "#9ca3af" : undefined,
      }}
    >
      ↳ {row.label}
      {row.cancelled ? CANCELLED_TAG : null}
      {includeCancelled && hasCancelledQty(row) ? (
        <span style={{ marginInlineStart: 8, color: "#9ca3af", fontSize: 12 }}>
          {t("ยกเลิก {qty} {unit}", { qty: formatQty(row.cancelledQty ?? "0"), unit: row.unitCode ?? "" })}
        </span>
      ) : null}
    </span>
  );
}

const emphasize = (row: SummaryRow, content: string) =>
  row.kind === "line" ? content : <strong>{content}</strong>;

function buildColumns(includeCancelled: boolean, t: TFunction, lang: Language): ColumnsType<SummaryRow> {
  return [
    {
      title: t("ลำดับ"),
      dataIndex: "seq",
      width: 104,
      render: (value: number | undefined) => value ?? "",
    },
    {
      title: t("ลูกค้า / SO / สินค้า"),
      dataIndex: "label",
      render: (_value: string, row) => labelCell(row, includeCancelled, t, lang),
    },
    {
      title: t("วันที่ SO"),
      dataIndex: "soDate",
      width: 110,
      render: (value: string | undefined) => (value ? formatBeDate(value, lang) : ""),
    },
    {
      title: t("หน่วยนับ"),
      dataIndex: "unitCode",
      width: 90,
      render: (value: string | null, row) => emphasize(row, value ?? ""),
    },
    ...QTY_COLUMNS.map(([title, dataIndex]) => ({
      title: t(title),
      dataIndex,
      align: "right" as const,
      render: (value: string | null, row: SummaryRow) =>
        emphasize(row, qtyText(value)),
    })),
    ...MONEY_COLUMNS.map(([title, dataIndex]) => ({
      title: t(title),
      dataIndex,
      align: "right" as const,
      render: (value: string, row: SummaryRow) =>
        emphasize(row, formatMoney(value)),
    })),
  ];
}

export default function SalesSummaryReportPage() {
  const t = useT();
  const lang = useLanguage();
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [itemId, setItemId] = useState<string | undefined>();
  const [itemCategoryId, setItemCategoryId] = useState<string | undefined>();
  const [soStatus, setSoStatus] = useState<string | undefined>();
  const [deliveryStatus, setDeliveryStatus] =
    useState<SalesDeliveryStatusFilter>("ALL");
  const [cancelledFilter, setCancelledFilter] =
    useState<CancelledFilter>("ACTIVE");
  const [applied, setApplied] = useState<SalesSummaryReportQuery>(() => ({
    dateFrom: dayjs().startOf("month").format("YYYY-MM-DD"),
    dateTo: dayjs().format("YYYY-MM-DD"),
    deliveryStatus: "ALL",
    includeCancelled: false,
  }));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);

  const customersQuery = useCustomersQuery({ isActive: true });
  const itemsQuery = useItemsQuery({ isActive: true, isSalesItem: true });
  const categoriesQuery = useItemCategoriesQuery({ isActive: true });
  const reportQuery = useProcurementSalesByItemReportQuery({
    ...applied,
    page,
    limit,
  });

  const includeCancelled = applied.includeCancelled ?? false;
  const report = reportQuery.data?.data;
  const total = report?.total ?? 0;
  const showingSample = reportQuery.isSuccess && total === 0;
  const summary = showingSample ? SAMPLE_SUMMARY : report?.summary;
  const dateFrom = report?.dateFrom ?? applied.dateFrom ?? "";
  const dateTo = report?.dateTo ?? applied.dateTo ?? "";
  const tableRows = useMemo(
    () =>
      showingSample
        ? toTreeRows(SAMPLE_GROUPS, 1, "sample")
        : toTreeRows(
            report?.items ?? [],
            (page - 1) * limit + 1,
            `customer-${page}`,
          ),
    [showingSample, report, page, limit],
  );
  const expandableKeys = useMemo(
    () => expandableRowKeys(tableRows),
    [tableRows],
  );
  const expandedRowKeys = expandableKeys.filter((key) => !collapsed.has(key));
  const allCollapsed =
    expandableKeys.length > 0 && expandedRowKeys.length === 0;
  const columns = useMemo(
    () => buildColumns(includeCancelled, t, lang),
    [includeCancelled, t, lang],
  );

  const canExport =
    !isMatrixPermissionMode() || hasPermission("REPORTS_SALES_BY_ITEM.EXPORT");

  const applySearch = () => {
    setPage(1);
    setCollapsed(new Set());
    setApplied({
      dateFrom: dateRange[0].format("YYYY-MM-DD"),
      dateTo: dateRange[1].format("YYYY-MM-DD"),
      customerId,
      itemId,
      itemCategoryId,
      soStatus,
      deliveryStatus,
      includeCancelled: cancelledFilter === "INCLUDE",
    });
  };

  const clearFilters = () => {
    const from = dayjs().startOf("month");
    const to = dayjs();
    setDateRange([from, to]);
    setCustomerId(undefined);
    setItemId(undefined);
    setItemCategoryId(undefined);
    setSoStatus(undefined);
    setDeliveryStatus("ALL");
    setCancelledFilter("ACTIVE");
    setPage(1);
    setCollapsed(new Set());
    setApplied({
      dateFrom: from.format("YYYY-MM-DD"),
      dateTo: to.format("YYYY-MM-DD"),
      deliveryStatus: "ALL",
      includeCancelled: false,
    });
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format);
    try {
      const exported = await exportProcurementSalesByItemReport(
        getAccessToken(),
        applied,
      );
      const empty = exported.data.items.length === 0;
      if (empty) {
        message.info(t("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง"));
      }
      await downloadTabularReport(
        format,
        toSheet(
          empty ? SAMPLE_GROUPS : exported.data.items,
          empty ? SAMPLE_SUMMARY : exported.data.summary,
          exported.data.dateFrom,
          exported.data.dateTo,
          includeCancelled,
        ),
      );
    } catch {
      message.error(t("ดาวน์โหลดรายงานไม่สำเร็จ"));
    } finally {
      setExporting(null);
    }
  };

  const cards = [
    { label: t("มูลค่ายอดขาย"), value: summary?.salesAmount, money: true },
    { label: t("มูลค่าส่งมอบแล้ว"), value: summary?.deliveredAmount, money: true },
    { label: t("มูลค่าค้างส่ง"), value: summary?.outstandingAmount, money: true },
    {
      label: t("จำนวนใบสั่งขาย"),
      value: summary ? String(summary.salesOrderCount) : undefined,
      money: false,
    },
  ];

  const filterItem = (label: string, control: React.ReactNode) => (
    <div className={styles.filterItem}>
      <label>{label}</label>
      {control}
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reports · Sales by Item"
        icon={<BarChartOutlined />}
        title={t(TITLE)}
        subtitle={t("ยอดขายจากใบสั่งขายที่ยืนยันแล้ว แยกตามลูกค้า ใบสั่งขาย และสินค้า พร้อมยอดส่งมอบและยอดค้างส่ง")}
        actions={
          <>

          <ReportExportButtons
            canExport={canExport}
            csvRequiresExport
            downloading={exporting}
            onExport={(format) => void handleExport(format)}
          />
          </>
        }
      />

      <div className={styles.statRow} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {cards.map((card) => (
          <div key={card.label} className={styles.statChip}>
            <span className={styles.statLabel}>{card.label}</span>
            <span className={styles.statValue}>
              {card.value === undefined
                ? "–"
                : card.money
                  ? formatMoney(card.value)
                  : Number(card.value).toLocaleString("th-TH")}
            </span>
            <span className={styles.statHint}>{card.money ? t("บาท") : t("ใบ")}</span>
          </div>
        ))}
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          {filterItem(
            t("ช่วงวันที่"),
            <DatePicker.RangePicker
              allowClear={false}
              style={{ width: "100%" }}
              value={dateRange}
              format="DD/MM/YYYY"
              onChange={(value) => {
                if (value?.[0] && value[1]) {
                  setDateRange([value[0], value[1]]);
                }
              }}
            />,
          )}
          {filterItem(
            t("ลูกค้า"),
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={customerId}
              loading={customersQuery.isLoading}
              options={(customersQuery.data?.data ?? []).map((customer) => ({
                value: customer.id,
                label: `${customer.customerCode} ${customer.nameTh}`,
              }))}
              onChange={setCustomerId}
            />,
          )}
          {filterItem(
            t("สินค้า"),
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={itemId}
              loading={itemsQuery.isLoading}
              options={(itemsQuery.data?.data ?? []).map((item) => ({
                value: item.id,
                label: `${item.itemCode} ${item.itemNameTh}`,
              }))}
              onChange={setItemId}
            />,
          )}
          {filterItem(
            t("ประเภทสินค้า"),
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={itemCategoryId}
              loading={categoriesQuery.isLoading}
              options={(categoriesQuery.data?.data ?? []).map((category) => ({
                value: category.id,
                label: category.nameTh,
              }))}
              onChange={setItemCategoryId}
            />,
          )}
          {filterItem(
            t("สถานะ SO"),
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={soStatus}
              options={CONFIRMED_STATUSES.map((status) => ({
                value: status,
                label: tSoStatus(SALES_ORDER_STATUS_LABEL[status], lang),
              }))}
              onChange={setSoStatus}
            />,
          )}
          {filterItem(
            t("สถานะการส่งมอบ"),
            <Select
              value={deliveryStatus}
              options={DELIVERY_STATUS_OPTIONS.map((o) => ({ ...o, label: deliveryStatusLabel(o.value, o.label, lang) }))}
              onChange={setDeliveryStatus}
            />,
          )}
          {filterItem(
            t("รายการที่ยกเลิก"),
            <Select
              value={cancelledFilter}
              options={CANCELLED_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={setCancelledFilter}
            />,
          )}
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
          <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      {showingSample ? (
        <Alert
          type="info"
          showIcon
          title={t("ข้อมูลตัวอย่าง")}
          description={t("ยังไม่มีใบสั่งขายที่ยืนยันแล้วตามเงื่อนไขนี้ ตาราง ยอดสรุป และไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน")}
        />
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{showingSample ? 0 : total.toLocaleString("th-TH")}</strong> {t("ลูกค้า")}
            {dateFrom && dateTo ? (
              <span> · {t("ช่วงวันที่ {from} – {to}", { from: formatBeDate(dateFrom, lang), to: formatBeDate(dateTo, lang) })}</span>
            ) : null}
          </div>
          <div className={styles.toolbarActions}>
            <Button
              icon={<PlusSquareOutlined />}
              disabled={expandedRowKeys.length === expandableKeys.length}
              onClick={() => setCollapsed(new Set())}
            >
              {t("ขยายทั้งหมด")}
            </Button>
            <Button
              icon={<MinusSquareOutlined />}
              disabled={expandableKeys.length === 0 || allCollapsed}
              onClick={() => setCollapsed(new Set(expandableKeys))}
            >
              {t("ยุบทั้งหมด")}
            </Button>
          </div>
        </div>

        <Table<SummaryRow>
          rowKey="key"
          loading={reportQuery.isLoading}
          columns={columns}
          dataSource={tableRows}
          pagination={false}
          className={styles.table}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ไม่พบใบสั่งขายตามเงื่อนไขที่ค้นหา")}</strong>
                {t("ลองปรับช่วงวันที่หรือตัวกรองอื่น")}
              </div>
            ),
          }}
          expandable={{
            expandedRowKeys,
            onExpand: (isExpanded, row) => {
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (isExpanded) next.delete(row.key);
                else next.add(row.key);
                return next;
              });
            },
          }}
          summary={() =>
            summary ? (
              <Table.Summary.Row className={styles.totalRow}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  {t("รวมทั้งหมด")}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>{summary.unitCode ?? ""}</Table.Summary.Cell>
                {QTY_COLUMNS.map(([title, field], index) => (
                  <Table.Summary.Cell key={title} index={4 + index} align="right">
                    {qtyText(summary[field])}
                  </Table.Summary.Cell>
                ))}
                {MONEY_COLUMNS.map(([title, field], index) => (
                  <Table.Summary.Cell key={title} index={7 + index} align="right">
                    {formatMoney(summary[field])}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            ) : null
          }
        />

        {showingSample ? null : (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              {t("แสดง {from}–{to} จาก {total} ลูกค้า", {
                from: total === 0 ? 0 : (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total: total.toLocaleString("th-TH"),
              })}
            </div>
            <Pagination
              size="small"
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger
              onChange={(nextPage, nextLimit) => {
                setPage(nextPage);
                setLimit(nextLimit);
                setCollapsed(new Set());
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
