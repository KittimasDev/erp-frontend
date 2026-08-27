"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  InboxOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useGoodsReceiptsQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import type { GoodsReceipt } from "@/types/goods-receipts";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import styles from "./GoodsReceiptsListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "CONFIRMED"
      ? styles.statusConfirmed
      : status === "CANCELLED"
        ? styles.statusCancelled
        : styles.statusDraft;

  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {GOODS_RECEIPT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function GoodsReceiptsListPage() {
  const router = useRouter();
  const [grNo, setGrNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [grDate, setGrDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    grNo?: string;
    status?: string;
    grDateFrom?: string;
    grDateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  /** สิทธิ์จาก Permission Matrix ของหน้านี้ — สร้างกับแก้ไขแยกกันตามที่ติ๊กไว้ */
  const screenActions = useScreenActionPermissions("GOODS_RECEIPTS");
  const canAdd = screenActions.canAdd;
  const canEdit = screenActions.canEdit;

  const query = useGoodsReceiptsQuery({ ...applied, page, limit });
  const allQuery = useGoodsReceiptsQuery({ page: 1, limit: 1 });
  const draftQuery = useGoodsReceiptsQuery({ status: "DRAFT", page: 1, limit: 1 });
  const confirmedQuery = useGoodsReceiptsQuery({
    status: "CONFIRMED",
    page: 1,
    limit: 1,
  });
  const cancelledQuery = useGoodsReceiptsQuery({
    status: "CANCELLED",
    page: 1,
    limit: 1,
  });

  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;
  const allTotal = allQuery.data?.data.total ?? 0;
  const draftTotal = draftQuery.data?.data.total ?? 0;
  const confirmedTotal = confirmedQuery.data?.data.total ?? 0;
  const cancelledTotal = cancelledQuery.data?.data.total ?? 0;

  const applySearch = () => {
    setPage(1);
    setApplied({
      grNo: grNo.trim() || undefined,
      status,
      grDateFrom: grDate ? grDate.format("YYYY-MM-DD") : undefined,
      grDateTo: grDate ? grDate.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setGrNo("");
    setStatus(undefined);
    setGrDate(null);
    setApplied({});
    setPage(1);
  };

  const setQuickStatus = (next?: string) => {
    setStatus(next);
    setPage(1);
    setApplied((prev) => ({
      ...prev,
      status: next,
    }));
  };

  const columns: ColumnsType<GoodsReceipt> = useMemo(
    () => [
      {
        title: "#",
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบรับของ",
        dataIndex: "grNo",
        key: "grNo",
        render: (value: string, row) => (
          <DocNoWithFlowBadge
            no={<span className={styles.grNo}>{value}</span>}
            source={{
              kind: "gr",
              status: row.status,
              poStatus: row.purchaseOrder?.status,
              paymentStatus: row.purchaseOrder?.paymentStatus,
            }}
          />
        ),
      },
      {
        title: "วันที่รับ",
        dataIndex: "grDate",
        key: "grDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "อ้างอิง PO",
        key: "po",
        render: (_v, row) =>
          row.purchaseOrder ? (
            <Link
              className={styles.poLink}
              href={`/purchase-orders/${row.purchaseOrder.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {row.purchaseOrder.poNo}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        title: "ผู้ขาย",
        key: "creditor",
        render: (_v, row) =>
          row.creditor ? (
            <div className={styles.creditorCell}>
              <span className={styles.creditorName}>{row.creditor.nameTh}</span>
              <span className={styles.creditorCode}>
                {row.creditor.creditorCode}
              </span>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: "ยอดรวม",
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        render: (value: string) => (
          <span className={styles.amountCell}>{formatMoney(value)}</span>
        ),
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
              onClick={() => router.push(`/goods-receipts/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            {canEdit && row.status === "DRAFT" ? (
              <button
                type="button"
                className={styles.actionBtn}
                title="แก้ไข"
                onClick={() => router.push(`/goods-receipts/${row.id}/edit`)}
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
              <InboxOutlined />
            </span>
            Warehouse · Goods Receipt
          </div>
          <h1 className={styles.pageTitle}>ใบรับของ</h1>
          <p className={styles.pageSubtitle}>
            รับสินค้าจากใบสั่งซื้อที่ยืนยันแล้ว — Confirm แล้วสต๊อกเข้าคลังจริง
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/purchase-orders">
            <Button
              className={styles.secondaryBtn}
              icon={<ShoppingCartOutlined />}
            >
              ไปที่ใบสั่งซื้อ
            </Button>
          </Link>
        </div>
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
          <span className={styles.statHint}>รอ Confirm</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${applied.status === "CONFIRMED" ? styles.statChipActive : ""}`}
          onClick={() => setQuickStatus("CONFIRMED")}
        >
          <span className={styles.statLabel}>ยืนยันแล้ว</span>
          <span className={styles.statValue}>{confirmedTotal}</span>
          <span className={styles.statHint}>โพสต์สต๊อกแล้ว</span>
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
            <label>เลขที่ใบรับของ</label>
            <Input
              allowClear
              placeholder="เช่น GR-20260718-001"
              value={grNo}
              onChange={(e) => setGrNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่รับ</label>
            <DatePicker
              style={{ width: "100%" }}
              value={grDate}
              onChange={setGrDate}
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
                { value: "DRAFT", label: "ร่าง" },
                { value: "CONFIRMED", label: "ยืนยันแล้ว" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
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
          onRow={(row) => ({
            onClick: () => router.push(`/goods-receipts/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ยังไม่มีใบรับของ</strong>
                สร้างจากใบสั่งซื้อที่ยืนยันแล้วผ่านปุ่ม “รับของ”
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
