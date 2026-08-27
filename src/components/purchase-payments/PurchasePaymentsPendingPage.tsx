"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Pagination, Select, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DollarOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePendingPurchasePaymentsQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import type { PendingSupplierPaymentPo } from "@/types/purchase-payments";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./PurchasePaymentsPendingPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PurchasePaymentsPendingPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [poNo, setPoNo] = useState("");
  const [vendor, setVendor] = useState("");
  const [applied, setApplied] = useState<{ poNo?: string; vendor?: string }>(
    {},
  );

  /** ตั้งใบสำคัญจ่ายจาก PO = PURCHASE_PAYMENTS_PENDING.EDIT (ตรงกับ guard ฝั่ง backend) */
  const canPay = useScreenActionPermissions("PURCHASE_PAYMENTS_PENDING").canEdit;

  const query = usePendingPurchasePaymentsQuery({ page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const filteredRows = useMemo(() => {
    const poQ = applied.poNo?.toLowerCase();
    const vendorQ = applied.vendor?.toLowerCase();
    return rows.filter((row) => {
      if (poQ && !row.poNo.toLowerCase().includes(poQ)) return false;
      if (
        vendorQ &&
        !(
          row.creditor?.nameTh?.toLowerCase().includes(vendorQ) ||
          row.creditor?.creditorCode?.toLowerCase().includes(vendorQ)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [applied, rows]);

  const pageAmount = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0),
    [filteredRows],
  );

  const grCount = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + (row.confirmedGrCount || 0), 0),
    [filteredRows],
  );

  const applySearch = () => {
    setApplied({
      poNo: poNo.trim() || undefined,
      vendor: vendor.trim() || undefined,
    });
  };

  const clearFilters = () => {
    setPoNo("");
    setVendor("");
    setApplied({});
  };

  const columns: ColumnsType<PendingSupplierPaymentPo> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ PO",
        dataIndex: "poNo",
        render: (value: string) => (
          <DocNoWithFlowBadge
            no={<span className={styles.poNo}>{value}</span>}
            source={{ kind: "pending-pay" }}
          />
        ),
      },
      {
        title: "วันที่",
        dataIndex: "poDate",
        width: 110,
        render: (value: string) => formatDate(value),
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
        title: "เงื่อนไขชำระ",
        key: "paymentTerm",
        render: (_v, row) => (
          <span className={styles.termCell}>
            {row.paymentTerm?.name ?? "ไม่ระบุ"}
          </span>
        ),
      },
      {
        title: "ยอดจ่าย",
        dataIndex: "totalAmount",
        align: "right",
        render: (value: string) => (
          <span className={styles.amountCell}>{formatMoney(value)}</span>
        ),
      },
      {
        title: "GR ยืนยัน",
        dataIndex: "confirmedGrCount",
        align: "center",
        width: 100,
        render: (value: number) => (
          <span className={styles.grCount}>{value}</span>
        ),
      },
      {
        title: "สถานะจ่าย",
        dataIndex: "paymentStatus",
        width: 120,
        render: () => (
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden />
            รอจ่าย
          </span>
        ),
      },
      {
        title: "",
        key: "actions",
        width: canPay ? 120 : 56,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            {canPay ? (
              <Button
                className={styles.payBtn}
                type="primary"
                size="small"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(`/purchase-payments/create-from-po/${row.id}`)
                }
              >
                จ่ายเงิน
              </Button>
            ) : (
              <button
                type="button"
                className={styles.actionBtn}
                title="ดูใบสั่งซื้อ"
                onClick={() => router.push(`/purchase-orders/${row.id}`)}
              >
                <EyeOutlined />
              </button>
            )}
          </Space>
        ),
      },
    ],
    [canPay, limit, page, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeIcon} aria-hidden>
              <DollarOutlined />
            </span>
            Accounting · Supplier Payments
          </div>
          <h1 className={styles.pageTitle}>PO รอจ่ายเงิน</h1>
          <p className={styles.pageSubtitle}>
            ใบสั่งซื้อที่รับของครบแล้ว (COMPLETED) และมี GR ยืนยัน —
            จ่ายเต็มจำนวนเท่านั้น
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
          <Link href="/purchase-payments">
            <Button className={styles.secondaryBtn} icon={<HistoryOutlined />}>
              ประวัติการจ่าย
            </Button>
          </Link>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>รอจ่ายทั้งหมด</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statHint}>ใบสั่งซื้อค้างจ่าย</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดในหน้านี้</span>
          <span className={`${styles.statValue} ${styles.statValueAccent}`}>
            {formatMoney(pageAmount)}
          </span>
          <span className={styles.statHint}>บาท · ตามผลที่แสดง</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>GR ที่ยืนยัน</span>
          <span className={styles.statValue}>{grCount}</span>
          <span className={styles.statHint}>ใบรับของอ้างอิงในหน้านี้</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ PO</label>
            <Input
              allowClear
              placeholder="เช่น PO-20260718-001"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ผู้ขาย</label>
            <Input
              allowClear
              placeholder="ชื่อหรือรหัสผู้ขาย"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              onPressEnter={applySearch}
            />
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
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{total}</strong> รายการ
            {applied.poNo || applied.vendor ? (
              <>
                {" "}
                · แสดงในหน้านี้ <strong>{filteredRows.length}</strong>
              </>
            ) : null}
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
          dataSource={filteredRows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          onRow={(row) => ({
            onClick: () =>
              router.push(
                canPay
                  ? `/purchase-payments/create-from-po/${row.id}`
                  : `/purchase-orders/${row.id}`,
              ),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ไม่มี PO รอจ่ายเงิน</strong>
                เมื่อรับของครบและ Confirm GR แล้ว รายการจะขึ้นที่นี่
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
