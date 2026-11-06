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
  tSoStatus,
  type SalesOrderStatus,
  type SalesOrderStockVerificationLine,
} from "@/types/sales-orders";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
import styles from "./StockVerificationDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

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
  const t = useT();
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
            {t("…อีก {n} Lot", { n: row.availableLots.length - 4 })}
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
            {t("…อีก {n} ตำแหน่ง", { n: row.availableLocations.length - 4 })}
          </li>
        ) : null}
      </ul>
    );
  }

  return <span className={styles.hintEmpty}>{t("ไม่มีตำแหน่งพร้อมใช้")}</span>;
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
  const t = useT();
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
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!verification) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบข้อมูลใบสั่งขายหรือผลการตรวจสต๊อก")}
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-orders/stock-verification">{t("กลับรายการ")}</Link>
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
        {draft ? t("เปิดใบจ่ายสินค้า (ร่าง)") : t("เปิดใบจ่ายสินค้า")}
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
        {t("ไปเลือกรอบจัดส่งเพื่อสร้างใบจ่าย")}
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
        {t("ไปใบสั่งขายเพื่อออกใบขอผลิต")}
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
        {t("ไปใบสั่งขายเพื่อติดตามใบขอผลิต")}
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
            {t("สร้างใบจ่ายสินค้า")}
          </Button>
        );
      }
    }

    return null;
  };

  const statusBannerTitle = isPastStockVerification
    ? t("ขั้นตอนตรวจสต๊อกเสร็จแล้ว")
    : isStockChecked
      ? t("ยืนยันผลตรวจสอบสต๊อกแล้ว")
      : allOk
        ? t("สต๊อกพอทุกรายการ")
        : waitingProduction
          ? t("รอผลผลิตเข้าคลัง")
          : t("สต๊อกไม่พอบางรายการ");

  const statusBannerText = isPastStockVerification
    ? t("ใบสั่งขายไปขั้นถัดไปแล้ว — หน้านี้ดูผลตรวจย้อนหลังได้อย่างเดียว ไม่สร้างใบจ่ายใหม่จากที่นี่")
    : isStockChecked
      ? hasPickingDocument
        ? t("มีใบจ่ายสินค้าแล้ว — กดเปิดใบจ่ายเพื่อดำเนินการต่อ")
        : t("ขั้นตอนตรวจสต๊อกเสร็จแล้ว — สร้างใบจ่ายสินค้าเพื่อไปขั้นถัดไป")
      : allOk
        ? t("หน้านี้เป็นรายงานอ่านอย่างเดียว — ขั้นถัดไปคือคลังเปิดใบจ่ายสินค้าของรอบที่ถึงกำหนด (ใช้ของที่จองไว้แล้ว ไม่จองซ้ำ)")
        : waitingProduction
          ? t("มีใบขอผลิตคุมยอดที่ขาดอยู่แล้ว — เปิดใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง")
          : canOpenDetail
            ? t("ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง กดไปหน้าใบสั่งขายใบนี้เพื่อออกใบขอผลิต")
            : t("ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง");

  const statusBannerTone =
    isPastStockVerification || isStockChecked || allOk
      ? styles.statusBannerOk
      : styles.statusBannerWarn;

  const statusPillLabel = isPastStockVerification
    ? t("เสร็จแล้ว")
    : isStockChecked
      ? hasPickingDocument
        ? t("มีใบจ่ายแล้ว")
        : t("พร้อมจ่ายสินค้า")
      : allOk
        ? t("ของพอ")
        : waitingProduction
          ? t("รอผลผลิต")
          : t("ขาด {n} รายการ", { n: shortCount });

  const sideNote = isPastStockVerification ? (
    <>
      {t("ดูผลตรวจได้อย่างเดียว — ไปทำต่อที่")}{" "}
      <strong>{tSoStatus("ใบจ่ายสินค้า")}</strong> {t("หรือใบสั่งขาย")}
    </>
  ) : isStockChecked ? (
    hasPickingDocument ? (
      <>
        {t("มีใบจ่ายแล้ว — กด")} <strong>{t("เปิดใบจ่ายสินค้า")}</strong> {t("เพื่อไปขั้นถัดไป")}
      </>
    ) : (
      <>
        {t("ตรวจสต๊อกเสร็จแล้ว — กด")} <strong>{t("สร้างใบจ่ายสินค้า")}</strong> {t("เพื่อไปขั้นถัดไป")}
      </>
    )
  ) : allOk && pickingActions.canAdd ? (
    <>
      {t("ขั้นถัดไป: กด")} <strong>{t("ไปเลือกรอบจัดส่งเพื่อสร้างใบจ่าย")}</strong>{" "}
      {t("— ของจะถูกจองตอนสร้างใบจ่าย ไม่ใช่ตอนนี้")}
    </>
  ) : allOk ? (
    <>{t("ของพอแล้ว — ขั้นถัดไปเป็นงานของคลัง (เปิดใบจ่ายสินค้าของรอบที่ถึงกำหนด)")}</>
  ) : waitingProduction ? (
    canOpenDetail ? (
      <>
        {t("รอผลผลิตเข้าคลัง — กด")} <strong>{t("ไปใบสั่งขาย")}</strong> {t("เพื่อติดตามใบขอผลิต")}
      </>
    ) : (
      <>{t("รอผลผลิตเข้าคลัง — เปิดใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง")}</>
    )
  ) : canOpenDetail ? (
    <>
      {t("ของไม่พอ — กด")} <strong>{t("ไปใบสั่งขายเพื่อออกใบขอผลิต")}</strong>{" "}
      {t("(ใบ {soNo}) แล้วออกใบขอผลิตจากหน้านั้น", { soNo })}
    </>
  ) : (
    <>{t("ของไม่พอ — สร้างใบจ่ายไม่ได้จนกว่าของจะเข้าคลัง")}</>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Stock Verification"
        icon={<SearchOutlined />}
        title={soNo}
        subtitle={<>{order?.customer
              ? `${order.customer.customerCode} — ${order.customer.nameTh}`
              : "—"}{" "}
            · {t("วันที่ SO")} {formatDate(order?.soDate)} ·{" "}
            {tSoStatus(SALES_ORDER_STATUS_LABEL[soStatus as SalesOrderStatus] ??
              soStatus)}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/sales-orders/stock-verification")}
          >
            {t("กลับรายการ")}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={verifyQuery.isFetching}
            disabled={isPastStockVerification}
            title={
              isPastStockVerification
                ? t("ขั้นตอนนี้เสร็จแล้ว — ไม่ต้องตรวจสอบใหม่")
                : undefined
            }
            onClick={() => void verifyQuery.refetch()}
          >
            {t("ตรวจสอบใหม่")}
          </Button>
          {renderPrimaryAction()}
          </>
        }
      />

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
              <h2 className={styles.sectionTitle}>{t("ข้อมูลใบสั่งขาย")}</h2>
              <span
                className={`${styles.statusPill} ${statusClass(soStatus)}`}
              >
                {SALES_ORDER_STATUS_LABEL[soStatus as SalesOrderStatus] ??
              soStatus}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่ SO")}</span>
                <div className={styles.metaValue}>
                  {canOpenDetail ? (
                    <Link href={`/sales-orders/${id}`}>{soNo}</Link>
                  ) : (
                    soNo
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่")}</span>
                <div className={styles.metaValue}>
                  {formatDate(order?.soDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันส่งที่ขอ")}</span>
                <div className={styles.metaValue}>
                  {formatDate(order?.requestedDeliveryDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ลูกค้า")}</span>
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
              <h2 className={styles.sectionTitle}>{t("รายการตรวจสต๊อก")}</h2>
              <Typography.Text type="secondary">
                {t("{n} รายการ", { n: lines.length })}
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
                        {tSoStatus(tag.label)}
                      </Tag>
                    </div>

                    <div className={styles.qtyGrid}>
                      <div className={styles.qtyItem}>
                        <span>{t("ยอดสั่งขาย")}</span>
                        <strong>{formatQty(row.orderedQty)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>{tSoStatus("จ่ายแล้ว")}</span>
                        <strong>{formatQty(row.issuedQty ?? 0)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>{t("จองแล้ว")}</span>
                        <strong>{formatQty(row.reservedQty ?? 0)}</strong>
                      </div>
                      <div className={styles.qtyItem}>
                        <span>{t("พร้อมใช้ว่าง")}</span>
                        <strong>{formatQty(row.availableQty)}</strong>
                      </div>
                      {Number(row.pendingProductionQty ?? 0) > 0.0005 ? (
                        <div className={styles.qtyItem}>
                          <span>{t("รอผลิต")}</span>
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
                        <span>{t("ยอดขาด")}</span>
                        <strong>
                          {formatQty(
                            row.unplannedShortageQty ?? row.shortageQty,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.locationBlock}>
                      <span className={styles.locationLabel}>
                        {t("คลัง / ตำแหน่ง / Lot")}
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
          <h3 className={styles.sideTitle}>{t("สรุปผลตรวจ")}</h3>
          <p className={styles.sideLead}>
            {t("ตรวจยอดจองแล้ว + พร้อมใช้ว่าง เทียบกับยอดสั่งขาย — ยังไม่ตัดสต๊อก")}
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span>{t("รายการทั้งหมด")}</span>
              <strong>{lines.length}</strong>
            </div>
            <div className={`${styles.statItem} ${styles.statOk}`}>
              <span>{t("พอ")}</span>
              <strong>{okCount}</strong>
            </div>
            {waitingCount > 0 ? (
              <div className={styles.statItem}>
                <span>{t("รอผลผลิต")}</span>
                <strong>{waitingCount}</strong>
              </div>
            ) : null}
            <div className={`${styles.statItem} ${styles.statWarn}`}>
              <span>{t("ไม่พอ")}</span>
              <strong>{shortCount}</strong>
            </div>
            <div className={styles.statItem}>
              <span>{t("ยอดขาดรวม")}</span>
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
              {t("เปิดใบสั่งขาย")}
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
