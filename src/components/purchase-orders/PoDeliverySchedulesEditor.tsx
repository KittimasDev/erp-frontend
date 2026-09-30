"use client";

import { useLayoutEffect } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { FormInstance } from "antd/es/form";

import styles from "./PurchaseOrderFormPage.module.css";

const EPS = 0.0005;

export type ScheduleSourceLine = {
  purchaseRequestItemId: string;
  label: string;
  quantity: number;
  unitLabel: string;
};

type ScheduleLine = {
  purchaseRequestItemId: string;
  quantity?: number;
};

type ScheduleRound = {
  deliveryDate?: dayjs.Dayjs;
  items?: ScheduleLine[];
};

type Props = {
  form: FormInstance;
  sourceLines: ScheduleSourceLine[];
};

export function sumScheduledQty(
  rounds: ScheduleRound[] | undefined,
  purchaseRequestItemId: string,
) {
  return (rounds ?? []).reduce((sum, round) => {
    const line = (round.items ?? []).find(
      (item) => item.purchaseRequestItemId === purchaseRequestItemId,
    );
    return sum + Number(line?.quantity || 0);
  }, 0);
}

function itemsSignature(rounds: ScheduleRound[] | undefined) {
  return JSON.stringify(
    (rounds ?? []).map((round) =>
      (round.items ?? []).map(
        (item) =>
          `${item.purchaseRequestItemId}:${Number(item.quantity || 0)}`,
      ),
    ),
  );
}

/**
 * รอบเดียวต้องใส่จำนวนเท่ากับที่สั่ง — ถ้าฟอร์มยังเป็น 0 (nested list ไม่รับค่า)
 * ให้เติมจากบรรทัดที่เลือก รอบถัดไปที่เพิ่มเองคง 0 ไว้ให้ผู้ใช้แบ่งเอง
 */
function syncScheduleRounds(
  rounds: ScheduleRound[] | undefined,
  sourceLines: ScheduleSourceLine[],
): ScheduleRound[] {
  const existing = rounds?.length ? rounds : [{ items: [] as ScheduleLine[] }];
  const fillFullQty = existing.length === 1;

  return existing.map((round) => {
    const byId = new Map(
      (round.items ?? [])
        .filter((item) => item.purchaseRequestItemId)
        .map((item) => [item.purchaseRequestItemId, item]),
    );
    return {
      deliveryDate: round.deliveryDate,
      items: sourceLines.map((source) => {
        const prev = byId.get(source.purchaseRequestItemId);
        const prevQty = Number(prev?.quantity);
        const keep = Number.isFinite(prevQty) && prevQty > 0;
        return {
          purchaseRequestItemId: source.purchaseRequestItemId,
          quantity: keep ? prevQty : fillFullQty ? source.quantity : 0,
        };
      }),
    };
  });
}

export default function PoDeliverySchedulesEditor({
  form,
  sourceLines,
}: Props) {
  const rounds: ScheduleRound[] = Form.useWatch("deliverySchedules", form) ?? [];
  const sourceKey = sourceLines
    .map((line) => `${line.purchaseRequestItemId}:${line.quantity}`)
    .join("|");

  useLayoutEffect(() => {
    if (!sourceLines.length) {
      return;
    }
    const current = form.getFieldValue("deliverySchedules") as
      | ScheduleRound[]
      | undefined;
    const next = syncScheduleRounds(current, sourceLines);
    if (itemsSignature(current) === itemsSignature(next)) {
      return;
    }
    form.setFieldValue("deliverySchedules", next);
    // sourceKey แทน sourceLines เพื่อไม่ให้ array ใหม่ทุกเรนเดอร์ยิงซ้ำ
  }, [form, sourceKey, sourceLines]);

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>รอบจัดส่ง</h2>
        <p className={styles.sectionHint}>
          ต้องมีอย่างน้อย 1 รอบ และจำนวนรวมทุกรอบต้องเท่ากับจำนวนที่สั่ง
          — สินค้าหนึ่งรายการแบ่งหลายรอบได้ ค่ารอบแรกใส่ให้เท่ากับจำนวนที่สั่งแล้ว
        </p>
      </div>

      <Form.List name="deliverySchedules">
        {(fields, { add, remove }) => (
          <div className={styles.lineList}>
            {fields.map(({ key, name, ...restField }, index) => (
              <div key={key} className={styles.lineCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <strong>รอบที่ {index + 1}</strong>
                  {fields.length > 1 ? (
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    >
                      ลบรอบ
                    </Button>
                  ) : null}
                </div>
                <Form.Item
                  {...restField}
                  name={[name, "deliveryDate"]}
                  label="วันที่กำหนดส่ง"
                  rules={[{ required: true, message: "ระบุวันที่กำหนดส่ง" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <div>
                  {sourceLines.map((source, itemIndex) => {
                    const scheduled = sumScheduledQty(
                      rounds,
                      source.purchaseRequestItemId,
                    );
                    return (
                      <div
                        key={source.purchaseRequestItemId}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 160px",
                          gap: 12,
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Form.Item
                          name={[name, "items", itemIndex, "purchaseRequestItemId"]}
                          hidden
                        >
                          <Input />
                        </Form.Item>
                        <div>
                          <div>{source.label}</div>
                          <div className={styles.sectionHint}>
                            สั่ง {source.quantity} {source.unitLabel} ·
                            จัดแล้ว {scheduled.toFixed(3)} · เหลือจัด{" "}
                            {Math.max(0, source.quantity - scheduled).toFixed(
                              3,
                            )}
                          </div>
                        </div>
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Space.Compact style={{ width: "100%" }}>
                            <Form.Item
                              name={[name, "items", itemIndex, "quantity"]}
                              noStyle
                              rules={[
                                {
                                  validator: async (_, value) => {
                                    const qty = Number(value || 0);
                                    if (qty < 0) {
                                      throw new Error("จำนวนต้องไม่ติดลบ");
                                    }
                                    const others = sumScheduledQty(
                                      rounds.map((round, roundIndex) =>
                                        roundIndex === index
                                          ? {
                                              ...round,
                                              items: (round.items ?? []).map(
                                                (line) =>
                                                  line.purchaseRequestItemId ===
                                                  source.purchaseRequestItemId
                                                    ? { ...line, quantity: 0 }
                                                    : line,
                                              ),
                                            }
                                          : round,
                                      ),
                                      source.purchaseRequestItemId,
                                    );
                                    if (others + qty - source.quantity > EPS) {
                                      throw new Error(
                                        "จำนวนเกินที่ยังไม่ได้จัดลงรอบ",
                                      );
                                    }
                                  },
                                },
                              ]}
                            >
                              <InputNumber
                                min={0}
                                max={source.quantity}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                            {source.unitLabel ? (
                              <Input
                                disabled
                                value={source.unitLabel}
                                style={{ width: 80 }}
                              />
                            ) : null}
                          </Space.Compact>
                        </Form.Item>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                add({
                  deliveryDate: undefined,
                  items: sourceLines.map((line) => ({
                    purchaseRequestItemId: line.purchaseRequestItemId,
                    quantity: fields.length === 0 ? line.quantity : 0,
                  })),
                })
              }
            >
              เพิ่มรอบจัดส่ง
            </Button>
          </div>
        )}
      </Form.List>
    </div>
  );
}
