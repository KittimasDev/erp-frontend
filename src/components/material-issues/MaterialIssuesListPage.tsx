"use client";

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

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStockIssuesQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import { useLowStockItemsQuery } from "@/hooks/inventory/useInventoryQueries";
import type { StockIssue } from "@/types/stock-issues";
import { STOCK_ISSUE_STATUS_LABEL } from "@/types/stock-issues";
import styles from "./MaterialIssuesListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "POSTED"
      ? styles.statusConfirmed
      : status === "CANCELLED"
        ? styles.statusCancelled
        : styles.statusDraft;

  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {STOCK_ISSUE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function MaterialIssuesListPage() {
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
        title: "#",
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบเบิก",
        dataIndex: "issueNo",
        key: "issueNo",
        render: (value: string) => <span className={styles.issueNo}>{value}</span>,
      },
      {
        title: "วันที่เบิก",
        dataIndex: "issueDate",
        key: "issueDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ผู้ขอเบิก",
        key: "requestedBy",
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: "จำนวนรายการ",
        key: "itemCount",
        align: "right",
        width: 110,
        render: (_v, row) => row.items?.length ?? 0,
      },
      {
        title: "สถานะ",
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
              title="ดูรายละเอียด"
              onClick={() => router.push(`/inventory/material-issues/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            {canEdit && row.status === "DRAFT" ? (
              <button
                type="button"
                className={styles.actionBtn}
                title="แก้ไข"
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
    [canEdit, limit, page, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeIcon} aria-hidden>
              <SwapOutlined />
            </span>
            Warehouse · Material Issue
          </div>
          <h1 className={styles.pageTitle}>เบิกของออกจากคลัง</h1>
          <p className={styles.pageSubtitle}>
            สร้างใบเบิก (DRAFT) แล้วส่งให้หัวหน้าคลังอนุมัติเพื่อตัดสต๊อกจริง
          </p>
        </div>
        {canAdd ? (
          <div className={styles.heroActions}>
            <Button
              className={styles.primaryBtn}
              icon={<PlusOutlined />}
              onClick={() => router.push("/inventory/material-issues/create")}
            >
              สร้างใบเบิกของ
            </Button>
          </div>
        ) : null}
      </header>

      <div className={styles.statRow}>
        <button
          type="button"
          className={`${styles.statChip} ${!applied.status ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus(undefined)}
        >
          <span className={styles.statLabel}>ทั้งหมด</span>
          <span className={styles.statValue}>{allTotal}</span>
          <span className={styles.statHint}>เอกสารทั้งหมด</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "DRAFT" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("DRAFT")}
        >
          <span className={styles.statLabel}>ร่าง</span>
          <span className={styles.statValue}>{draftTotal}</span>
          <span className={styles.statHint}>รออนุมัติ</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "POSTED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("POSTED")}
        >
          <span className={styles.statLabel}>อนุมัติแล้ว</span>
          <span className={styles.statValue}>{postedTotal}</span>
          <span className={styles.statHint}>ตัดสต๊อกแล้ว</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "CANCELLED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("CANCELLED")}
        >
          <span className={styles.statLabel}>ยกเลิก</span>
          <span className={styles.statValue}>{cancelledTotal}</span>
          <span className={styles.statHint}>ไม่ใช้งาน</span>
        </button>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ใบเบิก</label>
            <Input
              allowClear
              placeholder="เช่น SI-20260721-001"
              value={issueNo}
              onChange={(e) => setIssueNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่เบิก</label>
            <DatePicker
              style={{ width: "100%" }}
              value={issueDate}
              onChange={setIssueDate}
              format="DD/MM/YYYY"
              placeholder="เลือกวันที่"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              options={[
                { value: "DRAFT", label: "แบบร่างเอกสาร" },
                { value: "POSTED", label: "อนุมัติแล้ว" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applySearch}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{total}</strong> รายการ
          </div>
          <div className={styles.entriesBox}>
            <span>แสดง</span>
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
            <span>รายการ/หน้า</span>
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
                <strong>ยังไม่มีใบเบิกของ</strong>
                สร้างใบเบิกใหม่ผ่านปุ่ม “สร้างใบเบิกของ”
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            แสดง {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} จาก {total}
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
