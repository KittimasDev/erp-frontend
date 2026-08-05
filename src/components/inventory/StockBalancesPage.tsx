"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Switch, Table, Tabs, Typography } from "antd";
import {
  AppstoreOutlined,
  ClearOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useStockBalanceSummaryQuery,
  useStockBalancesByItemQuery,
  useStockBalancesQuery,
} from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import type {
  StockBalanceByItemRow,
  StockBalanceQueryParams,
  StockBalanceRow,
} from "@/types/inventory";
import { getInventoryPageScope } from "./inventory-page-copy";
import styles from "./StockBalancesPage.module.css";

const StockBalanceItemDetailDrawer = dynamic(
  () => import("./StockBalanceItemDetailDrawer"),
  { ssr: false },
);

type StockBalanceView = "by-item" | "detail";

function formatQty(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function resolveView(raw: string | null): StockBalanceView {
  return raw === "detail" ? "detail" : "by-item";
}

function pageCopy(itemCategoryCode?: string) {
  const scope = getInventoryPageScope(itemCategoryCode);
  if (scope) {
    return {
      ...scope,
      subtitle:
        "ดูยอดรวมต่อสินค้า หรือรายละเอียดแยกคลัง/ตำแหน่ง — กดสินค้าเพื่อดูรายละเอียด",
    };
  }
  return {
    eyebrow: "INVENTORY · STOCK BALANCES",
    title: "ภาพรวมคลังสินค้า",
    subtitle:
      "ดูยอดรวมต่อสินค้า หรือรายละเอียดแยกคลัง/ตำแหน่ง — ดูอย่างเดียว ไม่แก้สต๊อกจากหน้านี้",
  };
}

export default function StockBalancesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const itemCategoryCode = searchParams.get("itemCategoryCode")?.trim() || undefined;
  const copy = pageCopy(itemCategoryCode);
  const activeView = useMemo(
    () => resolveView(searchParams.get("view")),
    [searchParams],
  );

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
  const [selectedItem, setSelectedItem] = useState<StockBalanceByItemRow | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queryParams = { ...filters, itemCategoryCode };

  const balancesByItemQuery = useStockBalancesByItemQuery(queryParams, {
    enabled: activeView === "by-item",
  });
  const balancesQuery = useStockBalancesQuery(queryParams, {
    enabled: activeView === "detail",
  });
  const summaryQuery = useStockBalanceSummaryQuery(queryParams);
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    draft.warehouseId
      ? { warehouseId: draft.warehouseId, isActive: true }
      : undefined,
    { enabled: Boolean(draft.warehouseId) },
  );

  const summary = summaryQuery.data?.data;
  const byItemRows = balancesByItemQuery.data?.data ?? [];
  const detailRows = balancesQuery.data?.data ?? [];
  const isFetching =
    activeView === "by-item"
      ? balancesByItemQuery.isFetching
      : balancesQuery.isFetching;

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

  const setView = (view: StockBalanceView) => {
    const next = new URLSearchParams(searchParams.toString());
    if (view === "by-item") {
      next.delete("view");
    } else {
      next.set("view", view);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  const openItemDrawer = (row: StockBalanceByItemRow) => {
    setSelectedItem(row);
    setDrawerOpen(true);
  };

  const byItemColumns: ColumnsType<StockBalanceByItemRow> = [
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
      title: "คงเหลือรวม",
      dataIndex: "totalQuantityOnHand",
      key: "totalQuantityOnHand",
      align: "right",
      width: 130,
      render: (value: string, row) => (
        <span className={styles.qtyCell}>
          {formatQty(value)}
          <span className={styles.summaryUnit}>{row.unitCode || ""}</span>
        </span>
      ),
    },
    {
      title: "พร้อมใช้",
      dataIndex: "totalQuantityAvailable",
      key: "totalQuantityAvailable",
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
      dataIndex: "totalQuantityReserved",
      key: "totalQuantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: "คลัง / ตำแหน่ง",
      key: "places",
      align: "center",
      width: 120,
      render: (_, row) => (
        <span className={styles.metaMuted}>
          {row.warehouseCount} / {row.locationCount}
        </span>
      ),
    },
    {
      title: "ขั้นต่ำ",
      dataIndex: "minimumStockQty",
      key: "minimumStockQty",
      align: "right",
      width: 100,
      render: (value?: string) => (
        <span className={styles.metaMuted}>{value ? formatQty(value) : "-"}</span>
      ),
    },
  ];

  const detailColumns: ColumnsType<StockBalanceRow> = [
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

  const filterBar = (
    <div className={styles.filterBar}>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>คลัง</span>
        <Select
          allowClear
          showSearch
          aria-label="คลังสินค้า"
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
          aria-label="ตำแหน่งในคลัง"
          className={styles.filterControl}
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
          aria-label="ค้นหาสินค้า"
          className={styles.filterControl}
          prefix={<SearchOutlined />}
          placeholder="รหัส / ชื่อสินค้า"
          value={draft.q}
          onChange={(e) => setDraft((prev) => ({ ...prev, q: e.target.value }))}
          onPressEnter={handleSearch}
        />
      </div>
      <div className={styles.stockToggle}>
        <Switch
          aria-label="แสดงเฉพาะรายการที่มียอดคงเหลือ"
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
  );

  return (
    <MasterPageGate>
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

          {filterBar}

          <Tabs
            className={styles.viewTabs}
            activeKey={activeView}
            onChange={(key) => setView(key as StockBalanceView)}
            items={[
              {
                key: "by-item",
                label: (
                  <span className={styles.tabLabel}>
                    <AppstoreOutlined />
                    รวมต่อสินค้า
                  </span>
                ),
                children: (
                  <div className={styles.cardBody}>
                    <Table
                      rowKey="itemId"
                      className={styles.dataTable}
                      columns={byItemColumns}
                      dataSource={byItemRows}
                      loading={isFetching}
                      rowClassName={(row) =>
                        [
                          row.isLowStock ? styles.lowStockRow : "",
                          styles.clickableRow,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      onRow={(row) => ({
                        onClick: () => openItemDrawer(row),
                      })}
                      pagination={{
                        pageSize: 15,
                        showTotal: (total) => `ทั้งหมด ${total} สินค้า`,
                        hideOnSinglePage: true,
                      }}
                      scroll={{ x: 900 }}
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
                ),
              },
              {
                key: "detail",
                label: (
                  <span className={styles.tabLabel}>
                    <UnorderedListOutlined />
                    รายละเอียดคลัง
                  </span>
                ),
                children: (
                  <div className={styles.cardBody}>
                    <Table
                      rowKey="id"
                      className={styles.dataTable}
                      columns={detailColumns}
                      dataSource={detailRows}
                      loading={isFetching}
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
                ),
              },
            ]}
          />
        </div>

        <StockBalanceItemDetailDrawer
          open={drawerOpen}
          item={selectedItem}
          filters={queryParams}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedItem(null);
          }}
        />
      </section>
    </MasterPageGate>
  );
}
