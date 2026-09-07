"use client";

import { useState } from "react";
import { Alert, Button, Input, Select } from "antd";
import { Modal } from "antd";

import {
  PRODUCTION_DOWNTIME_CATEGORY_LABEL,
  type CancelProductionOrderBody,
  type PauseProductionOrderBody,
} from "@/types/production-order";
import styles from "./ProductionOrderStartModal.module.css";

/**
 * กล่องยืนยัน 2 ตัวของการควบคุมงานที่กำลังเดินอยู่ — หยุดชั่วคราว และยกเลิกกลางคัน
 *
 * ทั้งคู่ใช้ `destroyOnHidden` แล้วตั้งค่าเริ่มต้นใน `useState` ตอน mount
 * (ไม่ใช้ effect มา sync) สิ่งที่ผู้ใช้พิมพ์อยู่จึงไม่ถูกล้างเมื่อข้อมูลเบื้องหลัง refetch
 */

const CATEGORY_OPTIONS = Object.entries(PRODUCTION_DOWNTIME_CATEGORY_LABEL).map(
  ([value, label]) => ({ value, label }),
);

/** สั้นกว่านี้อ่านย้อนหลังไม่รู้เรื่อง — ใบที่ยกเลิกแล้วกู้ไม่ได้ */
const CANCEL_REASON_MIN = 10;

type PauseModalProps = {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (body: PauseProductionOrderBody) => void;
};

function PauseModalBody(props: Omit<PauseModalProps, "open">) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  const trimmed = reason.trim();

  return (
    <>
      <Alert
        className={styles.notice}
        type="info"
        showIcon
        title="นาฬิกา Cycle ไม่หยุดเดิน"
        description="เตา 48 ชั่วโมงคือ 48 ชั่วโมงตามนาฬิกาจริง เวลาที่หยุดจะถูกบันทึกแยกไว้เป็นชั่วโมง Downtime ไม่ได้หักออกจาก Cycle"
      />

      <div className={styles.cellStack}>
        <span className={styles.cellMuted}>หมวดสาเหตุ (ใช้ทำกราฟ Pareto)</span>
        <Select
          allowClear
          placeholder="เลือกหมวด — ไม่เลือกก็ได้ แต่จะวิเคราะห์ไม่ได้"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </div>

      <div className={styles.cellStack} style={{ marginTop: 12 }}>
        <span className={styles.cellMuted}>เกิดอะไรขึ้น (บังคับ)</span>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น ปั๊มน้ำหล่อเย็นรั่ว รอช่างมาเปลี่ยนซีล"
        />
      </div>

      <div className={styles.footer}>
        <Button onClick={props.onCancel}>ปิด</Button>
        <Button
          type="primary"
          disabled={!trimmed}
          loading={props.loading}
          onClick={() => props.onConfirm({ reason: trimmed, category })}
        >
          หยุดเดินเครื่อง
        </Button>
      </div>
    </>
  );
}

export function ProductionOrderPauseModal(props: PauseModalProps) {
  return (
    <Modal
      open={props.open}
      title="หยุดเดินเครื่องชั่วคราว"
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
          title="วัตถุดิบที่ตัดไปแล้วจะไม่ถูกคืนเข้าสต๊อก"
          description="ยางที่เข้าเตาไปแล้วไม่ได้กลับมาวางบนชั้นเพราะเตาพัง ถ้ามีของเหลือจริงให้เปิดใบปรับปรุงสต๊อกโดยชั่งของจริงและมีคนอนุมัติ"
        />
      ) : null}

      <div className={styles.cellStack}>
        <span className={styles.cellMuted}>
          เหตุผลที่ยกเลิก
          {props.started ? ` (บังคับ อย่างน้อย ${CANCEL_REASON_MIN} ตัวอักษร)` : " (ไม่บังคับ)"}
        </span>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น เตาหมายเลข 2 ฝาครอบแตกชั่วโมงที่ 20 เดินต่อไม่ได้"
        />
      </div>

      {props.started ? (
        <div className={styles.cellStack} style={{ marginTop: 12 }}>
          {/* ด่านฝั่ง server รับได้แค่ "done" หรือชื่อผู้ใช้ที่ login อยู่
              — ต้องบอกให้ตรง ไม่งั้นผู้ใช้พิมพ์ชื่อจริงแล้วโดน 400 */}
          <span className={styles.cellMuted}>
            พิมพ์ <strong>done</strong> เพื่อลงชื่อยืนยันการยกเลิก
          </span>
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="done"
          />
        </div>
      ) : null}

      <div className={styles.footer}>
        <Button onClick={props.onCancel}>ไม่ยกเลิก</Button>
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
          ยกเลิกใบสั่งผลิต
        </Button>
      </div>
    </>
  );
}

export function ProductionOrderCancelModal(props: CancelModalProps) {
  return (
    <Modal
      open={props.open}
      title={
        props.orderNo
          ? `ยกเลิกใบสั่งผลิต ${props.orderNo}`
          : "ยกเลิกใบสั่งผลิต"
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
