"use client";

import { Button, DatePicker, Form, InputNumber } from "antd";
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

export default function PoDeliverySchedulesEditor({
  form,
  sourceLines,
}: Props) {
  const rounds: ScheduleRound[] = Form.useWatch("deliverySchedules", form) ?? [];

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>รอบจัดส่ง</h2>
        <p className={styles.sectionHint}>
          ต้องมีอย่างน้อย 1 รอบ และจำนวนรวมทุกรอบต้องเท่ากับจำนวนที่สั่ง
          — สินค้าหนึ่งรายการแบ่งหลายรอบได้
        </p>
      </div>

      <Form.List name="deliverySchedules">
        {(fields, { add, remove }) => (
          <div className={styles.lineList}>
            {fields.map((field, index) => (
              <div key={field.key} className={styles.lineCard}>
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
                      onClick={() => remove(field.name)}
                    >
                      ลบรอบ
                    </Button>
                  ) : null}
                </div>
                <Form.Item
                  {...field}
                  name={[field.name, "deliveryDate"]}
                  label="วันที่กำหนดส่ง"
                  rules={[{ required: true, message: "ระบุวันที่กำหนดส่ง" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <Form.List name={[field.name, "items"]}>
                  {(itemFields) => (
                    <div>
                      {itemFields.map((itemField, itemIndex) => {
                        const line = rounds[index]?.items?.[itemIndex];
                        const source = sourceLines.find(
                          (item) =>
                            item.purchaseRequestItemId ===
                            line?.purchaseRequestItemId,
                        );
                        if (!source) {
                          return null;
                        }
                        const scheduled = sumScheduledQty(
                          rounds,
                          source.purchaseRequestItemId,
                        );
                        const leftover = Math.max(
                          0,
                          source.quantity - scheduled + EPS,
                        );
                        return (
                          <div
                            key={itemField.key}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 160px",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Form.Item
                              {...itemField}
                              name={[itemField.name, "purchaseRequestItemId"]}
                              hidden
                            >
                              <input />
                            </Form.Item>
                            <div>
                              <div>{source.label}</div>
                              <div className={styles.sectionHint}>
                                สั่ง {source.quantity} {source.unitLabel} ·
                                จัดแล้ว {scheduled.toFixed(3)} · เหลือจัด{" "}
                                {Math.max(0, source.quantity - scheduled).toFixed(3)}
                              </div>
                            </div>
                            <Form.Item
                              {...itemField}
                              name={[itemField.name, "quantity"]}
                              style={{ marginBottom: 0 }}
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
                                                (line, lineIndex) =>
                                                  lineIndex === itemIndex
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
                                addonAfter={source.unitLabel}
                              />
                            </Form.Item>
                            <span style={{ display: "none" }}>{leftover}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Form.List>
              </div>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                add({
                  deliveryDate: undefined,
                  items: sourceLines.map((line) => ({
                    purchaseRequestItemId: line.purchaseRequestItemId,
                    quantity: 0,
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
