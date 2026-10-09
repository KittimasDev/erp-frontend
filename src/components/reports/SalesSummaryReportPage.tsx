"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Pagination,
  Select,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
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

const EXPORT_HEADERS = [
  "ลำดับ",
  "ลูกค้า / สินค้า",
  "หน่วยนับ",
  "จำนวนสั่งขาย",
  "จำนวนส่งแล้ว",
  "จำนวนค้างส่ง",
  "มูลค่ายอดขาย",
  "มูลค่าส่งแล้ว",
  "มูลค่าค้างส่ง",
];

/** index ใน cells ตรงกับลำดับช่องของ EXPORT_HEADERS */
const PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 26, align: "center" },
  { header: "ลูกค้า / สินค้า", cells: [1], width: 218 },
  { header: "หน่วย", cells: [2], width: 40, align: "center" },
  ...EXPORT_HEADERS.slice(3).map((header, index) => ({
    header,
    cells: [3 + index],
    width: index < 3 ? 74 : 80,
    numeric: true,
  })),
];

const DASH = "–";

type SummaryRow = {
  key: string;
  isGroup: boolean;
  seq?: number;
  label: string;
  unitCode: string;
  orderedQty?: string;
  deliveredQty?: string;
  outstandingQty?: string;
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
};

const SAMPLE_GROUPS: SalesSummaryCustomerGroup[] = [
  {
    customerCode: "C-A",
    customerName: "บริษัท A",
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
      },
    ],
  },
  {
    customerCode: "C-B",
    customerName: "บริษัท B",
    salesAmount: "350000.00",
    deliveredAmount: "250000.00",
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
      },
      {
        itemCode: "FG-OIL",
        itemName: "Pyrolysis Oil",
        itemCategoryName: "สินค้าสำเร็จรูป",
        unitCode: "ลิตร",
        orderedQty: "5000.000",
        deliveredQty: "5000.000",
        outstandingQty: "0.000",
        salesAmount: "150000.00",
        deliveredAmount: "150000.00",
        outstandingAmount: "0.00",
      },
    ],
  },
];

const SAMPLE_SUMMARY: SalesSummaryTotals = {
  salesAmount: "850000.00",
  deliveredAmount: "600000.00",
  outstandingAmount: "250000.00",
  salesOrderCount: 4,
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

/** 01/10/2569 — วัน/เดือน/ปี พ.ศ. */
function formatBeDate(isoDate: string) {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return `${d.format("DD/MM/")}${d.year() + 543}`;
}

function rangeLabel(dateFrom: string, dateTo: string) {
  return `ช่วงวันที่ ${formatBeDate(dateFrom)} – ${formatBeDate(dateTo)}`;
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
        isGroup: true,
        seq: startSeq + index,
        label: group.customerName,
        unitCode: "รวม",
        salesAmount: group.salesAmount,
        deliveredAmount: group.deliveredAmount,
        outstandingAmount: group.outstandingAmount,
      },
      ...group.lines.map((line, lineIndex) => ({
        key: `${key}-line-${lineIndex + 1}`,
        isGroup: false,
        label: `↳ ${line.itemName}`,
        unitCode: line.unitCode,
        orderedQty: line.orderedQty,
        deliveredQty: line.deliveredQty,
        outstandingQty: line.outstandingQty,
        salesAmount: line.salesAmount,
        deliveredAmount: line.deliveredAmount,
        outstandingAmount: line.outstandingAmount,
      })),
    ];
  });
}

function toSheet(
  groups: SalesSummaryCustomerGroup[],
  summary: SalesSummaryTotals,
  dateFrom: string,
  dateTo: string,
): TabularReport {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  groups.forEach((group, index) => {
    groupRows.push(rows.length);
    rows.push([
      String(index + 1),
      group.customerName,
      "รวม",
      DASH,
      DASH,
      DASH,
      formatMoney(group.salesAmount),
      formatMoney(group.deliveredAmount),
      formatMoney(group.outstandingAmount),
    ]);
    for (const line of group.lines) {
      rows.push([
        "",
        `↳ ${line.itemName}`,
        line.unitCode,
        formatQty(line.orderedQty),
        formatQty(line.deliveredQty),
        formatQty(line.outstandingQty),
        formatMoney(line.salesAmount),
        formatMoney(line.deliveredAmount),
        formatMoney(line.outstandingAmount),
      ]);
    }
  });
  groupRows.push(rows.length);
  rows.push([
    "",
    "รวมทั้งหมด",
    DASH,
    DASH,
    DASH,
    DASH,
    formatMoney(summary.salesAmount),
    formatMoney(summary.deliveredAmount),
    formatMoney(summary.outstandingAmount),
  ]);
  return {
    title: TITLE,
    filename: `sales-summary-${dateFrom}-${dateTo}`,
    meta: [
      rangeLabel(dateFrom, dateTo),
      `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
      `มูลค่ายอดขาย: ${formatMoney(summary.salesAmount)} บาท`,
      `มูลค่าส่งมอบแล้ว: ${formatMoney(summary.deliveredAmount)} บาท`,
      `มูลค่าค้างส่ง: ${formatMoney(summary.outstandingAmount)} บาท`,
      `จำนวนใบสั่งขาย: ${summary.salesOrderCount.toLocaleString("th-TH")} ใบ`,
    ],
    headers: EXPORT_HEADERS,
    rows,
    groupRows,
    pdfColumns: PDF_COLUMNS,
  };
}

const bold = (row: SummaryRow, content: string) =>
  row.isGroup ? <strong>{content}</strong> : content;

const qtyCell = (value: string | undefined) =>
  value === undefined ? DASH : formatQty(value);

const columns: ColumnsType<SummaryRow> = [
  {
    title: "ลำดับ",
    dataIndex: "seq",
    width: 72,
    render: (value: number | undefined) => value ?? "",
  },
  {
    title: "ลูกค้า / สินค้า",
    dataIndex: "label",
    render: (value: string, row) => bold(row, value),
  },
  {
    title: "หน่วยนับ",
    dataIndex: "unitCode",
    render: (value: string, row) => bold(row, value),
  },
  ...(
    [
      ["จำนวนสั่งขาย", "orderedQty"],
      ["จำนวนส่งแล้ว", "deliveredQty"],
      ["จำนวนค้างส่ง", "outstandingQty"],
    ] as const
  ).map(([title, dataIndex]) => ({
    title,
    dataIndex,
    align: "right" as const,
    render: (value: string | undefined) => qtyCell(value),
  })),
  ...(
    [
      ["มูลค่ายอดขาย", "salesAmount"],
      ["มูลค่าส่งแล้ว", "deliveredAmount"],
      ["มูลค่าค้างส่ง", "outstandingAmount"],
    ] as const
  ).map(([title, dataIndex]) => ({
    title,
    dataIndex,
    align: "right" as const,
    render: (value: string, row: SummaryRow) => bold(row, formatMoney(value)),
  })),
];

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
  const [applied, setApplied] = useState<SalesSummaryReportQuery>(() => ({
    dateFrom: dayjs().startOf("month").format("YYYY-MM-DD"),
    dateTo: dayjs().format("YYYY-MM-DD"),
    deliveryStatus: "ALL",
  }));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
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

  const report = reportQuery.data?.data;
  const total = report?.total ?? 0;
  const showingSample = reportQuery.isSuccess && total === 0;
  const summary = showingSample ? SAMPLE_SUMMARY : report?.summary;
  const dateFrom = report?.dateFrom ?? applied.dateFrom ?? "";
  const dateTo = report?.dateTo ?? applied.dateTo ?? "";
  const tableRows = useMemo(
    () =>
      showingSample
        ? toTableRows(SAMPLE_GROUPS, 1, "sample")
        : toTableRows(
            report?.items ?? [],
            (page - 1) * limit + 1,
            `customer-${page}`,
          ),
    [showingSample, report, page, limit],
  );

  const canExport =
    !isMatrixPermissionMode() ||
    hasPermission("REPORTS_SALES_BY_ITEM.EXPORT");

  const applySearch = () => {
    setPage(1);
    setApplied({
      dateFrom: dateRange[0].format("YYYY-MM-DD"),
      dateTo: dateRange[1].format("YYYY-MM-DD"),
      customerId,
      itemId,
      itemCategoryId,
      soStatus,
      deliveryStatus,
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

      <div className={styles.filters}>
        <DatePicker.RangePicker
          allowClear={false}
          value={dateRange}
          format="DD/MM/YYYY"
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
          style={{ minWidth: 220 }}
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
          style={{ minWidth: 220 }}
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
          style={{ minWidth: 180 }}
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
          style={{ minWidth: 170 }}
          value={soStatus}
          options={CONFIRMED_STATUSES.map((status) => ({
            value: status,
            label: SALES_ORDER_STATUS_LABEL[status],
          }))}
          onChange={setSoStatus}
        />
        <Select
          style={{ minWidth: 170 }}
          value={deliveryStatus}
          options={DELIVERY_STATUS_OPTIONS}
          onChange={setDeliveryStatus}
          aria-label="สถานะการส่งมอบ"
        />
        <Button type="primary" onClick={applySearch}>
          ค้นหา
        </Button>
      </div>

      {dateFrom && dateTo ? (
        <p className={styles.range}>{rangeLabel(dateFrom, dateTo)}</p>
      ) : null}

      <div className={styles.cards}>
        {cards.map((card) => (
          <div key={card.label} className={styles.card}>
            <span className={styles.cardLabel}>{card.label}</span>
            <strong className={styles.cardValue}>
              {card.value === undefined
                ? DASH
                : card.money
                  ? formatMoney(card.value)
                  : Number(card.value).toLocaleString("th-TH")}
            </strong>
          </div>
        ))}
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
        scroll={{ x: 1100 }}
        summary={() =>
          summary ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>รวมทั้งหมด</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                {DASH}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {DASH}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                {DASH}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong>{formatMoney(summary.salesAmount)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <strong>{formatMoney(summary.deliveredAmount)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <strong>{formatMoney(summary.outstandingAmount)}</strong>
              </Table.Summary.Cell>
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
          }}
        />
      )}
    </section>
  );
}
