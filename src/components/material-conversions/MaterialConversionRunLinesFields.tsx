"use client";

import { useMemo } from "react";
import { App, Button, Form, Input, InputNumber, Select, Tag } from "antd";
import type { FormInstance, SelectProps } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { MaterialConversionRouteStep } from "@/types/material-conversion";
import {
  OUTPUT_TYPE_COLOR,
  OUTPUT_TYPE_LABEL,
  OUTPUT_TYPES,
  PACKAGING_TYPES,
  PACKAGING_TYPE_LABEL,
  outputPostsToStock,
} from "@/types/material-conversion";
import { useT, tNow } from "@/lib/i18n/useT";
import styles from "./MaterialConversionPage.module.css";

/**
 * บรรทัดวัตถุดิบเข้า + ผลผลิตออก — ใช้ร่วมกันระหว่างหน้าสร้างเอกสารเดี่ยว
 * กับลิ้นชักกรอกขั้นตอนในใบงานตามเส้นทาง
 *
 * ยกออกมาจาก `MaterialConversionCreatePage` ทั้งดุ้น **ไม่ได้เขียนใหม่** —
 * หน้าสร้างเดิมจึงคง URL, DTO และพฤติกรรมทุกอย่างไว้เหมือนเดิม
 *
 * **วัตถุดิบยังเลือกด้วย Lot เหมือนเดิม** — ห้ามถอยกลับไปเป็นการเลือก
 * สินค้า → คลัง → ตำแหน่ง → Lot สี่ชั้น เพราะ Lot ตัวเดียวบอกครบทุกอย่างอยู่แล้ว
 * และเป็นสิ่งเดียวที่บอกได้ว่าของที่จะตัดมีอยู่จริงเท่าไหร่
 */

export type InputLineValues = {
  /** id ของยอดคงเหลือราย Lot — บอกครบทั้งสินค้า คลัง ตำแหน่ง หน่วย */
  balanceId?: string;
  plannedQty?: number | null;
  remark?: string;
};

export type OutputLineValues = {
  outputType?: string;
  packagingType?: string;
  itemId?: string;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  plannedQty?: number | null;
  remark?: string;
};

export const EMPTY_INPUT: InputLineValues = {};
export const EMPTY_OUTPUT: OutputLineValues = { outputType: "MAIN" };

/**
 * master data ที่ทั้งสองหน้าต้องใช้ — React Query รวม request ให้เองตาม key
 *
 * @param highlightBatchNo เลข Batch ที่กำลังทำอยู่ · ส่งมาแล้ว Lot ที่มาจาก Batch
 * เดียวกัน (คือผลผลิตของขั้นก่อนหน้าในสายเดียวกัน) จะถูก **ดันขึ้นไปอยู่บนสุด**
 * ของรายการพร้อมหัวข้อกำกับ
 *
 * **ดันขึ้นบน ไม่ใช่กรองทิ้ง** — ระบบตรวจไม่ได้ว่าขั้นนี้ต้องใช้ของจากขั้นก่อนหน้าเสมอ
 * (เติมสารเคมีใหม่เข้ามากลางสายก็มี) การกรองจะปิดทางเลือก Lot อื่นทั้งหมด ·
 * และ **ไม่เลือกให้อัตโนมัติ** ตามที่ตกลงไว้ว่าไม่ต่อขั้นอัตโนมัติ
 */
export function useConversionLineData(highlightBatchNo?: string) {
  const t = useT();
  const lotsQuery = useInventoryLotsQuery({ hasStock: true });
  const itemsQuery = useItemsQuery();
  const unitsQuery = useUnitsQuery();
  const warehousesQuery = useWarehousesQuery();
  const locationsQuery = useWarehouseLocationsQuery();

  const lots = useMemo(() => lotsQuery.data?.data ?? [], [lotsQuery.data]);
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  const units = useMemo(() => unitsQuery.data?.data ?? [], [unitsQuery.data]);
  const warehouses = useMemo(
    () => warehousesQuery.data?.data ?? [],
    [warehousesQuery.data],
  );
  const locations = useMemo(
    () => locationsQuery.data?.data ?? [],
    [locationsQuery.data],
  );

  const lotById = useMemo(
    () => new Map(lots.map((lot) => [lot.id, lot] as const)),
    [lots],
  );
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );
  const unitCodeById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.code] as const)),
    [units],
  );

  const itemOptions = useMemo(
    () =>
      items
        .filter((item) => item.isActive && item.isStockItem)
        .map((item) => ({
          value: item.id,
          label: `${item.itemCode} — ${item.itemNameTh}`,
        })),
    [items],
  );

  const lotOptions = useMemo<SelectProps["options"]>(() => {
    const toOption = (lot: (typeof lots)[number]) => ({
      value: lot.id,
      label: `${lot.itemCode} — ${lot.itemNameTh} · ${lot.lotNo} · ${lot.warehouseName}/${lot.locationCode} · ${t("คงเหลือ")} ${Number(
        lot.quantityAvailable,
      ).toLocaleString("th-TH", { maximumFractionDigits: 3 })} ${lot.unitCode ?? ""}`,
    });

    const batch = highlightBatchNo?.trim();
    if (!batch) {
      return lots.map(toOption);
    }

    const sameBatch = lots.filter((lot) => lot.batchNo === batch);
    /*
      ไม่มี Lot ของ Batch นี้เลย → คืนรายการแบนเหมือนเดิมทุกประการ
      ไม่ขึ้นหัวข้อกลุ่มให้รกโดยไม่ได้ช่วยอะไร (เป็นกรณีปกติของขั้นแรกสุด)
    */
    if (sameBatch.length === 0) {
      return lots.map(toOption);
    }

    const others = lots.filter((lot) => lot.batchNo !== batch);
    return [
      {
        label: t("Lot จาก Batch {batch} — ผลผลิตของขั้นก่อนหน้าในสายนี้", { batch }),
        options: sameBatch.map(toOption),
      },
      { label: t("Lot อื่นทั้งหมด"), options: others.map(toOption) },
    ];
  }, [lots, highlightBatchNo, t]);

  return {
    lots,
    items,
    units,
    warehouses,
    locations,
    lotById,
    itemById,
    unitCodeById,
    itemOptions,
    lotOptions,
    lotsQuery,
    itemsQuery,
    isLoading: lotsQuery.isLoading || itemsQuery.isLoading,
  };
}

export type ConversionLineData = ReturnType<typeof useConversionLineData>;

/**
 * แปลงค่าจากฟอร์มเป็น body ของ API
 *
 * คืน `{ error }` แทนการโยน เพราะทั้งสองหน้าต้องขึ้นข้อความเตือนเอง
 * ในรูปแบบของตัวเอง (หน้าหนึ่งใช้ message อีกหน้าอยู่ในลิ้นชัก)
 */
export function buildRunLinesPayload(
  values: { inputs?: InputLineValues[]; outputs?: OutputLineValues[] },
  lotById: ConversionLineData["lotById"],
  itemById: ConversionLineData["itemById"],
):
  | { error: string }
  | {
      inputs: Array<{
        itemId: string;
        warehouseId: string;
        locationId: string;
        lotId: string;
        unitId: string;
        plannedQty: number;
        remark?: string;
        sortOrder: number;
      }>;
      outputs: Array<{
        outputType: string;
        itemId: string;
        unitId: string;
        warehouseId?: string;
        locationId?: string;
        plannedQty: number;
        packagingType?: string;
        remark?: string;
        sortOrder: number;
      }>;
    } {
  const inputs = (values.inputs ?? [])
    .map((line, index) => {
      const lot = line.balanceId ? lotById.get(line.balanceId) : undefined;
      if (!lot) return null;
      const item = itemById.get(lot.itemId);
      return {
        itemId: lot.itemId,
        warehouseId: lot.warehouseId,
        locationId: lot.locationId,
        lotId: lot.lotId,
        // หน่วยหลักของสินค้า — Lot อาจบันทึกคนละหน่วย (เช่น KG ทั้งที่สินค้าเป็น G)
        unitId: item?.unitId ?? lot.unitId,
        plannedQty: Number(line.plannedQty ?? 0),
        remark: line.remark?.trim() || undefined,
        sortOrder: index,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  if (inputs.length === 0) {
    return { error: tNow("เลือก Lot วัตถุดิบอย่างน้อย 1 บรรทัด") };
  }

  const outputs = (values.outputs ?? []).map((line, index) => {
    const posts = outputPostsToStock(line.outputType);
    const item = line.itemId ? itemById.get(line.itemId) : undefined;
    return {
      outputType: line.outputType as string,
      itemId: line.itemId as string,
      unitId: item?.unitId ?? (line.unitId as string),
      warehouseId: posts ? line.warehouseId : undefined,
      locationId: posts ? line.locationId : undefined,
      plannedQty: Number(line.plannedQty ?? 0),
      packagingType: posts ? line.packagingType || undefined : undefined,
      remark: line.remark?.trim() || undefined,
      sortOrder: index,
    };
  });

  if (!outputs.some((line) => line.outputType === "MAIN")) {
    return { error: tNow("ต้องมีผลผลิตชนิด \"ผลผลิตหลัก\" อย่างน้อย 1 บรรทัด") };
  }

  return { inputs, outputs };
}

type Props = {
  form: FormInstance;
  data: ConversionLineData;
  /** ขั้นตอนที่เลือก — ใช้ปุ่มเติมจำนวนตามสัดส่วนคาดหมาย */
  selectedStep?: MaterialConversionRouteStep;
  /** ค่าปัจจุบันของทั้งสอง list ที่หน้าแม่ watch ไว้แล้ว ส่งต่อมาไม่ต้อง watch ซ้ำ */
  inputValues: InputLineValues[];
  outputValues: OutputLineValues[];
};

export default function MaterialConversionRunLinesFields({
  form,
  data,
  selectedStep,
  inputValues,
  outputValues,
}: Props) {
  const t = useT();
  const { message } = App.useApp();
  const {
    warehouses,
    locations,
    lotById,
    itemById,
    unitCodeById,
    itemOptions,
    lotOptions,
    lotsQuery,
    itemsQuery,
    items,
  } = data;
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("MATERIAL_CONVERSIONS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);

  const totalPlannedInput = useMemo(
    () =>
      inputValues.reduce((acc, line) => acc + (Number(line?.plannedQty) || 0), 0),
    [inputValues],
  );

  const applyTemplateRatios = () => {
    if (!selectedStep) return;
    const template = selectedStep.lines.filter(
      (line) => line.lineRole === "OUTPUT" && line.expectedRatio,
    );
    if (template.length === 0 || totalPlannedInput <= 0) {
      message.info(
        t("ขั้นตอนนี้ยังไม่ได้ตั้งสัดส่วนคาดหมาย หรือยังไม่ได้กรอกวัตถุดิบ"),
      );
      return;
    }
    const current = (form.getFieldValue("outputs") ?? []) as OutputLineValues[];
    form.setFieldsValue({
      outputs: current.map((line) => {
        const match = template.find(
          (row) => row.itemId && row.itemId === line.itemId,
        );
        if (!match?.expectedRatio) return line;
        return {
          ...line,
          plannedQty: Number(
            (totalPlannedInput * Number(match.expectedRatio)).toFixed(3),
          ),
        };
      }),
    });
    message.success(t("เติมจำนวนตามสัดส่วนคาดหมายแล้ว — แก้ได้ทุกบรรทัด"));
  };

  const hasRatioTemplate = selectedStep?.lines.some(
    (line) => line.lineRole === "OUTPUT" && line.expectedRatio,
  );

  return (
    <>
      {/* ─── วัตถุดิบเข้า ──────────────────────────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.formSectionHead}>
          <h4>{t("วัตถุดิบเข้า")}</h4>
          <span className={styles.formSectionHint}>
            {t("เลือก Lot แล้วระบบเติมคลัง ตำแหน่งให้เอง · หน่วยนับใช้หน่วยหลักของสินค้า")}
          </span>
        </div>
        <Form.List
          name="inputs"
          rules={[
            {
              validator: async (_, value) => {
                if (!value || value.length < 1) {
                  return Promise.reject(
                    new Error(t("เพิ่มวัตถุดิบอย่างน้อย 1 รายการ")),
                  );
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <div className={styles.lineList}>
              {fields.map((field, index) => {
                const line = inputValues[index];
                const lot = line?.balanceId
                  ? lotById.get(line.balanceId)
                  : undefined;
                const item = lot ? itemById.get(lot.itemId) : undefined;
                const itemUnitCode = item?.unitId
                  ? unitCodeById.get(item.unitId)
                  : undefined;
                const lotUnitMismatch =
                  Boolean(lot && item && lot.unitId !== item.unitId);
                const available = lot
                  ? Number(lot.quantityAvailable)
                  : undefined;
                const overStock =
                  available !== undefined &&
                  Number(line?.plannedQty ?? 0) > available;

                return (
                  <div key={field.key} className={styles.lineCard}>
                    <div className={styles.lineCardHeader}>
                      <span className={styles.lineCardTitle}>
                        {t("วัตถุดิบที่ {n}", { n: index + 1 })}
                      </span>
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
                        className={styles.lineGridWide}
                        name={[field.name, "balanceId"]}
                        label={t("Lot วัตถุดิบ")}
                        rules={[{ required: true, message: t("เลือก Lot") }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder={t("เลือก Lot ที่มีของ")}
                          loading={lotsQuery.isFetching}
                          notFoundContent={
                            lotsQuery.isFetching
                              ? t("กำลังโหลด...")
                              : t("ไม่พบ Lot ที่มีของคงเหลือ")
                          }
                          options={lotOptions}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "plannedQty"]}
                        label={`${t("จำนวน")}${itemUnitCode ? ` (${itemUnitCode})` : lot?.unitCode ? ` (${lot.unitCode})` : ""}`}
                        rules={[
                          { required: true, message: t("กรอกจำนวน") },
                          {
                            validator: async (_, value) => {
                              if (
                                value !== undefined &&
                                value !== null &&
                                value <= 0
                              ) {
                                return Promise.reject(
                                  new Error(t("จำนวนต้องมากกว่า 0")),
                                );
                              }
                            },
                          },
                        ]}
                        validateStatus={overStock ? "error" : undefined}
                        help={
                          overStock
                            ? t("Lot นี้คงเหลือ {qty}", { qty: available?.toLocaleString("th-TH", { maximumFractionDigits: 3 }) ?? "" })
                            : lotUnitMismatch
                              ? t("สินค้านี้หน่วยหลักคือ {unit} — Lot บันทึกเป็น {lotUnit}", { unit: itemUnitCode ?? t("หน่วยหลัก"), lotUnit: lot?.unitCode ?? t("หน่วยอื่น") })
                              : undefined
                        }
                        extra={
                          available !== undefined && !overStock && !lotUnitMismatch
                            ? `${t("คงเหลือ")} ${available.toLocaleString("th-TH", { maximumFractionDigits: 3 })}`
                            : undefined
                        }
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          precision={3}
                          placeholder="0.000"
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, "remark"]} label={t("หมายเหตุ")}>
                        <Input placeholder={t("เช่น ยางเปียก")} maxLength={500} />
                      </Form.Item>
                    </div>
                  </div>
                );
              })}
              <Button
                type="dashed"
                className={styles.addLineButton}
                icon={<PlusOutlined />}
                onClick={() => add({ ...EMPTY_INPUT })}
              >
                {t("เพิ่มวัตถุดิบ")}
              </Button>
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>
      </div>

      {/* ─── ผลผลิตออก ────────────────────────────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.formSectionHead}>
          <h4>{t("ผลผลิตออก")}</h4>
          <span className={styles.formSectionHint}>
            {t("ของเสียบันทึกได้เพื่อคิดสมดุลมวล แต่ไม่เข้าสต๊อกและไม่ต้องระบุคลัง")}
          </span>
        </div>
        {hasRatioTemplate ? (
          <Button
            size="small"
            style={{ marginBottom: 10 }}
            onClick={applyTemplateRatios}
          >
            {t("เติมจำนวนตามสัดส่วนคาดหมายของขั้นตอนนี้")}
          </Button>
        ) : null}
        <Form.List
          name="outputs"
          rules={[
            {
              validator: async (_, value) => {
                if (!value || value.length < 1) {
                  return Promise.reject(
                    new Error(t("เพิ่มผลผลิตอย่างน้อย 1 รายการ")),
                  );
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <div className={styles.lineList}>
              {fields.map((field, index) => {
                const line = outputValues[index];
                const posts = outputPostsToStock(line?.outputType);
                // อ่านคลังจากค่าในฟอร์มโดยตรง ไม่เก็บ state ซ้ำ
                const warehouseId = line?.warehouseId;
                const lineLocations = warehouseId
                  ? locations.filter((loc) => loc.warehouseId === warehouseId)
                  : [];
                const unitCode = line?.unitId
                  ? unitCodeById.get(line.unitId)
                  : undefined;

                return (
                  <div
                    key={field.key}
                    className={
                      posts
                        ? styles.lineCard
                        : `${styles.lineCard} ${styles.lineCardWaste}`
                    }
                  >
                    <div className={styles.lineCardHeader}>
                      <span className={styles.lineCardTitle}>
                        {t("ผลผลิตที่ {n}", { n: index + 1 })}
                        <Tag
                          color={OUTPUT_TYPE_COLOR[line?.outputType ?? "MAIN"]}
                        >
                          {t(OUTPUT_TYPE_LABEL[line?.outputType ?? "MAIN"])}
                        </Tag>
                      </span>
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
                        name={[field.name, "outputType"]}
                        label={t("ชนิดผลผลิต")}
                        rules={[{ required: true, message: t("เลือกชนิด") }]}
                      >
                        <Select
                          options={OUTPUT_TYPES.map((value) => ({
                            value,
                            label: t(OUTPUT_TYPE_LABEL[value]),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        className={styles.lineGridWide}
                        name={[field.name, "itemId"]}
                        label={t("สินค้า")}
                        rules={[{ required: true, message: t("เลือกสินค้า") }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder={t("เลือกสินค้า")}
                          loading={itemsQuery.isFetching}
                          options={itemOptions}
                          onChange={(value: string) => {
                            // หน่วยต้องเป็นหน่วยหลักของสินค้าเท่านั้น (backend บังคับ)
                            const item = itemById.get(value);
                            if (item) {
                              const outputs = (form.getFieldValue("outputs") ??
                                []) as OutputLineValues[];
                              outputs[index] = {
                                ...outputs[index],
                                unitId: item.unitId,
                              };
                              form.setFieldsValue({ outputs });
                            }
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "unitId"]}
                        label={t("หน่วยนับ")}
                        rules={[{ required: true, message: t("เลือกหน่วย") }]}
                        extra={t("ต้องเป็นหน่วยหลักของสินค้า")}
                      >
                        <Select
                          showSearch
                          optionFilterProp="title"
                          {...resolveUnitField(line?.itemId, line?.unitId)}
                        />
                      </Form.Item>
                      {posts ? (
                        <>
                          <Form.Item
                            name={[field.name, "warehouseId"]}
                            label={t("คลังที่รับเข้า")}
                            rules={[{ required: true, message: t("เลือกคลัง") }]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={t("เลือกคลัง")}
                              options={warehouses.map((wh) => ({
                                value: wh.id,
                                label: wh.warehouseName,
                              }))}
                              onChange={() => {
                                // เปลี่ยนคลังแล้วตำแหน่งเดิมใช้ไม่ได้ ต้องล้าง
                                const outputs = (form.getFieldValue("outputs") ??
                                  []) as OutputLineValues[];
                                outputs[index] = {
                                  ...outputs[index],
                                  locationId: undefined,
                                };
                                form.setFieldsValue({ outputs });
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, "locationId"]}
                            label={t("ตำแหน่ง")}
                            rules={[{ required: true, message: t("เลือกตำแหน่ง") }]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={
                                warehouseId ? t("เลือกตำแหน่ง") : t("เลือกคลังก่อน")
                              }
                              disabled={!warehouseId}
                              options={lineLocations.map((loc) => ({
                                value: loc.id,
                                label: `${loc.locationCode} — ${loc.locationName}`,
                              }))}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, "packagingType"]}
                            label={t("ภาชนะบรรจุ")}
                            extra={t("ใช้กับขั้นบรรจุ — กรอกจำนวนถุงและน้ำหนักตอนปิดงาน")}
                          >
                            <Select
                              allowClear
                              placeholder={t("ไม่ระบุ")}
                              options={PACKAGING_TYPES.map((value) => ({
                                value,
                                label: t(PACKAGING_TYPE_LABEL[value]),
                              }))}
                            />
                          </Form.Item>
                        </>
                      ) : null}
                      <Form.Item
                        name={[field.name, "plannedQty"]}
                        label={`${t("จำนวนตามแผน")}${unitCode ? ` (${unitCode})` : ""}`}
                        rules={[{ required: true, message: t("กรอกจำนวน") }]}
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          precision={3}
                          placeholder="0.000"
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, "remark"]} label={t("หมายเหตุ")}>
                        <Input
                          placeholder={t("เช่น ลวดเหล็กที่แยกได้")}
                          maxLength={500}
                        />
                      </Form.Item>
                    </div>
                  </div>
                );
              })}
              <Button
                type="dashed"
                className={styles.addLineButton}
                icon={<PlusOutlined />}
                onClick={() => add({ ...EMPTY_OUTPUT })}
              >
                {t("เพิ่มผลผลิต")}
              </Button>
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>
      </div>
    </>
  );
}
