"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  PlusOutlined,
  RollbackOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useReturnNotesQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import type { ReturnNote, ReturnNoteStatus } from "@/types/return-notes";
import { RETURN_NOTE_STATUS_LABEL } from "@/types/return-notes";
import {
  ApproveReturnNoteModal,
  RejectReturnNoteModal,
} from "./ReturnNoteDecisionModals";
import styles from "./ReturnNotesListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "APPROVED"
      ? styles.statusConfirmed
      : status === "REJECTED"
        ? styles.statusCancelled
        : styles.statusDraft;
  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {RETURN_NOTE_STATUS_LABEL[status as ReturnNoteStatus] ?? status}
    </span>
  );
}

function formatQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

export default function ReturnNotesListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(
    null,
  );
  const [applied, setApplied] = useState<{
    keyword?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [approveTarget, setApproveTarget] = useState<ReturnNote | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReturnNote | null>(null);

  const screenActions = useScreenActionPermissions("RETURN_NOTES");
  const canAdd = screenActions.canAdd;
  const canApprove = screenActions.canApprove;

  const query = useReturnNotesQuery({ ...applied, page, limit });
  const allQuery = useReturnNotesQuery({ page: 1, limit: 1 });
  const pendingQuery = useReturnNotesQuery({
    status: "PENDING_APPROVAL",
    page: 1,
    limit: 1,
  });
  const approvedQuery = useReturnNotesQuery({
    status: "APPROVED",
    page: 1,
    limit: 1,
  });
  const rejectedQuery = useReturnNotesQuery({
    status: "REJECTED",
    page: 1,
    limit: 1,
  });

  const rows = query.data?.data?.items ?? [];
  const total = query.data?.data?.total ?? 0;

  const buildApplied = (nextStatus?: string) => ({
    keyword: keyword.trim() || undefined,
    status: nextStatus,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  });

  const applySearch = () => {
    setPage(1);
    setApplied(buildApplied(status));
  };

  const clearFilters = () => {
    setKeyword("");
    setStatus(undefined);
    setRange(null);
    setApplied({});
    setPage(1);
  };

  const setQuickStatus = (next?: ReturnNoteStatus) => {
    setStatus(next);
    setPage(1);
    setApplied(buildApplied(next));
  };

  const columns: ColumnsType<ReturnNote> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบคืน",
        dataIndex: "returnNoteNo",
        key: "returnNoteNo",
        width: 160,
        render: (value: string) => <span className={styles.countNo}>{value}</span>,
      },
      {
        title: "วันที่",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 110,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "ลูกค้า",
        dataIndex: "customerName",
        key: "customerName",
        ellipsis: true,
        render: (value?: string) => value || "—",
      },
      {
        title: "อ้างอิง",
        key: "refs",
        width: 220,
        render: (_: unknown, row) => (
          <div style={{ lineHeight: 1.4 }}>
            <div>{row.salesOrderNo ?? "—"}{row.roundNo ? ` · รอบที่ ${row.roundNo}` : ""}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.pickingNo ?? "—"}
              {row.deliveryOrderNo ? ` · ${row.deliveryOrderNo}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "จำนวนคืน",
        key: "totalReturnQty",
        width: 110,
        align: "right",
        render: (_: unknown, row) => formatQty(row.totalReturnQty),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value: string) => <StatusPill status={value} />,
      },
      {
        title: "",
        key: "actions",
        width: 120,
        render: (_: unknown, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.actionBtn}
              title="ดูรายละเอียด"
              onClick={() => router.push(`/return-notes/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            {canApprove && row.status === "PENDING_APPROVAL" ? (
              <>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="อนุมัติ"
                  onClick={() => setApproveTarget(row)}
                >
                  <CheckOutlined />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="ไม่อนุมัติ"
                  onClick={() => setRejectTarget(row)}
                >
                  <CloseOutlined />
                </button>
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [canApprove, limit, page, router],
  );

  const chips: Array<{
    key?: ReturnNoteStatus;
    label: string;
    hint: string;
    value: number;
  }> = [
    { label: "ทั้งหมด", hint: "เอกสารทั้งหมด", value: allQuery.data?.data?.total ?? 0 },
    {
      key: "PENDING_APPROVAL",
      label: "รอคลังอนุมัติ",
      hint: "ยังไม่รับของเข้า",
      value: pendingQuery.data?.data?.total ?? 0,
    },
    {
      key: "APPROVED",
      label: "อนุมัติแล้ว",
      hint: "อยู่ในคลังตรวจสอบ",
      value: approvedQuery.data?.data?.total ?? 0,
    },
    {
      key: "REJECTED",
      label: "ไม่อนุมัติ",
      hint: "ไม่รับของเข้า",
      value: rejectedQuery.data?.data?.total ?? 0,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Finished Goods · Return Note"
        icon={<RollbackOutlined />}
        title="คืนสินค้า"
        subtitle="บันทึกสินค้าที่ลูกค้าตีกลับ อ้างอิงใบจ่ายสินค้า แล้วให้คลังอนุมัติรับเข้าคลังตรวจสอบ"
        actions={
          <>
{canAdd ? (
          <div className={styles.heroActions}>
            <Button
              className={styles.primaryBtn}
              icon={<PlusOutlined />}
              onClick={() => router.push("/return-notes/create")}
            >
              สร้างใบคืนสินค้า
            </Button>
          </div>
        ) : null}
          </>
        }
      />

      <div className={styles.statRow}>
        {chips.map((chip) => (
          <button
            key={chip.key ?? "ALL"}
            type="button"
            className={`${styles.statChip} ${applied.status === chip.key ? styles.statChipActive : ""}`}
            onClick={() => setQuickStatus(chip.key)}
          >
            <span className={styles.statLabel}>{chip.label}</span>
            <span className={styles.statValue}>{chip.value}</span>
            <span className={styles.statHint}>{chip.hint}</span>
          </button>
        ))}
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="เลขที่ใบคืน / SO / ใบจ่าย / ใบส่ง / ลูกค้า"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่สร้าง</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={range}
              onChange={(value) => setRange(value)}
              format="DD/MM/YYYY"
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
              options={(
                Object.keys(RETURN_NOTE_STATUS_LABEL) as ReturnNoteStatus[]
              ).map((value) => ({
                value,
                label: RETURN_NOTE_STATUS_LABEL[value],
              }))}
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
          scroll={{ x: 1000 }}
          onRow={(row) => ({
            onClick: () => router.push(`/return-notes/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ยังไม่มีใบคืนสินค้า</strong>
                สร้างจากใบส่งสินค้าที่ถูกตีกลับ หรือกดปุ่ม “สร้างใบคืนสินค้า”
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

      <ApproveReturnNoteModal
        note={approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <RejectReturnNoteModal
        note={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </div>
  );
}
