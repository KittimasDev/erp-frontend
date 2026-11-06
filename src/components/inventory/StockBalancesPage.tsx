"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Switch, Table, Tabs, Typography, Alert } from "antd";
import {
  AppstoreOutlined,
  ClearOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { tNow, useT } from "@/lib/i18n/useT";
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
import { getInventoryPageScope, inventoryScopeApiFilter } from "./inventory-page-copy";
import styles from "./StockBalancesPage.module.css";
import PageHeader from "@/components/common/PageHeader";

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

function pageCopy(
  searchParams: { get(name: string): string | null } | null,
  itemCategoryCode?: string,
) {
  const scope = getInventoryPageScope(searchParams, itemCategoryCode);
  if (scope) {
    return {
      eyebrow: tNow(scope.eyebrow),
      title: tNow(scope.title),
      subtitle:
        tNow("ดูยอดรวมต่อสินค้า หรือรายละเอียดแยกคลัง/ตำแหน่ง — กดสินค้าเพื่อดูรายละเอียด"),
    };
  }
  return {
    eyebrow: "INVENTORY · STOCK BALANCES",
    title: tNow("ภาพรวมคลังสินค้า"),
    subtitle:
      tNow("ดูยอดรวมต่อสินค้า หรือรายละเอียดแยกคลัง/ตำแหน่ง — ดูอย่างเดียว ไม่แก้สต๊อกจากหน้านี้"),
  };
}

export default function StockBalancesPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scopeFilter = inventoryScopeApiFilter(searchParams);
  const copy = pageCopy(searchParams, scopeFilter.itemCategoryCode);
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
    ...scopeFilter,
  });
  const [selectedItem, setSelectedItem] = useState<StockBalanceByItemRow | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queryParams = {
    ...filters,
    itemCategoryCode: scopeFilter.itemCategoryCode,
    isFinishedGood: scopeFilter.isFinishedGood,
  };

  const balancesByItemQuery = useStockBalancesByItemQuery(queryParams);
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
      : t("ทุกคลัง"),
    filters.hasStock === false ? t("รวมยอดศูนย์") : t("เฉพาะมียอด"),
    filters.q ? t("ค้นหา “{q}”", { q: filters.q }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const pageError =
    (activeView === "by-item"
      ? balancesByItemQuery.error
      : balancesQuery.error) ??
    summaryQuery.error ??
    warehousesQuery.error;

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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 15 + index + 1,
    },
    {
      title: t("สินค้า"),
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
      title: t("คงเหลือรวม"),
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
      title: t("พร้อมใช้"),
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
      title: t("จอง"),
      dataIndex: "totalQuantityReserved",
      key: "totalQuantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: t("คลัง / ตำแหน่ง"),
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
      title: t("ขั้นต่ำ"),
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 15 + index + 1,
    },
    {
      title: t("สินค้า"),
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
      title: t("คลัง / ตำแหน่ง"),
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
      title: t("คงเหลือ"),
      dataIndex: "quantityOnHand",
      key: "quantityOnHand",
      align: "right",
      width: 120,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: t("พร้อมใช้"),
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
      title: t("รอตรวจ (Hold)"),
      dataIndex: "quantityOnHold",
      key: "quantityOnHold",
      align: "right",
      width: 120,
      render: (value?: string) => (
        <span className={styles.qtyCell}>{formatQty(value ?? "0")}</span>
      ),
    },
    {
      title: t("ถูกบล็อก"),
      dataIndex: "quantityBlocked",
      key: "quantityBlocked",
      align: "right",
      width: 110,
      render: (value?: string) => (
        <span className={styles.qtyCell}>{formatQty(value ?? "0")}</span>
      ),
    },
    {
      title: t("จอง"),
      dataIndex: "quantityReserved",
      key: "quantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: t("หน่วย"),
      dataIndex: "unitCode",
      key: "unitCode",
      width: 80,
      render: (value?: string) => (
        <span className={styles.metaMuted}>{value || "-"}</span>
      ),
    },
    {
      title: t("ต้นทุนเฉลี่ย"),
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
      ...scopeFilter,
    });
  };

  const handleClear = () => {
    setDraft({ q: "", hasStock: true });
    setFilters({ hasStock: true, ...scopeFilter });
  };

  const filterBar = (
    <div className={styles.filterBar}>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>{t("คลัง")}</span>
        <Select
          allowClear
          showSearch
          aria-label={t("คลังสินค้า")}
          className={styles.filterControl}
          optionFilterProp="label"
          placeholder={t("ทุกคลัง")}
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
        <span className={styles.filterLabel}>{t("ตำแหน่ง")}</span>
        <Select
          allowClear
          showSearch
          aria-label={t("ตำแหน่งในคลัง")}
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
        <span className={styles.filterLabel}>{t("ค้นหาสินค้า")}</span>
        <Input
          allowClear
          aria-label={t("ค้นหาสินค้า")}
          className={styles.filterControl}
          prefix={<SearchOutlined />}
          placeholder={t("รหัส / ชื่อสินค้า")}
          value={draft.q}
          onChange={(e) => setDraft((prev) => ({ ...prev, q: e.target.value }))}
          onPressEnter={handleSearch}
        />
      </div>
      <div className={styles.stockToggle}>
        <Switch
          aria-label={t("แสดงเฉพาะรายการที่มียอดคงเหลือ")}
          checked={draft.hasStock}
          checkedChildren={t("มียอด")}
          unCheckedChildren={t("ทั้งหมด")}
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
          {t("ค้นหา")}
        </Button>
        <Button
          icon={<ClearOutlined />}
          className={styles.clearButton}
          onClick={handleClear}
        >
          {t("ล้าง")}
        </Button>
      </div>
    </div>
  );

  return (
    <MasterPageGate>
      <section className={styles.page}>
        <PageHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

        {pageError ? (
          <Alert
            type="error"
            showIcon
            title={
              pageError instanceof Error
                ? pageError.message
                : t("โหลดข้อมูลไม่สำเร็จ")
            }
            description={t("ถ้าเพิ่งแก้ Permission Matrix ให้ตรวจที่ /users ว่าบัญชีนี้ผูก role ที่ติ๊กไว้ — เมนูจะรีเฟรชหลัง Save โดยไม่ต้อง logout")}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>{t("รายการคงเหลือ")}</span>
            <strong>{summary?.balanceRows ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("สินค้า")}</span>
            <strong>{summary?.distinctItems ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("คลัง / ตำแหน่ง")}</span>
            <strong className={styles.summaryCompact}>
              {summary?.distinctWarehouses ?? 0}
              <span className={styles.summaryUnit}>/</span>
              {summary?.distinctLocations ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("คงเหลือรวม")}</span>
            <strong className={styles.summaryCompact}>
              {formatQty(summary?.totalQuantityOnHand)}
            </strong>
          </div>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span>{t("พร้อมใช้รวม")}</span>
            <strong>{formatQty(summary?.totalQuantityAvailable)}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>{t("จองรวม")}</span>
            <strong>{formatQty(summary?.totalQuantityReserved)}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>{t("พัก / บล็อก")}</span>
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
              <h3>{t("ยอดคงเหลือ")}</h3>
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
                    {t("รวมต่อสินค้า")}
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
                      pagination={{ current: page, pageSize: 15, onChange: setPage, showTotal: (total) => t("ทั้งหมด {n} สินค้า", { n: total }),
                        hideOnSinglePage: true,
                      }}
                      scroll={{ x: 1150 }}
                      locale={{
                        emptyText: (
                          <div className={styles.emptyState}>
                            <strong>{t("ยังไม่มียอดคงเหลือ")}</strong>
                            <span>
                              {t("ลองเปลี่ยนคลัง ตำแหน่ง หรือปิดตัวกรอง “เฉพาะมียอด”")}
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
                    {t("รายละเอียดคลัง")}
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
                        [
                          row.isLowStock ? styles.lowStockRow : "",
                          styles.clickableRow,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      onRow={(row) => ({
                        onClick: () => {
                          const item = byItemRows.find(
                            (entry) => entry.itemId === row.itemId,
                          );
                          if (item) {
                            openItemDrawer(item);
                          }
                        },
                      })}
                      pagination={{ current: page, pageSize: 15, onChange: setPage, showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
                        hideOnSinglePage: true,
                      }}
                      scroll={{ x: 980 }}
                      locale={{
                        emptyText: (
                          <div className={styles.emptyState}>
                            <strong>{t("ยังไม่มียอดคงเหลือ")}</strong>
                            <span>
                              {t("ลองเปลี่ยนคลัง ตำแหน่ง หรือปิดตัวกรอง “เฉพาะมียอด”")}
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
