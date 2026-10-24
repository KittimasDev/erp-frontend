"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Radio,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import type {
  DeliverDeliveryOrderBody,
  DeliveryOrderItem,
  DeliveryResult,
} from "@/types/delivery-orders";
import { DELIVERY_RESULT_LABEL } from "@/types/delivery-orders";
import styles from "./DeliveryResultModal.module.css";

const QTY_EPSILON = 5e-4;

type Props = {
  open: boolean;
  items: DeliveryOrderItem[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (body: DeliverDeliveryOrderBody) => void;
};

export default function DeliveryResultModal(props: Props) {
  return (
    <Modal
      open={props.open}
      destroyOnHidden
      title="บันทึกผลการส่ง"
      footer={null}
      width={760}
      onCancel={props.onCancel}
    >
      {props.open ? <DeliveryResultBody {...props} /> : null}
    </Modal>
  );
}

type LineQty = { accepted: number; returned: number };

function DeliveryResultBody({ items, loading, onCancel, onConfirm }: Props) {
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [reason, setReason] = useState("");
  const [returnToStock, setReturnToStock] = useState<boolean | null>(null);
  const [redeliver, setRedeliver] = useState<boolean | null>(null);
  const [redeliverDate, setRedeliverDate] = useState<Dayjs | null>(null);
  const [lineQty, setLineQty] = useState<Record<string, LineQty>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        { accepted: Number(item.deliveredQty), returned: 0 },
      ]),
    ),
  );

  const isReturn = result === "FULL_RETURN" || result === "PARTIAL_RETURN";

  const effectiveQty = (item: DeliveryOrderItem): LineQty => {
    const shipped = Number(item.deliveredQty);
    if (result === "FULL_RETURN") return { accepted: 0, returned: shipped };
    return lineQty[item.id] ?? { accepted: shipped, returned: 0 };
  };

  const errors: string[] = [];
  if (!result) errors.push("กรุณาเลือกผลการส่ง");
  if (isReturn) {
    if (!reason.trim()) errors.push("กรุณาระบุเหตุผลการตีกลับ");
    if (returnToStock === null)
      errors.push("กรุณาเลือกว่าจะนำสินค้าคืนเข้าคลังหรือไม่");
    if (redeliver === null) errors.push("กรุณาเลือกว่าจะส่งใหม่หรือไม่");
    if (redeliver && !redeliverDate) errors.push("กรุณาระบุวันที่ต้องการส่งใหม่");
  }
  if (result === "PARTIAL_RETURN") {
    let totalAccepted = 0;
    let totalReturned = 0;
    for (const item of items) {
      const qty = effectiveQty(item);
      totalAccepted += qty.accepted;
      totalReturned += qty.returned;
      if (
        Math.abs(qty.accepted + qty.returned - Number(item.deliveredQty)) >
        QTY_EPSILON
      ) {
        errors.push(
          `${item.itemCode ?? item.itemNameTh ?? "รายการ"}: รับจริง + ตีกลับ ต้องเท่ากับจำนวนที่ส่ง`,
        );
      }
    }
    if (!(totalAccepted > QTY_EPSILON) || !(totalReturned > QTY_EPSILON)) {
      errors.push("ตีกลับบางส่วน — จำนวนรับจริงและจำนวนตีกลับต้องมากกว่า 0");
    }
  }

  const setAccepted = (item: DeliveryOrderItem, value: number) => {
    const shipped = Number(item.deliveredQty);
    const accepted = Math.min(Math.max(value, 0), shipped);
    setLineQty((prev) => ({
      ...prev,
      [item.id]: {
        accepted,
        returned: Number((shipped - accepted).toFixed(3)),
      },
    }));
  };

  const setReturned = (item: DeliveryOrderItem, value: number) => {
    const shipped = Number(item.deliveredQty);
    const returned = Math.min(Math.max(value, 0), shipped);
    setLineQty((prev) => ({
      ...prev,
      [item.id]: {
        accepted: Number((shipped - returned).toFixed(3)),
        returned,
      },
    }));
  };

  const columns: ColumnsType<DeliveryOrderItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "สินค้า",
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode ?? "—"}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: "จำนวนที่ส่ง",
      key: "shipped",
      align: "right",
      width: 110,
      render: (_v, item) =>
        `${Number(item.deliveredQty).toLocaleString("th-TH")} ${item.unitCode ?? ""}`,
    },
    {
      title: "รับจริง",
      key: "accepted",
      width: 130,
      render: (_v, item) => (
        <InputNumber
          min={0}
          max={Number(item.deliveredQty)}
          value={effectiveQty(item).accepted}
          disabled={result !== "PARTIAL_RETURN"}
          onChange={(v) => setAccepted(item, Number(v ?? 0))}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "ตีกลับ",
      key: "returned",
      width: 130,
      render: (_v, item) => (
        <InputNumber
          min={0}
          max={Number(item.deliveredQty)}
          value={effectiveQty(item).returned}
          disabled={result !== "PARTIAL_RETURN"}
          onChange={(v) => setReturned(item, Number(v ?? 0))}
          style={{ width: "100%" }}
        />
      ),
    },
  ];

  const submit = () => {
    if (!result || errors.length) return;
    if (!isReturn) {
      onConfirm({ result });
      return;
    }
    onConfirm({
      result,
      returnReason: reason.trim(),
      returnToStock: returnToStock ?? undefined,
      redeliver: redeliver ?? undefined,
      redeliverDate:
        redeliver && redeliverDate
          ? redeliverDate.format("YYYY-MM-DD")
          : undefined,
      items: items.map((item) => {
        const qty = effectiveQty(item);
        return {
          deliveryOrderItemId: item.id,
          acceptedQty: qty.accepted,
          returnedQty: qty.returned,
        };
      }),
    });
  };

  return (
    <div className={styles.body}>
      <div className={styles.field}>
        <span className={styles.label}>ผลการส่ง</span>
        <Radio.Group
          value={result}
          onChange={(e) => setResult(e.target.value as DeliveryResult)}
          optionType="button"
          buttonStyle="solid"
          options={(
            ["SUCCESS", "FULL_RETURN", "PARTIAL_RETURN"] as DeliveryResult[]
          ).map((value) => ({ value, label: DELIVERY_RESULT_LABEL[value] }))}
        />
      </div>

      {result === "SUCCESS" ? (
        <Alert
          type="success"
          showIcon
          title="ลูกค้ารับสินค้าครบตามจำนวนที่ส่ง"
          description="รอบจัดส่งจะเป็นส่งแล้ว — ไม่มีการตัดสต๊อกในขั้นตอนนี้"
        />
      ) : null}

      {isReturn ? (
        <>
          <label className={styles.field}>
            <span className={styles.label}>
              เหตุผลการตีกลับ <span className={styles.required}>*</span>
            </span>
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={reason}
              placeholder="เช่น สินค้าเสียหาย / ลูกค้าไม่อยู่รับ"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={items}
          />

          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>
                สินค้าที่ตีกลับ <span className={styles.required}>*</span>
              </span>
              <Radio.Group
                value={returnToStock}
                onChange={(e) => setReturnToStock(e.target.value as boolean)}
                options={[
                  { value: true, label: "นำสินค้าคืนเข้าคลัง" },
                  { value: false, label: "ไม่นำเข้าคลัง" },
                ]}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>
                ต้องส่งสินค้าใหม่หรือไม่ <span className={styles.required}>*</span>
              </span>
              <Radio.Group
                value={redeliver}
                onChange={(e) => setRedeliver(e.target.value as boolean)}
                options={[
                  { value: true, label: "ส่งใหม่" },
                  { value: false, label: "ไม่ส่งใหม่" },
                ]}
              />
            </div>
          </div>

          {redeliver ? (
            <label className={styles.field}>
              <span className={styles.label}>
                วันที่ต้องการส่งใหม่ <span className={styles.required}>*</span>
              </span>
              <DatePicker
                value={redeliverDate}
                onChange={setRedeliverDate}
                format="DD/MM/YYYY"
                disabledDate={(d) => d.isBefore(dayjs(), "day")}
                style={{ width: 220 }}
              />
              <span className={styles.hint}>
                {returnToStock === false
                  ? "ระบบจะสร้างใบส่งสินค้าใหม่ (ร่าง) ด้วยจำนวนที่ตีกลับ ลงวันที่ส่งใหม่ — ไม่จ่าย/บรรจุใหม่ ไม่ตัดสต๊อกซ้ำ"
                  : "ระบบจะสร้างรอบจัดส่งใหม่ของ SO ด้วยจำนวนที่ตีกลับ แล้วไปจ่าย/บรรจุ/ส่งตามปกติ"}
              </span>
            </label>
          ) : redeliver === false ? (
            <Alert
              type="warning"
              showIcon
              title={
                "ไม่ส่งใหม่ — จำนวนที่ตีกลับปิดการส่ง ไม่ค้างส่ง และไม่ลดยอดเงินใบสั่งขาย ระบบเปิดคิวใบลดหนี้ให้กรอกจำนวนกับราคาเอง"
              }
            />
          ) : null}

          {returnToStock ? (
            <Alert
              type="info"
              showIcon
              title="ระบบจะสร้างใบคืนสินค้า (รออนุมัติ) เฉพาะจำนวนที่ตีกลับ — อนุมัติแล้วสินค้าเข้าคลังตรวจสอบ"
            />
          ) : null}
        </>
      ) : null}

      {result && errors.length ? (
        <ul className={styles.errors}>
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.actions}>
        <Button onClick={onCancel}>ปิด</Button>
        <Button
          type="primary"
          loading={loading}
          disabled={!result || errors.length > 0}
          onClick={submit}
        >
          บันทึกผลการส่ง
        </Button>
      </div>
    </div>
  );
}
