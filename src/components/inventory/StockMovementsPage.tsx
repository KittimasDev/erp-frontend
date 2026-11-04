"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  InfoCircleOutlined,
  ClearOutlined,
  HistoryOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useStockMovementsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { formatErpDate, formatErpTime } from "@/lib/datetime/erp-timezone";
import type {
  StockMovementQueryParams,
  StockMovementRow,
} from "@/types/inventory";
import {
  resolveStockMovementTypeLabel,
  STOCK_MOVEMENT_TYPE_LABEL,
} from "@/types/inventory";
import { getInventoryPageScope, inventoryScopeApiFilter } from "./inventory-page-copy";
import styles from "./StockMovementsPage.module.css";

type DraftFilters = {
  warehouseId?: string;
  movementType?: string;
  q: string;
  range: [Dayjs, Dayjs] | null;
};

const MOVEMENT_OPTIONS = Object.entries(STOCK_MOVEMENT_TYPE_LABEL).map(
  ([value, label]) => ({ value, label: `${value} — ${label}` }),
);

const PAGE_SIZE = 20;

function formatQty(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n) || Math.abs(n) < 1e-9) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatQtyTotal(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function movementTagColor(label: string): string | undefined {
  switch (label) {
    case STOCK_MOVEMENT_TYPE_LABEL.RECEIVE:
    case STOCK_MOVEMENT_TYPE_LABEL.ADJUST_IN:
    case STOCK_MOVEMENT_TYPE_LABEL.TRANSFER_IN:
    case STOCK_MOVEMENT_TYPE_LABEL.SALES_RETURN_IN:
      return "success";
    case STOCK_MOVEMENT_TYPE_LABEL.ISSUE:
    case STOCK_MOVEMENT_TYPE_LABEL.ADJUST_OUT:
    case STOCK_MOVEMENT_TYPE_LABEL.TRANSFER_OUT:
      return "error";
    case STOCK_MOVEMENT_TYPE_LABEL.SALES_OUT:
      return "blue";
    default:
      return undefined;
  }
}

function pageCopy(
  searchParams: { get(name: string): string | null } | null,
  itemCategoryCode?: string,
) {
  const scope = getInventoryPageScope(searchParams, itemCategoryCode);
  if (scope) {
    return {
      ...scope,
      subtitle: "ตรวจสอบประวัติความเคลื่อนไหวของสินค้า",
    };
  }
  return {
    eyebrow: "Inventory · Audit",
    title: "ประวัติความเคลื่อนไหวสต๊อก",
    subtitle:
      "ตรวจสอบรับเข้า · เบิกออก · ขายออก · ปรับยอด · โอนคลัง พร้อมเอกสารต้นทาง",
  };
}

export default function StockMovementsPage() {
  const searchParams = useSearchParams();
  const scopeFilter = inventoryScopeApiFilter(searchParams);
  const copy = pageCopy(searchParams, scopeFilter.itemCategoryCode);

  const [draft, setDraft] = useState<DraftFilters>({
    q: "",
    range: null,
  });
  const [filters, setFilters] = useState<StockMovementQueryParams>({
    ...scopeFilter,
  });
  const [page, setPage] = useState(1);

  const movementsQuery = useStockMovementsQuery({
    ...filters,
    itemCategoryCode: scopeFilter.itemCategoryCode,
    isFinishedGood: scopeFilter.isFinishedGood,
  });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const rows = useMemo(() => {
    const list = movementsQuery.data?.data ?? [];
    // ล่าสุดขึ้นก่อน — ใช้ createdAt (เวลาทำรายการ) เป็นหลัก
    return [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.movementDate).getTime();
      const bTime = new Date(b.createdAt ?? b.movementDate).getTime();
      return bTime - aTime;
    });
  }, [movementsQuery.data?.data]);

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );

  const summary = useMemo(() => {
    let inQty = 0;
    let outQty = 0;
    let salesCount = 0;
    let revenue = 0;
    let expense = 0;
    for (const row of rows) {
      inQty += Number(row.quantityIn) || 0;
      outQty += Number(row.quantityOut) || 0;
      revenue += Number(row.revenueAmount) || 0;
      expense += Number(row.expenseAmount) || 0;
      if (
        resolveStockMovementTypeLabel(row) ===
        STOCK_MOVEMENT_TYPE_LABEL.SALES_OUT
      ) {
        salesCount += 1;
      }
    }
    return { inQty, outQty, salesCount, revenue, expense, total: rows.length };
  }, [rows]);

  const columns: ColumnsType<StockMovementRow> = [
    {
      title: "ลำดับ",
      key: "index",
      width: 72,
      align: "center",
      render: (_value, _row, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "วันเวลา",
      dataIndex: "movementDate",
      key: "movementDate",
      width: 150,
      render: (_v: string, row) => {
        // วันจาก movementDate / เวลาจริงจาก createdAt (movementDate เก่ามักเป็น 00:00 UTC)
        const dateText = formatErpDate(row.movementDate);
        const timeText = formatErpTime(row.createdAt ?? row.movementDate);
        if (dateText === "—" && timeText === "—") return "—";
        return (
          <div className={styles.dateCell}>
            <span className={styles.dateMain}>{dateText}</span>
            <span className={styles.dateSub}>{timeText}</span>
          </div>
        );
      },
    },
    {
      title: "ประเภท",
      dataIndex: "movementType",
      key: "movementType",
      width: 120,
      render: (_v: string, row) => {
        const label = resolveStockMovementTypeLabel(row);
        return <Tag color={movementTagColor(label)}>{label}</Tag>;
      },
    },
    {
      title: "สินค้า",
      key: "item",
      width: 220,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemCode}>{row.itemCode}</span>
          <span className={styles.itemName}>{row.itemNameTh}</span>
        </div>
      ),
    },
    {
      title: "คลัง / ตำแหน่ง",
      key: "place",
      width: 150,
      render: (_, row) => (
        <div className={styles.placeCell}>
          <span className={styles.placeMain}>{row.warehouseCode}</span>
          <span className={styles.placeSub}>{row.locationCode}</span>
        </div>
      ),
    },
    {
      title: "จำนวนเข้า",
      dataIndex: "quantityIn",
      key: "quantityIn",
      align: "right",
      width: 100,
      render: (v: string) => {
        const n = Number(v);
        if (!n) return <span className={styles.qtyMuted}>—</span>;
        return <span className={styles.qtyIn}>{formatQty(v)}</span>;
      },
    },
    {
      title: "จำนวนออก",
      dataIndex: "quantityOut",
      key: "quantityOut",
      align: "right",
      width: 100,
      render: (v: string) => {
        const n = Number(v);
        if (!n) return <span className={styles.qtyMuted}>—</span>;
        return <span className={styles.qtyOut}>{formatQty(v)}</span>;
      },
    },
    {
      title: "มูลค่า (บาท)",
      key: "money",
      align: "right",
      width: 130,
      render: (_, row) => {
        const revenue = Number(row.revenueAmount) || 0;
        const expense = Number(row.expenseAmount) || 0;
        if (revenue > 0) {
          return (
            <span className={styles.moneyIn}>{formatMoney(revenue)}</span>
          );
        }
        if (expense > 0) {
          return (
            <span className={styles.moneyOut}>{formatMoney(expense)}</span>
          );
        }
        return <span className={styles.qtyMuted}>—</span>;
      },
    },
    {
      title: "ต้นทุน",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 130,
      render: (value: string) => formatMoney(value),
    },
    {
      title: (
        <Tooltip title="ยอดรวมสินค้าทุก Lot ในคลังและตำแหน่งนั้น ณ เวลาที่เกิดรายการ ไม่ใช่ยอดคงเหลือของ Lot ในแถวนี้">
          <span>
            ยอดคงเหลือรวมหลังรายการ{" "}
            <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
          </span>
        </Tooltip>
      ),
      dataIndex: "balanceQuantityAfter",
      key: "balanceQuantityAfter",
      align: "right",
      width: 170,
      render: (v: string) => (
        <span className={styles.qtyBalance}>{formatQty(v)}</span>
      ),
    },
    {
      title: "Lot",
      dataIndex: "lotNo",
      key: "lotNo",
      width: 140,
      render: (v?: string) => v || "—",
    },
    {
      title: "เอกสารอ้างอิง",
      key: "ref",
      width: 180,
      render: (_, row) => {
        if (!row.referenceDocType && !row.referenceDocNo) return "—";
        return (
          <div className={styles.refChip}>
            {row.referenceDocType ? (
              <span className={styles.refType}>{row.referenceDocType}</span>
            ) : null}
            <span className={styles.refNo}>{row.referenceDocNo ?? "—"}</span>
          </div>
        );
      },
    },
    {
      title: "ผู้ทำรายการ",
      dataIndex: "createdByName",
      key: "createdByName",
      width: 130,
      render: (v?: string) => v || "—",
    },
  ];

  const applySearch = () => {
    setPage(1);
    setFilters({
      warehouseId: draft.warehouseId,
      movementType: draft.movementType,
      q: draft.q.trim() || undefined,
      from: draft.range?.[0]?.format("YYYY-MM-DD"),
      to: draft.range?.[1]?.format("YYYY-MM-DD"),
      ...scopeFilter,
    });
  };

  const clearFilters = () => {
    setPage(1);
    setDraft({ q: "", range: null });
    setFilters({ ...scopeFilter });
  };

  if (movementsQuery.isLoading && !movementsQuery.data) {
    return (
      <div className={styles.page} style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <HistoryOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 className={styles.pageTitle}>{copy.title}</h1>
          <p className={styles.pageSubtitle}>{copy.subtitle}</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.headerMetaLabel}>รายการที่พบ</span>
          <span className={styles.headerMetaValue}>{summary.total}</span>
        </div>
      </header>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryIn}`}>
          <span>ยอดเข้า (ในผลลัพธ์)</span>
          <strong>{formatQtyTotal(summary.inQty)}</strong>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryOut}`}>
          <span>ยอดออก (ในผลลัพธ์)</span>
          <strong>{formatQtyTotal(summary.outQty)}</strong>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryIn}`}>
          <span>รายรับ (ในผลลัพธ์)</span>
          <strong>{formatMoney(summary.revenue)}</strong>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryOut}`}>
          <span>รายจ่าย (ในผลลัพธ์)</span>
          <strong>{formatMoney(summary.expense)}</strong>
        </div>
        <div className={`${styles.summaryCard} ${styles.summarySales}`}>
          <span>รายการขายออก</span>
          <strong>{summary.salesCount}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>ทั้งหมดในตาราง</span>
          <strong>{summary.total}</strong>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>คลัง</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทุกคลัง"
              value={draft.warehouseId}
              onChange={(warehouseId) =>
                setDraft((d) => ({ ...d, warehouseId }))
              }
              options={warehouseOptions}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ประเภท</label>
            <Select
              allowClear
              placeholder="ทุกประเภท"
              value={draft.movementType}
              onChange={(movementType) =>
                setDraft((d) => ({ ...d, movementType }))
              }
              options={MOVEMENT_OPTIONS}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={draft.range}
              onChange={(range) =>
                setDraft((d) => ({
                  ...d,
                  range: range as [Dayjs, Dayjs] | null,
                }))
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="สินค้า / เลขเอกสาร / Lot"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              onPressEnter={applySearch}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            className={styles.secondaryBtn}
            icon={<ClearOutlined />}
            onClick={clearFilters}
          >
            ล้าง
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            loading={movementsQuery.isFetching}
            onClick={applySearch}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <p className={styles.toolbarTitle}>รายการเคลื่อนไหว</p>
            <p className={styles.toolbarHint}>
              สีเขียว = เข้าคลัง / รายรับ · สีแดง = ออกคลัง / รายจ่าย · สีฟ้า =
              ขายออกจากใบจ่าย (มูลค่าจากราคาใบสั่งขาย)
            </p>
          </div>
        </div>
        <Table
          rowKey="id"
          className={styles.table}
          columns={columns}
          dataSource={rows}
          loading={movementsQuery.isFetching}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            showSizeChanger: false,
            onChange: (next) => setPage(next),
          }}
          scroll={{ x: 1732 }}
          locale={{ emptyText: "ยังไม่มีการเคลื่อนไหวตามเงื่อนไข" }}
        />
      </section>
    </div>
  );
}
