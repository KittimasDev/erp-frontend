"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import {
  useProcurementSalesByItemReportQuery,
  useProcurementStockMovementReportQuery,
} from "@/hooks/procurement-reports/useProcurementReportQueries";
import {
  exportProcurementSalesByItemReport,
  exportProcurementStockMovementReport,
} from "@/lib/api/procurement-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ProcurementReportQuery,
  ProcurementSalesByItemRow,
  ProcurementStockMovementRow,
} from "@/types/procurement-reports";
import {
  downloadTabularReport,
  type TabularReport,
} from "@/utils/downloadTabularReport";

import styles from "./ProcurementExtraReportPage.module.css";

export type ProcurementReportKind = "stock-movements" | "sales-by-item";

const TITLES: Record<ProcurementReportKind, string> = {
  "stock-movements": "รายงานแสดงสรุปยอดเคลื่อนไหวสินค้า",
  "sales-by-item": "รายงานสรุปยอดขาย",
};

const SCREEN_CODES: Record<ProcurementReportKind, string> = {
  "stock-movements": "REPORTS_STOCK_MOVEMENTS",
  "sales-by-item": "REPORTS_SALES_BY_ITEM",
};

function formatQty(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : value;
}

function movementColumns(): ColumnsType<ProcurementStockMovementRow> {
  return [
    {
      title: "วันเวลา",
      dataIndex: "movementDate",
      render: formatDateTime,
    },
    { title: "ประเภท", dataIndex: "movementTypeLabel" },
    { title: "เลขที่เอกสาร", dataIndex: "referenceDocNo" },
    { title: "รหัสสินค้า", dataIndex: "itemCode" },
    { title: "ชื่อสินค้า", dataIndex: "itemName" },
    { title: "คลัง", dataIndex: "warehouseName" },
    { title: "ตำแหน่ง", dataIndex: "locationName" },
    { title: "หน่วย", dataIndex: "unitCode" },
    {
      title: "จำนวนเข้า",
      dataIndex: "quantityIn",
      align: "right",
      render: formatQty,
    },
    {
      title: "จำนวนออก",
      dataIndex: "quantityOut",
      align: "right",
      render: formatQty,
    },
  ];
}

function salesColumns(): ColumnsType<ProcurementSalesByItemRow> {
  return [
    { title: "รหัสสินค้า", dataIndex: "itemCode" },
    { title: "ชื่อสินค้า", dataIndex: "itemName" },
    { title: "หน่วย", dataIndex: "unitCode" },
    {
      title: "จำนวนรวม",
      dataIndex: "quantity",
      align: "right",
      render: formatQty,
    },
    {
      title: "มูลค่ารวม",
      dataIndex: "amount",
      align: "right",
      render: formatMoney,
    },
  ];
}

function toMovementSheet(rows: ProcurementStockMovementRow[]): TabularReport {
  return {
    title: TITLES["stock-movements"],
    filename: "stock-movements",
    headers: [
      "วันเวลา",
      "ประเภท",
      "เลขที่เอกสาร",
      "รหัสสินค้า",
      "ชื่อสินค้า",
      "คลัง",
      "ตำแหน่ง",
      "หน่วย",
      "จำนวนเข้า",
      "จำนวนออก",
    ],
    rows: rows.map((row) => [
      formatDateTime(row.movementDate),
      row.movementTypeLabel,
      row.referenceDocNo,
      row.itemCode,
      row.itemName,
      row.warehouseName,
      row.locationName,
      row.unitCode,
      row.quantityIn,
      row.quantityOut,
    ]),
  };
}

const SAMPLE_MOVEMENTS: ProcurementStockMovementRow[] = [
  {
    movementDate: "2026-10-08T02:30:00.000Z",
    movementType: "RECEIVE",
    movementTypeLabel: "รับเข้า",
    referenceDocNo: "GR-20261008-001",
    itemCode: "RM-001",
    itemName: "ยางดิบ",
    warehouseName: "คลังวัตถุดิบ",
    locationName: "ลาน A",
    unitCode: "KG",
    quantityIn: "50.000",
    quantityOut: "0.000",
  },
  {
    movementDate: "2026-10-08T09:15:00.000Z",
    movementType: "SALES_OUT",
    movementTypeLabel: "ขายออก",
    referenceDocNo: "PK-20261008-004",
    itemCode: "FG-210",
    itemName: "น้ำมันสำเร็จรูป",
    warehouseName: "คลังสินค้าสำเร็จรูป",
    locationName: "ตำแหน่งหลัก",
    unitCode: "L",
    quantityIn: "0.000",
    quantityOut: "12.000",
  },
];

const SAMPLE_SALES: ProcurementSalesByItemRow[] = [
  {
    itemCode: "FG-210",
    itemName: "น้ำมันสำเร็จรูป",
    unitCode: "L",
    quantity: "120.000",
    amount: "86400.00",
  },
  {
    itemCode: "FG-088",
    itemName: "ผงคาร์บอน",
    unitCode: "KG",
    quantity: "35.500",
    amount: "24850.00",
  },
];

function withRowKey<T extends object>(rows: T[], prefix: string) {
  return rows.map((row, index) => ({ ...row, key: `${prefix}-${index + 1}` }));
}

function toSalesSheet(rows: ProcurementSalesByItemRow[]): TabularReport {
  return {
    title: TITLES["sales-by-item"],
    filename: "sales-by-item",
    headers: ["รหัสสินค้า", "ชื่อสินค้า", "หน่วย", "จำนวนรวม", "มูลค่ารวม"],
    rows: rows.map((row) => [
      row.itemCode,
      row.itemName,
      row.unitCode,
      row.quantity,
      row.amount,
    ]),
  };
}

export default function ProcurementExtraReportPage({
  kind,
}: {
  kind: ProcurementReportKind;
}) {
  const { message } = App.useApp();
  const today = dayjs();
  const [keyword, setKeyword] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    today.startOf("month"),
    today,
  ]);
  const [applied, setApplied] = useState<ProcurementReportQuery>({
    dateFrom: today.startOf("month").format("YYYY-MM-DD"),
    dateTo: today.format("YYYY-MM-DD"),
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const queryParams = { ...applied, page, limit };
  const movementQuery = useProcurementStockMovementReportQuery(
    queryParams,
    kind === "stock-movements",
  );
  const salesQuery = useProcurementSalesByItemReportQuery(
    queryParams,
    kind === "sales-by-item",
  );

  const activeQuery = kind === "stock-movements" ? movementQuery : salesQuery;
  const total = activeQuery.data?.data.total ?? 0;
  const showingSample = activeQuery.isSuccess && total === 0;
  const rowPrefix = showingSample ? `sample-${kind}` : `${kind}-${page}`;
  const tableRows =
    kind === "stock-movements"
      ? withRowKey(
          showingSample
            ? SAMPLE_MOVEMENTS
            : (movementQuery.data?.data.items ?? []),
          rowPrefix,
        )
      : withRowKey(
          showingSample ? SAMPLE_SALES : (salesQuery.data?.data.items ?? []),
          rowPrefix,
        );
  const canExport =
    !isMatrixPermissionMode() ||
    hasPermission(`${SCREEN_CODES[kind]}.EXPORT`);

  const columns = useMemo(() => {
    if (kind === "stock-movements") return movementColumns();
    return salesColumns();
  }, [kind]);

  const applySearch = () => {
    setPage(1);
    setApplied({
      q: keyword.trim() || undefined,
      warehouseId: kind === "sales-by-item" ? undefined : warehouseId,
      dateFrom: dateRange[0].format("YYYY-MM-DD"),
      dateTo: dateRange[1].format("YYYY-MM-DD"),
    });
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    try {
      const token = getAccessToken();
      const filters = { ...applied };
      if (kind === "stock-movements") {
        const exported = await exportProcurementStockMovementReport(token, filters);
        if (exported.data.truncated) {
          message.warning("ส่งออกได้ 5,000 แถวแรกของชุดที่กรอง");
        }
        const items =
          exported.data.items.length > 0
            ? exported.data.items
            : SAMPLE_MOVEMENTS;
        if (exported.data.items.length === 0) {
          message.info("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง");
        }
        await downloadTabularReport(format, toMovementSheet(items));
      } else {
        const exported = await exportProcurementSalesByItemReport(token, filters);
        if (exported.data.truncated) {
          message.warning("ส่งออกได้ 5,000 แถวแรกของชุดที่กรอง");
        }
        const items =
          exported.data.items.length > 0 ? exported.data.items : SAMPLE_SALES;
        if (exported.data.items.length === 0) {
          message.info("ไม่มีข้อมูลจริง ส่งออกเป็นรายการตัวอย่าง");
        }
        await downloadTabularReport(format, toSalesSheet(items));
      }
    } catch {
      message.error("ดาวน์โหลดรายงานไม่สำเร็จ");
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <h1>{TITLES[kind]}</h1>
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
        <Input
          allowClear
          placeholder="ค้นหารหัสหรือชื่อสินค้า"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={applySearch}
        />
        {kind !== "sales-by-item" ? (
          <Select
            allowClear
            placeholder="คลัง"
            style={{ minWidth: 220 }}
            value={warehouseId}
            options={(warehousesQuery.data?.data ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.warehouseName,
            }))}
            onChange={setWarehouseId}
          />
        ) : null}
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
        <Button type="primary" onClick={applySearch}>
          ค้นหา
        </Button>
      </div>

      {showingSample ? (
        <Alert
          type="info"
          showIcon
          title="ข้อมูลตัวอย่าง"
          description="ยังไม่มีรายการจริงในช่วงนี้ ตารางและไฟล์ที่ดาวน์โหลดจึงเป็นตัวอย่างเพื่อดูรูปแบบรายงาน"
        />
      ) : null}

      <Table
        rowKey="key"
        loading={activeQuery.isLoading}
        columns={columns as ColumnsType<{ key: string }>}
        dataSource={tableRows}
        pagination={false}
        scroll={{ x: 960 }}
      />
      {showingSample ? null : (
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          showSizeChanger
          onChange={(nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          }}
        />
      )}
    </section>
  );
}
