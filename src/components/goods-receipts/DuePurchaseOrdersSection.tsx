"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useDuePurchaseOrdersQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import type {
  DuePurchaseOrderGroup,
  DuePurchaseOrderRound,
} from "@/types/goods-receipts";
import styles from "./DuePurchaseOrdersSection.module.css";

const PAGE_SIZE = 5;

const RECEIVE_STATUS_LABEL: Record<string, string> = {
  NOT_RECEIVED: "ยังไม่รับ",
  PARTIALLY_RECEIVED: "รับบางส่วน",
};

function DuePill({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className={`${styles.duePill} ${styles.dueOverdue}`}>
        เลยกำหนด {Math.abs(days)} วัน
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className={`${styles.duePill} ${styles.dueToday}`}>
        ถึงกำหนดวันนี้
      </span>
    );
  }
  return (
    <span className={`${styles.duePill} ${styles.dueSoon}`}>อีก {days} วัน</span>
  );
}

function createHref(row: DuePurchaseOrderRound) {
  const base = `/goods-receipts/create-from-po/${row.purchaseOrderId}`;
  return row.scheduleId
    ? `${base}?scheduleId=${encodeURIComponent(row.scheduleId)}`
    : base;
}

type Props = {
  canAdd: boolean;
};

export default function DuePurchaseOrdersSection({ canAdd }: Props) {
  const router = useRouter();
  const query = useDuePurchaseOrdersQuery();
  const [group, setGroup] = useState<DuePurchaseOrderGroup | undefined>();
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => query.data?.data ?? [], [query.data]);
  const overdueCount = allRows.filter((row) => row.dueGroup === "OVERDUE").length;
  const dueSoonCount = allRows.length - overdueCount;
  const rows = group
    ? allRows.filter((row) => row.dueGroup === group)
    : allRows;

  const selectGroup = (next?: DuePurchaseOrderGroup) => {
    setGroup(next);
    setPage(1);
  };

  const columns: ColumnsType<DuePurchaseOrderRound> = useMemo(
    () => [
      {
        title: "เลขที่ PO",
        key: "poNo",
        render: (_v, row) => (
          <div className={styles.poCell}>
            <Link
              className={styles.poLink}
              href={`/purchase-orders/${row.purchaseOrderId}`}
            >
              {row.poNo}
            </Link>
            {row.roundNo > 1 ? (
              <span className={styles.roundTag}>รอบ {row.roundNo}</span>
            ) : null}
          </div>
        ),
      },
      {
        title: "ผู้ขาย",
        key: "creditor",
        render: (_v, row) => (
          <div className={styles.stackCell}>
            <span className={styles.creditorName}>
              {row.creditorName ?? "—"}
            </span>
            {row.creditorCode ? (
              <span className={styles.muted}>{row.creditorCode}</span>
            ) : null}
          </div>
        ),
      },
      {
        title: "กำหนดส่ง",
        key: "deliveryDate",
        width: 190,
        render: (_v, row) => (
          <div className={styles.dueCell}>
            <span className={styles.dueDate}>
              {dayjs(row.deliveryDate).format("DD/MM/YYYY")}
            </span>
            <DuePill days={row.daysUntilDue} />
          </div>
        ),
      },
      {
        title: "สถานะรับ",
        key: "receiveStatus",
        width: 120,
        render: (_v, row) => (
          <span
            className={`${styles.receivePill} ${
              row.receiveStatus === "PARTIALLY_RECEIVED"
                ? styles.receivePartial
                : styles.receiveNone
            }`}
          >
            {RECEIVE_STATUS_LABEL[row.receiveStatus] ?? row.receiveStatus}
          </span>
        ),
      },
      {
        title: "รายการ",
        dataIndex: "itemCount",
        key: "itemCount",
        width: 80,
        align: "center",
      },
      {
        title: "",
        key: "actions",
        width: 190,
        align: "right",
        render: (_v, row) =>
          row.draftGoodsReceiptId ? (
            <Tooltip title="รอบนี้มีใบรับของร่างอยู่แล้ว — เปิดไปยืนยันต่อ">
              <Button
                size="small"
                icon={<FileTextOutlined />}
                className={styles.draftBtn}
                onClick={() =>
                  router.push(`/goods-receipts/${row.draftGoodsReceiptId}`)
                }
              >
                เปิดใบร่าง {row.draftGoodsReceiptNo}
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title={canAdd ? undefined : "ไม่มีสิทธิ์สร้างใบรับของ"}>
              <span>
                <Button
                  type="primary"
                  size="small"
                  icon={<InboxOutlined />}
                  className={styles.createBtn}
                  disabled={!canAdd}
                  onClick={() => router.push(createHref(row))}
                >
                  สร้างใบรับของ
                </Button>
              </span>
            </Tooltip>
          ),
      },
    ],
    [canAdd, router],
  );

  if (!query.isLoading && allRows.length === 0) {
    return null;
  }

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.title}>
          <span className={styles.titleIcon} aria-hidden>
            <ClockCircleOutlined />
          </span>
          PO ใกล้ถึงกำหนดรับสินค้า <strong>{allRows.length}</strong> รายการ
        </div>
        <div className={styles.chips} role="group" aria-label="กรองตามกำหนดส่ง">
          <button
            type="button"
            className={`${styles.chip} ${!group ? styles.chipActive : ""}`}
            onClick={() => selectGroup(undefined)}
          >
            ทั้งหมด <span className={styles.chipCount}>{allRows.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.chip} ${styles.chipOverdue} ${
              group === "OVERDUE" ? styles.chipActive : ""
            }`}
            onClick={() => selectGroup("OVERDUE")}
          >
            ค้างรับ / เลยกำหนดส่ง{" "}
            <span className={styles.chipCount}>{overdueCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.chip} ${styles.chipSoon} ${
              group === "DUE_SOON" ? styles.chipActive : ""
            }`}
            onClick={() => selectGroup("DUE_SOON")}
          >
            ใกล้ถึงกำหนดส่ง{" "}
            <span className={styles.chipCount}>{dueSoonCount}</span>
          </button>
        </div>
      </div>

      <Table
        rowKey={(row) => row.scheduleId ?? `po-${row.purchaseOrderId}`}
        columns={columns}
        dataSource={rows}
        loading={query.isLoading}
        size="middle"
        className={styles.table}
        rowClassName={(row) =>
          row.dueGroup === "OVERDUE" ? styles.overdueRow : ""
        }
        scroll={{ x: 900 }}
        pagination={
          rows.length > PAGE_SIZE
            ? {
                current: page,
                pageSize: PAGE_SIZE,
                size: "small",
                showSizeChanger: false,
                onChange: setPage,
              }
            : false
        }
        locale={{ emptyText: "ไม่มี PO ในกลุ่มนี้" }}
      />
    </section>
  );
}
