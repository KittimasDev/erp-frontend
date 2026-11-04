"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Popconfirm, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BuildOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCancelProductionOrderMutation } from "@/hooks/production-orders/useProductionOrderMutations";
import { useProductionOutputReadyOrdersQuery } from "@/hooks/production-output/useProductionOutputQueries";
import type { ProductionOutputReadyOrder } from "@/types/production-output-stock-request";
import { hasRequestableProductionOutput } from "@/types/production-output-stock-request";
import styles from "./ProductionOutputPendingTicketsPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

function formatDateTime(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";
}

function formatQty(value?: string) {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("th-TH", { maximumFractionDigits: 3 })
    : "—";
}

/** ต่ำกว่าแผนเกิน 5 จุด = ผิดปกติพอที่ควรไปดู · สูงกว่าแผน = ดีกว่าที่วางไว้ */
const YIELD_GAP_ALERT = 5;

/**
 * คิว "ใบสั่งผลิตที่ผลิตเสร็จแล้ว และยังขอรับผลผลิตเข้าคลังได้อีก"
 *
 * รับผลผลิตเข้าคลัง (FINISHED_GOODS) เริ่มจากใบสั่งผลิตเท่านั้น ไม่เริ่มจากตั๋วชั่งรับซื้อยาง (PURCHASE_IN)
 * หน้านี้จึงไล่จาก production order ที่ปิดงานแล้ว เพื่อไม่ให้ของผลิตเสร็จค้างโดยไม่มีใครขอเข้าคลัง
 * (กับดักที่ FLOW_PRODUCTION.md เขียนไว้ว่า "ยืนยันเสร็จสิ้นแล้ว ทำไมสต๊อกไม่ขึ้น")
 * ใบที่ขอครบทุก SKU แล้ว (รออนุมัติหรืออนุมัติเข้าคลังแล้ว) ไม่ขึ้นในคิวนี้
 */
export default function ProductionOutputPendingTicketsPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  /** ค่าเริ่มต้นของ API คือ 7 วันล่าสุด — คิวงานควรเห็นของค้างเก่าด้วย จึงดึงทั้งหมด */
  const [allRange, setAllRange] = useState(true);

  const readyQuery = useProductionOutputReadyOrdersQuery({
    all: allRange || undefined,
    q: q.trim() || undefined,
  });
  const rows = useMemo(
    () =>
      (readyQuery.data?.data ?? []).filter(hasRequestableProductionOutput),
    [readyQuery.data],
  );

  /** ยังไม่มีคำขอสักใบ = งานที่ต้องรีบทำ · มีแล้วบางส่วน = ตามต่อได้ */
  const notRequested = rows.filter((row) => row.totalRequestCount === 0);
  const partlyRequested = rows.length - notRequested.length;

  /**
   * yield รวมของทั้งคิว = ผลผลิตที่รับเข้าคลังจริง ÷ วัตถุดิบที่ตัดเข้าผลิตจริง
   * คิดจากผลรวมทั้งชุด ไม่ใช่เฉลี่ยของ % รายใบ — ใบใหญ่กับใบเล็กจะได้ถ่วงน้ำหนักถูก
   */
  const totals = rows.reduce(
    (acc, row) => ({
      input: acc.input + Number(row.totalInputQty ?? 0),
      output: acc.output + Number(row.totalOutputQty ?? 0),
      plannedOutput: acc.plannedOutput + Number(row.totalPlannedOutputQty ?? 0),
    }),
    { input: 0, output: 0, plannedOutput: 0 },
  );
  const overallYield = totals.input > 0 ? (totals.output / totals.input) * 100 : 0;

  const canCreateRequest = useScreenActionPermissions(
    "PRODUCTION_OUTPUT_STOCK_REQUESTS",
  ).canAdd;
  const orderActions = useScreenActionPermissions("PRODUCTION_ORDERS");
  const canCancelOrder =
    orderActions.canEdit || orderActions.canAdd || orderActions.canApprove;
  const cancelMutation = useCancelProductionOrderMutation();

  const columns: ColumnsType<ProductionOutputReadyOrder> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 20 + index + 1,
      },
      {
        title: "เลขที่ใบสั่งผลิต",
        dataIndex: "orderNo",
        key: "orderNo",
        width: 190,
        render: (value: string, row) => (
          <button
            type="button"
            className={styles.ticketNoButton}
            onClick={() => router.push(`/production/production-orders/${row.id}`)}
          >
            <span className={styles.ticketNo}>{value}</span>
          </button>
        ),
      },
      {
        title: "Batch",
        dataIndex: "batchNo",
        key: "batchNo",
        width: 150,
        render: (value?: string) => value || "—",
      },
      {
        title: "วันที่ผลิต",
        dataIndex: "productionDate",
        key: "productionDate",
        width: 130,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ปิดงานเมื่อ",
        dataIndex: "completedAt",
        key: "completedAt",
        width: 160,
        render: (value?: string) => (
          <span className={styles.metaMuted}>{formatDateTime(value)}</span>
        ),
      },
      {
        title: "เข้าผลิต / ได้เข้าคลัง",
        key: "qty",
        width: 170,
        align: "right",
        render: (_v, row) => (
          <div className={styles.yieldCell}>
            <span className={styles.yieldValue}>
              {formatQty(row.totalOutputQty)} / {formatQty(row.totalInputQty)}
            </span>
            <span className={styles.metaMuted}>
              แผนได้ {formatQty(row.totalPlannedOutputQty)}
            </span>
          </div>
        ),
      },
      {
        title: "Yield จริง / แผน",
        key: "yield",
        width: 160,
        align: "right",
        sorter: (a, b) => a.yieldPercent - b.yieldPercent,
        render: (_v, row) => {
          // ยังไม่มีคำขออนุมัติ = ยังไม่มีผลผลิตเข้าคลัง จึงยังคิด yield ไม่ได้
          if (Number(row.totalInputQty) <= 0 || row.totalOutputQty === "0.000") {
            return (
              <div className={styles.yieldCell}>
                <span className={styles.yieldNone}>ยังไม่มีผลผลิตเข้าคลัง</span>
                <span className={styles.metaMuted}>
                  แผน {row.plannedYieldPercent.toFixed(1)}%
                </span>
              </div>
            );
          }
          const gap = row.yieldPercent - row.plannedYieldPercent;
          const tone =
            row.plannedYieldPercent > 0 && gap < -YIELD_GAP_ALERT
              ? styles.yieldBelow
              : gap > 0
                ? styles.yieldAbove
                : styles.yieldValue;
          return (
            <Tooltip
              title={`ผลผลิตที่อนุมัติเข้าคลัง ${formatQty(row.totalOutputQty)} ÷ วัตถุดิบที่ตัดเข้าผลิต ${formatQty(row.totalInputQty)}`}
            >
              <div className={styles.yieldCell}>
                <span className={`${styles.yieldValue} ${tone}`}>
                  {row.yieldPercent.toFixed(1)}%
                </span>
                <span className={styles.metaMuted}>
                  แผน {row.plannedYieldPercent.toFixed(1)}%
                  {row.plannedYieldPercent > 0
                    ? ` (${gap >= 0 ? "+" : ""}${gap.toFixed(1)})`
                    : ""}
                </span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: "สถานะการขอรับเข้าคลัง",
        key: "requestState",
        width: 200,
        render: (_v, row) =>
          row.totalRequestCount === 0 ? (
            <span className={`${styles.statusPill} ${styles.statusRejected}`}>
              ยังไม่ได้ขอ
            </span>
          ) : (
            <Tooltip title="เปิดหน้าใบสั่งผลิตเพื่อดูว่าขอสินค้าตัวไหนไปแล้วบ้าง">
              <span className={`${styles.statusPill} ${styles.statusNone}`}>
                ขอแล้ว {row.totalRequestCount} คำขอ
              </span>
            </Tooltip>
          ),
      },
      {
        title: "",
        key: "actions",
        width: 280,
        align: "right",
        render: (_v, row) => (
          <Space size={8} wrap>
            {canCreateRequest && hasRequestableProductionOutput(row) ? (
              <Button
                type="primary"
                size="small"
                className={styles.rowAction}
                icon={<InboxOutlined />}
                onClick={() =>
                  router.push(
                    `/production/output-stock-requests/create?productionOrderId=${row.id}`,
                  )
                }
              >
                ขอรับผลผลิต
              </Button>
            ) : (
              <Button
                size="small"
                className={styles.rowAction}
                onClick={() =>
                  router.push(`/production/production-orders/${row.id}`)
                }
              >
                ดูใบสั่งผลิต
              </Button>
            )}
            {canCancelOrder && row.totalRequestCount === 0 ? (
              <Popconfirm
                title="ยกเลิกใบสั่งผลิต?"
                description="ใช้เมื่อไม่มีของจะรับเข้าคลัง — ไม่คืนวัตถุดิบที่ตัดตอนเริ่มผลิต"
                okText="ยกเลิกใบ"
                cancelText="ปิด"
                okButtonProps={{ danger: true }}
                onConfirm={() => cancelMutation.mutate({ id: row.id })}
              >
                <Button
                  danger
                  size="small"
                  loading={
                    cancelMutation.isPending &&
                    cancelMutation.variables?.id === row.id
                  }
                >
                  ยกเลิกใบสั่งผลิต
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [
      canCancelOrder,
      canCreateRequest,
      cancelMutation.isPending,
      cancelMutation.variables,
      cancelMutation,
      router,
    ],
  );

  return (
    <MasterPageGate isLoading={readyQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          title="ใบสั่งผลิตรอรับเข้าคลัง"
          subtitle="ใบสั่งผลิตที่เริ่มผลิตแล้วและยังรับผลผลิตเข้าคลังไม่ครบ"
        />
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardWarn}`}>
            <span>ยังไม่ได้ขอรับเข้าคลัง</span>
            <strong>
              {notRequested.length}
              <span className={styles.summaryUnit}>ใบ</span>
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ขอไปแล้วบางส่วน</span>
            <strong>
              {partlyRequested}
              <span className={styles.summaryUnit}>ใบ</span>
            </strong>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>คิวที่ยังต้องขอรับ</span>
            <strong>
              {rows.length}
              <span className={styles.summaryUnit}>ใบ</span>
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Yield รวมของคิวนี้</span>
            <strong>
              {overallYield.toFixed(1)}
              <span className={styles.summaryUnit}>%</span>
            </strong>
            <span className={styles.metaMuted}>
              เข้าคลัง {formatQty(totals.output.toFixed(3))} จากวัตถุดิบ{" "}
              {formatQty(totals.input.toFixed(3))}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>ใบสั่งผลิตรอรับผลผลิตเข้าคลัง</h3>
              <p>
                ใบสั่งผลิตที่ปิดงานแล้วและยังขอรับผลผลิตเข้าคลังได้อีก — ของที่ผลิตเสร็จ
                จะยังไม่เข้าสต๊อกจนกว่าจะเปิดคำขอและหัวหน้าคลังอนุมัติ ใบที่ขอครบแล้วไม่ขึ้นที่นี่
              </p>
            </div>
            <div className={styles.listHeaderActions}>
              <Button
                icon={<ReloadOutlined />}
                className={styles.backButton}
                loading={readyQuery.isFetching}
                onClick={() => void readyQuery.refetch()}
              >
                รีเฟรช
              </Button>
              <Button
                icon={<BuildOutlined />}
                className={styles.secondaryButton}
                onClick={() => router.push("/production/production-orders")}
              >
                ไปใบสั่งผลิต
              </Button>
              <Button
                type="primary"
                icon={<InboxOutlined />}
                className={styles.primaryButton}
                onClick={() => router.push("/production/output-stock-requests")}
              >
                คำขอทั้งหมด
              </Button>
            </div>
          </div>

          <div className={styles.filterBar}>
            <Input
              allowClear
              className={styles.filterSearch}
              prefix={<SearchOutlined />}
              placeholder="ค้นหาเลขที่ใบสั่งผลิต / Batch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => setQ(search)}
              onBlur={() => setQ(search)}
            />
            <div />
            <div className={styles.presetChips}>
              <button
                type="button"
                className={`${styles.presetChip} ${
                  allRange ? styles.presetChipActive : ""
                }`}
                onClick={() => setAllRange(true)}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                className={`${styles.presetChip} ${
                  allRange ? "" : styles.presetChipActive
                }`}
                onClick={() => setAllRange(false)}
              >
                7 วันล่าสุด
              </button>
            </div>
          </div>

          {!canCreateRequest ? (
            <div className={styles.permissionNote}>
              คุณดูคิวได้อย่างเดียว — การเปิดคำขอรับผลผลิตต้องมีสิทธิ์เพิ่มของหน้า
              “ขอรับผลผลิตเข้าคลัง”
            </div>
          ) : null}

          <div className={styles.cardBody}>
            <Table
              className={styles.dataTable}
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={readyQuery.isFetching}
              pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} ใบ` }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>ไม่มีใบสั่งผลิตค้างรับเข้าคลัง</strong>
                    <span>
                      ใบสั่งผลิตที่ปิดงานแล้วถูกขอรับผลผลิตครบทุกใบ — ถ้ายังไม่เห็นของในสต๊อก
                      ให้ไปดูที่คำขอว่าค้างรอหัวหน้าคลังอนุมัติอยู่หรือเปล่า
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          title="รับผลผลิตเข้าคลังเริ่มจากใบสั่งผลิตเท่านั้น"
          description="ตั๋วชั่งประเภทรับซื้อยาง (PURCHASE_IN) ใช้ flow คัดแยก → ใบรับซื้อ → จ่ายเงิน → รับยางดิบเข้าคลัง คนละเส้นทางกับหน้านี้"
        />
      </section>
    </MasterPageGate>
  );
}
