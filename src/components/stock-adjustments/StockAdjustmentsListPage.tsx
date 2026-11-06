"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
  Space,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";

import {
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStockAdjustmentsQuery } from "@/hooks/stock-adjustments/useStockAdjustmentsQuery";
import type {
  StockAdjustment,
  StockAdjustmentStatus,
} from "@/types/stock-adjustments";
import {
  STOCK_ADJUSTMENT_STATUS_LABEL,
  stockAdjustmentTypeDisplayName,
  tStockLabel,
} from "@/types/stock-adjustments";
import styles from "./StockAdjustmentsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "POSTED"
      ? styles.statusConfirmed
      : status === "CANCELLED" || status === "REJECTED"
        ? styles.statusCancelled
        : styles.statusDraft;

  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {STOCK_ADJUSTMENT_STATUS_LABEL[status]
        ? tStockLabel(STOCK_ADJUSTMENT_STATUS_LABEL[status])
        : status}
    </span>
  );
}

export default function StockAdjustmentsListPage() {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
  const [adjustmentNo, setAdjustmentNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [adjustmentDate, setAdjustmentDate] = useState<dayjs.Dayjs | null>(
    null,
  );
  const [applied, setApplied] = useState<{
    adjustmentNo?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  /** สิทธิ์จาก Permission Matrix ของหน้านี้ — สร้างกับแก้ไขแยกกันตามที่ติ๊กไว้ */
  const screenActions = useScreenActionPermissions("STOCK_ADJUSTMENTS");
  const canAdd = screenActions.canAdd;
  const canEdit = screenActions.canEdit;

  const query = useStockAdjustmentsQuery({
    ...applied,
    page,
    limit,
    warehouseGroup,
  });
  const allQuery = useStockAdjustmentsQuery({
    page: 1,
    limit: 1,
    warehouseGroup,
  });
  const draftQuery = useStockAdjustmentsQuery({
    status: "DRAFT",
    page: 1,
    limit: 1,
    warehouseGroup,
  });
  const pendingQuery = useStockAdjustmentsQuery({
    status: "PENDING_APPROVAL",
    page: 1,
    limit: 1,
    warehouseGroup,
  });
  const postedQuery = useStockAdjustmentsQuery({
    status: "POSTED",
    page: 1,
    limit: 1,
    warehouseGroup,
  });
  const cancelledQuery = useStockAdjustmentsQuery({
    status: "CANCELLED",
    page: 1,
    limit: 1,
    warehouseGroup,
  });

  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;
  const allTotal = allQuery.data?.data.total ?? 0;
  const draftTotal = draftQuery.data?.data.total ?? 0;
  const pendingTotal = pendingQuery.data?.data.total ?? 0;
  const postedTotal = postedQuery.data?.data.total ?? 0;
  const cancelledTotal = cancelledQuery.data?.data.total ?? 0;

  const applySearch = () => {
    setPage(1);
    setApplied({
      adjustmentNo: adjustmentNo.trim() || undefined,
      status,
      dateFrom: adjustmentDate
        ? adjustmentDate.format("YYYY-MM-DD")
        : undefined,
      dateTo: adjustmentDate ? adjustmentDate.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setAdjustmentNo("");
    setStatus(undefined);
    setAdjustmentDate(null);
    setApplied({});
    setPage(1);
  };

  const setQuickStatus = (next?: StockAdjustmentStatus) => {
    setStatus(next);
    setPage(1);
    setApplied({
      adjustmentNo: adjustmentNo.trim() || undefined,
      status: next,
      dateFrom: adjustmentDate
        ? adjustmentDate.format("YYYY-MM-DD")
        : undefined,
      dateTo: adjustmentDate ? adjustmentDate.format("YYYY-MM-DD") : undefined,
    });
  };

  const columns: ColumnsType<StockAdjustment> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่"),
        dataIndex: "adjustmentNo",
        key: "adjustmentNo",
        render: (value: string) => (
          <span className={styles.countNo}>{value}</span>
        ),
      },
      {
        title: t("วันที่"),
        dataIndex: "adjustmentDate",
        key: "adjustmentDate",
        width: 120,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ประเภท"),
        dataIndex: "adjustmentType",
        key: "adjustmentType",
        width: 120,
        render: (_value: string, record: StockAdjustment) =>
          stockAdjustmentTypeDisplayName(record),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value: string) => <StatusPill status={value} />,
      },
      {
        title: t("รายการ"),
        key: "itemCount",
        width: 90,
        align: "right",
        render: (_: unknown, row) => row.items?.length ?? 0,
      },
      {
        title: t("เหตุผล"),
        dataIndex: "reason",
        key: "reason",
        ellipsis: true,
        render: (value?: string | null) => value || "—",
      },
      {
        title: "",
        key: "actions",
        width: 96,
        render: (_: unknown, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.actionBtn}
              title={t("ดูรายละเอียด")}
              onClick={() =>
                router.push(scopePath(`/inventory/stock-adjustments/${row.id}`))
              }
            >
              <EyeOutlined />
            </button>
            {canEdit && row.status === "DRAFT" ? (
              <button
                type="button"
                className={styles.actionBtn}
                title={t("แก้ไข")}
                onClick={() =>
                  router.push(scopePath(`/inventory/stock-adjustments/${row.id}/edit`))
                }
              >
                <EditOutlined />
              </button>
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Warehouse · Stock Adjustment"
        icon={<SwapOutlined />}
        title={t("ใบปรับปรุงสต๊อก")}
        subtitle={t("เปิดใบร่าง ส่งอนุมัติ แล้วให้หัวหน้าคลังอนุมัติเพื่อปรับยอดสต๊อกจริง")}
        actions={
          <>
{canAdd ? (
          <div className={styles.heroActions}>
            <Button
              className={styles.primaryBtn}
              icon={<PlusOutlined />}
              onClick={() => router.push(scopePath("/inventory/stock-adjustments/create"))}
            >
              {t("สร้างใบปรับปรุง")}
            </Button>
          </div>
        ) : null}
          </>
        }
      />

      <div className={styles.statRow}>
        <button
          type="button"
          className={`${styles.statChip} ${!applied.status ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus(undefined)}
        >
          <span className={styles.statLabel}>{t("ทั้งหมด")}</span>
          <span className={styles.statValue}>{allTotal}</span>
          <span className={styles.statHint}>{t("เอกสารทั้งหมด")}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "DRAFT" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("DRAFT")}
        >
          <span className={styles.statLabel}>{t("ร่าง")}</span>
          <span className={styles.statValue}>{draftTotal}</span>
          <span className={styles.statHint}>{t("ยังไม่ส่ง")}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "PENDING_APPROVAL" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("PENDING_APPROVAL")}
        >
          <span className={styles.statLabel}>{t("รออนุมัติ")}</span>
          <span className={styles.statValue}>{pendingTotal}</span>
          <span className={styles.statHint}>{t("ส่งแล้ว")}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "POSTED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("POSTED")}
        >
          <span className={styles.statLabel}>{t("อนุมัติแล้ว")}</span>
          <span className={styles.statValue}>{postedTotal}</span>
          <span className={styles.statHint}>{t("ปรับสต๊อกแล้ว")}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "CANCELLED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("CANCELLED")}
        >
          <span className={styles.statLabel}>{tStockLabel("ยกเลิก")}</span>
          <span className={styles.statValue}>{cancelledTotal}</span>
          <span className={styles.statHint}>{t("ไม่ใช้งาน")}</span>
        </button>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่ใบปรับปรุง")}</label>
            <Input
              allowClear
              placeholder={t("เช่น ADJ-20260724-001")}
              value={adjustmentNo}
              onChange={(e) => setAdjustmentNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่")}</label>
            <DatePicker
              style={{ width: "100%" }}
              value={adjustmentDate}
              onChange={setAdjustmentDate}
              format="DD/MM/YYYY"
              placeholder={t("เลือกวันที่")}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              options={[
                { value: "DRAFT", label: t("แบบร่างเอกสาร") },
                { value: "PENDING_APPROVAL", label: t("รออนุมัติ") },
                { value: "POSTED", label: t("อนุมัติแล้ว") },
                { value: "CANCELLED", label: tStockLabel("ยกเลิก") },
                { value: "REJECTED", label: tStockLabel("ไม่อนุมัติ") },
              ]}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
          <Button
            type="primary"
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applySearch}
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{total}</strong> {t("รายการ")}
          </div>
          <div className={styles.entriesBox}>
            <span>{t("แสดง")}</span>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <span>{t("รายการ/หน้า")}</span>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          scroll={{ x: 900 }}
          onRow={(row) => ({
            onClick: () =>
              router.push(scopePath(`/inventory/stock-adjustments/${row.id}`)),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ยังไม่มีใบปรับปรุงสต๊อก")}</strong>
                {t("สร้างใบใหม่ผ่านปุ่ม “สร้างใบปรับปรุง”")}
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดง")} {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} {t("จาก")} {total}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
