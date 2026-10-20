"use client";

import { useMemo } from "react";
import { Button, Checkbox, Form, Input, InputNumber, Select, Tag } from "antd";
import type { FormInstance } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { calcChargeTotals, sumChargeTotals } from "@/lib/money/vat-totals";
import {
  PO_CHARGE_TYPE_LABEL,
  type PurchaseOrderCharge,
  type PurchaseOrderChargeBody,
} from "@/types/purchase-orders";

import styles from "./PurchaseOrderFormPage.module.css";

/** ค่าในฟอร์มของค่าใช้จ่ายหนึ่งรายการ (ชื่อ _snap* = ค่า snapshot ที่บันทึกไว้เดิม ไม่ส่งกลับ backend) */
export type ChargeFormRow = {
  id?: string;
  chargeType?: string;
  description?: string;
  amountBeforeVat?: number;
  taxRateId?: string | null;
  whtApplicable?: boolean;
  whtIncomeType?: string;
  whtRate?: number;
  _snapRateId?: string | null;
  _snapRate?: number;
  /** ยอดก่อน VAT ที่ตั้งหนี้แล้ว (ล็อกการลบ/ลดยอดต่ำกว่านี้) */
  _allocated?: number;
};

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CHARGE_TYPE_OPTIONS = Object.entries(PO_CHARGE_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

/** แปลงค่าที่ backend ส่งมา (หน้าแก้ไข) เป็นค่าในฟอร์ม */
export function chargesToFormRows(charges: PurchaseOrderCharge[] | undefined): ChargeFormRow[] {
  return (charges ?? []).map((c) => ({
    id: c.id,
    chargeType: c.chargeType,
    description: c.description,
    amountBeforeVat: Number(c.amountBeforeVat),
    taxRateId: c.taxRateId ?? null,
    whtApplicable: c.whtApplicable,
    whtIncomeType: c.whtIncomeType ?? undefined,
    whtRate: Number(c.whtRate) || undefined,
    _snapRateId: c.taxRateId ?? null,
    _snapRate: Number(c.taxRatePercent),
    _allocated: c.allocatedAmount,
  }));
}

/** แถวในฟอร์ม → body ที่ส่ง backend */
export function chargeRowsToBody(rows: ChargeFormRow[] | undefined): PurchaseOrderChargeBody[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    chargeType: row.chargeType as string,
    description: (row.description ?? "").trim(),
    amountBeforeVat: Number(row.amountBeforeVat) || 0,
    taxRateId: row.taxRateId || null,
    whtApplicable: Boolean(row.whtApplicable),
    whtIncomeType: row.whtApplicable ? row.whtIncomeType?.trim() || null : null,
    whtRate: row.whtApplicable ? Number(row.whtRate) || 0 : 0,
  }));
}

/** อัตรา VAT ของแถว: ไม่เปลี่ยน tax rate จากที่บันทึกไว้ → ใช้ snapshot เดิม ไม่งั้นอ่านจาก master */
function rowRate(
  row: ChargeFormRow,
  masterRate: (id?: string | null) => number,
): number {
  if (row.taxRateId && row._snapRateId === row.taxRateId && row._snapRate !== undefined) {
    return row._snapRate;
  }
  return masterRate(row.taxRateId);
}

/** ยอดรวมค่าใช้จ่ายสำหรับสรุปยอดท้ายฟอร์ม */
export function usePoChargesPreview(rows: ChargeFormRow[] | undefined) {
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const taxRates = taxRatesQuery.data?.data;
  return useMemo(() => {
    const rateOf = (id?: string | null) =>
      id ? Number(taxRates?.find((t) => t.id === id)?.rate ?? 0) : 0;
    const sum = sumChargeTotals(
      (rows ?? []).map((row) => ({
        amountBeforeVat: Number(row?.amountBeforeVat) || 0,
        taxRatePercent: rowRate(row ?? {}, rateOf),
      })),
    );
    return { amountBeforeVat: sum.amountBeforeVat, vat: sum.vat, total: sum.total };
  }, [rows, taxRates]);
}

type Props = {
  form: FormInstance;
  disabled?: boolean;
};

/**
 * Section "ค่าใช้จ่ายเพิ่มเติม" ของใบสั่งซื้อ — แยกจากรายการสินค้า
 * ไม่เข้าสต๊อก/Lot ไม่รวมในราคาต่อหน่วย · VAT คิดต่อรายการตามอัตราที่เลือก (Tax Rate master)
 * รายการที่ตั้งหนี้แล้ว (มี _allocated) ลบไม่ได้และลดยอดต่ำกว่ายอดที่ตั้งไม่ได้
 */
export default function PoChargesEditor({ form, disabled }: Props) {
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const taxRates = useMemo(() => taxRatesQuery.data?.data ?? [], [taxRatesQuery.data]);
  const watched = (Form.useWatch("charges", form) ?? []) as ChargeFormRow[];
  const rateOf = (id?: string | null) =>
    id ? Number(taxRates.find((t) => t.id === id)?.rate ?? 0) : 0;

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>ค่าใช้จ่ายเพิ่มเติม</h2>
        <p className={styles.sectionHint}>
          ค่าขนส่ง ค่าบริการ หรือค่าใช้จ่ายอื่น ๆ ของ Supplier รายนี้ — แยกจากรายการสินค้า ไม่เข้าสต๊อก/Lot
          และแบ่งไปตั้งหนี้ในแต่ละใบตั้งหนี้ได้ภายหลัง
        </p>
      </div>
      <Form.List name="charges">
        {(fields, { add, remove }) => (
          <div>
            {fields.map((field, index) => {
              const row = watched[index] ?? {};
              const totals = calcChargeTotals(
                Number(row.amountBeforeVat) || 0,
                rowRate(row, rateOf),
              );
              const allocated = row._allocated ?? 0;
              const locked = allocated > 0;
              return (
                <div key={field.key} className={styles.lineCard}>
                  <div className={styles.lineCardHeader}>
                    <strong>ค่าใช้จ่ายรายการที่ {index + 1}</strong>
                    <span>
                      {locked ? (
                        <Tag color="gold">ตั้งหนี้แล้ว {money(allocated)}</Tag>
                      ) : null}
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={disabled || locked}
                        onClick={() => remove(field.name)}
                        aria-label={`ลบค่าใช้จ่ายรายการที่ ${index + 1}`}
                      />
                    </span>
                  </div>
                  <Form.Item name={[field.name, "id"]} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={[field.name, "_snapRateId"]} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={[field.name, "_snapRate"]} hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item name={[field.name, "_allocated"]} hidden>
                    <InputNumber />
                  </Form.Item>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <Form.Item
                      name={[field.name, "chargeType"]}
                      label="ประเภทค่าใช้จ่าย"
                      rules={[{ required: true, message: "เลือกประเภท" }]}
                    >
                      <Select options={CHARGE_TYPE_OPTIONS} placeholder="เลือกประเภท" disabled={disabled} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "description"]}
                      label="รายละเอียดค่าใช้จ่าย"
                      rules={[{ required: true, whitespace: true, message: "ระบุรายละเอียด" }]}
                    >
                      <Input maxLength={500} placeholder="เช่น ค่าขนส่งจากโรงงานถึงคลัง" disabled={disabled} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "amountBeforeVat"]}
                      label="จำนวนเงินก่อน VAT"
                      rules={[
                        { required: true, message: "ระบุจำนวนเงิน" },
                        {
                          validator: (_, value?: number) =>
                            locked && value !== undefined && value < allocated - 0.004
                              ? Promise.reject(new Error(`ต่ำกว่ายอดที่ตั้งหนี้แล้ว ${money(allocated)}`))
                              : Promise.resolve(),
                        },
                      ]}
                    >
                      <InputNumber
                        min={0.01}
                        precision={2}
                        style={{ width: "100%" }}
                        disabled={disabled}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "taxRateId"]}
                      label="อัตรา VAT (Tax Rate)"
                      tooltip="ไม่เลือก = ไม่มี VAT · อัตราดึงจาก Tax Rate master"
                    >
                      <Select
                        allowClear
                        placeholder="ไม่มี VAT"
                        disabled={disabled || locked}
                        loading={taxRatesQuery.isLoading}
                        options={taxRates.map((t) => ({
                          value: t.id,
                          label: `${t.name} (${Number(t.rate)}%)`,
                        }))}
                      />
                    </Form.Item>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 8 }}>
                    <Form.Item name={[field.name, "whtApplicable"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Checkbox disabled={disabled}>มีภาษีหัก ณ ที่จ่าย</Checkbox>
                    </Form.Item>
                    {row.whtApplicable ? (
                      <>
                        <Form.Item
                          name={[field.name, "whtRate"]}
                          label="อัตราหัก (%)"
                          style={{ marginBottom: 0 }}
                          rules={[{ required: true, message: "ระบุอัตรา" }]}
                        >
                          <InputNumber min={0.01} max={100} precision={2} disabled={disabled} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "whtIncomeType"]}
                          label="ประเภทเงินได้"
                          style={{ marginBottom: 0 }}
                        >
                          <Input maxLength={100} placeholder="เช่น ค่าขนส่ง" style={{ width: 220 }} disabled={disabled} />
                        </Form.Item>
                      </>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    VAT {money(totals.vat)} · รวม <strong>{money(totals.total)}</strong>
                  </div>
                </div>
              );
            })}
            <Button
              icon={<PlusOutlined />}
              disabled={disabled}
              onClick={() => add({ chargeType: "FREIGHT", whtApplicable: false })}
            >
              เพิ่มค่าใช้จ่าย
            </Button>
          </div>
        )}
      </Form.List>
    </div>
  );
}
