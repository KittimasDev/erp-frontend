"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

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
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./ProcurementExtraReportPage.module.css";

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
  };
}

const columns: ColumnsType<BalanceRow> = [
  {
    title: "ลำดับ",
    dataIndex: "seq",
    width: 80,
    render: (value: number | undefined) => value ?? "",
  },
  { title: "รหัสสินค้า", dataIndex: "itemCode" },
  {
    title: "ชื่อสินค้า / Lot",
    dataIndex: "label",
    render: (value: string, row) =>
      row.isGroup ? <strong>{value}</strong> : value,
  },
  { title: "ประเภทสินค้า", dataIndex: "itemCategoryName" },
  {
    title: "คลังสินค้า",
    dataIndex: "warehouseName",
    render: (value: string, row) =>
      row.isGroup ? <strong>{value}</strong> : value,
  },
  { title: "หน่วยนับ", dataIndex: "unitCode" },
  ...(
    [
      ["คงเหลือ", "quantityOnHand"],
      ["จอง", "quantityReserved"],
      ["พร้อมใช้", "quantityAvailable"],
    ] as const
  ).map(([title, dataIndex]) => ({
    title,
    dataIndex,
    align: "right" as const,
    render: (value: string, row: BalanceRow) =>
      row.isGroup ? <strong>{formatQty(value)}</strong> : formatQty(value),
  })),
];

export default function StockBalanceReportPage() {
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
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

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
  const expandedRowKeys = tableRows
    .filter((row) => row.children && !collapsed.has(row.key))
    .map((row) => row.key);

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

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    try {
      const exported = await exportProcurementStockBalanceReport(
        getAccessToken(),
        applied,
      );
      const groups =
        exported.data.items.length > 0 ? exported.data.items : SAMPLE_GROUPS;
      if (exported.data.items.length === 0) {
        message.info("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง");
      }
      await downloadTabularReport(
        format,
        toSheet(groups, exported.data.asOfDate || applied.asOfDate || ""),
      );
    } catch {
      message.error("ดาวน์โหลดรายงานไม่สำเร็จ");
    } finally {
      setExporting(null);
    }
  };

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
        <DatePicker
          allowClear={false}
          value={asOf}
          format="DD/MM/YYYY"
          aria-label="วันที่รายงาน"
          onChange={(value) => {
            if (value) setAsOf(value);
          }}
        />
        <Select
          allowClear
          placeholder="คลังสินค้า"
          style={{ minWidth: 200 }}
          value={warehouseId}
          loading={warehousesQuery.isLoading}
          options={(warehousesQuery.data?.data ?? []).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.warehouseName,
          }))}
          onChange={setWarehouseId}
        />
        <Select
          allowClear
          placeholder="ประเภทสินค้า"
          style={{ minWidth: 200 }}
          value={itemCategoryId}
          loading={categoriesQuery.isLoading}
          options={(categoriesQuery.data?.data ?? []).map((category) => ({
            value: category.id,
            label: category.nameTh,
          }))}
          onChange={setItemCategoryId}
        />
        <Input
          allowClear
          placeholder="รหัสหรือชื่อสินค้า"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={applySearch}
        />
        <Input
          allowClear
          placeholder="Lot No."
          value={lotNo}
          onChange={(event) => setLotNo(event.target.value)}
          onPressEnter={applySearch}
        />
        <Select
          style={{ minWidth: 140 }}
          value={stockStatus}
          options={STATUS_OPTIONS}
          onChange={setStockStatus}
          aria-label="สถานะสินค้า"
        />
        <Button type="primary" onClick={applySearch}>
          ค้นหา
        </Button>
      </div>

      {showingSample ? (
        <Alert
          type="info"
          showIcon
          title="ข้อมูลตัวอย่าง"
          description="ยังไม่มีรายการจริงตามเงื่อนไขนี้ ตารางและไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน"
        />
      ) : null}

      <Table<BalanceRow>
        rowKey="key"
        loading={reportQuery.isLoading}
        columns={columns}
        dataSource={tableRows}
        pagination={false}
        scroll={{ x: 1080 }}
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
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          showSizeChanger
          showTotal={(count) => `${count.toLocaleString("th-TH")} รายการสินค้า`}
          onChange={(nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          }}
        />
      )}
    </section>
  );
}
