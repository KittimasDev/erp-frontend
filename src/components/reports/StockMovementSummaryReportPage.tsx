"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  MinusSquareOutlined,
  PlusSquareOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useProcurementStockMovementReportQuery } from "@/hooks/procurement-reports/useProcurementReportQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { exportProcurementStockMovementReport } from "@/lib/api/procurement-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type {
  StockMovementSummaryGroup,
  StockMovementSummaryReportQuery,
} from "@/types/procurement-reports";
import {
  downloadTabularReport,
  type TabularPdfColumn,
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./RawTirePurchaseReportPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useLanguage } from "@/lib/i18n/language";
import type { Language } from "@/lib/i18n/translate";
import { useT, type TFunction } from "@/lib/i18n/useT";

const TITLE = "รายงานแสดงสรุปยอดเคลื่อนไหวสินค้า";

const QTY_FIELDS = [
  ["ยอดยกมา", "openingQty"],
  ["รับเข้า", "receivedQty"],
  ["จ่ายออก", "issuedQty"],
  ["ปรับปรุง (+/-)", "adjustedQty"],
  ["ยอดยกไป", "closingQty"],
] as const;

type QtyField = (typeof QTY_FIELDS)[number][1];

const EXPORT_HEADERS = [
  "ลำดับ",
  "รหัสสินค้า",
  "ชื่อสินค้า / Lot",
  "ประเภทสินค้า",
  "คลังสินค้า",
  "หน่วยนับ",
  ...QTY_FIELDS.map(([title]) => title),
];

/** index ใน cells ตรงกับลำดับช่องของ EXPORT_HEADERS */
/*
  "ปรับปรุง (+/-)" ยาวกว่าหัวอื่นในกลุ่มตัวเลข ถ้าใช้ 66 เท่ากันหมดจะตัดสองบรรทัด
  ความกว้างรวมต้องคงที่ 746 จึงหักคืนจากช่อง "สินค้า / Lot" ซึ่งตัดบรรทัดได้
*/
const QTY_COL_WIDTH: Record<string, number> = { "ปรับปรุง (+/-)": 72 };

const PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 36, align: "center" },
  { header: "สินค้า / Lot", cells: [1, 2], width: 168 },
  { header: "ประเภท", cells: [3], width: 72 },
  { header: "คลัง", cells: [4], width: 98 },
  { header: "หน่วย", cells: [5], width: 36, align: "center" },
  ...QTY_FIELDS.map(([title], index) => ({
    header: title,
    cells: [6 + index],
    width: QTY_COL_WIDTH[title] ?? 66,
    numeric: true,
  })),
];

type MovementRow = {
  key: string;
  isGroup: boolean;
  seq?: number;
  itemCode: string;
  label: string;
  itemCategoryName: string;
  warehouseName: string;
  unitCode: string;
  children?: MovementRow[];
} & Record<QtyField, string>;

const SAMPLE_GROUPS: StockMovementSummaryGroup[] = [
  {
    itemCode: "RM-001",
    itemName: "ยางรถยนต์",
    itemCategoryName: "วัตถุดิบ",
    unitCode: "กก.",
    openingQty: "4000.000",
    receivedQty: "3000.000",
    issuedQty: "2000.000",
    adjustedQty: "0.000",
    closingQty: "5000.000",
    lots: [
      {
        lotId: "sample-lot-001",
        lotNo: "LOT-001",
        warehouseNames: ["คลังวัตถุดิบ"],
        openingQty: "2500.000",
        receivedQty: "1500.000",
        issuedQty: "1000.000",
        adjustedQty: "0.000",
        closingQty: "3000.000",
      },
      {
        lotId: "sample-lot-002",
        lotNo: "LOT-002",
        warehouseNames: ["คลังวัตถุดิบ"],
        openingQty: "1500.000",
        receivedQty: "1500.000",
        issuedQty: "1000.000",
        adjustedQty: "0.000",
        closingQty: "2000.000",
      },
    ],
  },
  {
    itemCode: "FG-005",
    itemName: "Carbon Black",
    itemCategoryName: "สินค้าสำเร็จรูป",
    unitCode: "กก.",
    openingQty: "2000.000",
    receivedQty: "1000.000",
    issuedQty: "500.000",
    adjustedQty: "0.000",
    closingQty: "2500.000",
    lots: [
      {
        lotId: "sample-lot-005",
        lotNo: "LOT-005",
        warehouseNames: ["คลังสำเร็จรูป"],
        openingQty: "2000.000",
        receivedQty: "0.000",
        issuedQty: "500.000",
        adjustedQty: "0.000",
        closingQty: "1500.000",
      },
      {
        lotId: "sample-lot-006",
        lotNo: "LOT-006",
        warehouseNames: ["คลัง HOLD"],
        openingQty: "0.000",
        receivedQty: "500.000",
        issuedQty: "0.000",
        adjustedQty: "0.000",
        closingQty: "500.000",
      },
      {
        lotId: "sample-lot-007",
        lotNo: "LOT-007",
        warehouseNames: ["คลังสำเร็จรูป"],
        openingQty: "0.000",
        receivedQty: "500.000",
        issuedQty: "0.000",
        adjustedQty: "0.000",
        closingQty: "500.000",
      },
    ],
  },
];

function formatQty(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/** ปรับปรุงแสดงเครื่องหมายเสมอเมื่อไม่เป็นศูนย์ */
function formatSignedQty(value: string) {
  const n = Number(value);
  if (!n) return formatQty("0");
  return `${n > 0 ? "+" : "-"}${formatQty(String(Math.abs(n)))}`;
}

function formatField(field: QtyField, value: string) {
  return field === "adjustedQty" ? formatSignedQty(value) : formatQty(value);
}

/** 01/10/2569 — วัน/เดือน/ปี พ.ศ. (พ.ศ. ทุกภาษา) */
function formatBeDate(isoDate: string, _lang: Language = "th") {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return d.format("DD/MM/BBBB");
}

function rangeLabel(dateFrom: string, dateTo: string) {
  return `ช่วงวันที่ ${formatBeDate(dateFrom)} – ${formatBeDate(dateTo)}`;
}

function qtyValues(row: Record<QtyField, string>): Record<QtyField, string> {
  return {
    openingQty: row.openingQty,
    receivedQty: row.receivedQty,
    issuedQty: row.issuedQty,
    adjustedQty: row.adjustedQty,
    closingQty: row.closingQty,
  };
}

function itemRow(
  group: StockMovementSummaryGroup,
  key: string,
  seq: number,
): MovementRow {
  return {
    key,
    isGroup: true,
    seq,
    itemCode: group.itemCode,
    label: group.itemName,
    itemCategoryName: group.itemCategoryName,
    warehouseName: "รวม",
    unitCode: group.unitCode,
    ...qtyValues(group),
  };
}

function lotRows(group: StockMovementSummaryGroup, key: string): MovementRow[] {
  return group.lots.map((lot, lotIndex) => ({
    key: `${key}-lot-${lotIndex + 1}`,
    isGroup: false,
    itemCode: "",
    label: `↳ ${lot.lotNo}`,
    itemCategoryName: "",
    warehouseName: lot.warehouseNames.join(", ") || "–",
    unitCode: group.unitCode,
    ...qtyValues(lot),
  }));
}

/** แถวแบน สินค้าตามด้วย Lot ทุกแถว — ใช้ส่งออกไฟล์ */
function toTableRows(
  groups: StockMovementSummaryGroup[],
  startSeq: number,
  prefix: string,
): MovementRow[] {
  return groups.flatMap((group, index) => {
    const key = `${prefix}-${index + 1}`;
    return [itemRow(group, key, startSeq + index), ...lotRows(group, key)];
  });
}

/** แถวสินค้าที่มี Lot เป็น children — ตารางบนจอขยาย/ยุบทีละสินค้า */
function toTreeRows(
  groups: StockMovementSummaryGroup[],
  startSeq: number,
  prefix: string,
): MovementRow[] {
  return groups.map((group, index) => {
    const key = `${prefix}-${index + 1}`;
    const children = lotRows(group, key);
    return {
      ...itemRow(group, key, startSeq + index),
      children: children.length ? children : undefined,
    };
  });
}

function toSheet(
  groups: StockMovementSummaryGroup[],
  dateFrom: string,
  dateTo: string,
): TabularReport {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  toTableRows(groups, 1, "export").forEach((row) => {
    if (row.isGroup) groupRows.push(rows.length);
    rows.push([
      row.seq === undefined ? "" : String(row.seq),
      row.itemCode,
      row.label,
      row.itemCategoryName,
      row.warehouseName,
      row.unitCode,
      ...QTY_FIELDS.map(([, field]) => formatField(field, row[field])),
    ]);
  });
  return {
    title: TITLE,
    filename: `stock-movement-summary-${dateFrom}-${dateTo}`,
    meta: [
      rangeLabel(dateFrom, dateTo),
      `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
      "ยอดยกไป = ยอดยกมา + รับเข้า - จ่ายออก + ปรับปรุง",
    ],
    headers: EXPORT_HEADERS,
    rows,
    groupRows,
    pdfColumns: PDF_COLUMNS,
  };
}

const bold = (row: MovementRow, content: string) =>
  row.isGroup ? <strong>{content}</strong> : content;

const buildColumns = (t: TFunction): ColumnsType<MovementRow> => [
  {
    title: t("ลำดับ"),
    dataIndex: "seq",
    width: 72,
    render: (value: number | undefined) => value ?? "",
  },
  {
    title: t("รหัสสินค้า"),
    dataIndex: "itemCode",
    render: (value: string, row) => bold(row, value),
  },
  {
    title: t("ชื่อสินค้า / Lot"),
    dataIndex: "label",
    render: (value: string, row) => bold(row, value),
  },
  { title: t("ประเภทสินค้า"), dataIndex: "itemCategoryName" },
  {
    title: t("คลังสินค้า"),
    dataIndex: "warehouseName",
    render: (value: string, row) => bold(row, row.isGroup ? t(value) : value),
  },
  { title: t("หน่วยนับ"), dataIndex: "unitCode" },
  ...QTY_FIELDS.map(([title, field]) => ({
    title: t(title),
    dataIndex: field,
    align: "right" as const,
    render: (value: string, row: MovementRow) =>
      bold(row, formatField(field, value)),
  })),
];

export default function StockMovementSummaryReportPage() {
  const t = useT();
  const lang = useLanguage();
  const columns = useMemo(() => buildColumns(t), [t]);
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [itemCategoryId, setItemCategoryId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [applied, setApplied] = useState<StockMovementSummaryReportQuery>(
    () => ({
      dateFrom: dayjs().startOf("month").format("YYYY-MM-DD"),
      dateTo: dayjs().format("YYYY-MM-DD"),
    }),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const categoriesQuery = useItemCategoriesQuery({ isActive: true });
  const reportQuery = useProcurementStockMovementReportQuery({
    ...applied,
    page,
    limit,
  });

  const report = reportQuery.data?.data;
  const total = report?.total ?? 0;
  const showingSample = reportQuery.isSuccess && total === 0;
  const dateFrom = report?.dateFrom ?? applied.dateFrom ?? "";
  const dateTo = report?.dateTo ?? applied.dateTo ?? "";
  const tableRows = useMemo(
    () =>
      showingSample
        ? toTreeRows(SAMPLE_GROUPS, 1, "sample")
        : toTreeRows(
            report?.items ?? [],
            (page - 1) * limit + 1,
            `item-${page}`,
          ),
    [showingSample, report, page, limit],
  );
  const expandableKeys = tableRows
    .filter((row) => row.children)
    .map((row) => row.key);
  const expandedRowKeys = expandableKeys.filter((key) => expanded.has(key));
  const allExpanded =
    expandableKeys.length > 0 &&
    expandedRowKeys.length === expandableKeys.length;

  const canExport =
    !isMatrixPermissionMode() ||
    hasPermission("REPORTS_STOCK_MOVEMENTS.EXPORT");

  const applySearch = () => {
    setPage(1);
    setExpanded(new Set());
    setApplied({
      dateFrom: dateRange[0].format("YYYY-MM-DD"),
      dateTo: dateRange[1].format("YYYY-MM-DD"),
      warehouseId,
      itemCategoryId,
      q: keyword.trim() || undefined,
      lotNo: lotNo.trim() || undefined,
    });
  };

  const clearFilters = () => {
    const from = dayjs().startOf("month");
    const to = dayjs();
    setDateRange([from, to]);
    setWarehouseId(undefined);
    setItemCategoryId(undefined);
    setKeyword("");
    setLotNo("");
    setPage(1);
    setExpanded(new Set());
    setApplied({ dateFrom: from.format("YYYY-MM-DD"), dateTo: to.format("YYYY-MM-DD") });
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format);
    try {
      const exported = await exportProcurementStockMovementReport(
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
          exported.data.dateFrom,
          exported.data.dateTo,
        ),
      );
    } catch {
      message.error(t("ดาวน์โหลดรายงานไม่สำเร็จ"));
    } finally {
      setExporting(null);
    }
  };

  const filterItem = (label: string, control: React.ReactNode) => (
    <div className={styles.filterItem}>
      <label>{label}</label>
      {control}
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reports · Stock Movements"
        icon={<SwapOutlined />}
        title={t(TITLE)}
        subtitle={t("ยอดยกมา รับเข้า จ่ายออก ปรับปรุง และยอดยกไป แยกตามสินค้าและ Lot ในช่วงวันที่ที่เลือก")}
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

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("จำนวนสินค้า")}</span>
          <span className={styles.statValue}>{showingSample ? 0 : total.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("ตามเงื่อนไขที่กรอง")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ช่วงวันที่")}</span>
          <span className={styles.statValue} style={{ fontSize: 16 }}>
            {dateFrom && dateTo
              ? t("ช่วงวันที่ {from} – {to}", { from: formatBeDate(dateFrom, lang), to: formatBeDate(dateTo, lang) })
              : "—"}
          </span>
          <span className={styles.statHint}>{t("ยกมา = ก่อนวันเริ่มต้น")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          {filterItem(
            t("ช่วงวันที่"),
            <DatePicker.RangePicker
              allowClear={false}
              style={{ width: "100%" }}
              value={dateRange}
              format="DD/MM/BBBB"
              onChange={(value) => {
                if (value?.[0] && value[1]) {
                  setDateRange([value[0], value[1]]);
                }
              }}
            />,
          )}
          {filterItem(
            t("คลังสินค้า"),
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={warehouseId}
              loading={warehousesQuery.isLoading}
              options={(warehousesQuery.data?.data ?? []).map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.warehouseName,
              }))}
              onChange={setWarehouseId}
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
            t("สินค้า"),
            <Input
              allowClear
              placeholder={t("รหัสหรือชื่อสินค้า")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={applySearch}
            />,
          )}
          {filterItem(
            "Lot",
            <Input
              allowClear
              placeholder={t("ค้นเลข Lot")}
              value={lotNo}
              onChange={(event) => setLotNo(event.target.value)}
              onPressEnter={applySearch}
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
          description={t("ยังไม่มีสินค้าที่มียอดหรือการเคลื่อนไหวตามเงื่อนไขนี้ ตารางและไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน")}
        />
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{showingSample ? 0 : total.toLocaleString("th-TH")}</strong> {t("รายการสินค้า")}
          </div>
          <div className={styles.toolbarActions}>
            <Button
              icon={<PlusSquareOutlined />}
              disabled={expandableKeys.length === 0 || allExpanded}
              onClick={() => setExpanded(new Set(expandableKeys))}
            >
              {t("ขยายทั้งหมด")}
            </Button>
            <Button
              icon={<MinusSquareOutlined />}
              disabled={expandedRowKeys.length === 0}
              onClick={() => setExpanded(new Set())}
            >
              {t("ยุบทั้งหมด")}
            </Button>
          </div>
        </div>

        <Table<MovementRow>
          rowKey="key"
          loading={reportQuery.isLoading}
          columns={columns}
          dataSource={tableRows}
          pagination={false}
          className={styles.table}
          scroll={{ x: 1280 }}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ไม่พบสินค้าตามเงื่อนไขที่ค้นหา")}</strong>
                {t("ลองปรับช่วงวันที่หรือตัวกรองอื่น")}
              </div>
            ),
          }}
          expandable={{
            expandedRowKeys,
            onExpand: (isExpanded, row) => {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (isExpanded) next.add(row.key);
                else next.delete(row.key);
                return next;
              });
            },
          }}
        />

        {showingSample ? null : (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              {t("แสดง {from}–{to} จาก {total}", {
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
                setExpanded(new Set());
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
