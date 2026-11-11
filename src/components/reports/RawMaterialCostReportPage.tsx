"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, App, Button, DatePicker, Input, Pagination, Segmented, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import {
  useRawMaterialCostDetailQuery,
  useRawMaterialCostSummaryQuery,
} from "@/hooks/raw-material-cost-report/useRawMaterialCostReportQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { getRawMaterialCostDetail, getRawMaterialCostSummary } from "@/lib/api/raw-material-cost-report";
import { fetchAllReportRows } from "@/lib/api/sales-reports";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { formatErpDate, formatErpTime } from "@/lib/datetime/erp-timezone";
import type {
  RawMaterialCostDetailRow,
  RawMaterialCostQueryParams,
  RawMaterialCostSummaryRow,
  RawMaterialCostTab,
} from "@/types/raw-material-cost-report";
import { RAW_MATERIAL_COST_TYPE_OPTIONS } from "@/types/raw-material-cost-report";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import {
  detailDocLabel,
  detailTypeLabel,
  money,
  qty,
  summaryItemName,
  summaryQuantityTotals,
  toDetailSheet,
  toSummarySheet,
  unitCost,
  type RawMaterialCostExportContext,
} from "@/utils/rawMaterialCostReportSheets";
import styles from "./RawTirePurchaseReportPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

const TAB_OPTIONS: Array<{ label: string; value: RawMaterialCostTab }> = [
  { label: "สรุปต้นทุนวัตถุดิบ", value: "summary" },
  { label: "รายละเอียดต้นทุนวัตถุดิบ", value: "detail" },
];

const DATE_FORMAT = "YYYY-MM-DD";

/** ค่าเริ่มต้น: ตั้งแต่ต้นเดือนถึงวันนี้ (ตรงกับค่าเริ่มต้นของ backend) */
function defaultRange(): [dayjs.Dayjs, dayjs.Dayjs] {
  return [dayjs().startOf("month"), dayjs()];
}

function defaultApplied(): RawMaterialCostQueryParams {
  const [from, to] = defaultRange();
  return { dateFrom: from.format(DATE_FORMAT), dateTo: to.format(DATE_FORMAT) };
}

function negativeClass(value: string) {
  return Number(value) < 0 ? { color: "#cf1322" } : undefined;
}

export default function RawMaterialCostReportPage() {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: RawMaterialCostTab = searchParams.get("tab") === "detail" ? "detail" : "summary";

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(
    defaultRange(),
  );
  const [itemId, setItemId] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [movementType, setMovementType] = useState<string | undefined>();
  const [lotNo, setLotNo] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState<RawMaterialCostQueryParams>(defaultApplied);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);

  const itemsQuery = useItemsQuery({ itemCategoryCode: "RAW_MATERIAL" });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const summaryQuery = useRawMaterialCostSummaryQuery(applied, tab === "summary");
  const detailQuery = useRawMaterialCostDetailQuery({ ...applied, page, limit }, tab === "detail");

  const items = itemsQuery.data?.data ?? [];
  const warehouses = warehousesQuery.data?.data ?? [];
  const summaryData = summaryQuery.data?.data;
  const detailData = detailQuery.data?.data;
  const summaryRows = summaryData?.items ?? [];
  const detailTotal = detailData?.total ?? 0;

  const canExport = !isMatrixPermissionMode() || hasPermission("REPORTS_RAW_MATERIAL_COST.EXPORT");

  const setTab = (next: RawMaterialCostTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "summary") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setPage(1);
  };

  const applySearch = () => {
    setPage(1);
    setApplied({
      dateFrom: (dateRange?.[0] ?? defaultRange()[0]).format(DATE_FORMAT),
      dateTo: (dateRange?.[1] ?? defaultRange()[1]).format(DATE_FORMAT),
      itemId,
      warehouseId,
      movementType,
      lotNo: lotNo.trim() || undefined,
      q: q.trim() || undefined,
    });
  };

  const clearFilters = () => {
    setDateRange(defaultRange());
    setItemId(undefined);
    setWarehouseId(undefined);
    setMovementType(undefined);
    setLotNo("");
    setQ("");
    setApplied(defaultApplied());
    setPage(1);
  };

  /** กดสินค้าในแท็บสรุป → ไปแท็บรายละเอียด กรองสินค้านั้น (ช่วงวันที่/คลัง/ประเภท/Lot เดิมคงไว้) */
  const openItemDetail = (row: RawMaterialCostSummaryRow) => {
    setItemId(row.itemId);
    setQ("");
    setApplied((prev) => ({ ...prev, itemId: row.itemId, q: undefined }));
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "detail");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  /** ตัวกรองที่ใช้อยู่จริง (ที่กดค้นหาแล้ว) เป็นข้อความ — พิมพ์ลงหัวไฟล์ส่งออก */
  const appliedFilterLabels = () => {
    const labels: string[] = [];
    const item = items.find((i) => i.id === applied.itemId);
    if (item) labels.push(`สินค้า: ${item.itemCode} — ${item.itemNameTh}`);
    const warehouse = warehouses.find((w) => w.id === applied.warehouseId);
    if (warehouse) labels.push(`คลังสินค้า: ${warehouse.warehouseName}`);
    const type = RAW_MATERIAL_COST_TYPE_OPTIONS.find((o) => o.value === applied.movementType);
    if (type) labels.push(`ประเภทรายการ: ${type.label}`);
    if (applied.lotNo) labels.push(`Lot: ${applied.lotNo}`);
    if (tab === "detail" && applied.q) labels.push(`ค้นหา: ${applied.q}`);
    return labels;
  };

  /**
   * ส่งออกตามตัวกรองที่ใช้อยู่และแท็บที่เลือก — ดึงทั้งชุด ไม่ใช่เฉพาะหน้าปัจจุบัน
   * สรุป: คำขอเดียวได้ครบ · รายละเอียด: ดึงทุกหน้า (สูงสุด 5,000 รายการ) และแจ้งถ้าถูกตัด
   */
  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format);
    try {
      const token = getAccessToken();
      const context: RawMaterialCostExportContext = {
        dateFrom: applied.dateFrom ?? defaultApplied().dateFrom!,
        dateTo: applied.dateTo ?? defaultApplied().dateTo!,
        filters: appliedFilterLabels(),
      };

      if (tab === "summary") {
        const res = await getRawMaterialCostSummary(token, applied);
        await downloadTabularReport(
          format,
          toSummarySheet(res.data.items, res.data.totals, {
            ...context,
            dateFrom: res.data.dateFrom,
            dateTo: res.data.dateTo,
          }),
        );
        return;
      }

      const all = await fetchAllReportRows((exportPage, exportLimit) =>
        getRawMaterialCostDetail(token, { ...applied, page: exportPage, limit: exportLimit }),
      );
      if (all.truncated) {
        message.warning(
          t("มี {total} รายการ — ไฟล์มีเฉพาะ 5,000 รายการแรก (ยอดรวมเป็นของทั้งชุด)", {
            total: all.total.toLocaleString("th-TH"),
          }),
        );
      }
      await downloadTabularReport(
        format,
        toDetailSheet(all.rows, all.first.totals, {
          ...context,
          dateFrom: all.first.dateFrom,
          dateTo: all.first.dateTo,
          truncated: all.truncated,
          total: all.total,
        }),
      );
    } catch {
      message.error(t("ดาวน์โหลดรายงานไม่สำเร็จ"));
    } finally {
      setExporting(null);
    }
  };

  const summaryColumns: ColumnsType<RawMaterialCostSummaryRow> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 60,
        align: "center" as const,
        render: (_v: unknown, _row: RawMaterialCostSummaryRow, index: number) => index + 1,
      },
      {
        title: t("รหัสสินค้า"),
        key: "itemCode",
        width: 110,
        render: (_v, row) => (
          <button
            type="button"
            className={styles.receiptNo}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textDecoration: "underline" }}
            title={t("ดูรายละเอียดรายการเคลื่อนไหวของสินค้านี้")}
            onClick={() => openItemDetail(row)}
          >
            {row.itemCode}
          </button>
        ),
      },
      { title: t("ชื่อสินค้า"), key: "itemName", render: (_v, row) => summaryItemName(row) },
      {
        title: t("จำนวนยกมา (KG)"),
        key: "openingQty",
        align: "right",
        render: (_v, row) => qty(row.openingQty),
      },
      {
        title: t("มูลค่าต้นทุนยกมา (บาท)"),
        key: "openingValue",
        align: "right",
        render: (_v, row) => money(row.openingValue),
      },
      {
        title: t("ต้นทุนรับเข้า (บาท)"),
        key: "receivedValue",
        align: "right",
        render: (_v, row) => money(row.receivedValue),
      },
      {
        title: t("ต้นทุนเบิกออก (บาท)"),
        key: "issuedValue",
        align: "right",
        render: (_v, row) => money(row.issuedValue),
      },
      {
        title: t("มูลค่าปรับปรุงสุทธิ (บาท)"),
        key: "adjustedValue",
        align: "right",
        render: (_v, row) => <span style={negativeClass(row.adjustedValue)}>{money(row.adjustedValue)}</span>,
      },
      {
        title: t("จำนวนคงเหลือ (KG)"),
        key: "closingQty",
        align: "right",
        render: (_v, row) => <span style={negativeClass(row.closingQty)}>{qty(row.closingQty)}</span>,
      },
      {
        title: t("ต้นทุนเฉลี่ยคงเหลือ (บาท/KG)"),
        key: "closingAvgCost",
        align: "right",
        render: (_v, row) => unitCost(row.closingAvgCost),
      },
      {
        title: t("มูลค่าคงเหลือ (บาท)"),
        key: "closingValue",
        align: "right",
        render: (_v, row) => <span style={negativeClass(row.closingValue)}>{money(row.closingValue)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname, t],
  );

  const detailColumns: ColumnsType<RawMaterialCostDetailRow> = [
    {
      title: t("ลำดับ"),
      key: "no",
      width: 64,
      align: "center",
      render: (_v, _row, index) => (page - 1) * limit + index + 1,
    },
    {
      title: t("วันที่ทำรายการ"),
      key: "movementDate",
      width: 120,
      render: (_v, row) => (
        <>
          {formatErpDate(row.movementDate)}
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {formatErpTime(row.createdAt ?? row.movementDate)}
          </div>
        </>
      ),
    },
    { title: t("ประเภทรายการ"), key: "type", width: 120, render: (_v, row) => t(detailTypeLabel(row)) },
    {
      title: t("เลขที่เอกสารอ้างอิง"),
      key: "doc",
      width: 190,
      render: (_v, row) => <span className={styles.receiptNo}>{detailDocLabel(row) || "—"}</span>,
    },
    { title: t("รหัสสินค้า"), dataIndex: "itemCode", key: "itemCode", width: 110 },
    { title: t("ชื่อสินค้า"), dataIndex: "itemNameTh", key: "itemNameTh" },
    { title: "Lot", key: "lot", render: (_v, row) => row.lotNo ?? "—" },
    { title: t("คลังสินค้า"), dataIndex: "warehouseName", key: "warehouse" },
    {
      title: t("จำนวนเข้า (KG)"),
      key: "qtyIn",
      align: "right",
      render: (_v, row) => (Number(row.quantityIn) > 0 ? qty(row.quantityIn) : "—"),
    },
    {
      title: t("จำนวนออก (KG)"),
      key: "qtyOut",
      align: "right",
      render: (_v, row) => (Number(row.quantityOut) > 0 ? qty(row.quantityOut) : "—"),
    },
    {
      title: t("ต้นทุนต่อหน่วย (บาท/KG)"),
      key: "unitCost",
      align: "right",
      render: (_v, row) => unitCost(row.unitCost),
    },
    {
      title: t("ต้นทุนรวม (บาท)"),
      key: "amount",
      align: "right",
      render: (_v, row) => money(row.amount),
    },
  ];

  const quantityTotals = summaryQuantityTotals(summaryRows);
  const totals = summaryData?.totals;
  const emptyText = (
    <div className={styles.emptyState}>
      <strong>{t("ไม่พบรายการตามเงื่อนไขที่ค้นหา")}</strong>
      {t("ลองปรับช่วงวันที่หรือตัวกรองอื่น")}
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reports · Raw Material Cost"
        icon={<DollarOutlined />}
        title={t("รายงานต้นทุนวัตถุดิบ")}
        subtitle={t("ยกมา รับเข้า เบิกออก ปรับปรุง และคงเหลือของวัตถุดิบ พร้อมรายการเคลื่อนไหวต้นทุนตามเอกสาร และ Lot")}
        actions={
          <>

          <ReportExportButtons
            canExport={canExport}
            downloading={exporting}
            onExport={(format) => void handleExport(format)}
          />
          </>
        }
      />

      <div className={styles.modeBar}>
        <Segmented<RawMaterialCostTab>
          options={TAB_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          value={tab}
          onChange={setTab}
        />
        <span className={styles.modeHint}>
          {tab === "summary"
            ? t("สรุปต่อสินค้า — กดรหัสสินค้าเพื่อดูรายการเคลื่อนไหวของสินค้านั้น")
            : t("รายการรับเข้า เบิกออก โอนย้าย ปรับปรุง และเบิกไปผลิต (รวมรายการโอนเข้า/ออก)")}
        </span>
      </div>

      {tab === "summary" ? (
        <div className={styles.statRow}>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("มูลค่าต้นทุนยกมา")}</span>
            <span className={styles.statValue}>{money(totals?.openingValue)}</span>
            <span className={styles.statHint}>{t("บาท · ก่อนวันเริ่มต้น")}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("ต้นทุนรับเข้า")}</span>
            <span className={styles.statValue}>{money(totals?.receivedValue)}</span>
            <span className={styles.statHint}>{t("บาท")}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("ต้นทุนเบิกออก")}</span>
            <span className={styles.statValue}>{money(totals?.issuedValue)}</span>
            <span className={styles.statHint}>{t("บาท")}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("มูลค่าคงเหลือ")}</span>
            <span className={styles.statValue}>{money(totals?.closingValue)}</span>
            <span className={styles.statHint}>{t("บาท · ณ สิ้นวันสิ้นสุด")}</span>
          </div>
        </div>
      ) : (
        <div className={styles.statRow}>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("จำนวนรายการ")}</span>
            <span className={styles.statValue}>{detailTotal.toLocaleString("th-TH")}</span>
            <span className={styles.statHint}>{t("ตามเงื่อนไขที่กรอง")}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("ต้นทุนรวมรับเข้า")}</span>
            <span className={styles.statValue}>{money(detailData?.totals.totalCostIn)}</span>
            <span className={styles.statHint}>{t("บาท · {qty} KG", { qty: qty(detailData?.totals.totalQuantityIn) })}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("ต้นทุนรวมเบิกออก")}</span>
            <span className={styles.statValue}>{money(detailData?.totals.totalCostOut)}</span>
            <span className={styles.statHint}>{t("บาท · {qty} KG", { qty: qty(detailData?.totals.totalQuantityOut) })}</span>
          </div>
        </div>
      )}

      {tab === "summary" && (totals?.zeroCostMovements ?? 0) > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("มี {n} รายการเคลื่อนไหวในช่วงนี้ที่ต้นทุน 0 บาท", { n: totals!.zeroCostMovements.toLocaleString("th-TH") })}
          description={t("เช่น ผลผลิตจากการผลิตหรือรับเข้าน้ำมันที่ระบบยังไม่ได้บันทึกต้นทุน — ต้นทุนเฉลี่ยของสินค้านั้นอาจต่ำกว่าจริง ดูรายการได้ที่แท็บรายละเอียด")}
        />
      ) : null}
      {tab === "summary" && applied.movementType ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("ตัวกรองประเภทรายการมีผลกับคอลัมน์ต้นทุนรับเข้า / เบิกออก / ปรับปรุงเท่านั้น ยอดยกมาและยอดคงเหลือยังเป็นยอดจริงทุกประเภท")}
        />
      ) : null}

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              allowClear={false}
              onChange={(values) =>
                setDateRange(values as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
              }
              format="DD/MM/BBBB"
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สินค้า")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={itemId}
              onChange={setItemId}
              loading={itemsQuery.isLoading}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.itemCode} — ${item.itemNameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("คลังสินค้า")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={warehouseId}
              onChange={setWarehouseId}
              loading={warehousesQuery.isLoading}
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.warehouseName,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ประเภทรายการ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={movementType}
              onChange={setMovementType}
              options={RAW_MATERIAL_COST_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>Lot</label>
            <Input
              allowClear
              placeholder={t("ค้นเลข Lot")}
              value={lotNo}
              onChange={(event) => setLotNo(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          {tab === "detail" ? (
            <div className={styles.filterItem}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("สินค้า / เลขเอกสาร / เลข RP")}
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onPressEnter={applySearch}
              />
            </div>
          ) : null}
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
          <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {tab === "summary" ? (
              <>
                {t("พบทั้งหมด")} <strong>{summaryRows.length}</strong> {t("สินค้า")}
              </>
            ) : (
              <>
                {t("พบทั้งหมด")} <strong>{detailTotal.toLocaleString("th-TH")}</strong> {t("รายการ")}
              </>
            )}
          </div>
          {tab === "detail" ? (
            <div className={styles.entriesBox}>
              <span>{t("แสดง")}</span>
              <Select
                size="small"
                value={limit}
                style={{ width: 72 }}
                options={[
                  { label: "20", value: 20 },
                  { label: "50", value: 50 },
                  { label: "100", value: 100 },
                ]}
                onChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              />
              <span>{t("รายการ/หน้า")}</span>
            </div>
          ) : null}
        </div>

        {tab === "summary" ? (
          <Table<RawMaterialCostSummaryRow>
            rowKey={(row) => `${row.itemId}|${row.unitCode}`}
            columns={summaryColumns}
            dataSource={summaryRows}
            loading={summaryQuery.isLoading}
            pagination={false}
            className={styles.table}
            scroll={{ x: 1360 }}
            locale={{ emptyText }}
            summary={() =>
              summaryRows.length > 0 && totals ? (
                <Table.Summary.Row className={styles.totalRow}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    {t("รวมทั้งหมด")}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    {quantityTotals ? qty(quantityTotals.openingQty) : "—"}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {money(totals.openingValue)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {money(totals.receivedValue)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    {money(totals.issuedValue)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    {money(totals.adjustedValue)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    {quantityTotals ? qty(quantityTotals.closingQty) : "—"}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    {quantityTotals && quantityTotals.closingQty > 0
                      ? unitCost(Number(totals.closingValue) / quantityTotals.closingQty)
                      : "—"}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">
                    {money(totals.closingValue)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              ) : null
            }
          />
        ) : (
          <Table<RawMaterialCostDetailRow>
            rowKey="id"
            columns={detailColumns}
            dataSource={detailData?.items ?? []}
            loading={detailQuery.isLoading}
            pagination={false}
            className={styles.table}
            scroll={{ x: 1560 }}
            locale={{ emptyText }}
          />
        )}

        {tab === "detail" ? (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              {t("แสดง {from}–{to} จาก {total}", {
                from: detailTotal === 0 ? 0 : (page - 1) * limit + 1,
                to: Math.min(page * limit, detailTotal),
                total: detailTotal.toLocaleString("th-TH"),
              })}
            </div>
            <Pagination
              size="small"
              current={page}
              total={detailTotal}
              pageSize={limit}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
