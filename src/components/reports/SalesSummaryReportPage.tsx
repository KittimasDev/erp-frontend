"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Pagination,
  Select,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

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
  type SalesOrderStatus,
} from "@/types/sales-orders";
import {
  downloadTabularReport,
  type TabularPdfColumn,
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./ProcurementExtraReportPage.module.css";

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
const PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 26, align: "center" },
  { header: "ลูกค้า / SO / สินค้า", cells: [1], width: 176 },
  { header: "วันที่ SO", cells: [2], width: 58, align: "center" },
  { header: "หน่วย", cells: [3], width: 36, align: "center" },
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

/** 01/10/2569 — วัน/เดือน/ปี พ.ศ. */
function formatBeDate(isoDate: string) {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return `${d.format("DD/MM/")}${d.year() + 543}`;
}

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

const CANCELLED_TAG = (
  <Tag color="default" style={{ marginInlineStart: 8 }}>
    ยกเลิก
  </Tag>
);

function labelCell(row: SummaryRow, includeCancelled: boolean) {
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
          ยกเลิก {formatQty(row.cancelledQty ?? "0")} {row.unitCode ?? ""}
        </span>
      ) : null}
    </span>
  );
}

const emphasize = (row: SummaryRow, content: string) =>
  row.kind === "line" ? content : <strong>{content}</strong>;

function buildColumns(includeCancelled: boolean): ColumnsType<SummaryRow> {
  return [
    {
      title: "ลำดับ",
      dataIndex: "seq",
      width: 104,
      render: (value: number | undefined) => value ?? "",
    },
    {
      title: "ลูกค้า / SO / สินค้า",
      dataIndex: "label",
      render: (_value: string, row) => labelCell(row, includeCancelled),
    },
    {
      title: "วันที่ SO",
      dataIndex: "soDate",
      width: 110,
      render: (value: string | undefined) => (value ? formatBeDate(value) : ""),
    },
    {
      title: "หน่วยนับ",
      dataIndex: "unitCode",
      width: 90,
      render: (value: string | null, row) => emphasize(row, value ?? ""),
    },
    ...QTY_COLUMNS.map(([title, dataIndex]) => ({
      title,
      dataIndex,
      align: "right" as const,
      render: (value: string | null, row: SummaryRow) =>
        emphasize(row, qtyText(value)),
    })),
    ...MONEY_COLUMNS.map(([title, dataIndex]) => ({
      title,
      dataIndex,
      align: "right" as const,
      render: (value: string, row: SummaryRow) =>
        emphasize(row, formatMoney(value)),
    })),
  ];
}

export default function SalesSummaryReportPage() {
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
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

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
    () => buildColumns(includeCancelled),
    [includeCancelled],
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

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    try {
      const exported = await exportProcurementSalesByItemReport(
        getAccessToken(),
        applied,
      );
      const empty = exported.data.items.length === 0;
      if (empty) {
        message.info("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง");
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
      message.error("ดาวน์โหลดรายงานไม่สำเร็จ");
    } finally {
      setExporting(null);
    }
  };

  const cards = [
    { label: "มูลค่ายอดขาย", value: summary?.salesAmount, money: true },
    { label: "มูลค่าส่งมอบแล้ว", value: summary?.deliveredAmount, money: true },
    { label: "มูลค่าค้างส่ง", value: summary?.outstandingAmount, money: true },
    {
      label: "จำนวนใบสั่งขาย",
      value: summary ? String(summary.salesOrderCount) : undefined,
      money: false,
    },
  ];

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <h1>{TITLE}</h1>
        {canExport ? (
          <div className={styles.exports}>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting === "pdf"}
              onClick={() => void handleExport("pdf")}
            >
              PDF
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting === "xlsx"}
              onClick={() => void handleExport("xlsx")}
            >
              Excel
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting === "csv"}
              onClick={() => void handleExport("csv")}
            >
              CSV
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.filterArea}>
        <div className={`${styles.filterBar} ${styles.filterBarWide}`}>
          <DatePicker.RangePicker
            allowClear={false}
            value={dateRange}
            format="DD/MM/YYYY"
            aria-label="ช่วงวันที่"
            onChange={(value) => {
              if (value?.[0] && value[1]) {
                setDateRange([value[0], value[1]]);
              }
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="ลูกค้าทั้งหมด"
            value={customerId}
            loading={customersQuery.isLoading}
            options={(customersQuery.data?.data ?? []).map((customer) => ({
              value: customer.id,
              label: `${customer.customerCode} ${customer.nameTh}`,
            }))}
            onChange={setCustomerId}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="สินค้าทั้งหมด"
            value={itemId}
            loading={itemsQuery.isLoading}
            options={(itemsQuery.data?.data ?? []).map((item) => ({
              value: item.id,
              label: `${item.itemCode} ${item.itemNameTh}`,
            }))}
            onChange={setItemId}
          />
          <Select
            allowClear
            placeholder="ประเภทสินค้าทั้งหมด"
            value={itemCategoryId}
            loading={categoriesQuery.isLoading}
            options={(categoriesQuery.data?.data ?? []).map((category) => ({
              value: category.id,
              label: category.nameTh,
            }))}
            onChange={setItemCategoryId}
          />
          <Select
            allowClear
            placeholder="สถานะ SO ทั้งหมด"
            value={soStatus}
            options={CONFIRMED_STATUSES.map((status) => ({
              value: status,
              label: SALES_ORDER_STATUS_LABEL[status],
            }))}
            onChange={setSoStatus}
          />
          <Select
            value={deliveryStatus}
            options={DELIVERY_STATUS_OPTIONS}
            onChange={setDeliveryStatus}
            aria-label="สถานะการส่งมอบ"
          />
          <Select
            value={cancelledFilter}
            options={CANCELLED_OPTIONS}
            onChange={setCancelledFilter}
            aria-label="การแสดงรายการที่ยกเลิก"
          />
          <Button type="primary" onClick={applySearch}>
            ค้นหา
          </Button>
        </div>
      </div>

      <div className={styles.cards}>
        {cards.map((card) => (
          <div key={card.label} className={styles.card}>
            <span className={styles.cardLabel}>{card.label}</span>
            <strong className={styles.cardValue}>
              {card.value === undefined
                ? "–"
                : card.money
                  ? formatMoney(card.value)
                  : Number(card.value).toLocaleString("th-TH")}
            </strong>
          </div>
        ))}
      </div>

      <div className={styles.tableToolbar}>
        {dateFrom && dateTo ? (
          <p className={styles.range}>{rangeLabel(dateFrom, dateTo)}</p>
        ) : (
          <span />
        )}
        <div className={styles.toolbarActions}>
          <Button
            icon={<PlusSquareOutlined />}
            disabled={expandedRowKeys.length === expandableKeys.length}
            onClick={() => setCollapsed(new Set())}
          >
            ขยายทั้งหมด
          </Button>
          <Button
            icon={<MinusSquareOutlined />}
            disabled={expandableKeys.length === 0 || allCollapsed}
            onClick={() => setCollapsed(new Set(expandableKeys))}
          >
            ยุบทั้งหมด
          </Button>
        </div>
      </div>

      {showingSample ? (
        <Alert
          type="info"
          showIcon
          title="ข้อมูลตัวอย่าง"
          description="ยังไม่มีใบสั่งขายที่ยืนยันแล้วตามเงื่อนไขนี้ ตาราง ยอดสรุป และไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน"
        />
      ) : null}

      <Table<SummaryRow>
        rowKey="key"
        loading={reportQuery.isLoading}
        columns={columns}
        dataSource={tableRows}
        pagination={false}
        scroll={{ x: 1200 }}
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
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>รวมทั้งหมด</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <strong>{summary.unitCode ?? ""}</strong>
              </Table.Summary.Cell>
              {QTY_COLUMNS.map(([title, field], index) => (
                <Table.Summary.Cell key={title} index={4 + index} align="right">
                  <strong>{qtyText(summary[field])}</strong>
                </Table.Summary.Cell>
              ))}
              {MONEY_COLUMNS.map(([title, field], index) => (
                <Table.Summary.Cell key={title} index={7 + index} align="right">
                  <strong>{formatMoney(summary[field])}</strong>
                </Table.Summary.Cell>
              ))}
            </Table.Summary.Row>
          ) : null
        }
      />
      {showingSample ? null : (
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          showSizeChanger
          showTotal={(count) => `${count.toLocaleString("th-TH")} ลูกค้า`}
          onChange={(nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
            setCollapsed(new Set());
          }}
        />
      )}
    </section>
  );
}
