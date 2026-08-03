"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spin, Tag, Tooltip, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useConfirmStockVerificationMutation } from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
  type SalesOrderStockVerificationLine,
} from "@/types/sales-orders";
import styles from "./StockVerificationDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatQty(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function statusClass(status: string) {
  switch (status) {
    case "COMPLETED":
    case "STOCK_CHECKED":
      return styles.statusApproved;
    case "CONFIRMED":
    case "PICKING":
    case "PACKED":
    case "DELIVERED":
      return styles.statusPending;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

function LocationHints({ row }: { row: SalesOrderStockVerificationLine }) {
  if (row.availableLots?.length) {
    return (
      <ul className={styles.hintList}>
        {row.availableLots.slice(0, 4).map((lot) => (
          <li key={`${lot.lotId}-${lot.locationId}`}>
            <span className={styles.hintCode}>
              {lot.warehouseCode}/{lot.locationCode}
            </span>
            <span className={styles.hintMeta}>
              Lot {lot.lotNo ?? "—"} · {formatQty(lot.availableQty)}
            </span>
          </li>
        ))}
        {row.availableLots.length > 4 ? (
          <li className={styles.hintMore}>
            …อีก {row.availableLots.length - 4} Lot
          </li>
        ) : null}
      </ul>
    );
  }

  if (row.availableLocations?.length) {
    return (
      <ul className={styles.hintList}>
        {row.availableLocations.slice(0, 4).map((loc) => (
          <li key={`${loc.warehouseId}-${loc.locationId}`}>
            <span className={styles.hintCode}>
              {loc.warehouseCode}/{loc.locationCode}
            </span>
            <span className={styles.hintMeta}>
              {formatQty(loc.availableQty)}
            </span>
          </li>
        ))}
        {row.availableLocations.length > 4 ? (
          <li className={styles.hintMore}>
            …อีก {row.availableLocations.length - 4} ตำแหน่ง
          </li>
        ) : null}
      </ul>
    );
  }

  return <span className={styles.hintEmpty}>ไม่มีตำแหน่งพร้อมใช้</span>;
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

  const okCount = lines.filter((line) => line.isAvailable).length;
  const shortCount = lines.length - okCount;
  const totalShortage = lines.reduce(
    (sum, line) => sum + (Number(line.shortageQty) || 0),
    0,
  );

  if (orderQuery.isLoading || verifyQuery.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!order || !verification) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบข้อมูลใบสั่งขายหรือผลการตรวจสต๊อก
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-orders/stock-verification">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SearchOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Stock Verification</p>
          <h1 className={styles.pageTitle}>{order.soNo}</h1>
          <p className={styles.pageSubtitle}>
            {order.customer
              ? `${order.customer.customerCode} — ${order.customer.nameTh}`
              : "—"}{" "}
            · วันที่ SO {formatDate(order.soDate)} ·{" "}
            {SALES_ORDER_STATUS_LABEL[order.status as SalesOrderStatus] ??
              order.status}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/sales-orders/stock-verification")}
          >
            กลับรายการ
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={verifyQuery.isFetching}
            onClick={() => void verifyQuery.refetch()}
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

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div
            className={`${styles.statusBanner} ${
              allOk ? styles.statusBannerOk : styles.statusBannerWarn
            }`}
          >
            <div className={styles.statusBannerIcon} aria-hidden>
              {allOk ? <CheckCircleOutlined /> : <WarningOutlined />}
            </div>
            <div>
              <h2 className={styles.statusBannerTitle}>
                {allOk ? "สต๊อกพอทุกรายการ" : "สต๊อกไม่พอบางรายการ"}
              </h2>
              <p className={styles.statusBannerText}>
                {allOk
                  ? "สามารถยืนยันผลตรวจสอบสต๊อกได้ — ขั้นตอนนี้ยังไม่ตัดและไม่จองสต๊อก"
                  : "ระบบจะไม่เปลี่ยนสถานะใบสั่งขายจนกว่าทุกรายการจะมียอดพร้อมขายเพียงพอ"}
              </p>
            </div>
            <span
              className={`${styles.statusPill} ${
                allOk ? styles.statusApproved : styles.statusWarn
              }`}
            >
              {allOk ? "พร้อมยืนยัน" : `ขาด ${shortCount} รายการ`}
            </span>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบสั่งขาย</h2>
              <span
                className={`${styles.statusPill} ${statusClass(order.status)}`}
              >
                {SALES_ORDER_STATUS_LABEL[order.status as SalesOrderStatus] ??
              order.status}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ SO</span>
                <div className={styles.metaValue}>
                  <Link href={`/sales-orders/${order.id}`}>{order.soNo}</Link>
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(order.soDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันส่งที่ขอ</span>
                <div className={styles.metaValue}>
                  {formatDate(order.requestedDeliveryDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {order.customer
                    ? `${order.customer.customerCode} — ${order.customer.nameTh}`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการตรวจสต๊อก</h2>
              <Typography.Text type="secondary">
                {lines.length} รายการ
              </Typography.Text>
            </div>

            <div className={styles.lineList}>
              {lines.map((row, index) => (
                <article
                  key={row.salesOrderItemId}
                  className={`${styles.lineCard} ${
                    row.isAvailable ? styles.lineOk : styles.lineShort
                  }`}
                >
                  <div className={styles.lineIndex}>{index + 1}</div>
                  <div className={styles.lineBody}>
                    <div className={styles.lineTop}>
                      <div>
                        <p className={styles.lineCode}>
                          {row.itemCode ?? "—"}
                        </p>
                        <p className={styles.lineName}>
                          {row.itemName ?? "—"}
                        </p>
                      </div>
                      {row.isAvailable ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          พอ
                        </Tag>
                      ) : (
                        <Tag color="error" icon={<ExclamationCircleOutlined />}>
                          ไม่พอ
                        </Tag>
                      )}
                    </div>

                    <div className={styles.qtyGrid}>
                      <div className={styles.qtyItem}>
                        <span>ยอดสั่งขาย</span>
                        <strong>{formatQty(row.orderedQty)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>ยอดพร้อมขาย</span>
                        <strong>{formatQty(row.availableQty)}</strong>
                      </div>
                      <div
                        className={`${styles.qtyItem} ${
                          row.isAvailable ? "" : styles.qtyShortage
                        }`}
                      >
                        <span>ยอดขาด</span>
                        <strong>{formatQty(row.shortageQty)}</strong>
                      </div>
                    </div>

                    <div className={styles.locationBlock}>
                      <span className={styles.locationLabel}>
                        คลัง / ตำแหน่ง / Lot
                      </span>
                      <LocationHints row={row} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.sideCard}>
          <p className={styles.sideEyebrow}>SUMMARY</p>
          <h3 className={styles.sideTitle}>สรุปผลตรวจ</h3>
          <p className={styles.sideLead}>
            ตรวจยอดพร้อมขายเทียบกับยอดสั่งขาย — ยังไม่ตัดสต๊อก
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span>รายการทั้งหมด</span>
              <strong>{lines.length}</strong>
            </div>
            <div className={`${styles.statItem} ${styles.statOk}`}>
              <span>พอ</span>
              <strong>{okCount}</strong>
            </div>
            <div className={`${styles.statItem} ${styles.statWarn}`}>
              <span>ไม่พอ</span>
              <strong>{shortCount}</strong>
            </div>
            <div className={styles.statItem}>
              <span>ยอดขาดรวม</span>
              <strong>{formatQty(totalShortage)}</strong>
            </div>
          </div>

          <div className={styles.sideNote}>
            {allOk ? (
              <>
                พร้อมกด <strong>ยืนยันผลตรวจสอบสต๊อก</strong> เพื่อไปขั้นถัดไป
              </>
            ) : (
              <>
                ต้องเติมสต๊อกหรือปรับยอดสั่งขายก่อน จึงจะยืนยันผลตรวจได้
              </>
            )}
          </div>

          <Button
            block
            onClick={() => router.push(`/sales-orders/${order.id}`)}
          >
            เปิดใบสั่งขาย
          </Button>
        </aside>
      </div>
    </div>
  );
}
