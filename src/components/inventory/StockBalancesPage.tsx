"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Select, Switch, Table, Typography } from "antd";
import { ClearOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useStockBalanceSummaryQuery,
  useStockBalancesQuery,
} from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import type {
  StockBalanceQueryParams,
  StockBalanceRow,
} from "@/types/inventory";
import { getInventoryPageScope } from "./inventory-page-copy";
import styles from "./StockBalancesPage.module.css";

function formatQty(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function pageCopy(itemCategoryCode?: string) {
  const scope = getInventoryPageScope(itemCategoryCode);
  if (scope) {
    return {
      ...scope,
      subtitle: "ตรวจสอบยอดคงเหลือ แยกตามสินค้า คลัง และตำแหน่งจัดเก็บ",
    };
  }
  return {
    eyebrow: "INVENTORY · STOCK BALANCES",
    title: "ภาพรวมคลังสินค้า",
    subtitle:
      "ดูยอดคงเหลือตามสินค้า คลัง และตำแหน่ง — ดูอย่างเดียว ไม่แก้สต๊อกจากหน้านี้",
  };
}

export default function StockBalancesPage() {
  const searchParams = useSearchParams();
  const itemCategoryCode = searchParams.get("itemCategoryCode")?.trim() || undefined;
  const copy = pageCopy(itemCategoryCode);

  const [draft, setDraft] = useState<{
    warehouseId?: string;
    locationId?: string;
    q: string;
    hasStock: boolean;
  }>({
    q: "",
    hasStock: true,
  });
  const [filters, setFilters] = useState<StockBalanceQueryParams>({
    hasStock: true,
    itemCategoryCode,
  });

  const balancesQuery = useStockBalancesQuery({ ...filters, itemCategoryCode });
  const summaryQuery = useStockBalanceSummaryQuery({ ...filters, itemCategoryCode });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    draft.warehouseId
      ? { warehouseId: draft.warehouseId, isActive: true }
      : undefined,
    { enabled: Boolean(draft.warehouseId) },
  );

  const summary = summaryQuery.data?.data;
  const rows = balancesQuery.data?.data ?? [];

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );

  const locationOptions = useMemo(
    () =>
      (locationsQuery.data?.data ?? []).map((loc) => ({
        value: loc.id,
        label: `${loc.locationCode} — ${loc.locationName}`,
      })),
    [locationsQuery.data?.data],
  );

  const filterHint = [
    filters.warehouseId
      ? warehouseOptions.find((o) => o.value === filters.warehouseId)?.label
      : "ทุกคลัง",
    filters.hasStock === false ? "รวมยอดศูนย์" : "เฉพาะมียอด",
    filters.q ? `ค้นหา “${filters.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const columns: ColumnsType<StockBalanceRow> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemCode}>{row.itemCode}</span>
          <span className={styles.itemName}>{row.itemNameTh}</span>
          {row.itemCategoryName ? (
            <span className={styles.metaMuted}>{row.itemCategoryName}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "คลัง / ตำแหน่ง",
      key: "place",
      width: 200,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemName}>{row.warehouseCode}</span>
          <span className={styles.metaMuted}>
            {row.locationCode}
            {row.locationName ? ` — ${row.locationName}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "คงเหลือ",
      dataIndex: "quantityOnHand",
      key: "quantityOnHand",
      align: "right",
      width: 120,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: "พร้อมใช้",
      dataIndex: "quantityAvailable",
      key: "quantityAvailable",
      align: "right",
      width: 120,
      render: (value: string) => (
        <span className={`${styles.qtyCell} ${styles.qtyAvailable}`}>
          {formatQty(value)}
        </span>
      ),
    },
    {
      title: "จอง",
      dataIndex: "quantityReserved",
      key: "quantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: "หน่วย",
      dataIndex: "unitCode",
      key: "unitCode",
      width: 80,
      render: (value?: string) => (
        <span className={styles.metaMuted}>{value || "-"}</span>
      ),
    },
    {
      title: "ต้นทุนเฉลี่ย",
      dataIndex: "averageCost",
      key: "averageCost",
      align: "right",
      width: 120,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
  ];

  const handleSearch = () => {
    setFilters({
      warehouseId: draft.warehouseId,
      locationId: draft.locationId,
      q: draft.q.trim() || undefined,
      hasStock: draft.hasStock,
      itemCategoryCode,
    });
  };

  const handleClear = () => {
    setDraft({ q: "", hasStock: true });
    setFilters({ hasStock: true, itemCategoryCode });
  };

  return (
    <MasterPageGate isLoading={balancesQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.eyebrow}>{copy.eyebrow}</div>
            <Typography.Title level={2} className={styles.title}>
              {copy.title}
            </Typography.Title>
            <span className={styles.subtitle}>{copy.subtitle}</span>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>รายการคงเหลือ</span>
            <strong>{summary?.balanceRows ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>สินค้า</span>
            <strong>{summary?.distinctItems ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>คลัง / ตำแหน่ง</span>
            <strong className={styles.summaryCompact}>
              {summary?.distinctWarehouses ?? 0}
              <span className={styles.summaryUnit}>/</span>
              {summary?.distinctLocations ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>คงเหลือรวม</span>
            <strong className={styles.summaryCompact}>
              {formatQty(summary?.totalQuantityOnHand)}
            </strong>
          </div>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span>พร้อมใช้รวม</span>
            <strong>{formatQty(summary?.totalQuantityAvailable)}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>จองรวม</span>
            <strong>{formatQty(summary?.totalQuantityReserved)}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>พัก / บล็อก</span>
            <strong>
              {formatQty(summary?.totalQuantityOnHold)}
              <span className={styles.summaryUnit}>/</span>
              {formatQty(summary?.totalQuantityBlocked)}
            </strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>ยอดคงเหลือ</h3>
              <p>{filterHint}</p>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>คลัง</span>
              <Select
                allowClear
                showSearch
                className={styles.filterControl}
                optionFilterProp="label"
                placeholder="ทุกคลัง"
                options={warehouseOptions}
                value={draft.warehouseId}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    warehouseId: value,
                    locationId: undefined,
                  }))
                }
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ตำแหน่ง</span>
              <Select
                allowClear
                showSearch
                className={styles.filterControl}
                optionFilterProp="label"
                placeholder={
                  draft.warehouseId ? "ทุกตำแหน่ง" : "เลือกคลังก่อน"
                }
                options={locationOptions}
                disabled={!draft.warehouseId}
                value={draft.locationId}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, locationId: value }))
                }
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ค้นหาสินค้า</span>
              <Input
                allowClear
                className={styles.filterControl}
                prefix={<SearchOutlined />}
                placeholder="รหัส / ชื่อสินค้า"
                value={draft.q}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, q: e.target.value }))
                }
                onPressEnter={handleSearch}
              />
            </div>
            <div className={styles.stockToggle}>
              <Switch
                checked={draft.hasStock}
                checkedChildren="มียอด"
                unCheckedChildren="ทั้งหมด"
                onChange={(checked) =>
                  setDraft((prev) => ({ ...prev, hasStock: checked }))
                }
              />
            </div>
            <div className={styles.filterActions}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                className={styles.searchButton}
                onClick={handleSearch}
              >
                ค้นหา
              </Button>
              <Button
                icon={<ClearOutlined />}
                className={styles.clearButton}
                onClick={handleClear}
              >
                ล้าง
              </Button>
            </div>
          </div>

          <div className={styles.cardBody}>
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={rows}
              loading={balancesQuery.isFetching}
              rowClassName={(row) =>
                row.isLowStock ? styles.lowStockRow : ""
              }
              pagination={{
                pageSize: 15,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                hideOnSinglePage: true,
              }}
              scroll={{ x: 980 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>ยังไม่มียอดคงเหลือ</strong>
                    <span>
                      ลองเปลี่ยนคลัง ตำแหน่ง หรือปิดตัวกรอง “เฉพาะมียอด”
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
