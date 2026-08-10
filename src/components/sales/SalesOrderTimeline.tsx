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
  SALES_ORDER_FLOW_STEPS,
  type SalesOrderProgress,
} from "@/lib/sales/sales-order-progress";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
import styles from "./SalesOrderTimeline.module.css";

type Props = {
  salesOrderId: string;
  loading?: boolean;
  refreshing?: boolean;
  currentStep?: string;
  nextAction?: string;
  timeline?: SalesTrackingTimelineStep[];
  progress?: SalesOrderProgress;
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

function toneIcon(tone: SalesTimelineStepTone) {
  if (tone === "done") return <CheckCircleFilled />;
  if (tone === "cancelled") return <CloseCircleFilled />;
  if (tone === "active") return <ClockCircleFilled />;
  return null;
}

function FlowStepCard({
  step,
  href,
  tone,
  isCurrentPage,
}: {
  step: SalesTrackingTimelineStep;
  href?: string;
  tone: SalesTimelineStepTone;
  isCurrentPage?: boolean;
}) {
  const actionLabel = timelineStepActionLabel(step, href);
  const content = (
    <>
      <div className={styles.flowStepTop}>
        <span className={styles.flowStepIcon}>{stepIcon(step.step)}</span>
        <Tag
          color={salesTimelineToneTagColor(tone)}
          className={styles.flowStepTag}
        >
          {salesTimelineStatusLabel(step.status)}
        </Tag>
      </div>
      <div className={styles.flowStepName}>
        {salesTrackingStepLabel(step.step)}
      </div>
      <div
        className={`${styles.flowStepAction} ${
          href ? styles.flowStepActionLink : ""
        } ${isCurrentPage ? styles.flowStepActionHere : ""}`}
      >
        {actionLabel}
        {href ? <ExportOutlined /> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${styles.flowStep} ${styles[`flowTone_${tone}`]} ${styles.flowStepClickable}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={`${styles.flowStep} ${styles[`flowTone_${tone}`]} ${
        isCurrentPage ? styles.flowStepCurrent : styles.flowStepDisabled
      }`}
    >
      {content}
    </div>
  );
}

export default function SalesOrderTimeline({
  salesOrderId,
  loading,
  refreshing,
  currentStep,
  nextAction,
  timeline = [],
  progress,
}: Props) {
  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <p className={styles.eyebrow}>Sales Flow · เอกสารใน Flow</p>
          <h2 className={styles.title}>
            ขั้นตอนการดำเนินการ
            {refreshing ? (
              <Spin size="small" className={styles.refreshSpin} />
            ) : null}
          </h2>
          <p className={styles.subtitle}>
            กดที่การ์ดแต่ละขั้นเพื่อเปิดเอกสาร — ใบเสนอราคา → ใบสั่งขาย →
            ตรวจสต๊อก → จ่าย → บรรจุ → ส่ง → แจ้งหนี้
          </p>
        </div>
        {progress ? (
          <div
            className={`${styles.progressStrip} ${styles[`progress_${progress.tone}`]}`}
          >
            <div className={styles.progressMeta}>
              <span className={styles.progressCount}>
                {progress.tone === "stopped" && progress.current === 0
                  ? "—"
                  : `${progress.current}/${progress.total}`}
              </span>
              <span className={styles.progressLabel}>{progress.label}</span>
            </div>
            <div className={styles.progressTrack} aria-hidden>
              {SALES_ORDER_FLOW_STEPS.map((step, index) => {
                const stepNo = index + 1;
                const filled = stepNo <= progress.current;
                const current =
                  stepNo === progress.inProgress &&
                  progress.tone !== "stopped";
                return (
                  <span
                    key={step.key}
                    className={[
                      styles.progressSeg,
                      filled ? styles.progressSegOn : "",
                      current ? styles.progressSegCurrent : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={step.label}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {currentStep || (nextAction && nextAction !== "—") ? (
        <div className={styles.nextCard}>
          <div className={styles.nextLabel}>ขั้นตอนปัจจุบัน</div>
          <div className={styles.nextCurrent}>{currentStep ?? "—"}</div>
          {nextAction && nextAction !== "—" ? (
            <div className={styles.nextAction}>
              <ArrowRightOutlined />
              <span>ถัดไป: {nextAction}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.body}>
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
            {timeline.map((step, index) => {
              const tone = resolveSalesTimelineStepTone(step);
              const href = resolveTimelineStepHref(
                step,
                salesOrderId,
                timeline,
              );
              const isCurrentPage = step.step === "Sales Order";

              return (
                <div key={`${step.step}-${step.documentId ?? index}`} className={styles.flowItem}>
                  <FlowStepCard
                    step={step}
                    href={href}
                    tone={tone}
                    isCurrentPage={isCurrentPage}
                  />
                  {index < timeline.length - 1 ? (
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
