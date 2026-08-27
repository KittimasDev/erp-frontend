"use client";

import Link from "next/link";
import { Spin, Tag } from "antd";
import {
  ArrowRightOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  ExportOutlined,
  FileTextOutlined,
  InboxOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

import {
  resolveSalesTimelineStepTone,
  resolveTimelineStepHref,
  salesTimelineStatusLabel,
  salesTimelineToneTagColor,
  salesTrackingStepLabel,
  timelineStepActionLabel,
  type SalesTimelineStepTone,
} from "@/lib/sales/sales-tracking-timeline";
import {
  resolveActiveTimelineStepName,
  SALES_ORDER_FLOW_STEPS,
  type SalesOrderProgress,
} from "@/lib/sales/sales-order-progress";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
import styles from "./SalesOrderTimeline.module.css";

type Props = {
  salesOrderId: string;
  salesOrderStatus?: string;
  /** sales_orders.delivery_status — ความคืบหน้าจริงหลังยืนยัน (สรุปจากทุกรอบ) */
  salesOrderDeliveryStatus?: string;
  loading?: boolean;
  refreshing?: boolean;
  currentStep?: string;
  nextAction?: string;
  timeline?: SalesTrackingTimelineStep[];
  progress?: SalesOrderProgress;
  /** ถ้าเปิด URL ของขั้นนั้นไม่ได้ — ไม่ใส่ลิงก์ และโชว์ รอกระบวนการ */
  canNavigateHref?: (href: string) => boolean;
};

function stepIcon(stepName: string) {
  switch (stepName) {
    case "Quotation":
    case "Sales Order":
    case "Invoice":
      return <FileTextOutlined />;
    case "Stock Verification":
      return <SafetyCertificateOutlined />;
    case "Picking":
      return <ShoppingCartOutlined />;
    case "Packing":
      return <InboxOutlined />;
    case "Delivery":
      return <CarOutlined />;
    default:
      return <ClockCircleFilled />;
  }
}

function FlowStepCard({
  step,
  href,
  tone,
  isHere,
  isFocus,
  waitForPermission,
}: {
  step: SalesTrackingTimelineStep;
  href?: string;
  tone: SalesTimelineStepTone;
  isHere?: boolean;
  isFocus?: boolean;
  waitForPermission?: boolean;
}) {
  const actionLabel = waitForPermission
    ? "รอกระบวนการ"
    : timelineStepActionLabel(step, href);
  const content = (
    <>
      <div className={styles.flowStepTop}>
        <span className={styles.flowStepIcon}>{stepIcon(step.step)}</span>
        <Tag
          color={salesTimelineToneTagColor(tone)}
          className={styles.flowStepTag}
        >
          {isFocus
            ? "กำลังทำ"
            : isHere
              ? "หน้านี้"
              : salesTimelineStatusLabel(step.status)}
        </Tag>
      </div>
      <div className={styles.flowStepName}>
        {salesTrackingStepLabel(step.step)}
      </div>
      <div
        className={`${styles.flowStepAction} ${
          href ? styles.flowStepActionLink : ""
        }`}
      >
        {actionLabel}
        {href ? <ExportOutlined /> : null}
      </div>
    </>
  );

  const className = [
    styles.flowStep,
    styles[`flowTone_${tone}`],
    href ? styles.flowStepClickable : styles.flowStepDisabled,
    isFocus ? styles.flowStepFocus : "",
    isHere && !isFocus ? styles.flowStepCurrent : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export default function SalesOrderTimeline({
  salesOrderId,
  salesOrderStatus,
  salesOrderDeliveryStatus,
  loading,
  refreshing,
  currentStep,
  nextAction,
  timeline = [],
  progress,
  canNavigateHref,
}: Props) {
  const activeTimelineStep = salesOrderStatus
    ? resolveActiveTimelineStepName(salesOrderStatus, salesOrderDeliveryStatus)
    : null;
  const flowComplete =
    salesOrderDeliveryStatus === "DELIVERED" || progress?.tone === "done";
  const hasNext = Boolean(nextAction && nextAction !== "—");
  const nowLabel =
    currentStep ||
    progress?.currentStepLabel ||
    progress?.label ||
    "—";

  return (
    <section className={styles.wrap}>
      <div className={styles.statusBanner}>
        <div className={styles.statusBannerMain}>
          <div className={styles.statusEyebrowRow}>
            <p className={styles.statusEyebrow}>สถานะตอนนี้</p>
            {refreshing ? (
              <Spin size="small" className={styles.refreshSpin} />
            ) : null}
          </div>
          <h2 className={styles.statusTitle}>{nowLabel}</h2>
          {hasNext ? (
            <p className={styles.statusNext}>
              <ArrowRightOutlined />
              <span>
                ต้องทำถัดไป: <strong>{nextAction}</strong>
              </span>
            </p>
          ) : progress?.tone === "done" ? (
            <p className={styles.statusNextDone}>ครบทุกขั้นตอนแล้ว</p>
          ) : null}
        </div>
        {progress ? (
          <div className={styles.statusBannerMeta}>
            <div className={styles.statusFraction}>
              <span className={styles.statusFractionNum}>
                {progress.tone === "stopped" && progress.current === 0
                  ? "—"
                  : progress.inProgress}
              </span>
              <span className={styles.statusFractionDen}>
                / {progress.total}
              </span>
            </div>
            <div className={styles.statusFractionLabel}>
              ขั้นที่กำลังทำ
              <br />
              <strong>{progress.currentStepLabel}</strong>
            </div>
          </div>
        ) : null}
      </div>

      {progress ? (
        <div
          className={`${styles.stepTracker} ${styles[`progress_${progress.tone}`]}`}
          role="list"
          aria-label="ความคืบหน้าใบสั่งขาย"
        >
          {SALES_ORDER_FLOW_STEPS.map((step, index) => {
            const stepNo = index + 1;
            const done =
              progress.tone !== "stopped" && stepNo <= progress.current;
            const current =
              progress.tone !== "stopped" &&
              stepNo === progress.inProgress &&
              progress.tone !== "done";
            const finished =
              progress.tone === "done" && stepNo <= progress.current;

            return (
              <div
                key={step.key}
                role="listitem"
                className={[
                  styles.stepNode,
                  done || finished ? styles.stepNodeDone : "",
                  current ? styles.stepNodeCurrent : "",
                  progress.tone === "stopped" ? styles.stepNodeStopped : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepNodeDot}>
                  {done || finished ? (
                    <CheckCircleFilled />
                  ) : (
                    <span>{stepNo}</span>
                  )}
                </div>
                <div className={styles.stepNodeLabel}>{step.shortLabel}</div>
                {current ? (
                  <div className={styles.stepNodeBadge}>อยู่ตรงนี้</div>
                ) : null}
                {index < SALES_ORDER_FLOW_STEPS.length - 1 ? (
                  <span
                    className={[
                      styles.stepConnector,
                      done || finished ? styles.stepConnectorOn : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={styles.body}>
        <div className={styles.bodyHead}>
          <p className={styles.eyebrow}>เอกสารใน Flow</p>
          <p className={styles.subtitle}>
            กดการ์ดเพื่อเปิดเอกสาร — การ์ดสีส้มคือขั้นที่ต้องทำตอนนี้
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Spin size="small" /> กำลังโหลดขั้นตอน...
          </div>
        ) : timeline.length === 0 ? (
          <p className={styles.subtitle} style={{ margin: 0 }}>
            ยังไม่มีข้อมูลขั้นตอน — ยืนยันใบสั่งขายแล้วเริ่มตรวจสต๊อก
          </p>
        ) : (
          <div className={styles.flowStrip} role="list">
            {timeline
              .filter((step) => step.step !== "Invoice")
              .map((step, index, visible) => {
              const tone = resolveSalesTimelineStepTone(step);
              const rawHref = resolveTimelineStepHref(
                step,
                salesOrderId,
                timeline,
              );
              const waitForPermission = Boolean(
                rawHref && canNavigateHref && !canNavigateHref(rawHref),
              );
              const href = waitForPermission ? undefined : rawHref;
              const isHere = step.step === "Sales Order";
              const isFocus =
                !flowComplete &&
                tone !== "done" &&
                tone !== "cancelled" &&
                (activeTimelineStep === step.step || tone === "active");

              return (
                <div
                  key={`${step.step}-${step.documentId ?? index}`}
                  className={styles.flowItem}
                >
                  <FlowStepCard
                    step={step}
                    href={href}
                    tone={isFocus && tone === "pending" ? "active" : tone}
                    isHere={isHere}
                    isFocus={isFocus}
                    waitForPermission={waitForPermission}
                  />
                  {index < visible.length - 1 ? (
                    <RightOutlined
                      className={styles.flowArrow}
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
