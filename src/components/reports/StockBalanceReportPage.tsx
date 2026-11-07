"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  InboxOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useProcurementStockBalanceReportQuery } from "@/hooks/procurement-reports/useProcurementReportQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { exportProcurementStockBalanceReport } from "@/lib/api/procurement-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type {
  StockBalanceGroup,
  StockBalanceReportQuery,
  StockBalanceStatusFilter,
} from "@/types/procurement-reports";
import {
  downloadTabularReport,
  type TabularPdfColumn,
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./RawTirePurchaseReportPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT, type TFunction } from "@/lib/i18n/useT";

const TITLE = "รายงานแสดงสินค้าคงเหลือ";

const STATUS_OPTIONS: { value: StockBalanceStatusFilter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "IN_STOCK", label: "มีสินค้า" },
  { value: "OUT_OF_STOCK", label: "สินค้าหมด" },
];

const EXPORT_HEADERS = [
  "ลำดับ",
  "รหัสสินค้า",
  "ชื่อสินค้า / Lot",
  "ประเภทสินค้า",
  "คลังสินค้า",
  "หน่วยนับ",
  "คงเหลือ",
  "จอง",
  "พร้อมใช้",
];

/** index ใน cells ตรงกับลำดับช่องของ EXPORT_HEADERS */
/*
  ความกว้างรวมต้องเป็น 746 (TABLE_WIDTH ของ tabularReportPdf) การเพิ่มช่องหนึ่ง
  ต้องหักอีกช่องเสมอ · ตัวเลขพวกนี้คุมว่าหัวตารางตัดบรรทัดไหม จึงอย่าแก้ทีละช่อง

  ลำดับ 26 -> 36 : เดิมเหลือเนื้อที่ ~14px แต่คำว่า "ลำดับ" กว้างกว่านั้น เลยตัดสองบรรทัด
  คลัง 120 -> 132 : ให้ "คลังสินค้าสำเร็จรูป" อยู่บรรทัดเดียว
  สินค้า / Lot ยอมหด 236 -> 214 เพราะเป็นช่องที่ตัดบรรทัดได้โดยไม่เสียความหมาย
*/
const PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 36, align: "center" },
  { header: "สินค้า / Lot", cells: [1, 2], width: 214 },
  { header: "ประเภท", cells: [3], width: 72 },
  { header: "คลัง", cells: [4], width: 132 },
  { header: "หน่วย", cells: [5], width: 40, align: "center" },
  { header: "คงเหลือ", cells: [6], width: 84, numeric: true },
  { header: "จอง", cells: [7], width: 84, numeric: true },
  { header: "พร้อมใช้", cells: [8], width: 84, numeric: true },
];

type BalanceRow = {
  key: string;
  isGroup: boolean;
  seq?: number;
  itemCode: string;
  label: string;
  itemCategoryName: string;
  warehouseName: string;
  unitCode: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  children?: BalanceRow[];
};

const SAMPLE_GROUPS: StockBalanceGroup[] = [
  {
    itemCode: "RM-001",
    itemName: "ยางรถยนต์",
    itemCategoryName: "วัตถุดิบ",
    unitCode: "KG",
    quantityOnHand: "5000.000",
    quantityReserved: "500.000",
    quantityAvailable: "4500.000",
    lots: [
      {
        lotNo: "LOT-001",
        warehouseName: "คลังวัตถุดิบ",
        quantityOnHand: "3000.000",
        quantityReserved: "300.000",
        quantityAvailable: "2700.000",
      },
      {
        lotNo: "LOT-002",
        warehouseName: "คลังวัตถุดิบ",
        quantityOnHand: "2000.000",
        quantityReserved: "200.000",
        quantityAvailable: "1800.000",
      },
    ],
  },
  {
    itemCode: "FG-005",
    itemName: "Carbon Black",
    itemCategoryName: "สินค้าสำเร็จรูป",
    unitCode: "KG",
    quantityOnHand: "3000.000",
    quantityReserved: "500.000",
    quantityAvailable: "1500.000",
    lots: [
      {
        lotNo: "LOT-005",
        warehouseName: "คลังสำเร็จรูป",
        quantityOnHand: "2000.000",
        quantityReserved: "500.000",
        quantityAvailable: "1500.000",
      },
      {
        lotNo: "LOT-006",
        warehouseName: "คลัง HOLD",
        quantityOnHand: "1000.000",
        quantityReserved: "0.000",
        quantityAvailable: "0.000",
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

function toTableRows(
  groups: StockBalanceGroup[],
  startSeq: number,
  prefix: string,
): BalanceRow[] {
  return groups.map((group, index) => {
    const key = `${prefix}-${index + 1}`;
    return {
      key,
      isGroup: true,
      seq: startSeq + index,
      itemCode: group.itemCode,
      label: group.itemName,
      itemCategoryName: group.itemCategoryName,
      warehouseName: "รวม",
      unitCode: group.unitCode,
      quantityOnHand: group.quantityOnHand,
      quantityReserved: group.quantityReserved,
      quantityAvailable: group.quantityAvailable,
      children: group.lots.length
        ? group.lots.map((lot, lotIndex) => ({
            key: `${key}-lot-${lotIndex + 1}`,
            isGroup: false,
            itemCode: "",
            label: `↳ ${lot.lotNo}`,
            itemCategoryName: "",
            warehouseName: lot.warehouseName,
            unitCode: group.unitCode,
            quantityOnHand: lot.quantityOnHand,
            quantityReserved: lot.quantityReserved,
            quantityAvailable: lot.quantityAvailable,
          }))
        : undefined,
    };
  });
}

function toSheet(
  groups: StockBalanceGroup[],
  asOfDate: string,
): TabularReport {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  groups.forEach((group, index) => {
    groupRows.push(rows.length);
    rows.push([
      String(index + 1),
      group.itemCode,
      group.itemName,
      group.itemCategoryName,
      "รวม",
      group.unitCode,
      formatQty(group.quantityOnHand),
      formatQty(group.quantityReserved),
      formatQty(group.quantityAvailable),
    ]);
    for (const lot of group.lots) {
      rows.push([
        "",
        "",
        `↳ ${lot.lotNo}`,
        "",
        lot.warehouseName,
        group.unitCode,
        formatQty(lot.quantityOnHand),
        formatQty(lot.quantityReserved),
        formatQty(lot.quantityAvailable),
      ]);
    }
  });
  return {
    title: TITLE,
    filename: `stock-balance-${asOfDate}`,
    meta: [
      `วันที่รายงาน: ${dayjs(asOfDate).format("DD/MM/YYYY")}`,
      `วันที่ออกรายงาน: ${dayjs().format("DD/MM/YYYY HH:mm")}`,
    ],
    headers: EXPORT_HEADERS,
    rows,
    groupRows,
    pdfColumns: PDF_COLUMNS,
  };
}

const buildColumns = (t: TFunction): ColumnsType<BalanceRow> => [
  {
    title: t("ลำดับ"),
    dataIndex: "seq",
    width: 80,
    render: (value: number | undefined) => value ?? "",
  },
  { title: t("รหัสสินค้า"), dataIndex: "itemCode" },
  {
    title: t("ชื่อสินค้า / Lot"),
    dataIndex: "label",
    render: (value: string, row) =>
      row.isGroup ? <strong>{value}</strong> : value,
  },
  { title: t("ประเภทสินค้า"), dataIndex: "itemCategoryName" },
  {
    title: t("คลังสินค้า"),
    dataIndex: "warehouseName",
    render: (value: string, row) =>
      row.isGroup ? <strong>{t(value)}</strong> : value,
  },
  { title: t("หน่วยนับ"), dataIndex: "unitCode" },
  ...(
    [
      ["คงเหลือ", "quantityOnHand"],
      ["จอง", "quantityReserved"],
      ["พร้อมใช้", "quantityAvailable"],
    ] as const
  ).map(([title, dataIndex]) => ({
    title: t(title),
    dataIndex,
    align: "right" as const,
    render: (value: string, row: BalanceRow) =>
      row.isGroup ? <strong>{formatQty(value)}</strong> : formatQty(value),
  })),
];

export default function StockBalanceReportPage() {
  const t = useT();
  const columns = useMemo(() => buildColumns(t), [t]);
  const { message } = App.useApp();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [itemCategoryId, setItemCategoryId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [stockStatus, setStockStatus] =
    useState<StockBalanceStatusFilter>("ALL");
  const [applied, setApplied] = useState<StockBalanceReportQuery>(() => ({
    asOfDate: dayjs().format("YYYY-MM-DD"),
    stockStatus: "ALL",
  }));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const categoriesQuery = useItemCategoriesQuery({ isActive: true });
  const reportQuery = useProcurementStockBalanceReportQuery({
    ...applied,
    page,
    limit,
  });

  const total = reportQuery.data?.data.total ?? 0;
  const showingSample = reportQuery.isSuccess && total === 0;
  const tableRows = useMemo(
    () =>
      showingSample
        ? toTableRows(SAMPLE_GROUPS, 1, "sample")
        : toTableRows(
            reportQuery.data?.data.items ?? [],
            (page - 1) * limit + 1,
            `group-${page}`,
          ),
    [showingSample, reportQuery.data, page, limit],
  );
  const asOfDate = reportQuery.data?.data.asOfDate || applied.asOfDate;
  const expandableKeys = tableRows
    .filter((row) => row.children)
    .map((row) => row.key);
  const expandedRowKeys = expandableKeys.filter((key) => !collapsed.has(key));

  const canExport =
    !isMatrixPermissionMode() ||
    hasPermission("REPORTS_STOCK_BALANCE.EXPORT");

  const applySearch = () => {
    setPage(1);
    setCollapsed(new Set());
    setApplied({
      asOfDate: asOf.format("YYYY-MM-DD"),
      warehouseId,
      itemCategoryId,
      q: keyword.trim() || undefined,
      lotNo: lotNo.trim() || undefined,
      stockStatus,
    });
  };

  const clearFilters = () => {
    const today = dayjs();
    setAsOf(today);
    setWarehouseId(undefined);
    setItemCategoryId(undefined);
    setKeyword("");
    setLotNo("");
    setStockStatus("ALL");
    setPage(1);
    setCollapsed(new Set());
    setApplied({ asOfDate: today.format("YYYY-MM-DD"), stockStatus: "ALL" });
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format);
    try {
      const exported = await exportProcurementStockBalanceReport(
        getAccessToken(),
        applied,
      );
      const groups =
        exported.data.items.length > 0 ? exported.data.items : SAMPLE_GROUPS;
      if (exported.data.items.length === 0) {
        message.info(t("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง"));
      }
      await downloadTabularReport(
        format,
        toSheet(groups, exported.data.asOfDate || applied.asOfDate || ""),
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
        eyebrow="Reports · Stock Balance"
        icon={<InboxOutlined />}
        title={t(TITLE)}
        subtitle={t("ยอดคงเหลือ ณ สิ้นวันที่เลือก แยกตามสินค้า Lot และคลัง พร้อมยอดจองและยอดพร้อมใช้")}
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
          <span className={styles.statLabel}>{t("ข้อมูล ณ วันที่")}</span>
          <span className={styles.statValue}>{asOfDate ? dayjs(asOfDate).format("DD/MM/YYYY") : "—"}</span>
          <span className={styles.statHint}>{t("ยอดสิ้นวัน")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("สถานะสินค้า")}</span>
          <span className={styles.statValue}>
            {t(STATUS_OPTIONS.find((o) => o.value === (applied.stockStatus ?? "ALL"))?.label ?? "")}
          </span>
          <span className={styles.statHint}>{t("ตัวกรองที่ใช้อยู่")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          {filterItem(
            t("วันที่รายงาน"),
            <DatePicker
              allowClear={false}
              style={{ width: "100%" }}
              value={asOf}
              format="DD/MM/YYYY"
              onChange={(value) => {
                if (value) setAsOf(value);
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
          {filterItem(
            t("สถานะสินค้า"),
            <Select
              value={stockStatus}
              options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={setStockStatus}
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
          description={t("ยังไม่มีรายการจริงตามเงื่อนไขนี้ ตารางและไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน")}
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
              disabled={expandedRowKeys.length === expandableKeys.length}
              onClick={() => setCollapsed(new Set())}
            >
              {t("ขยายทั้งหมด")}
            </Button>
            <Button
              icon={<MinusSquareOutlined />}
              disabled={expandedRowKeys.length === 0}
              onClick={() => setCollapsed(new Set(expandableKeys))}
            >
              {t("ยุบทั้งหมด")}
            </Button>
          </div>
        </div>

        <Table<BalanceRow>
          rowKey="key"
          loading={reportQuery.isLoading}
          columns={columns}
          dataSource={tableRows}
          pagination={false}
          className={styles.table}
          scroll={{ x: 1080 }}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ไม่พบสินค้าตามเงื่อนไขที่ค้นหา")}</strong>
                {t("ลองปรับตัวกรองอื่น")}
              </div>
            ),
          }}
          expandable={{
            expandedRowKeys,
            onExpand: (expanded, row) => {
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (expanded) next.delete(row.key);
                else next.add(row.key);
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
                setCollapsed(new Set());
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
