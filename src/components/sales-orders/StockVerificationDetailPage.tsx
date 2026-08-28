"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spin, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useSalesOrderQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { canAccessSalesOrderDetail } from "@/lib/sales/sales-fulfillment-nav";
import {
  stockVerificationLineTag,
  type StockVerificationLineTag,
} from "@/lib/sales/stock-verification-line-tag";
import { resolveTimelineStepHref } from "@/lib/sales/sales-tracking-timeline";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
  type SalesOrderStockVerificationLine,
} from "@/types/sales-orders";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
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

function findTimelineStep(
  timeline: SalesTrackingTimelineStep[],
  step: string,
): SalesTrackingTimelineStep | undefined {
  return timeline.find((entry) => entry.step === step);
}

function lineCardToneClass(tag: StockVerificationLineTag) {
  if (tag.color === "success") return styles.lineOk;
  if (tag.color === "error") return styles.lineShort;
  return "";
}

export default function StockVerificationDetailPage({ id }: Props) {
  const router = useRouter();
  const orderQuery = useSalesOrderQuery(id);
  const verifyQuery = useSalesOrderStockVerificationQuery(id);
  const trackingQuery = useSalesTrackingDetailQuery(id);
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const stockVerificationActions = useScreenActionPermissions(
    "SALES_STOCK_VERIFICATION",
  );
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const packingActions = useScreenActionPermissions("PACKINGS");
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const canOpenDetail = canAccessSalesOrderDetail({
    salesOrder: salesOrderActions,
    stockVerification: stockVerificationActions,
    picking: pickingActions,
    packing: packingActions,
    delivery: deliveryActions,
  });
  const canFulfill =
    salesOrderActions.canEdit ||
    stockVerificationActions.canEdit ||
    stockVerificationActions.canApprove ||
    pickingActions.canAdd ||
    pickingActions.canEdit;

  const order = orderQuery.data?.data;
  const verification = verifyQuery.data?.data;
  const timeline = trackingQuery.data?.data?.timeline ?? [];
  const lines = verification?.lines ?? [];
  const lineTags = lines.map((line) => stockVerificationLineTag(line));
  const allOk =
    lines.length > 0 && lineTags.every((tag) => tag.color === "success");
  const needsMoreProduction = lineTags.some((tag) => tag.label === "ไม่พอ");
  const waitingProduction = lines.length > 0 && !allOk && !needsMoreProduction;
  const soStatus = order?.status ?? verification?.status ?? "";
  const soNo = order?.soNo ?? verification?.soNo ?? "—";
  const isConfirmed = soStatus === "CONFIRMED";
  const isStockChecked = soStatus === "STOCK_CHECKED";
  /** ผ่านขั้นตรวจสต๊อกไปแล้ว (กำลังจ่าย/บรรจุ/ส่ง หรือเสร็จ) — หน้านี้ดูอย่างเดียว */
  const isPastStockVerification = [
    "PICKING",
    "PARTIALLY_ISSUED",
    "PACKED",
    "DELIVERED",
    "COMPLETED",
  ].includes(soStatus);
  const pickingStep = findTimelineStep(timeline, "Picking");
  const pickingHref = pickingStep
    ? resolveTimelineStepHref(pickingStep, id, timeline)
    : undefined;
  const hasPickingDocument = Boolean(pickingStep?.documentId);

  const okCount = lineTags.filter((tag) => tag.color === "success").length;
  const waitingCount = lineTags.filter((tag) => tag.label === "รอผลผลิต").length;
  const shortCount = lineTags.filter((tag) => tag.label === "ไม่พอ").length;
  const totalShortage = lines.reduce(
    (sum, line) =>
      sum + (Number(line.unplannedShortageQty ?? line.shortageQty) || 0),
    0,
  );

  if (verifyQuery.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!verification) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบข้อมูลใบสั่งขายหรือผลการตรวจสต๊อก
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-orders/stock-verification">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const openPickingButton = (block = false) => {
    if (!pickingHref && !hasPickingDocument) return null;
    const href =
      pickingHref ??
      (pickingStep?.documentId
        ? `/pickings/${pickingStep.documentId}`
        : undefined);
    if (!href) return null;
    const draft = pickingStep?.status === "DRAFT";
    return (
      <Button
        type="primary"
        block={block}
        className={styles.primaryBtn}
        icon={<ShoppingOutlined />}
        onClick={() =>
          router.push(draft && !href.endsWith("/edit") ? `${href}/edit` : href)
        }
      >
        {draft ? "เปิดใบจ่ายสินค้า (ร่าง)" : "เปิดใบจ่ายสินค้า"}
      </Button>
    );
  };

  /**
   * พาไปหน้า "เลือกรอบจัดส่งที่พร้อมจ่าย" ไม่ใช่หน้าที่สร้างใบจ่ายให้ทันที
   *
   * ตั้งแต่ 1 รอบ = 1 ใบจ่าย คนต้องเลือกก่อนว่าจะจ่ายรอบไหน และหน้านั้นกางดู
   * ต้องการ/มี/ขาด ได้ก่อนกดสร้าง (การกดสร้างคือการจองของจริง)
   */
  const openCreatePickingButton = (block = false) => {
    if (!pickingActions.canAdd) return null;
    return (
      <Button
        type="primary"
        block={block}
        className={styles.primaryBtn}
        icon={<ShoppingOutlined />}
        onClick={() => router.push("/pickings/create-from-sales-order")}
      >
        ไปเลือกรอบจัดส่งเพื่อสร้างใบจ่าย
      </Button>
    );
  };

  /** ของไม่พอ — พาไปหน้า SO ใบนี้เพื่อออกใบขอผลิต (ไม่ใช่รายการ SO ทั่วไป) */
  const openProductionRequestOnSoButton = (block = false) => {
    if (!canOpenDetail) return null;
    return (
      <Button
        type="primary"
        block={block}
        className={styles.primaryBtn}
        icon={<ProfileOutlined />}
        onClick={() => router.push(`/sales-orders/${id}`)}
      >
        ไปใบสั่งขายเพื่อออกใบขอผลิต
      </Button>
    );
  };

  const openFollowProductionOnSoButton = (block = false) => {
    if (!canOpenDetail) return null;
    return (
      <Button
        block={block}
        className={styles.primaryBtn}
        icon={<ProfileOutlined />}
        onClick={() => router.push(`/sales-orders/${id}`)}
      >
        ไปใบสั่งขายเพื่อติดตามใบขอผลิต
      </Button>
    );
  };

  const renderPrimaryAction = (block = false) => {
    // ผ่านขั้นตรวจสต๊อกแล้ว — ไม่ให้สร้าง/ยืนยันซ้ำ มีแค่เปิดเอกสารที่ทำต่อ
    if (isPastStockVerification) {
      return openPickingButton(block);
    }

    /*
     * ถอดปุ่ม "ยืนยันผลตรวจสอบสต๊อก" ออกแล้ว (2026-08-26)
     *
     * ของพอ → คลังเปิดใบจ่ายของรอบ
     * ของไม่พอ → ไปหน้า SO ใบเดิมเพื่อออกใบขอผลิต (สร้างใบจ่ายตอนนี้ไม่ได้)
     */
    if (isConfirmed) {
      return allOk
        ? openCreatePickingButton(block)
        : needsMoreProduction
          ? openProductionRequestOnSoButton(block)
          : openFollowProductionOnSoButton(block);
    }

    if (isStockChecked && canFulfill) {
      if (hasPickingDocument || pickingHref) {
        return openPickingButton(block);
      }

      if (pickingActions.canAdd) {
        return (
          <Button
            type="primary"
            block={block}
            className={styles.primaryBtn}
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(`/pickings/create-from-sales-order/${id}`)
            }
          >
            สร้างใบจ่ายสินค้า
          </Button>
        );
      }
    }

    return null;
  };

  const statusBannerTitle = isPastStockVerification
    ? "ขั้นตอนตรวจสต๊อกเสร็จแล้ว"
    : isStockChecked
      ? "ยืนยันผลตรวจสอบสต๊อกแล้ว"
      : allOk
        ? "สต๊อกพอทุกรายการ"
        : waitingProduction
          ? "รอผลผลิตเข้าคลัง"
          : "สต๊อกไม่พอบางรายการ";

  const statusBannerText = isPastStockVerification
    ? "ใบสั่งขายไปขั้นถัดไปแล้ว — หน้านี้ดูผลตรวจย้อนหลังได้อย่างเดียว ไม่สร้างใบจ่ายใหม่จากที่นี่"
    : isStockChecked
      ? hasPickingDocument
        ? "มีใบจ่ายสินค้าแล้ว — กดเปิดใบจ่ายเพื่อดำเนินการต่อ"
        : "ขั้นตอนตรวจสต๊อกเสร็จแล้ว — สร้างใบจ่ายสินค้าเพื่อไปขั้นถัดไป"
      : allOk
        ? "หน้านี้เป็นรายงานอ่านอย่างเดียว — ขั้นถัดไปคือคลังเปิดใบจ่ายสินค้าของรอบที่ถึงกำหนด (ใช้ของที่จองไว้แล้ว ไม่จองซ้ำ)"
        : waitingProduction
          ? "มีใบขอผลิตคุมยอดที่ขาดอยู่แล้ว — เปิดใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง"
          : canOpenDetail
            ? "ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง กดไปหน้าใบสั่งขายใบนี้เพื่อออกใบขอผลิต"
            : "ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง";

  const statusBannerTone =
    isPastStockVerification || isStockChecked || allOk
      ? styles.statusBannerOk
      : styles.statusBannerWarn;

  const statusPillLabel = isPastStockVerification
    ? "เสร็จแล้ว"
    : isStockChecked
      ? hasPickingDocument
        ? "มีใบจ่ายแล้ว"
        : "พร้อมจ่ายสินค้า"
      : allOk
        ? "ของพอ"
        : waitingProduction
          ? "รอผลผลิต"
          : `ขาด ${shortCount} รายการ`;

  const sideNote = isPastStockVerification ? (
    <>
      ดูผลตรวจได้อย่างเดียว — ไปทำต่อที่{" "}
      <strong>ใบจ่ายสินค้า</strong> หรือใบสั่งขาย
    </>
  ) : isStockChecked ? (
    hasPickingDocument ? (
      <>
        มีใบจ่ายแล้ว — กด <strong>เปิดใบจ่ายสินค้า</strong> เพื่อไปขั้นถัดไป
      </>
    ) : (
      <>
        ตรวจสต๊อกเสร็จแล้ว — กด <strong>สร้างใบจ่ายสินค้า</strong> เพื่อไปขั้นถัดไป
      </>
    )
  ) : allOk && pickingActions.canAdd ? (
    <>
      ขั้นถัดไป: กด <strong>ไปเลือกรอบจัดส่งเพื่อสร้างใบจ่าย</strong> — ของจะถูก
      จองตอนสร้างใบจ่าย ไม่ใช่ตอนนี้
    </>
  ) : allOk ? (
    <>ของพอแล้ว — ขั้นถัดไปเป็นงานของคลัง (เปิดใบจ่ายสินค้าของรอบที่ถึงกำหนด)</>
  ) : waitingProduction ? (
    canOpenDetail ? (
      <>
        รอผลผลิตเข้าคลัง — กด <strong>ไปใบสั่งขาย</strong> เพื่อติดตามใบขอผลิต
      </>
    ) : (
      <>รอผลผลิตเข้าคลัง — เปิดใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง</>
    )
  ) : canOpenDetail ? (
    <>
      ของไม่พอ — กด <strong>ไปใบสั่งขายเพื่อออกใบขอผลิต</strong> (ใบ{" "}
      {soNo}) แล้วออกใบขอผลิตจากหน้านั้น
    </>
  ) : (
    <>ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง</>
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SearchOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Stock Verification</p>
          <h1 className={styles.pageTitle}>{soNo}</h1>
          <p className={styles.pageSubtitle}>
            {order?.customer
              ? `${order.customer.customerCode} — ${order.customer.nameTh}`
              : "—"}{" "}
            · วันที่ SO {formatDate(order?.soDate)} ·{" "}
            {SALES_ORDER_STATUS_LABEL[soStatus as SalesOrderStatus] ??
              soStatus}
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
            disabled={isPastStockVerification}
            title={
              isPastStockVerification
                ? "ขั้นตอนนี้เสร็จแล้ว — ไม่ต้องตรวจสอบใหม่"
                : undefined
            }
            onClick={() => void verifyQuery.refetch()}
          >
            ตรวจสอบใหม่
          </Button>
          {renderPrimaryAction()}
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div
            className={`${styles.statusBanner} ${statusBannerTone}`}
          >
            <div className={styles.statusBannerIcon} aria-hidden>
              {isPastStockVerification || isStockChecked || allOk ? (
                <CheckCircleOutlined />
              ) : (
                <WarningOutlined />
              )}
            </div>
            <div>
              <h2 className={styles.statusBannerTitle}>{statusBannerTitle}</h2>
              <p className={styles.statusBannerText}>{statusBannerText}</p>
            </div>
            <span
              className={`${styles.statusPill} ${
                isPastStockVerification || isStockChecked || allOk
                  ? styles.statusApproved
                  : styles.statusWarn
              }`}
            >
              {statusPillLabel}
            </span>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบสั่งขาย</h2>
              <span
                className={`${styles.statusPill} ${statusClass(soStatus)}`}
              >
                {SALES_ORDER_STATUS_LABEL[soStatus as SalesOrderStatus] ??
              soStatus}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ SO</span>
                <div className={styles.metaValue}>
                  {canOpenDetail ? (
                    <Link href={`/sales-orders/${id}`}>{soNo}</Link>
                  ) : (
                    soNo
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(order?.soDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันส่งที่ขอ</span>
                <div className={styles.metaValue}>
                  {formatDate(order?.requestedDeliveryDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {order?.customer
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
              {lines.map((row, index) => {
                const tag = lineTags[index] ?? stockVerificationLineTag(row);
                return (
                <article
                  key={row.salesOrderItemId}
                  className={`${styles.lineCard} ${lineCardToneClass(tag)}`}
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
                      <Tag
                        color={tag.color}
                        icon={
                          tag.color === "error" ? (
                            <ExclamationCircleOutlined />
                          ) : (
                            <CheckCircleOutlined />
                          )
                        }
                      >
                        {tag.label}
                      </Tag>
                    </div>

                    <div className={styles.qtyGrid}>
                      <div className={styles.qtyItem}>
                        <span>ยอดสั่งขาย</span>
                        <strong>{formatQty(row.orderedQty)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>จ่ายแล้ว</span>
                        <strong>{formatQty(row.issuedQty ?? 0)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>จองแล้ว</span>
                        <strong>{formatQty(row.reservedQty ?? 0)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>พร้อมใช้ว่าง</span>
                        <strong>{formatQty(row.availableQty)}</strong>
                      </div>
                      {Number(row.pendingProductionQty ?? 0) > 0.0005 ? (
                        <div className={styles.qtyItem}>
                          <span>รอผลิต</span>
                          <strong>
                            {formatQty(row.pendingProductionQty)}
                          </strong>
                        </div>
                      ) : null}
                      <div
                        className={`${styles.qtyItem} ${
                          Number(row.unplannedShortageQty ?? row.shortageQty) >
                          0.0005
                            ? styles.qtyShortage
                            : ""
                        }`}
                      >
                        <span>ยอดขาด</span>
                        <strong>
                          {formatQty(
                            row.unplannedShortageQty ?? row.shortageQty,
                          )}
                        </strong>
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
                );
              })}
            </div>
          </div>
        </section>

        <aside className={styles.sideCard}>
          <p className={styles.sideEyebrow}>SUMMARY</p>
          <h3 className={styles.sideTitle}>สรุปผลตรวจ</h3>
          <p className={styles.sideLead}>
            ตรวจยอดจองแล้ว + พร้อมใช้ว่าง เทียบกับยอดสั่งขาย — ยังไม่ตัดสต๊อก
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
            {waitingCount > 0 ? (
              <div className={styles.statItem}>
                <span>รอผลผลิต</span>
                <strong>{waitingCount}</strong>
              </div>
            ) : null}
            <div className={`${styles.statItem} ${styles.statWarn}`}>
              <span>ไม่พอ</span>
              <strong>{shortCount}</strong>
            </div>
            <div className={styles.statItem}>
              <span>ยอดขาดรวม</span>
              <strong>{formatQty(totalShortage)}</strong>
            </div>
          </div>

          <div className={styles.sideNote}>{sideNote}</div>

          {renderPrimaryAction(true)}

          {canOpenDetail ? (
            <Button
              block
              onClick={() => router.push(`/sales-orders/${id}`)}
            >
              เปิดใบสั่งขาย
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
