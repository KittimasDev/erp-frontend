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
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import { tNow, useT } from "@/lib/i18n/useT";
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
import PageHeader from "@/components/common/PageHeader";

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
  return dayjs(value).format("DD/MM/BBBB");
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
  const t = useT();
  if (!row.recordedInOtherUnit) {
    return null;
  }
  const recorded = `${formatQty(row.quantityOnHand)} ${row.unitCode ?? ""}`.trim();
  const title =
    row.baseUnitConvertible === false
      ? t("บันทึกเป็น {unit} และยังไม่มีกฎแปลงเป็นหน่วยหลักของสินค้า — ตั้งกฎที่ ข้อมูลหลัก > กฎแปลงหน่วยนับ", { unit: row.unitCode ?? t("หน่วยอื่น") })
      : t("บันทึกในระบบเป็น {recorded} — แสดงเป็นหน่วยหลัก {unit}", { recorded, unit: row.baseUnitCode ?? "" });
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
    return tNow("เลยมา {n} วัน", { n: Math.abs(days) });
  }
  if (days === 0) {
    return tNow("หมดอายุวันนี้");
  }
  return tNow("เหลือ {n} วัน", { n: days });
}

function pageCopy(
  searchParams: { get(name: string): string | null } | null,
  itemCategoryCode?: string,
) {
  const scope = getInventoryPageScope(searchParams, itemCategoryCode);
  if (scope) {
    const isRm = scope.title === "คลังวัตถุดิบ";
    const isFg = scope.title === "คลังสินค้าสำเร็จรูป";
    return {
      eyebrow: isRm ? tNow("คลังวัตถุดิบ · RAW MATERIAL") : isFg ? tNow("คลังสินค้าสำเร็จรูป · FINISHED GOODS") : tNow(scope.eyebrow),
      title: isRm ? tNow("ยอดคงเหลือและประวัติ Lot วัตถุดิบ") : isFg ? tNow("ยอดคงเหลือและประวัติ Lot สินค้าสำเร็จรูป") : tNow(scope.title),
      subtitle: tNow("ตรวจสอบประวัติ Lot วัตถุดิบ ยอดคงเหลือ ตำแหน่งจัดเก็บ และวันหมดอายุ"),
    };
  }
  return {
    eyebrow: "INVENTORY · LOTS",
    title: tNow("ยอดคงเหลือแยก Lot"),
    subtitle:
      tNow("ตรวจสอบ Lot จากใบรับซื้อยาง รับผลผลิต และเอกสารต้นทางอื่น — แถวสีเตือนเมื่อใกล้หมดอายุ"),
  };
}

export default function InventoryLotsPage() {
  const t = useT();
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
      : t("ทุกคลัง"),
    filters.status ? t("สถานะ {status}", { status: filters.status }) : null,
    filters.hasStock === false ? t("รวมยอดศูนย์") : t("เฉพาะมียอด"),
    filters.nearExpiry ? t("ใกล้หมดอายุ") : null,
    filters.dateFrom || filters.dateTo
      ? t("รับเข้า {from} – {to}", { from: filters.dateFrom ? formatDate(filters.dateFrom) : "…", to: filters.dateTo ? formatDate(filters.dateTo) : "…" })
      : null,
    filters.q ? t("ค้นหา “{q}”", { q: filters.q }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const [qcLot, setQcLot] = useState<InventoryLotBalanceRow | null>(null);

  const columns: ColumnsType<InventoryLotBalanceRow> = [
    {
      title: t("ลำดับ"),
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
      title: t("วันที่รับเข้า"),
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
      title: t("สินค้า"),
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
      title: t("คลัง / ตำแหน่ง"),
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
      title: t("คงเหลือ"),
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
      title: t("พร้อมใช้"),
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
      title: t("หมดอายุ"),
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
                {LOT_EXPIRY_STATUS_LABEL[status] ? t(LOT_EXPIRY_STATUS_LABEL[status]) : status}
              </span>
            )}
            {row.expirySource === "CALCULATED" ? (
              <span className={styles.metaMuted}>{t("คำนวณจากอายุเก็บ")}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 150,
      render: (_, row) => {
        const isPending = (row.qcStatus ?? "").toUpperCase() === "PENDING";
        const isApproved = (row.qcStatus ?? "").toUpperCase() === "APPROVED";
        return (
          <div className={styles.itemCell}>
            <span
              className={`${styles.statusPill} ${lotStatusClass(row.lotStatus)}`}
            >
              {row.lotStatus || "-"}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: isPending ? 600 : 400,
                color: isPending ? "#d97706" : isApproved ? "#16a34a" : "#64748b",
              }}
            >
              {isPending ? t("⚠️ QC รอตรวจ") : isApproved ? t("✓ QC ผ่าน") : `QC ${row.qcStatus || "-"}`}
              {row.coaReference ? ` · COA ${row.coaReference}` : ""}
            </span>
          </div>
        );
      },
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
          {row.qcStatus === "PENDING" || row.qcStatus === "HOLD" ? t("ตรวจ QC") : "QC / COA"}
        </Button>
      ),
    },
    {
      title: t("เอกสารต้นทาง"),
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
    setPage(1);
  };

  const handleClear = () => {
    setDraft({ q: "", hasStock: true, nearExpiry: false });
    setFilters({ hasStock: true, ...scopeFilter });
    setPage(1);
  };

  return (
    <MasterPageGate isLoading={lotsQuery.isLoading}>
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
            <span>{t("รายการ Lot ทั้งหมด")}</span>
            <strong>
              {stats.lots}{" "}
              <span style={{ fontSize: 13, fontWeight: 400, color: "#6f9720" }}>
                Lot
              </span>
            </strong>
            <span className={styles.summarySub}>
              {t("{rows} ตำแหน่งจัดเก็บ · {items} ชนิดสินค้า", { rows: stats.rows, items: stats.items })}
            </span>
          </div>

          <div className={styles.summaryCard}>
            <span>{t("คงเหลือรวมในคลัง")}</span>
            <strong className={styles.summaryCompact}>
              {formatQty(String(stats.totalOnHand))}
            </strong>
            <span className={styles.summarySub} style={{ color: "#739816" }}>
              {t("พร้อมใช้")}: <strong>{formatQty(String(stats.totalAvailable))}</strong>
            </span>
          </div>

          <div
            className={styles.summaryCard}
            style={{
              borderLeft:
                stats.pendingQc > 0
                  ? "4px solid #f59e0b"
                  : "1px solid var(--erp-border, rgba(0, 0, 0, 0.06))",
            }}
          >
            <span>{t("การตรวจคุณภาพ (QC)")}</span>
            <strong style={{ color: stats.pendingQc > 0 ? "#d97706" : "#2f343a" }}>
              {stats.pendingQc}{" "}
              <span style={{ fontSize: 13, fontWeight: 400 }}>{t("รอตรวจ")}</span>
            </strong>
            <span className={styles.summarySub}>
              {stats.pendingQc > 0
                ? t("⚠️ มี Lot รออนุมัติผล QC / COA")
                : t("✅ ผ่านการตรวจ QC ครบถ้วน")}
            </span>
          </div>

          <div
            className={styles.summaryCard}
            style={{
              borderLeft:
                stats.expiredLots > 0
                  ? "4px solid #ef4444"
                  : stats.warningLots > 0
                  ? "4px solid #f59e0b"
                  : "1px solid var(--erp-border, rgba(0, 0, 0, 0.06))",
            }}
          >
            <span>{t("การเฝ้าระวังวันหมดอายุ")}</span>
            <strong
              style={{
                color:
                  stats.expiredLots > 0
                    ? "#cf1322"
                    : stats.criticalLots > 0
                    ? "#d4380d"
                    : stats.warningLots > 0
                    ? "#d48806"
                    : "#2f343a",
              }}
            >
              {stats.expiredLots + stats.criticalLots + stats.warningLots}{" "}
              <span style={{ fontSize: 13, fontWeight: 400 }}>Lot</span>
            </strong>
            <span className={styles.summarySub}>
              {stats.expiredLots > 0
                ? t("❌ หมดอายุแล้ว {n} Lot", { n: stats.expiredLots })
                : stats.criticalLots > 0
                ? t("⚠️ วิกฤต ≤7 วัน {n} Lot", { n: stats.criticalLots })
                : stats.warningLots > 0
                ? t("ใกล้หมดอายุ ≤30 วัน {n} Lot", { n: stats.warningLots })
                : t("✅ ทุก Lot วันที่ปกติ")}
            </span>
          </div>
        </div>

        <FilterCard onSearch={handleSearch} onClear={handleClear} loading={lotsQuery.isFetching}>
          <FilterField label={t("คลัง")}>
            <Select
              allowClear
              showSearch
              style={{ width: "100%" }}
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
          </FilterField>
          <FilterField label={t("ตำแหน่ง")}>
            <Select
              allowClear
              showSearch
              style={{ width: "100%" }}
              optionFilterProp="label"
              placeholder={
                draft.warehouseId ? t("ทุกตำแหน่ง") : t("เลือกคลังก่อน")
              }
              options={locationOptions}
              disabled={!draft.warehouseId}
              value={draft.locationId}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, locationId: value }))
              }
            />
          </FilterField>
          <FilterField label={t("สถานะ Lot")}>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("ทุกสถานะ")}
              options={statusOptions}
              value={draft.status}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, status: value }))
              }
            />
          </FilterField>
          <FilterField label={t("วันที่รับเข้า")} wide>
            <DatePicker.RangePicker
              allowEmpty={[true, true]}
              style={{ width: "100%" }}
              format="DD/MM/BBBB"
              placeholder={[t("ตั้งแต่"), t("ถึง")]}
              value={draft.receivedRange ?? null}
              onChange={(range) =>
                setDraft((prev) => ({ ...prev, receivedRange: range }))
              }
            />
          </FilterField>
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              style={{ width: "100%" }}
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder={t("Lot / สินค้า / เอกสาร...")}
              value={draft.q}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, q: e.target.value }))
              }
            />
          </FilterField>
          <FilterField label={t("ใกล้หมดอายุ")}>
            <Switch
              checked={draft.nearExpiry}
              checkedChildren={t("ใกล้หมดอายุ")}
              unCheckedChildren={t("ทั้งหมด")}
              onChange={(checked) =>
                setDraft((prev) => ({ ...prev, nearExpiry: checked }))
              }
            />
          </FilterField>
          <FilterField label={t("มียอด")}>
            <Switch
              checked={draft.hasStock}
              checkedChildren={t("มียอด")}
              unCheckedChildren={t("ทั้งหมด")}
              onChange={(checked) =>
                setDraft((prev) => ({ ...prev, hasStock: checked }))
              }
            />
          </FilterField>
        </FilterCard>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>{t("รายการ Lot ในคลัง")}</h3>
              <p>{filterHint}</p>
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
                current: page,
                onChange: setPage,
                pageSize: 15,
                showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
                hideOnSinglePage: true,
              }}
              scroll={{ x: 1600 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>{t("ยังไม่มี Lot ตามเงื่อนไข")}</strong>
                    <span>
                      {t("ลองเปลี่ยนคลัง ตำแหน่ง หรือปิดตัวกรอง “เฉพาะมียอด”")}
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
