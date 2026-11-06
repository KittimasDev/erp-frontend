"use client";

import { useMemo } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { calcLineAmount, calcDocumentTotals, resolveVatMode } from "@/lib/money/vat-totals";
import type {
  SalesOrder,
  UpdateSalesOrderItemsBody,
} from "@/types/sales-orders";
import { tSoStatus } from "@/types/sales-orders";
import { useT } from "@/lib/i18n/useT";
import styles from "./SalesOrderItemsEditModal.module.css";

/**
 * แก้รายการสินค้าของใบสั่งขาย — **เปิดได้เฉพาะตอนใบยังเป็นร่าง / รอยืนยัน**
 *
 * เดิมรายการสินค้าล็อกตามใบเสนอราคาและแก้ไม่ได้เลย · เจ้าของระบบสั่งเปิด (2026-09-07)
 * ให้แก้จำนวน ราคา ส่วนลด และเพิ่ม/ลบบรรทัดได้ระหว่างเป็นร่าง
 * **การแก้ตอนร่างไม่ทำให้เลขฉบับขยับ** — ยังเป็น "ฉบับ 0" เสมอ
 *
 * แพตเทิร์นฟอร์มลอกจาก `QuotationFormPage` ซึ่งเป็นฟอร์มแก้รายการที่มีอยู่แล้วในโปรเจกต
 * ใช้ `destroyOnHidden` แล้วตั้งค่าเริ่มต้นผ่าน `initialValues` — ปิดแล้วเปิดใหม่ได้ค่าสด
 * ไม่ต้องมี effect มา sync ซึ่งเป็นทางที่ทำให้สิ่งที่ผู้ใช้พิมพ์อยู่หายตอน refetch
 */

type FormLine = {
  id?: string;
  itemId?: string;
  unitId?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
};

type FormValues = {
  items: FormLine[];
  discountAmount?: number;
};

type Props = {
  open: boolean;
  order: SalesOrder;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (body: UpdateSalesOrderItemsBody) => void;
};

function fmtMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesOrderItemsEditModal(props: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();

  const itemsQuery = useItemsQuery({
    isActive: true,
    isFinishedGood: true,
    isSalesItem: true,
  });
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  // dropdown หน่วยเสนอเท่าที่ backend รับได้ = หน่วยหลักของสินค้า
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("SALES_ORDERS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);

  const itemOptions = useMemo(
    () =>
      items.map((row) => ({
        value: row.id,
        label: `${row.itemCode} — ${row.itemNameTh ?? ""}`,
      })),
    [items],
  );

  const initialValues = useMemo<FormValues>(
    () => ({
      items: props.order.items.map((row) => ({
        id: row.id,
        itemId: row.itemId,
        unitId: row.unitId,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        discountAmount: Number(row.discountAmount) || 0,
        description: row.description ?? undefined,
      })),
      discountAmount: Number(props.order.discountAmount) || 0,
    }),
    [props.order],
  );

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form);

  /*
    ยอดฝั่งหน้าจอเป็นแค่ตัวอย่างให้เห็นก่อนกดบันทึก — server คิดใหม่เสมอ
    ใช้สูตรตัวเดียวกับที่ backend ใช้ (`vat-totals`) ตัวเลขจะได้ไม่หลอกตา
  */
  const preview = useMemo(() => {
    const lineAmounts = watchedItems.map((line) =>
      calcLineAmount(
        Number(line?.quantity) || 0,
        Number(line?.unitPrice) || 0,
        Number(line?.discountAmount) || 0,
      ),
    );
    const totals = calcDocumentTotals(
      lineAmounts,
      Number(watchedDiscount) || 0,
      resolveVatMode(props.order.vatMode),
      0,
    );
    return { lineAmounts, ...totals };
  }, [watchedItems, watchedDiscount, props.order.vatMode]);

  const handleItemChange = (index: number, itemId: string) => {
    const picked = items.find((row) => row.id === itemId);
    const current = form.getFieldValue("items") as FormLine[];
    const next = [...current];
    next[index] = {
      ...next[index],
      itemId,
      // เปลี่ยนสินค้าแล้วหน่วยเดิมอาจไม่ใช่หน่วยของสินค้าใหม่ ตั้งเป็นหน่วยหลักให้
      unitId: picked?.unitId,
    };
    form.setFieldValue("items", next);
  };

  const submit = async () => {
    const values = await form.validateFields();
    props.onSubmit({
      items: values.items.map((line, index) => ({
        id: line.id,
        itemId: line.itemId as string,
        unitId: line.unitId as string,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountAmount: Number(line.discountAmount) || 0,
        description: line.description,
        sortOrder: index,
      })),
      discountAmount:
        values.discountAmount === undefined
          ? undefined
          : Number(values.discountAmount),
    });
  };

  return (
    <Modal
      open={props.open}
      title={t("แก้ไขรายการสินค้า — {soNo}", { soNo: props.order.soNo })}
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={880}
    >
      <Alert
        className={styles.notice}
        type="info"
        showIcon
        title={t("แก้ได้เฉพาะตอนใบยังไม่ยืนยัน และไม่ทำให้เลขฉบับเปลี่ยน")}
        description={t("ระบบจะปรับรอบจัดส่ง คืนการจองสต๊อก แล้วคิดยอดใหม่ให้อัตโนมัติ · บรรทัดที่ลบออกจะถูกเอาออกจากรอบจัดส่งด้วย")}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        requiredMark={false}
      >
        <Form.List
          name="items"
          rules={[
            {
              validator: async (_, value: FormLine[]) => {
                if (!value?.length) {
                  throw new Error(t("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ"));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <div key={field.key} className={styles.lineCard}>
                  <div className={styles.lineHead}>
                    <span className={styles.lineIndex}>{index + 1}</span>
                    {fields.length > 1 ? (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        {t("ลบ")}
                      </Button>
                    ) : null}
                  </div>

                  <div className={styles.lineGrid}>
                    <Form.Item
                      name={[field.name, "itemId"]}
                      label={t("สินค้า")}
                      rules={[{ required: true, message: t("เลือกสินค้า") }]}
                      className={styles.fieldWide}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={t("เลือกสินค้า")}
                        loading={itemsQuery.isLoading}
                        options={itemOptions}
                        onChange={(value: string) =>
                          handleItemChange(index, value)
                        }
                      />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "quantity"]}
                      label={t("จำนวน")}
                      rules={[
                        { required: true, message: t("กรอกจำนวน") },
                        {
                          validator: async (_, value) => {
                            if (!(Number(value) > 0)) {
                              throw new Error(t("จำนวนต้องมากกว่า 0"));
                            }
                          },
                        },
                      ]}
                    >
                      <InputNumber
                        min={0.001}
                        step={0.001}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "unitId"]}
                      label={t("หน่วย")}
                      rules={[{ required: true, message: t("เลือกหน่วย") }]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="title"
                        {...resolveUnitField(
                          watchedItems[field.name]?.itemId,
                          watchedItems[field.name]?.unitId,
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "unitPrice"]}
                      label={t("ราคา/หน่วย")}
                      rules={[{ required: true, message: t("กรอกราคา") }]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "discountAmount"]}
                      label={t("ส่วนลดรายการ")}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <div className={styles.lineAmount}>
                      <span>{t("จำนวนเงิน")}</span>
                      <strong>
                        {fmtMoney(preview.lineAmounts[index] ?? 0)}
                      </strong>
                    </div>
                  </div>

                  <Form.Item
                    name={[field.name, "description"]}
                    label={t("รายละเอียด")}
                  >
                    <Input maxLength={500} placeholder={t("ไม่กรอกจะใช้ชื่อสินค้า")} />
                  </Form.Item>
                </div>
              ))}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ discountAmount: 0 })}
              >
                {t("เพิ่มรายการ")}
              </Button>
              <Form.ErrorList errors={errors} />
            </>
          )}
        </Form.List>

        <div className={styles.footerGrid}>
          <Form.Item name="discountAmount" label={t("ส่วนลดท้ายบิล")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <div className={styles.totals}>
            <div>
              <span>{t("รวมเป็นเงิน")}</span>
              <strong>{fmtMoney(preview.subtotal)}</strong>
            </div>
            <div>
              <span>{t("หลังหักส่วนลด")}</span>
              <strong>{fmtMoney(preview.afterDiscount)}</strong>
            </div>
            <p className={styles.totalsHint}>
              {t("ยอดจริงรวม VAT ระบบคิดใหม่ตอนบันทึก")}
            </p>
          </div>
        </div>
      </Form>

      <div className={styles.actions}>
        <Button onClick={props.onCancel}>{tSoStatus("ยกเลิก")}</Button>
        <Button type="primary" loading={props.loading} onClick={() => void submit()}>
          {t("บันทึกรายการ")}
        </Button>
      </div>
    </Modal>
  );
}
