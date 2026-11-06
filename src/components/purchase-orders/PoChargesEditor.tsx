"use client";

import { useMemo } from "react";
import { Button, Form, Input, InputNumber, Select, Tag } from "antd";
import type { FormInstance } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useExpenseTypesQuery } from "@/hooks/expense-types/useExpenseTypes";
import { tNow, useT } from "@/lib/i18n/useT";
import {
  STANDARD_VAT_PERCENT,
  VAT_MODE_OPTIONS,
  VatMode,
  WITHHOLDING_TAX_TYPE_OPTIONS,
  WithholdingTaxType,
  calcChargeTotals,
  resolveVatMode,
  resolveWithholdingPercent,
  resolveWithholdingTaxType,
  sumChargeTotals,
} from "@/lib/money/vat-totals";
import {
  PO_CHARGE_TYPE_LABEL,
  type PurchaseOrderCharge,
  type PurchaseOrderChargeBody,
} from "@/types/purchase-orders";

import styles from "./PurchaseOrderFormPage.module.css";

/** ค่าในฟอร์มของค่าใช้จ่ายหนึ่งรายการ (ชื่อ _snap* / _allocated = client-only) */
export type ChargeFormRow = {
  id?: string;
  /** แบบเดิม (FREIGHT/SERVICE/OTHER) — ใช้เมื่อไม่ได้เลือกประเภทค่าใช้จ่ายจาก Master */
  chargeType?: string;
  /** ประเภทค่าใช้จ่ายจาก Master — มี = backend กำหนด chargeType ให้ และสมุดรายวันใช้ GL ของประเภทนี้ */
  expenseTypeId?: string;
  _expenseTypeName?: string;
  description?: string;
  /** ยอดที่ผู้ใช้กรอก — EXCLUSIVE/NONE = ก่อน VAT, INCLUSIVE = รวม VAT */
  amountBeforeVat?: number;
  vatMode?: VatMode;
  withholdingTaxType?: WithholdingTaxType;
  whtIncomeType?: string;
  whtRate?: number;
  _allocated?: number;
};

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CHARGE_TYPE_OPTIONS = Object.entries(PO_CHARGE_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

function amountFieldLabel(vatMode?: string | null): string {
  const mode = resolveVatMode(vatMode);
  if (mode === VatMode.NONE) return tNow("จำนวนเงิน");
  if (mode === VatMode.INCLUSIVE) return tNow("จำนวนเงินรวม VAT");
  return tNow("จำนวนเงินก่อน VAT");
}

function deriveWithholdingTaxType(
  applicable: boolean,
  rate: number,
): WithholdingTaxType {
  if (!applicable || !(rate > 0)) return WithholdingTaxType.NONE;
  if (Math.abs(rate - 1) < 0.001) return WithholdingTaxType.PCT_1;
  if (Math.abs(rate - 3) < 0.001) return WithholdingTaxType.PCT_3;
  return WithholdingTaxType.CUSTOM;
}

function chargeVatPercent(vatMode?: string | null): number {
  return resolveVatMode(vatMode) === VatMode.NONE ? 0 : STANDARD_VAT_PERCENT;
}

/** แปลงค่าที่ backend ส่งมา (หน้าแก้ไข) เป็นค่าในฟอร์ม */
export function chargesToFormRows(charges: PurchaseOrderCharge[] | undefined): ChargeFormRow[] {
  return (charges ?? []).map((c) => {
    const vatMode = resolveVatMode(c.vatMode);
    const whtType = deriveWithholdingTaxType(c.whtApplicable, Number(c.whtRate) || 0);
    return {
      id: c.id,
      chargeType: c.chargeType,
      expenseTypeId: c.expenseTypeId ?? undefined,
      _expenseTypeName: c.expenseTypeName ?? undefined,
      description: c.description,
      amountBeforeVat:
        vatMode === VatMode.INCLUSIVE ? Number(c.totalAmount) : Number(c.amountBeforeVat),
      vatMode,
      withholdingTaxType: whtType,
      whtIncomeType: c.whtIncomeType ?? undefined,
      whtRate: whtType === WithholdingTaxType.CUSTOM ? Number(c.whtRate) || undefined : undefined,
      _allocated: c.allocatedAmount,
    };
  });
}

/** แถวในฟอร์ม → body ที่ส่ง backend */
export function chargeRowsToBody(rows: ChargeFormRow[] | undefined): PurchaseOrderChargeBody[] {
  return (rows ?? []).map((row) => {
    const whtType = resolveWithholdingTaxType(row.withholdingTaxType);
    const whtRate = resolveWithholdingPercent(whtType, row.whtRate);
    const whtApplicable = whtType !== WithholdingTaxType.NONE && whtRate > 0;
    return {
      id: row.id,
      // มีประเภทจาก Master → ให้ backend กำหนด chargeType เอง (กันสองฟิลด์ขัดกัน) · ล้างประเภท = ส่ง null
      ...(row.expenseTypeId
        ? { expenseTypeId: row.expenseTypeId }
        : { expenseTypeId: null, chargeType: row.chargeType as string }),
      description: (row.description ?? "").trim(),
      amountBeforeVat: Number(row.amountBeforeVat) || 0,
      vatMode: resolveVatMode(row.vatMode),
      whtApplicable,
      whtIncomeType: whtApplicable ? row.whtIncomeType?.trim() || null : null,
      whtRate: whtApplicable ? whtRate : 0,
    };
  });
}

/** ยอดรวมค่าใช้จ่ายสำหรับสรุปยอดท้ายฟอร์ม */
export function usePoChargesPreview(rows: ChargeFormRow[] | undefined) {
  return useMemo(() => {
    const sum = sumChargeTotals(
      (rows ?? []).map((row) => ({
        amountBeforeVat: Number(row?.amountBeforeVat) || 0,
        taxRatePercent: chargeVatPercent(row?.vatMode),
        vatMode: resolveVatMode(row?.vatMode),
      })),
    );
    return { amountBeforeVat: sum.amountBeforeVat, vat: sum.vat, total: sum.total };
  }, [rows]);
}

type Props = {
  form: FormInstance;
  disabled?: boolean;
};

/**
 * Section "ค่าใช้จ่ายเพิ่มเติม" ของใบสั่งซื้อ — แยกจากรายการสินค้า
 * VAT ต่อรายการแบบหัว PO (ไม่คิด / ไม่รวม / รวม · 7%) · WHT เป็นประเภทไม่ระบุ/1%/3%/กำหนดเอง
 */
export default function PoChargesEditor({ form, disabled }: Props) {
  const t = useT();
  const watched = (Form.useWatch("charges", form) ?? []) as ChargeFormRow[];
  const expenseTypesQuery = useExpenseTypesQuery({ isActive: true });
  const activeTypes = expenseTypesQuery.data ?? [];
  const defaultExpenseType =
    activeTypes.find((et) => et.code === "FREIGHT") ?? activeTypes[0];

  /** ตัวเลือกของแถว: ประเภทที่เปิดใช้งาน + ประเภทที่แถวนี้ใช้อยู่แล้วแม้ถูกปิดไปภายหลัง (ไม่ให้ค่าเดิมหาย) */
  const optionsFor = (row: ChargeFormRow) => {
    const options = activeTypes.map((et) => ({
      value: et.id,
      label: `${et.code} — ${et.nameTh}${et.glAccountId ? "" : ` ${t("(ยังไม่ผูก GL)")}`}`,
    }));
    if (row.expenseTypeId && !options.some((o) => o.value === row.expenseTypeId)) {
      options.push({
        value: row.expenseTypeId,
        label: `${row._expenseTypeName ?? t("ประเภทเดิม")} ${t("(ปิดใช้งาน)")}`,
      });
    }
    return options;
  };

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.chargeHead}>
        <h2 className={styles.sectionTitle}>{t("ค่าใช้จ่ายเพิ่มเติม")}</h2>
        <p className={styles.sectionHint}>
          {t(
            "ค่าขนส่ง ค่าบริการ หรือค่าใช้จ่ายอื่น ๆ ของ Supplier รายนี้ — แยกจากรายการสินค้า ไม่เข้าสต๊อก/Lot และแบ่งไปตั้งหนี้ในแต่ละใบตั้งหนี้ได้ภายหลัง",
          )}
        </p>
      </div>
      <Form.List name="charges">
        {(fields, { add, remove }) => (
          <div className={styles.chargeList}>
            {fields.map((field, index) => {
              const row = watched[index] ?? {};
              const vatMode = resolveVatMode(row.vatMode);
              const whtType = resolveWithholdingTaxType(row.withholdingTaxType);
              const totals = calcChargeTotals(
                Number(row.amountBeforeVat) || 0,
                chargeVatPercent(vatMode),
                vatMode,
              );
              const allocated = row._allocated ?? 0;
              const locked = allocated > 0;
              return (
                <div key={field.key} className={styles.chargeCard}>
                  <div className={styles.chargeCardHeader}>
                    <strong>{t("ค่าใช้จ่ายรายการที่ {n}", { n: index + 1 })}</strong>
                    <span>
                      {locked ? (
                        <Tag color="gold">
                          {t("ตั้งหนี้แล้ว {amount}", { amount: money(allocated) })}
                        </Tag>
                      ) : null}
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={disabled || locked}
                        onClick={() => remove(field.name)}
                        aria-label={t("ลบค่าใช้จ่ายรายการที่ {n}", { n: index + 1 })}
                      />
                    </span>
                  </div>
                  <Form.Item name={[field.name, "id"]} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={[field.name, "_allocated"]} hidden>
                    <InputNumber />
                  </Form.Item>
                  <div className={styles.chargeFields}>
                    <Form.Item
                      name={[field.name, "expenseTypeId"]}
                      label={t("ประเภทค่าใช้จ่าย")}
                      extra={
                        locked
                          ? t("ล็อกแล้ว — มีการนำไปตั้งหนี้")
                          : row.expenseTypeId
                            ? t("สมุดรายวันซื้อใช้บัญชี GL ของประเภทนี้")
                            : t("ไม่เลือก = ใช้ประเภทแบบเดิมด้านล่าง")
                      }
                      rules={[
                        {
                          validator: (_, value?: string) =>
                            value || row.chargeType
                              ? Promise.resolve()
                              : Promise.reject(new Error(t("เลือกประเภท"))),
                        },
                      ]}
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={optionsFor(row)}
                        loading={expenseTypesQuery.isLoading}
                        placeholder={t("เลือกประเภทค่าใช้จ่าย")}
                        disabled={disabled || locked}
                        onChange={(value?: string) => {
                          const type = activeTypes.find((et) => et.id === value);
                          form.setFieldValue(
                            ["charges", field.name, "_expenseTypeName"],
                            type?.nameTh,
                          );
                          // ล้างประเภท → กลับไปใช้ chargeType แบบเดิม (ตั้งค่าตั้งต้นให้เลือกต่อได้ทันที)
                          if (!value && !row.chargeType) {
                            form.setFieldValue(["charges", field.name, "chargeType"], "FREIGHT");
                          }
                        }}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "_expenseTypeName"]} hidden>
                      <Input />
                    </Form.Item>
                    {!row.expenseTypeId ? (
                      <Form.Item
                        name={[field.name, "chargeType"]}
                        label={t("ประเภท (แบบเดิม)")}
                        rules={[{ required: true, message: t("เลือกประเภท") }]}
                      >
                        <Select
                          options={CHARGE_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                          placeholder={t("เลือกประเภท")}
                          disabled={disabled || locked}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item
                      name={[field.name, "description"]}
                      label={t("รายละเอียดค่าใช้จ่าย")}
                      rules={[{ required: true, whitespace: true, message: t("ระบุรายละเอียด") }]}
                    >
                      <Input
                        maxLength={500}
                        placeholder={t("เช่น ค่าขนส่งจากโรงงานถึงคลัง")}
                        disabled={disabled}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "amountBeforeVat"]}
                      label={amountFieldLabel(vatMode)}
                      rules={[
                        { required: true, message: t("ระบุจำนวนเงิน") },
                        {
                          validator: (_, value?: number) => {
                            if (!locked || value === undefined) return Promise.resolve();
                            const base =
                              vatMode === VatMode.INCLUSIVE
                                ? calcChargeTotals(value, STANDARD_VAT_PERCENT, VatMode.INCLUSIVE)
                                    .amountBeforeVat
                                : value;
                            return base < allocated - 0.004
                              ? Promise.reject(
                                  new Error(
                                    t("ต่ำกว่ายอดที่ตั้งหนี้แล้ว {amount}", {
                                      amount: money(allocated),
                                    }),
                                  ),
                                )
                              : Promise.resolve();
                          },
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
                      name={[field.name, "vatMode"]}
                      label={t("รูปแบบ VAT")}
                      rules={[{ required: true, message: t("เลือกรูปแบบ VAT") }]}
                    >
                      <Select options={VAT_MODE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} disabled={disabled || locked} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "withholdingTaxType"]}
                      label={t("ภาษีหัก ณ ที่จ่าย")}
                      rules={[{ required: true, message: t("เลือกภาษีหัก ณ ที่จ่าย") }]}
                    >
                      <Select options={WITHHOLDING_TAX_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} disabled={disabled} />
                    </Form.Item>
                    {whtType === WithholdingTaxType.CUSTOM ? (
                      <Form.Item
                        name={[field.name, "whtRate"]}
                        label={t("อัตราหัก ณ ที่จ่าย (%)")}
                        rules={[{ required: true, message: t("ระบุอัตรา") }]}
                      >
                        <InputNumber
                          min={0.01}
                          max={100}
                          precision={2}
                          style={{ width: "100%" }}
                          disabled={disabled}
                        />
                      </Form.Item>
                    ) : null}
                    {whtType !== WithholdingTaxType.NONE ? (
                      <Form.Item name={[field.name, "whtIncomeType"]} label={t("ประเภทเงินได้")}>
                        <Input
                          maxLength={100}
                          placeholder={t("เช่น ค่าขนส่ง")}
                          disabled={disabled}
                        />
                      </Form.Item>
                    ) : null}
                  </div>
                  <div className={styles.chargeSummary}>
                    VAT {money(totals.vat)} · {t("รวม")}{" "}
                    <strong>{money(totals.total)}</strong>
                  </div>
                </div>
              );
            })}
            <Button
              icon={<PlusOutlined />}
              disabled={disabled}
              onClick={() =>
                add({
                  // มีประเภทจาก Master → เริ่มที่ค่าขนส่ง · ยังโหลดไม่เสร็จ/ไม่มี → แบบเดิม
                  chargeType: defaultExpenseType ? undefined : "FREIGHT",
                  expenseTypeId: defaultExpenseType?.id,
                  _expenseTypeName: defaultExpenseType?.nameTh,
                  vatMode: VatMode.EXCLUSIVE,
                  withholdingTaxType: WithholdingTaxType.NONE,
                })
              }
            >
              {t("เพิ่มค่าใช้จ่าย")}
            </Button>
          </div>
        )}
      </Form.List>
    </div>
  );
}
