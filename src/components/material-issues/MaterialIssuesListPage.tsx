"use client";
import { Tag } from "antd";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Space, Table } from "antd";
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

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStockIssuesQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import { useLowStockItemsQuery } from "@/hooks/inventory/useInventoryQueries";
import type { StockIssue } from "@/types/stock-issues";
import { STOCK_ISSUE_STATUS_LABEL, STOCK_ISSUE_STATUS_COLOR } from "@/types/stock-issues";
import { tStockLabel } from "@/types/stock-adjustments";
import styles from "./MaterialIssuesListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function StatusPill({ status }: { status: string }) {
  return (
    <Tag color={STOCK_ISSUE_STATUS_COLOR[status] ?? "default"}>
      {STOCK_ISSUE_STATUS_LABEL[status]
        ? tStockLabel(STOCK_ISSUE_STATUS_LABEL[status])
        : status}
    </Tag>
  );
}

export default function MaterialIssuesListPage() {
  const t = useT();
  const router = useRouter();
  const [issueNo, setIssueNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [issueDate, setIssueDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    issueNo?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  /** สิทธิ์จาก Permission Matrix ของหน้านี้ — สร้างกับแก้ไขแยกกันตามที่ติ๊กไว้ */
  const screenActions = useScreenActionPermissions("MATERIAL_ISSUES");
  const canAdd = screenActions.canAdd;
  const canEdit = screenActions.canEdit;

  const query = useStockIssuesQuery({ ...applied, page, limit });
  const allQuery = useStockIssuesQuery({ page: 1, limit: 1 });
  const draftQuery = useStockIssuesQuery({ status: "DRAFT", page: 1, limit: 1 });
  const postedQuery = useStockIssuesQuery({ status: "POSTED", page: 1, limit: 1 });
  const cancelledQuery = useStockIssuesQuery({
    status: "CANCELLED",
    page: 1,
    limit: 1,
  });
  const lowStockQuery = useLowStockItemsQuery();

  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;
  const allTotal = allQuery.data?.data.total ?? 0;
  const draftTotal = draftQuery.data?.data.total ?? 0;
  const postedTotal = postedQuery.data?.data.total ?? 0;
  const cancelledTotal = cancelledQuery.data?.data.total ?? 0;

  const lowStockItemIds = useMemo(
    () => new Set((lowStockQuery.data?.data ?? []).map((row) => row.itemId)),
    [lowStockQuery.data?.data],
  );

  const applySearch = () => {
    setPage(1);
    setApplied({
      issueNo: issueNo.trim() || undefined,
      status,
      dateFrom: issueDate ? issueDate.format("YYYY-MM-DD") : undefined,
      dateTo: issueDate ? issueDate.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setIssueNo("");
    setStatus(undefined);
    setIssueDate(null);
    setApplied({});
    setPage(1);
  };

  const setQuickStatus = (next?: string) => {
    setStatus(next);
    setPage(1);
    setApplied((prev) => ({ ...prev, status: next }));
  };

  const columns: ColumnsType<StockIssue> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบเบิก"),
        dataIndex: "issueNo",
        key: "issueNo",
        render: (value: string) => <span className={styles.issueNo}>{value}</span>,
      },
      {
        title: t("วันที่เบิก"),
        dataIndex: "issueDate",
        key: "issueDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ผู้ขอเบิก"),
        key: "requestedBy",
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: t("จำนวนรายการ"),
        key: "itemCount",
        align: "right",
        width: 110,
        render: (_v, row) => row.items?.length ?? 0,
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => <StatusPill status={value} />,
      },
      {
        title: "",
        key: "actions",
        width: 96,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.actionBtn}
              title={t("ดูรายละเอียด")}
              onClick={() => router.push(`/inventory/material-issues/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            {canEdit && row.status === "DRAFT" ? (
              <button
                type="button"
                className={styles.actionBtn}
                title={t("แก้ไข")}
                onClick={() =>
                  router.push(`/inventory/material-issues/${row.id}/edit`)
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
        eyebrow="Warehouse · Material Issue"
        icon={<SwapOutlined />}
        title={t("เบิกของออกจากคลัง")}
        subtitle={t("สร้างใบเบิก (DRAFT) แล้วส่งให้หัวหน้าคลังอนุมัติเพื่อตัดสต๊อกจริง")}
        actions={
          <>
{canAdd ? (
          <div className={styles.heroActions}>
            <Button
              className={styles.primaryBtn}
              icon={<PlusOutlined />}
              onClick={() => router.push("/inventory/material-issues/create")}
            >
              {t("สร้างใบเบิกของ")}
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
          <span className={styles.statLabel}>{t("แบบร่างเอกสาร")}</span>
          <span className={styles.statValue}>{draftTotal}</span>
          <span className={styles.statHint}>{t("รออนุมัติ")}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "POSTED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("POSTED")}
        >
          <span className={styles.statLabel}>{t("อนุมัติแล้ว")}</span>
          <span className={styles.statValue}>{postedTotal}</span>
          <span className={styles.statHint}>{t("ตัดสต๊อกแล้ว")}</span>
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
            <label>{t("เลขที่ใบเบิก")}</label>
            <Input
              allowClear
              placeholder={t("เช่น SI-20260721-001")}
              value={issueNo}
              onChange={(e) => setIssueNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่เบิก")}</label>
            <DatePicker
              style={{ width: "100%" }}
              value={issueDate}
              onChange={setIssueDate}
              format="DD/MM/BBBB"
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
                { value: "POSTED", label: t("อนุมัติแล้ว") },
                { value: "CANCELLED", label: tStockLabel("ยกเลิก") },
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
          rowClassName={(row) =>
            (row.items ?? []).some((item) => lowStockItemIds.has(item.itemId))
              ? styles.lowStockRow
              : ""
          }
          onRow={(row) => ({
            onClick: () => router.push(`/inventory/material-issues/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ยังไม่มีใบเบิกของ")}</strong>
                {t("สร้างใบเบิกใหม่ผ่านปุ่ม “สร้างใบเบิกของ”")}
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
