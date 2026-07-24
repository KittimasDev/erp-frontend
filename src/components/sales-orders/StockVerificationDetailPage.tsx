"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Spin, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useConfirmStockVerificationMutation,
} from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { SalesOrderStockVerificationLine } from "@/types/sales-orders";
import styles from "./StockVerificationDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatQty(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export default function StockVerificationDetailPage({ id }: Props) {
  const router = useRouter();
  const orderQuery = useSalesOrderQuery(id);
  const verifyQuery = useSalesOrderStockVerificationQuery(id);
  const confirmMutation = useConfirmStockVerificationMutation();

  const canConfirm =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();

  const order = orderQuery.data?.data;
  const verification = verifyQuery.data?.data;
  const lines = verification?.lines ?? [];
  const allOk = verification?.isAllAvailable === true;
  const busy = confirmMutation.isPending || verifyQuery.isFetching;

  const columns: ColumnsType<SalesOrderStockVerificationLine> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_v, row) => (
        <div>
          <strong>{row.itemCode ?? "—"}</strong>
          <div style={{ color: "#8a9199", fontSize: 12 }}>{row.itemName}</div>
        </div>
      ),
    },
    {
      title: "ยอดสั่งขาย",
      dataIndex: "orderedQty",
      align: "right",
      width: 110,
      render: formatQty,
    },
    {
      title: "ยอดพร้อมขาย",
      dataIndex: "availableQty",
      align: "right",
      width: 120,
      render: formatQty,
    },
    {
      title: "ยอดขาด",
      dataIndex: "shortageQty",
      align: "right",
      width: 100,
      render: (value: string, row) => (
        <span style={{ color: row.isAvailable ? undefined : "#cf1322" }}>
          {formatQty(value)}
        </span>
      ),
    },
    {
      title: "ผล",
      dataIndex: "isAvailable",
      width: 90,
      render: (ok: boolean) =>
        ok ? <Tag color="success">พอ</Tag> : <Tag color="error">ไม่พอ</Tag>,
    },
    {
      title: "คลัง / Location / Lot",
      key: "locs",
      render: (_v, row) => {
        if (row.availableLots?.length) {
          return (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {row.availableLots.slice(0, 5).map((lot) => (
                <li key={`${lot.lotId}-${lot.locationId}`}>
                  {lot.warehouseCode}/{lot.locationCode} · Lot {lot.lotNo ?? "—"}{" "}
                  ({formatQty(lot.availableQty)})
                </li>
              ))}
              {row.availableLots.length > 5 ? (
                <li>…อีก {row.availableLots.length - 5}</li>
              ) : null}
            </ul>
          );
        }
        if (row.availableLocations?.length) {
          return (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {row.availableLocations.slice(0, 5).map((loc) => (
                <li key={`${loc.warehouseId}-${loc.locationId}`}>
                  {loc.warehouseCode}/{loc.locationCode} (
                  {formatQty(loc.availableQty)})
                </li>
              ))}
            </ul>
          );
        }
        return "—";
      },
    },
  ];

  if (orderQuery.isLoading || verifyQuery.isLoading) {
    return (
      <div className={styles.page} style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!order || !verification) {
    return (
      <div className={styles.page}>
        <Alert type="error" title="ไม่พบข้อมูลใบสั่งขายหรือผลการตรวจสต๊อก" />
        <Link href="/sales-orders/stock-verification">กลับรายการ</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <Link href="/sales-orders/stock-verification" className={styles.backLink}>
            <ArrowLeftOutlined /> กลับรายการรอตรวจ
          </Link>
          <p className={styles.eyebrow}>Stock Verification</p>
          <h1 className={styles.pageTitle}>{order.soNo}</h1>
          <p className={styles.pageSubtitle}>
            ลูกค้า:{" "}
            {order.customer
              ? `${order.customer.customerCode} — ${order.customer.nameTh}`
              : "—"}{" "}
            · วันที่ SO {formatDate(order.soDate)} · สถานะ {order.status}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ReloadOutlined />}
            loading={verifyQuery.isFetching}
            onClick={() => verifyQuery.refetch()}
          >
            ตรวจสอบใหม่
          </Button>
          {canConfirm && order.status === "CONFIRMED" ? (
            <Tooltip
              title={
                allOk
                  ? undefined
                  : "มีรายการที่สต๊อกไม่พอ — ไม่สามารถยืนยันได้"
              }
            >
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<CheckOutlined />}
                disabled={!allOk || busy}
                loading={confirmMutation.isPending}
                onClick={async () => {
                  await confirmMutation.mutateAsync(id);
                  router.push(`/sales-orders/${id}`);
                }}
              >
                ยืนยันผลตรวจสอบสต๊อก
              </Button>
            </Tooltip>
          ) : null}
        </div>
      </header>

      {!allOk ? (
        <Alert
          type="warning"
          showIcon
          title="สต๊อกไม่พอบางรายการ"
          description="ระบบจะไม่เปลี่ยนสถานะใบสั่งขายจนกว่าทุกรายการจะมียอดพร้อมขายเพียงพอ"
        />
      ) : (
        <Alert
          type="success"
          showIcon
          title="สต๊อกพอทุกรายการ"
          description="สามารถยืนยันผลตรวจสอบสต๊อกได้ — ขั้นตอนนี้ยังไม่ตัดและไม่จองสต๊อก"
        />
      )}

      <section className={styles.tableCard}>
        <Table
          rowKey="salesOrderItemId"
          columns={columns}
          dataSource={lines}
          pagination={false}
          className={styles.table}
        />
      </section>
    </div>
  );
}
