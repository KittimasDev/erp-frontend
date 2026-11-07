"use client";

import { useState } from "react";
import { Alert, Button, Input, InputNumber, Modal } from "antd";

import type {
  CancelStageRunBody,
  CompleteStageRunBody,
  StageRun,
} from "@/types/production-stage-run";
import { OUTPUT_VARIANCE_WARN_PERCENT } from "@/lib/production/constants";
import { useT } from "@/lib/i18n/useT";
import styles from "./StageRunPage.module.css";

/**
 * กล่องยืนยันของรอบ stage — ปิดงานด้วยผลผลิตจริง และยกเลิก (รวมกลางคัน)
 *
 * เดิมทั้งสองปุ่มเป็น `Popconfirm` ที่ยิง API เปล่า ๆ · ปิดงานจึงรับเข้าคลัง
 * "ตามแผน" เสมอ พูดว่า "วางแผน 900 ได้จริง 850" ไม่ได้เลย
 *
 * ใช้ `destroyOnHidden` แล้วตั้งค่าเริ่มต้นใน `useState` ตอน mount (ไม่ใช้ effect
 * มา sync) สิ่งที่ผู้ใช้พิมพ์อยู่จึงไม่ถูกล้างเมื่อข้อมูลเบื้องหลัง refetch
 */

const CANCEL_REASON_MIN = 10;

function fmtQty(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

type CompleteModalProps = {
  open: boolean;
  run: StageRun;
  loading: boolean;
  inputUnit: string;
  outputUnit: string;
  warehouseName: string;
  onCancel: () => void;
  onConfirm: (body: CompleteStageRunBody) => void;
};

function CompleteModalBody(props: Omit<CompleteModalProps, "open">) {
  const t = useT();
  const { run } = props;
  const planned = Number(run.outputQty) || 0;
  const [actual, setActual] = useState<number | null>(planned);
  const [remark, setRemark] = useState("");

  const value = actual ?? 0;
  const variance = value - planned;
  const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;
  const bigVariance = Math.abs(variancePercent) >= OUTPUT_VARIANCE_WARN_PERCENT;

  // เทียบได้เฉพาะตอนหน่วยเข้า/ออกเป็นหน่วยเดียวกัน — ดู yieldComparable จาก backend
  const consumed = Number(run.inputActualQty) || Number(run.inputQty) || 0;
  const previewYield =
    run.yieldComparable && consumed > 0
      ? Number(((value / consumed) * 100).toFixed(2))
      : null;

  return (
    <>
      <Alert
        className={styles.formSectionHint}
        type="warning"
        showIcon
        title={t("จะรับ {qty} {unit} เข้า {warehouse} พร้อมสร้าง Lot ใหม่ — ย้อนกลับไม่ได้", { qty: fmtQty(value), unit: props.outputUnit, warehouse: props.warehouseName })}
      />

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t("วัตถุดิบที่ตัดไปจริง")}</span>
          <span className={styles.infoValue}>
            {fmtQty(consumed)} {props.inputUnit}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t("ผลผลิตตามแผน")}</span>
          <span className={styles.infoValue}>
            {fmtQty(planned)} {props.outputUnit}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t("Yield ที่จะได้")}</span>
          <span className={styles.infoValue}>
            {previewYield === null ? t("เทียบไม่ได้ (หน่วยต่างกัน)") : `${previewYield}%`}
          </span>
        </div>
      </div>

      <div className={styles.cellStack} style={{ marginTop: 12 }}>
        <span className={styles.infoLabel}>
          {t("ผลผลิตที่ชั่งได้จริง")} ({props.outputUnit})
        </span>
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          step={1}
          value={actual}
          onChange={setActual}
          autoFocus
        />
        {bigVariance ? (
          <span className={styles.cellMuted}>
            {t("ต่างจากแผน")} {variance > 0 ? "+" : ""}
            {fmtQty(variance)} {props.outputUnit} (
            {variancePercent.toFixed(1)}%) — {t("ใส่หมายเหตุไว้จะช่วยคนอ่านย้อนหลัง")}
          </span>
        ) : null}
      </div>

      <div className={styles.cellStack} style={{ marginTop: 12 }}>
        <span className={styles.infoLabel}>{t("หมายเหตุ (ไม่บังคับ)")}</span>
        <Input.TextArea
          rows={2}
          maxLength={500}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder={t("เช่น เครื่องอบเดินไม่เต็มรอบ ได้น้อยกว่าแผน")}
        />
      </div>

      <div className={styles.formActions}>
        <Button onClick={props.onCancel}>{t("ปิด")}</Button>
        <Button
          type="primary"
          loading={props.loading}
          onClick={() =>
            props.onConfirm({
              outputActualQty: value,
              remark: remark.trim() || undefined,
            })
          }
        >
          {t("ยืนยันเสร็จงาน")}
        </Button>
      </div>
    </>
  );
}

export function StageRunCompleteModal(props: CompleteModalProps) {
  const t = useT();
  return (
    <Modal
      open={props.open}
      title={`${t("ยืนยันเสร็จงาน")} ${props.run.runNo}`}
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={560}
    >
      <CompleteModalBody
        run={props.run}
        loading={props.loading}
        inputUnit={props.inputUnit}
        outputUnit={props.outputUnit}
        warehouseName={props.warehouseName}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </Modal>
  );
}

type CancelModalProps = {
  open: boolean;
  runNo: string;
  loading: boolean;
  /** รอบที่เริ่มงานแล้ว = ตัดสต๊อกไปแล้ว ต้องเตือนและขอเหตุผล */
  started: boolean;
  onCancel: () => void;
  onConfirm: (body: CancelStageRunBody) => void;
};

function CancelModalBody(props: Omit<CancelModalProps, "open">) {
  const t = useT();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const ready = props.started ? trimmed.length >= CANCEL_REASON_MIN : true;

  return (
    <>
      {props.started ? (
        <Alert
          className={styles.formSectionHint}
          type="warning"
          showIcon
          title={t("วัตถุดิบที่ตัดไปแล้วจะไม่ถูกคืนเข้าสต๊อก")}
          description={t("ของเข้าเครื่องไปแล้ว ถ้ามีของเหลือจริงให้เปิดใบปรับปรุงสต๊อกโดยชั่งของจริงและมีคนอนุมัติ")}
        />
      ) : null}

      <div className={styles.cellStack}>
        <span className={styles.infoLabel}>
          {t("เหตุผลที่ยกเลิก")}
          {props.started
            ? ` (${t("บังคับ อย่างน้อย {min} ตัวอักษร", { min: CANCEL_REASON_MIN })})`
            : ` (${t("ไม่บังคับ")})`}
        </span>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("เช่น กดเริ่มผิดรอบ เครื่องยังไม่พร้อม")}
        />
      </div>

      <div className={styles.formActions}>
        <Button onClick={props.onCancel}>{t("ไม่ยกเลิก")}</Button>
        <Button
          danger
          type="primary"
          disabled={!ready}
          loading={props.loading}
          onClick={() =>
            props.onConfirm({ cancelReason: trimmed || undefined })
          }
        >
          {t("ยกเลิกรอบงาน")}
        </Button>
      </div>
    </>
  );
}

export function StageRunCancelModal(props: CancelModalProps) {
  const t = useT();
  return (
    <Modal
      open={props.open}
      title={`${t("ยกเลิกรอบงาน")} ${props.runNo}`}
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={520}
    >
      <CancelModalBody
        runNo={props.runNo}
        loading={props.loading}
        started={props.started}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </Modal>
  );
}
