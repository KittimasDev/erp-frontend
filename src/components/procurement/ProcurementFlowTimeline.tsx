"use client";

import Link from "next/link";
import { Button, Steps } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";

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
};

export default function ProcurementFlowTimeline({
  input,
  hideLinks = false,
}: Props) {
  const flow = resolveProcurementFlow(input);
  const current =
    flow.current >= 4 ? PROCUREMENT_FLOW_STEPS.length - 1 : flow.current;
  const goToPurchaseOrders =
    Boolean(input.pr && input.pr.status === "APPROVED") && !flow.docs.po;

  const items = PROCUREMENT_FLOW_STEPS.map((step, index) => {
    let description: string | undefined;
    if (index === 0 && flow.docs.pr) description = flow.docs.pr.no;
    if (index === 1 && flow.docs.po) description = flow.docs.po.no;
    if (index === 1 && !flow.docs.po && goToPurchaseOrders) {
      description = "ทำที่เมนูใบสั่งซื้อ";
    }
    if (index === 2 && flow.docs.goodsReceipts[0]) {
      description =
        flow.docs.goodsReceipts.length > 1
          ? `${flow.docs.goodsReceipts[0].no} +${flow.docs.goodsReceipts.length - 1}`
          : flow.docs.goodsReceipts[0].no;
    }
    if (index === 3 && flow.docs.payment) description = flow.docs.payment.no;

    return {
      title: step.title,
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
              <span className={styles.docLinkLabel}>จ่าย</span>
              <Link className={styles.docLink} href={flow.docs.payment.href}>
                {flow.docs.payment.no}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={styles.nextHint}>
        <strong>ขั้นตอนถัดไป</strong>
        {flow.nextHint}
      </p>

      {goToPurchaseOrders ? (
        <Link href="/purchase-orders" className={styles.createPoBtnWrap}>
          <Button block icon={<ShoppingCartOutlined />}>
            ไปที่ใบสั่งซื้อ
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
