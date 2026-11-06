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
import { tNow, useT } from "@/lib/i18n/useT";
import { isDeliveryScheduleDone } from "@/types/delivery-schedules";
import { tSoStatus } from "@/types/sales-orders";
import type {
  SalesTrackingRoundTimeline,
  SalesTrackingTimelineStep,
} from "@/types/sales-tracking";
import styles from "./SalesOrderTimeline.module.css";

type FlowRound = Pick<SalesTrackingRoundTimeline, "roundNo" | "roundStatus">;

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
  roundCount?: number;
  rounds?: FlowRound[];
  /** ถ้าเปิด URL ของขั้นนั้นไม่ได้ — ไม่ใส่ลิงก์ และโชว์ รอกระบวนการ */
  canNavigateHref?: (href: string) => boolean;
};

function isOpenRound(roundStatus: string) {
  return !isDeliveryScheduleDone(roundStatus) && roundStatus !== "CANCELLED";
}

function nextOpenRound(rounds: FlowRound[]): FlowRound | undefined {
  return rounds.find((round) => isOpenRound(round.roundStatus));
}

/** การ์ดสีส้มได้ใบเดียว — หลายรอบที่ยังไม่จบชี้ที่รอบจัดส่ง */
function resolveFlowFocusStepName({
  flowComplete,
  roundCount,
  rounds,
  salesOrderStatus,
  salesOrderDeliveryStatus,
}: {
  flowComplete: boolean;
  roundCount: number;
  rounds: FlowRound[];
  salesOrderStatus?: string;
  salesOrderDeliveryStatus?: string;
}): string | null {
  if (flowComplete) return null;
  const remaining = rounds.filter((round) => isOpenRound(round.roundStatus));
  if (roundCount > 1 && remaining.length > 0) {
    return "Delivery Rounds";
  }
  if (!salesOrderStatus) return null;
  return resolveActiveTimelineStepName(
    salesOrderStatus,
    salesOrderDeliveryStatus,
    remaining[0]?.roundStatus,
  );
}

function flowStepCaption(
  step: SalesTrackingTimelineStep,
  roundCount: number,
  remainingRound: FlowRound | undefined,
  lastRound: FlowRound | undefined,
  allRoundsDone: boolean,
): string | undefined {
  if (step.step === "Delivery Rounds") {
    if (!roundCount) return undefined;
    if (allRoundsDone || !remainingRound) {
      return tNow("ครบ {n} รอบ", { n: roundCount });
    }
    return tNow("รอบ {no} จาก {total}", { no: remainingRound.roundNo, total: roundCount });
  }
  if (step.step === "Picking" || step.step === "Packing" || step.step === "Delivery") {
    const round = remainingRound ?? lastRound;
    if (!round) return undefined;
    return tNow("รอบ {no}", { no: round.roundNo });
  }
  return undefined;
}

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
  caption,
}: {
  step: SalesTrackingTimelineStep;
  href?: string;
  tone: SalesTimelineStepTone;
  isHere?: boolean;
  isFocus?: boolean;
  waitForPermission?: boolean;
  caption?: string;
}) {
  const t = useT();
  const actionLabel = waitForPermission
    ? t("รอกระบวนการ")
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
            ? t("กำลังทำ")
            : isHere
              ? t("หน้านี้")
              : salesTimelineStatusLabel(step.status)}
        </Tag>
      </div>
      <div className={styles.flowStepName}>
        {salesTrackingStepLabel(step.step)}
      </div>
      {caption ? <div className={styles.flowStepMeta}>{caption}</div> : null}
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
  roundCount = 0,
  rounds = [],
  canNavigateHref,
}: Props) {
  const t = useT();
  const flowComplete =
    salesOrderDeliveryStatus === "DELIVERED" || progress?.tone === "done";
  const remainingRound = nextOpenRound(rounds);
  const lastRound = rounds[rounds.length - 1];
  const allRoundsDone =
    roundCount > 0 && rounds.every((round) => !isOpenRound(round.roundStatus));
  const focusStep = resolveFlowFocusStepName({
    flowComplete,
    roundCount,
    rounds,
    salesOrderStatus,
    salesOrderDeliveryStatus,
  });
  const hasNext = Boolean(nextAction && nextAction !== "—");
  const nowLabel =
    (currentStep ? tSoStatus(currentStep) : "") ||
    progress?.currentStepLabel ||
    progress?.label ||
    "—";

  return (
    <section className={styles.wrap}>
      <div className={styles.statusBanner}>
        <div className={styles.statusBannerMain}>
          <div className={styles.statusEyebrowRow}>
            <p className={styles.statusEyebrow}>{t("สถานะตอนนี้")}</p>
            {refreshing ? (
              <Spin size="small" className={styles.refreshSpin} />
            ) : null}
          </div>
          <h2 className={styles.statusTitle}>{nowLabel}</h2>
          {hasNext ? (
            <p className={styles.statusNext}>
              <ArrowRightOutlined />
              <span>
                {t("ต้องทำถัดไป:")} <strong>{tSoStatus(nextAction ?? "")}</strong>
              </span>
            </p>
          ) : progress?.tone === "done" ? (
            <p className={styles.statusNextDone}>{t("ครบทุกขั้นตอนแล้ว")}</p>
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
              {t("ขั้นที่กำลังทำ")}
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
          aria-label={t("ความคืบหน้าใบสั่งขาย")}
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
                <div className={styles.stepNodeLabel}>{tSoStatus(step.shortLabel)}</div>
                {current ? (
                  <div className={styles.stepNodeBadge}>{t("อยู่ตรงนี้")}</div>
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
          <p className={styles.eyebrow}>{t("เอกสารใน Flow")}</p>
          <p className={styles.subtitle}>
            {t("กดการ์ดเพื่อเปิดเอกสาร — การ์ดสีส้มคือขั้นที่ต้องทำตอนนี้")}
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Spin size="small" /> {t("กำลังโหลดขั้นตอน...")}
          </div>
        ) : timeline.length === 0 ? (
          <p className={styles.subtitle} style={{ margin: 0 }}>
            {t("ยังไม่มีข้อมูลขั้นตอน — ยืนยันใบสั่งขายแล้วเริ่มตรวจสต๊อก")}
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
                focusStep === step.step;
              const displayTone: SalesTimelineStepTone =
                tone === "done" || tone === "cancelled"
                  ? tone
                  : isFocus
                    ? "active"
                    : "pending";
              const caption = flowStepCaption(
                step,
                roundCount,
                remainingRound,
                lastRound,
                allRoundsDone,
              );

              return (
                <div
                  key={`${step.step}-${step.documentId ?? index}`}
                  className={styles.flowItem}
                >
                  <FlowStepCard
                    step={step}
                    href={href}
                    tone={displayTone}
                    isHere={isHere}
                    isFocus={isFocus}
                    waitForPermission={waitForPermission}
                    caption={caption}
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
