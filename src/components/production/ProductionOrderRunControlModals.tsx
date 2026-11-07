"use client";

import { useState } from "react";
import { Alert, Button, Input, Select } from "antd";
import { Modal } from "antd";

import {
  PRODUCTION_DOWNTIME_CATEGORY_LABEL,
  PRODUCTION_STOP_TYPE_LABEL,
  tPoLabel,
  type CancelProductionOrderBody,
  type PauseProductionOrderBody,
} from "@/types/production-order";
import styles from "./ProductionOrderStartModal.module.css";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

/**
 * กล่องยืนยัน 2 ตัวของการควบคุมงานที่กำลังเดินอยู่ — หยุดชั่วคราว และยกเลิกกลางคัน
 *
 * ทั้งคู่ใช้ `destroyOnHidden` แล้วตั้งค่าเริ่มต้นใน `useState` ตอน mount
 * (ไม่ใช้ effect มา sync) สิ่งที่ผู้ใช้พิมพ์อยู่จึงไม่ถูกล้างเมื่อข้อมูลเบื้องหลัง refetch
 */


/** สั้นกว่านี้อ่านย้อนหลังไม่รู้เรื่อง — ใบที่ยกเลิกแล้วกู้ไม่ได้ */
const CANCEL_REASON_MIN = 10;

type PauseModalProps = {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (body: PauseProductionOrderBody) => void;
};

function PauseModalBody(props: Omit<PauseModalProps, "open">) {
  const t = useT();
  const lang = useLanguage();
  const CATEGORY_OPTIONS = Object.entries(PRODUCTION_DOWNTIME_CATEGORY_LABEL).map(
    ([value, label]) => ({ value, label: tPoLabel(label, lang) }),
  );
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [stopType, setStopType] = useState<"PLANNED" | "UNPLANNED">("UNPLANNED");
  const [rootCause, setRootCause] = useState("");

  const trimmed = reason.trim();

  return (
    <>
      <Alert
        className={styles.notice}
        type="info"
        showIcon
        title={t("นาฬิกา Cycle ไม่หยุดเดิน")}
        description={t("เตา 48 ชั่วโมงคือ 48 ชั่วโมงตามนาฬิกาจริง เวลาที่หยุดจะถูกบันทึกแยกไว้เป็นชั่วโมง Downtime ไม่ได้หักออกจาก Cycle")}
      />

      <div className={styles.cellStack} style={{ marginBottom: 12 }}>
        <span className={styles.cellMuted}>{t("ประเภทการหยุด")}</span>
        <Select
          value={stopType}
          onChange={setStopType}
          options={(["UNPLANNED", "PLANNED"] as const).map((value) => ({
            value,
            label: tPoLabel(PRODUCTION_STOP_TYPE_LABEL[value], lang),
          }))}
        />
      </div>

      <div className={styles.cellStack}>
        <span className={styles.cellMuted}>{t("หมวดสาเหตุ (ใช้ทำกราฟ Pareto)")}</span>
        <Select
          allowClear
          placeholder={t("เลือกหมวด — ไม่เลือกก็ได้ แต่จะวิเคราะห์ไม่ได้")}
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </div>

      <div className={styles.cellStack} style={{ marginTop: 12 }}>
        <span className={styles.cellMuted}>{t("เกิดอะไรขึ้น (บังคับ)")}</span>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("เช่น ปั๊มน้ำหล่อเย็นรั่ว รอช่างมาเปลี่ยนซีล")}
        />
      </div>

      <div className={styles.cellStack} style={{ marginTop: 12 }}>
        <span className={styles.cellMuted}>{t("Root Cause — สาเหตุราก (ไม่บังคับ กรอกทีหลังได้)")}</span>
        <Input.TextArea
          rows={2}
          maxLength={500}
          showCount
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          placeholder={t("เช่น ซีลสึกหรอเกินอายุใช้งาน ไม่ได้เปลี่ยนตามรอบ PM")}
        />
      </div>

      <div className={styles.footer}>
        <Button onClick={props.onCancel}>{t("ปิด")}</Button>
        <Button
          type="primary"
          disabled={!trimmed}
          loading={props.loading}
          onClick={() =>
            props.onConfirm({
              reason: trimmed,
              category,
              stopType,
              rootCause: rootCause.trim() || undefined,
            })
          }
        >
          {t("หยุดเดินเครื่อง")}
        </Button>
      </div>
    </>
  );
}

export function ProductionOrderPauseModal(props: PauseModalProps) {
  const t = useT();
  return (
    <Modal
      open={props.open}
      title={t("หยุดเดินเครื่องชั่วคราว")}
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={520}
    >
      <PauseModalBody
        loading={props.loading}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </Modal>
  );
}

type CancelModalProps = {
  open: boolean;
  loading: boolean;
  /** ใบที่ตัดสต๊อกไปแล้ว — ต้องเตือนเรื่องวัตถุดิบและขอลายเซ็น */
  started: boolean;
  orderNo?: string;
  onCancel: () => void;
  onConfirm: (body: CancelProductionOrderBody) => void;
};

function CancelModalBody(props: Omit<CancelModalProps, "open">) {
  const t = useT();
  const lang = useLanguage();
  const [reason, setReason] = useState("");
  const [typedName, setTypedName] = useState("");

  const trimmedReason = reason.trim();
  const trimmedName = typedName.trim();
  const ready = props.started
    ? trimmedReason.length >= CANCEL_REASON_MIN && trimmedName.length > 0
    : true;

  return (
    <>
      {props.started ? (
        <Alert
          className={styles.notice}
          type="warning"
          showIcon
          title={t("วัตถุดิบที่ตัดไปแล้วจะไม่ถูกคืนเข้าสต๊อก")}
          description={t("ยางที่เข้าเตาไปแล้วไม่ได้กลับมาวางบนชั้นเพราะเตาพัง ถ้ามีของเหลือจริงให้เปิดใบปรับปรุงสต๊อกโดยชั่งของจริงและมีคนอนุมัติ")}
        />
      ) : null}

      <div className={styles.cellStack}>
        <span className={styles.cellMuted}>
          {t("เหตุผลที่ยกเลิก")}
          {props.started
            ? ` ${t("(บังคับ อย่างน้อย {n} ตัวอักษร)", { n: CANCEL_REASON_MIN })}`
            : ` ${t("(ไม่บังคับ)")}`}
        </span>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("เช่น เตาหมายเลข 2 ฝาครอบแตกชั่วโมงที่ 20 เดินต่อไม่ได้")}
        />
      </div>

      {props.started ? (
        <div className={styles.cellStack} style={{ marginTop: 12 }}>
          {/* ด่านฝั่ง server รับได้แค่ "done" หรือชื่อผู้ใช้ที่ login อยู่
              — ต้องบอกให้ตรง ไม่งั้นผู้ใช้พิมพ์ชื่อจริงแล้วโดน 400 */}
          <span className={styles.cellMuted}>
            {lang === "en" ? (
              <>Type <strong>done</strong> to sign and confirm the cancellation</>
            ) : (
              <>พิมพ์ <strong>done</strong> เพื่อลงชื่อยืนยันการยกเลิก</>
            )}
          </span>
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="done"
          />
        </div>
      ) : null}

      <div className={styles.footer}>
        <Button onClick={props.onCancel}>{t("ไม่ยกเลิก")}</Button>
        <Button
          danger
          type="primary"
          disabled={!ready}
          loading={props.loading}
          onClick={() =>
            props.onConfirm({
              cancelReason: trimmedReason || undefined,
              signature: trimmedName ? { typedName: trimmedName } : undefined,
            })
          }
        >
          {t("ยกเลิกใบสั่งผลิต")}
        </Button>
      </div>
    </>
  );
}

export function ProductionOrderCancelModal(props: CancelModalProps) {
  const t = useT();
  return (
    <Modal
      open={props.open}
      title={
        props.orderNo
          ? t("ยกเลิกใบสั่งผลิต {no}", { no: props.orderNo })
          : t("ยกเลิกใบสั่งผลิต")
      }
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={520}
    >
      <CancelModalBody
        loading={props.loading}
        started={props.started}
        orderNo={props.orderNo}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </Modal>
  );
}
