"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Select,
  Switch,
  Table,
  Tooltip,
  Typography,
} from "antd";
import {
  ClearOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import LotQcModal from "./LotQcModal";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import type {
  InventoryLotBalanceRow,
  InventoryLotQueryParams,
  LotExpiryStatus,
} from "@/types/inventory";
import {
  LOT_EXPIRY_STATUS_LABEL,
} from "@/types/inventory";
import { getInventoryPageScope, inventoryScopeApiFilter } from "./inventory-page-copy";
import styles from "./InventoryLotsPage.module.css";

function formatQty(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("DD/MM/YYYY");
}

function lotStatusClass(status?: string) {
  const value = (status ?? "").toUpperCase();
  if (value === "ACTIVE") {
    return styles.statusActive;
  }
  if (value.includes("PENDING") || value.includes("HOLD")) {
    return styles.statusPending;
  }
  return styles.statusMuted;
}

function expiryStatusClass(status?: string) {
  const value = (status ?? "").toUpperCase();
  if (value === "EXPIRED") {
    return styles.expiryBadgeExpired;
  }
  if (value === "CRITICAL") {
    return styles.expiryBadgeCritical;
  }
  if (value === "WARNING") {
    return styles.expiryBadgeWarning;
  }
  return styles.expiryBadgeOk;
}

function expiryRowClass(status?: string) {
  const value = (status ?? "").toUpperCase();
  if (value === "EXPIRED") {
    return styles.expiryExpiredRow;
  }
  if (value === "CRITICAL") {
    return styles.expiryCriticalRow;
  }
  if (value === "WARNING") {
    return styles.expiryWarningRow;
  }
  return "";
}

function OtherUnitWarning({ row }: { row: InventoryLotBalanceRow }) {
  if (!row.recordedInOtherUnit) {
    return null;
  }
  const recorded = `${formatQty(row.quantityOnHand)} ${row.unitCode ?? ""}`.trim();
  const title =
    row.baseUnitConvertible === false
      ? `บันทึกเป็น ${row.unitCode ?? "หน่วยอื่น"} และยังไม่มีกฎแปลงเป็นหน่วยหลักของสินค้า — ตั้งกฎที่ ข้อมูลหลัก > กฎแปลงหน่วยนับ`
      : `บันทึกในระบบเป็น ${recorded} — แสดงเป็นหน่วยหลัก ${row.baseUnitCode ?? ""}`;
  return (
    <Tooltip title={title}>
      <WarningOutlined
        aria-label={title}
        style={{ color: "#d48806", marginRight: 4 }}
      />
    </Tooltip>
  );
}

function formatDaysUntilExpiry(days?: number) {
  if (days == null || Number.isNaN(days)) {
    return null;
  }
  if (days < 0) {
    return `เลยมา ${Math.abs(days)} วัน`;
  }
  if (days === 0) {
    return "หมดอายุวันนี้";
  }
  return `เหลือ ${days} วัน`;
}

function pageCopy(
  searchParams: { get(name: string): string | null } | null,
  itemCategoryCode?: string,
) {
  const scope = getInventoryPageScope(searchParams, itemCategoryCode);
  if (scope) {
    return {
      ...scope,
      subtitle: "ตรวจสอบ Lot และยอดคงเหลือราย Lot — แถวสีเตือนเมื่อใกล้หมดอายุ",
    };
  }
  return {
    eyebrow: "INVENTORY · LOTS",
    title: "ยอดคงเหลือแยก Lot",
    subtitle:
      "ตรวจสอบ Lot จากใบรับซื้อยาง รับผลผลิต และเอกสารต้นทางอื่น — แถวสีเตือนเมื่อใกล้หมดอายุ",
  };
}

export default function InventoryLotsPage() {
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();
  const scopeFilter = inventoryScopeApiFilter(searchParams);
  const copy = pageCopy(searchParams, scopeFilter.itemCategoryCode);

  const [draft, setDraft] = useState<{
    warehouseId?: string;
    locationId?: string;
    status?: string;
    q: string;
    hasStock: boolean;
    nearExpiry: boolean;
    receivedRange?: [Dayjs | null, Dayjs | null] | null;
  }>({
    q: "",
    hasStock: true,
    nearExpiry: false,
  });
  const [filters, setFilters] = useState<InventoryLotQueryParams>({
    hasStock: true,
    ...scopeFilter,
  });

  const lotsQuery = useInventoryLotsQuery({
    ...filters,
    itemCategoryCode: scopeFilter.itemCategoryCode,
    isFinishedGood: scopeFilter.isFinishedGood,
  });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    draft.warehouseId
      ? { warehouseId: draft.warehouseId, isActive: true }
      : undefined,
    { enabled: Boolean(draft.warehouseId) },
  );

  const rows = lotsQuery.data?.data ?? [];
  const pageError = lotsQuery.error ?? warehousesQuery.error;

  const stats = useMemo(() => {
    const lotIds = new Set<string>();
    const itemIds = new Set<string>();
    let totalOnHand = 0;
    let totalAvailable = 0;
    let activeLots = 0;
    let pendingQc = 0;
    let expiredLots = 0;
    let criticalLots = 0;
    let warningLots = 0;

    for (const row of rows) {
      lotIds.add(row.lotId);
      itemIds.add(row.itemId);
      totalOnHand += Number(row.baseQuantityOnHand ?? row.quantityOnHand ?? 0);
      totalAvailable += Number(
        row.baseQuantityAvailable ?? row.quantityAvailable ?? 0,
      );
      if ((row.lotStatus ?? "").toUpperCase() === "ACTIVE") {
        activeLots += 1;
      }
      if ((row.qcStatus ?? "").toUpperCase() === "PENDING") {
        pendingQc += 1;
      }
      const expiry = (row.expiryStatus ?? "").toUpperCase();
      if (expiry === "EXPIRED") {
        expiredLots += 1;
      } else if (expiry === "CRITICAL") {
        criticalLots += 1;
      } else if (expiry === "WARNING") {
        warningLots += 1;
      }
    }

    return {
      rows: rows.length,
      lots: lotIds.size,
      items: itemIds.size,
      activeLots,
      pendingQc,
      expiredLots,
      criticalLots,
      warningLots,
      totalOnHand,
      totalAvailable,
    };
  }, [rows]);

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

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: "ACTIVE" },
      { value: "CLOSED", label: "CLOSED" },
      { value: "BLOCKED", label: "BLOCKED" },
    ],
    [],
  );

  const filterHint = [
    filters.warehouseId
      ? warehouseOptions.find((o) => o.value === filters.warehouseId)?.label
      : "ทุกคลัง",
    filters.status ? `สถานะ ${filters.status}` : null,
    filters.hasStock === false ? "รวมยอดศูนย์" : "เฉพาะมียอด",
    filters.nearExpiry ? "ใกล้หมดอายุ" : null,
    filters.dateFrom || filters.dateTo
      ? `รับเข้า ${filters.dateFrom ? formatDate(filters.dateFrom) : "…"} – ${filters.dateTo ? formatDate(filters.dateTo) : "…"}`
      : null,
    filters.q ? `ค้นหา “${filters.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const [qcLot, setQcLot] = useState<InventoryLotBalanceRow | null>(null);

  const columns: ColumnsType<InventoryLotBalanceRow> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 15 + index + 1,
    },
    {
      title: "Lot",
      key: "lot",
      width: 140,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.lotChip}>{row.lotNo}</span>
        </div>
      ),
    },
    {
      title: "วันที่รับเข้า",
      dataIndex: "receivedDate",
      key: "receivedDate",
      width: 120,
      sorter: (a, b) =>
        (a.receivedDate ?? "").localeCompare(b.receivedDate ?? ""),
      render: (value?: string) => (
        <span className={styles.itemName}>{formatDate(value)}</span>
      ),
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
      width: 240,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.warehouseBadge}>{row.warehouseCode}</span>
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
      width: 110,
      render: (value: string, row) => (
        <span className={styles.qtyCell}>
          <OtherUnitWarning row={row} />
          {formatQty(row.baseQuantityOnHand ?? value)}
          <span className={styles.summaryUnit}>
            {row.baseUnitCode ?? row.unitCode ?? ""}
          </span>
        </span>
      ),
    },
    {
      title: "พร้อมใช้",
      dataIndex: "quantityAvailable",
      key: "quantityAvailable",
      align: "right",
      width: 110,
      render: (value: string, row) => (
        <span className={`${styles.qtyCell} ${styles.qtyAvailable}`}>
          {formatQty(row.baseQuantityAvailable ?? value)}
        </span>
      ),
    },
    {
      title: "หมดอายุ",
      key: "expiry",
      width: 170,
      render: (_, row) => {
        const status = (row.expiryStatus ?? "UNKNOWN") as LotExpiryStatus;
        const daysLabel = formatDaysUntilExpiry(row.daysUntilExpiry);
        return (
          <div className={styles.itemCell}>
            <span className={styles.itemName}>
              {row.expiryDate ? formatDate(row.expiryDate) : "-"}
            </span>
            {daysLabel ? (
              <span
                className={`${styles.statusPill} ${expiryStatusClass(row.expiryStatus)}`}
              >
                {daysLabel}
              </span>
            ) : (
              <span className={styles.metaMuted}>
                {LOT_EXPIRY_STATUS_LABEL[status] ?? status}
              </span>
            )}
            {row.expirySource === "CALCULATED" ? (
              <span className={styles.metaMuted}>คำนวณจากอายุเก็บ</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      key: "status",
      width: 150,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span
            className={`${styles.statusPill} ${lotStatusClass(row.lotStatus)}`}
          >
            {row.lotStatus || "-"}
          </span>
          <span className={styles.metaMuted}>
            QC {row.qcStatus || "-"}
            {row.coaReference ? ` · COA ${row.coaReference}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "",
      key: "qc",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Button
          size="small"
          type={row.qcStatus === "PENDING" || row.qcStatus === "HOLD" ? "primary" : "default"}
          onClick={() => setQcLot(row)}
        >
          {row.qcStatus === "PENDING" || row.qcStatus === "HOLD" ? "ตรวจ QC" : "QC / COA"}
        </Button>
      ),
    },
    {
      title: "เอกสารต้นทาง",
      key: "source",
      width: 200,
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemName}>
            {row.sourceDocumentNo || "-"}
          </span>
          <span className={styles.metaMuted}>
            {row.sourceDocumentType || "-"}
          </span>
        </div>
      ),
    },
  ];

  const handleSearch = () => {
    setFilters({
      warehouseId: draft.warehouseId,
      locationId: draft.locationId,
      status: draft.status,
      q: draft.q.trim() || undefined,
      hasStock: draft.hasStock,
      nearExpiry: draft.nearExpiry || undefined,
      dateFrom: draft.receivedRange?.[0]?.format("YYYY-MM-DD"),
      dateTo: draft.receivedRange?.[1]?.format("YYYY-MM-DD"),
      ...scopeFilter,
    });
  };

  const handleClear = () => {
    setDraft({ q: "", hasStock: true, nearExpiry: false });
    setFilters({ hasStock: true, ...scopeFilter });
  };

  return (
    <MasterPageGate isLoading={lotsQuery.isLoading}>
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

        {pageError ? (
          <Alert
            type="error"
            showIcon
            title={
              pageError instanceof Error
                ? pageError.message
                : "โหลดข้อมูลไม่สำเร็จ"
            }
            description="ถ้าเพิ่งแก้ Permission Matrix ให้ตรวจที่ /users ว่าบัญชีนี้ผูก role ที่ติ๊กไว้ — เมนูจะรีเฟรชหลัง Save โดยไม่ต้อง logout"
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>รายการ Lot</span>
            <strong>{stats.rows}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>สินค้า</span>
            <strong>{stats.items}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Lot ACTIVE</span>
            <strong>{stats.activeLots}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>คงเหลือรวม</span>
            <strong className={styles.summaryCompact}>
              {formatQty(String(stats.totalOnHand))}
            </strong>
          </div>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span>หมดอายุแล้ว</span>
            <strong className={styles.metricDanger}>{stats.expiredLots}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>วิกฤต (≤7 วัน)</span>
            <strong className={styles.metricCritical}>{stats.criticalLots}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>ใกล้หมดอายุ (≤30 วัน)</span>
            <strong className={styles.metricWarning}>{stats.warningLots}</strong>
          </div>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span>พร้อมใช้รวม</span>
            <strong>{formatQty(String(stats.totalAvailable))}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>QC รอตรวจ</span>
            <strong>{stats.pendingQc}</strong>
          </div>
          <div className={styles.metricItem}>
            <span>Lot ไม่ซ้ำ</span>
            <strong>{stats.lots}</strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>รายการ Lot ในคลัง</h3>
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
              <span className={styles.filterLabel}>สถานะ Lot</span>
              <Select
                allowClear
                className={styles.filterControl}
                placeholder="ทุกสถานะ"
                options={statusOptions}
                value={draft.status}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, status: value }))
                }
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>วันที่รับเข้า</span>
              <DatePicker.RangePicker
                allowEmpty={[true, true]}
                className={styles.filterControl}
                format="DD/MM/YYYY"
                placeholder={["ตั้งแต่", "ถึง"]}
                value={draft.receivedRange ?? null}
                onChange={(range) =>
                  setDraft((prev) => ({ ...prev, receivedRange: range }))
                }
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ค้นหา</span>
              <Input
                allowClear
                className={styles.filterControl}
                prefix={<SearchOutlined />}
                placeholder="Lot / สินค้า / เอกสาร"
                value={draft.q}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, q: e.target.value }))
                }
                onPressEnter={handleSearch}
              />
            </div>
            <div className={styles.stockToggle}>
              <Switch
                checked={draft.nearExpiry}
                checkedChildren="ใกล้หมดอายุ"
                unCheckedChildren="ทั้งหมด"
                onChange={(checked) =>
                  setDraft((prev) => ({ ...prev, nearExpiry: checked }))
                }
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
              loading={lotsQuery.isFetching}
              rowClassName={(row) => expiryRowClass(row.expiryStatus)}
              pagination={{
                pageSize: 15,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                hideOnSinglePage: true,
              }}
              scroll={{ x: 1600 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>ยังไม่มี Lot ตามเงื่อนไข</strong>
                    <span>
                      ลองเปลี่ยนคลัง ตำแหน่ง หรือปิดตัวกรอง “เฉพาะมียอด”
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </div>
        {qcLot ? (
          <LotQcModal
            key={qcLot.lotId}
            lot={{
              lotId: qcLot.lotId,
              lotNo: qcLot.lotNo,
              itemCode: qcLot.itemCode,
              itemNameTh: qcLot.itemNameTh,
              qcStatus: qcLot.qcStatus,
              coaReference: qcLot.coaReference,
            }}
            onClose={() => setQcLot(null)}
          />
        ) : null}
      </section>
    </MasterPageGate>
  );
}
