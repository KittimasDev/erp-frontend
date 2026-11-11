"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button, Steps } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";
import {
  RECEIVE_TIMING_LABEL,
  receiveTiming,
  type PoDeliverySchedule,
  type ReceiveTiming,
} from "@/types/po-delivery-schedules";
import {
  PROCUREMENT_FLOW_STEPS,
  resolveProcurementFlow,
  type ProcurementFlowInput,
} from "./procurementFlow";
import styles from "./ProcurementFlow.module.css";

type Props = {
  input: ProcurementFlowInput;
  /** Hide document links under steps */
  hideLinks?: boolean;
  /** รอบจัดส่งของใบสั่งซื้อ — แสดงใต้ขั้นรับของ */
  deliverySchedules?: PoDeliverySchedule[];
};

function formatDate(value: string) {
  return dayjs(value).format("DD/MM/BBBB");
}

const TIMING_CLASS: Record<ReceiveTiming, string> = {
  early: styles.timingEarly,
  on_time: styles.timingOnTime,
  late: styles.timingLate,
};

function DeliveryRounds({ schedules }: { schedules: PoDeliverySchedule[] }) {
  const t = useT();
  const sorted = [...schedules].sort((a, b) => a.roundNo - b.roundNo);
  return (
    <div className={styles.rounds}>
      {sorted.map((schedule) => {
        const timing = receiveTiming(
          schedule.latestActualReceiveDate,
          schedule.effectiveDeliveryDate,
        );
        return (
          <div key={schedule.id} className={styles.round}>
            <strong>{t("รอบที่ {n}", { n: schedule.roundNo })}</strong>
            <span>
              {t("กำหนดส่ง {date}", {
                date: formatDate(schedule.effectiveDeliveryDate),
              })}
            </span>
            {schedule.latestActualReceiveDate ? (
              <>
                <span>
                  {t("รับจริงล่าสุด {date}", {
                    date: formatDate(schedule.latestActualReceiveDate),
                  })}
                </span>
                {timing ? (
                  <span className={TIMING_CLASS[timing]}>
                    {t(RECEIVE_TIMING_LABEL[timing])}
                  </span>
                ) : null}
              </>
            ) : schedule.status === "CANCELLED" ? (
              <span>{t("ยกเลิกการรับ")}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ProcurementFlowTimeline({
  input,
  hideLinks = false,
  deliverySchedules,
}: Props) {
  const t = useT();
  const flow = resolveProcurementFlow(input);
  const current =
    flow.current >= 4 ? PROCUREMENT_FLOW_STEPS.length - 1 : flow.current;
  const goToPurchaseOrders =
    Boolean(input.pr && input.pr.status === "APPROVED") && !flow.docs.po;

  const items = PROCUREMENT_FLOW_STEPS.map((step, index) => {
    let description: ReactNode;
    if (index === 0 && flow.docs.pr) description = flow.docs.pr.no;
    if (index === 1 && flow.docs.po) description = flow.docs.po.no;
    if (index === 1 && !flow.docs.po && goToPurchaseOrders) {
      description = t("ทำที่เมนูใบสั่งซื้อ");
    }
    if (index === 2 && flow.docs.goodsReceipts[0]) {
      description =
        flow.docs.goodsReceipts.length > 1
          ? `${flow.docs.goodsReceipts[0].no} +${flow.docs.goodsReceipts.length - 1}`
          : flow.docs.goodsReceipts[0].no;
    }
    if (index === 2 && deliverySchedules?.length) {
      description = (
        <>
          {description}
          <DeliveryRounds schedules={deliverySchedules} />
        </>
      );
    }
    if (index === 3 && flow.docs.payment) description = flow.docs.payment.no;

    return {
      title: t(step.title),
      content: description,
      status: flow.stepStates[index],
    };
  });

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHead}>
        <p className={styles.timelineEyebrow}>Procurement flow</p>
        <p className={styles.timelineSummary}>{flow.summaryLabel}</p>
      </div>

      <Steps
        className={styles.steps}
        size="small"
        orientation="vertical"
        current={current}
        status={flow.stepsStatus}
        items={items}
      />

      {!hideLinks ? (
        <div className={styles.docLinks}>
          {flow.docs.pr ? (
            <div className={styles.docLinkRow}>
              <span className={styles.docLinkLabel}>PR</span>
              <Link className={styles.docLink} href={flow.docs.pr.href}>
                {flow.docs.pr.no}
              </Link>
            </div>
          ) : null}
          {flow.docs.po ? (
            <div className={styles.docLinkRow}>
              <span className={styles.docLinkLabel}>PO</span>
              <Link className={styles.docLink} href={flow.docs.po.href}>
                {flow.docs.po.no}
              </Link>
            </div>
          ) : null}
          {flow.docs.goodsReceipts.length > 0 ? (
            <div className={styles.docLinkRow}>
              <span className={styles.docLinkLabel}>GR</span>
              {flow.docs.goodsReceipts.map((gr) => (
                <Link key={gr.id} className={styles.docLink} href={gr.href}>
                  {gr.no}
                </Link>
              ))}
            </div>
          ) : null}
          {flow.docs.payment ? (
            <div className={styles.docLinkRow}>
              <span className={styles.docLinkLabel}>{t("จ่าย")}</span>
              <Link className={styles.docLink} href={flow.docs.payment.href}>
                {flow.docs.payment.no}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={styles.nextHint}>
        <strong>{t("ขั้นตอนถัดไป")}</strong>
        {flow.nextHint}
      </p>

      {goToPurchaseOrders ? (
        <Link href="/purchase-orders" className={styles.createPoBtnWrap}>
          <Button block icon={<ShoppingCartOutlined />}>
            {t("ไปที่ใบสั่งซื้อ")}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
