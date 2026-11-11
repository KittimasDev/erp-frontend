"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
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
  const t = useT();
  if (days < 0) {
    return (
      <span className={`${styles.duePill} ${styles.dueOverdue}`}>
        {t("เลยกำหนด {n} วัน", { n: Math.abs(days) })}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className={`${styles.duePill} ${styles.dueToday}`}>
        {t("ถึงกำหนดวันนี้")}
      </span>
    );
  }
  return (
    <span className={`${styles.duePill} ${styles.dueSoon}`}>
      {t("อีก {n} วัน", { n: days })}
    </span>
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
  const t = useT();
  const router = useRouter();
  const query = useDuePurchaseOrdersQuery();
  const [group, setGroup] = useState<DuePurchaseOrderGroup | undefined>();
  const [draftGroup, setDraftGroup] = useState<DuePurchaseOrderGroup | undefined>();
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => query.data?.data ?? [], [query.data]);
  const overdueCount = allRows.filter((row) => row.dueGroup === "OVERDUE").length;
  const dueSoonCount = allRows.length - overdueCount;
  const rows = group
    ? allRows.filter((row) => row.dueGroup === group)
    : allRows;

  const applyFilters = () => {
    setGroup(draftGroup);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftGroup(undefined);
    setGroup(undefined);
    setPage(1);
  };

  const columns: ColumnsType<DuePurchaseOrderRound> = useMemo(
    () => [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
      {
        title: t("เลขที่ PO"),
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
              <span className={styles.roundTag}>
                {t("รอบ {n}", { n: row.roundNo })}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        title: t("ผู้ขาย"),
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
        title: t("กำหนดส่ง"),
        key: "deliveryDate",
        width: 190,
        render: (_v, row) => (
          <div className={styles.dueCell}>
            <span className={styles.dueDate}>
              {dayjs(row.deliveryDate).format("DD/MM/BBBB")}
            </span>
            <DuePill days={row.daysUntilDue} />
          </div>
        ),
      },
      {
        title: t("สถานะรับ"),
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
            {t(RECEIVE_STATUS_LABEL[row.receiveStatus] ?? row.receiveStatus)}
          </span>
        ),
      },
      {
        title: t("รายการ"),
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
            <Tooltip title={t("รอบนี้มีใบรับของร่างอยู่แล้ว — เปิดไปยืนยันต่อ")}>
              <Button
                size="small"
                icon={<FileTextOutlined />}
                className={styles.draftBtn}
                onClick={() =>
                  router.push(`/goods-receipts/${row.draftGoodsReceiptId}`)
                }
              >
                {t("เปิดใบร่าง {no}", { no: row.draftGoodsReceiptNo ?? "" })}
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title={canAdd ? undefined : t("ไม่มีสิทธิ์สร้างใบรับของ")}>
              <span>
                <Button
                  type="primary"
                  size="small"
                  icon={<InboxOutlined />}
                  className={styles.createBtn}
                  disabled={!canAdd}
                  onClick={() => router.push(createHref(row))}
                >
                  {t("สร้างใบรับของ")}
                </Button>
              </span>
            </Tooltip>
          ),
      },
    ],
    [canAdd, router, t],
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
          {t("PO ใกล้ถึงกำหนดรับสินค้า")} <strong>{allRows.length}</strong>{" "}
          {t("รายการ")}
        </div>
      </div>

      <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={query.isFetching}>
        <FilterField label={t("กรองตามกำหนดส่ง")}>
          <Select
            allowClear
            placeholder={`${t("ทั้งหมด")} (${allRows.length})`}
            style={{ width: "100%" }}
            value={draftGroup}
            onChange={(value) => setDraftGroup(value)}
            options={[
              { value: "OVERDUE", label: `${t("ค้างรับ / เลยกำหนดส่ง")} (${overdueCount})` },
              { value: "DUE_SOON", label: `${t("ใกล้ถึงกำหนดส่ง")} (${dueSoonCount})` },
            ]}
          />
        </FilterField>
      </FilterCard>

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
        locale={{ emptyText: t("ไม่มี PO ในกลุ่มนี้") }}
      />
    </section>
  );
}
