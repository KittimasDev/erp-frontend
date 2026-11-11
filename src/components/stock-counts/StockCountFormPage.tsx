"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, DatePicker, Form, Input, InputNumber, Select, Typography } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  useCreateStockCountMutation,
  useUpdateStockCountMutation,
} from "@/hooks/stock-counts/useStockCountMutations";
import { useStockCountQuery } from "@/hooks/stock-counts/useStockCountsQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import {
  itemInWarehouseGroup,
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateStockCountBody } from "@/types/stock-counts";
import { STOCK_COUNT_TYPE_LABEL } from "@/types/stock-counts";
import { useT } from "@/lib/i18n/useT";
import { tStockLabel } from "@/types/stock-adjustments";
import styles from "./StockCountFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type LineValues = {
  itemId?: string;
  unitId?: string;
  lotId?: string;
  countedQuantity?: number;
  remark?: string;
};

type FormValues = {
  countDate: dayjs.Dayjs;
  countType: string;
  warehouseId?: string;
  locationId?: string;
  remark?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

export default function StockCountFormPage({ mode, id }: Props) {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useStockCountQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateStockCountMutation();
  const updateMutation = useUpdateStockCountMutation();

  const itemsQuery = useItemsQuery({ isActive: true });
  const warehousesQuery = useWarehousesQuery({
    isActive: true,
    menuScope: warehouseGroup,
  });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });

  const headerWarehouseId = Form.useWatch("warehouseId", form);
  const headerLocationId = Form.useWatch("locationId", form);
  const lotsQuery = useInventoryLotsQuery({
    warehouseId: headerWarehouseId || undefined,
    locationId: headerLocationId || undefined,
  });

  // สินค้าที่อยู่ในใบเดิมต้องคงไว้ ไม่งั้นช่องสินค้า/หน่วยของบรรทัดเดิมหาข้อมูลไม่เจอ
  const lineItemIds = new Set(
    (detailQuery.data?.data?.items ?? []).map((line) => line.itemId),
  );
  const items = (itemsQuery.data?.data ?? []).filter(
    (item) =>
      lineItemIds.has(item.id) || itemInWarehouseGroup(item, warehouseGroup),
  );
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("PHYSICAL_INVENTORY_COUNTS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const warehouses = Array.isArray(warehousesQuery.data?.data)
    ? warehousesQuery.data.data
    : [];
  const locations = Array.isArray(locationsQuery.data?.data)
    ? locationsQuery.data.data
    : [];
  const lots = lotsQuery.data?.data ?? [];

  const headerLocations = locations.filter(
    (loc) => loc.warehouseId === headerWarehouseId,
  );

  const watchedItems = Form.useWatch("items", form) ?? [];

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({
        countDate: dayjs(),
        countType: "FULL",
        items: [{}],
      });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(scopePath(`/inventory/stock-counts/${data.id}`));
      return;
    }

    form.setFieldsValue({
      countDate: dayjs(data.countDate),
      countType: data.countType,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      remark: data.remark,
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        lotId: item.lotId,
        countedQuantity: Number(item.countedQuantity),
        remark: item.remark,
      })),
    });
  }, [detailQuery.data, form, mode, router]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const previewLines = useMemo(
    () =>
      watchedItems
        .map((line, index) => {
          const item = items.find((row) => row.id === line.itemId);
          if (!item && line.countedQuantity == null) return null;
          return {
            key: index,
            text: item
              ? `${item.itemNameTh} ${line.countedQuantity ?? "-"}`
              : t("รายการที่ {n} (รอเลือกสินค้า)", { n: index + 1 }),
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items, t],
  );

  const onFinish = async (values: FormValues) => {
    const body: CreateStockCountBody = {
      countDate: values.countDate.format("YYYY-MM-DD"),
      countType: values.countType,
      warehouseId: values.warehouseId as string,
      locationId: values.locationId as string,
      remark: values.remark?.trim() || undefined,
      warehouseGroup,
      items: (values.items ?? []).map((item, index) => ({
        itemId: item.itemId as string,
        lotId: item.lotId as string,
        unitId: item.unitId as string,
        countedQuantity: Number(item.countedQuantity),
        remark: item.remark?.trim() || undefined,
        sortOrder: index,
      })),
    };

    if (mode === "create") {
      const response = await createMutation.mutateAsync(body);
      router.push(scopePath(`/inventory/stock-counts/${response.data.id}`));
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(scopePath(`/inventory/stock-counts/${response.data.id}`));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Stock Count"
        icon={<FileSearchOutlined />}
        title={
          mode === "create" ? t("สร้างใบนับสต๊อก") : t("แก้ไขใบนับสต๊อก")
        }
        subtitle={t("เลือกคลัง/ตำแหน่งที่จะนับ แล้วกรอกยอดที่นับได้จริงต่อ Lot")}
        actions={
          <>
<div className={styles.backLink}>
          <Link href={scopePath("/inventory/stock-counts")}>
            <Button icon={<ArrowLeftOutlined />}>{t("กลับรายการ")}</Button>
          </Link>
        </div>
          </>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ countType: "FULL", items: [{}] }}
        requiredMark="optional"
      >
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{t("ข้อมูลเอกสาร")}</h2>
                  <p className={styles.sectionHint}>
                    {t("เลขที่ใบนับสต๊อกจะสร้างอัตโนมัติเมื่อบันทึก")}
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label={t("วันที่นับ")}
                    name="countDate"
                    rules={[{ required: true, message: t("กรุณาเลือกวันที่นับ") }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label={t("ประเภทการนับ")}
                    name="countType"
                    rules={[{ required: true, message: t("เลือกประเภทการนับ") }]}
                  >
                    <Select
                      options={Object.entries(STOCK_COUNT_TYPE_LABEL).map(
                        ([value, label]) => ({
                          value,
                          label: tStockLabel(label),
                        }),
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label={t("คลังที่นับ")}
                    name="warehouseId"
                    rules={[{ required: true, message: t("เลือกคลังที่นับ") }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={warehouses.map((w) => ({
                        value: w.id,
                        label: `${w.warehouseCode} — ${w.warehouseName}`,
                      }))}
                      onChange={() => {
                        form.setFieldValue("locationId", undefined);
                        const currentItems = form.getFieldValue("items") ?? [];
                        currentItems.forEach((_line: LineValues, index: number) => {
                          form.setFieldValue(["items", index, "lotId"], undefined);
                        });
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label={t("ตำแหน่งที่นับ")}
                    name="locationId"
                    rules={[{ required: true, message: t("เลือกตำแหน่งที่นับ") }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      disabled={!headerWarehouseId}
                      placeholder={
                        !headerWarehouseId
                          ? t("เลือกคลังก่อน")
                          : t("เลือกตำแหน่ง")
                      }
                      options={headerLocations.map((loc) => ({
                        value: loc.id,
                        label: `${loc.locationCode} — ${loc.locationName}`,
                      }))}
                      onChange={() => {
                        const currentItems = form.getFieldValue("items") ?? [];
                        currentItems.forEach((_line: LineValues, index: number) => {
                          form.setFieldValue(["items", index, "lotId"], undefined);
                        });
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label={t("หมายเหตุ")}
                    name="remark"
                  >
                    <Input.TextArea rows={2} placeholder={t("หมายเหตุหัวเอกสาร (ถ้ามี)")} />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{t("รายการนับสต๊อก")}</h2>
                  <p className={styles.sectionHint}>
                    {t("ต้องเลือก Lot ที่มีในคลัง/ตำแหน่งที่เลือกไว้ด้านบน")}
                  </p>
                </div>

                <Form.List
                  name="items"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (!value || value.length < 1) {
                          return Promise.reject(
                            new Error(t("ต้องมีรายการอย่างน้อย 1 รายการ")),
                          );
                        }
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => {
                        const line = watchedItems[index];
                        const availableLots = lots.filter(
                          (lot) => lot.itemId === line?.itemId,
                        );
                        const selectedLot = availableLots.find(
                          (lot) => lot.lotId === line?.lotId,
                        );
                        const systemQty = selectedLot
                          ? Number(selectedLot.quantityOnHand)
                          : undefined;
                        const variance =
                          systemQty != null && line?.countedQuantity != null
                            ? Number(line.countedQuantity) - systemQty
                            : undefined;
                        const varianceTone =
                          variance == null || Math.abs(variance) < 1e-9
                            ? styles.varianceZero
                            : variance > 0
                              ? styles.variancePositive
                              : styles.varianceNegative;

                        return (
                          <div key={key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>{t("รายการที่ {n}", { n: index + 1 })}</strong>
                              {fields.length > 1 ? (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                >
                                  {t("ลบ")}
                                </Button>
                              ) : null}
                            </div>

                            <div className={styles.lineGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("สินค้า")}
                                name={[name, "itemId"]}
                                rules={[{ required: true, message: t("เลือกสินค้า") }]}
                              >
                                <Select
                                  placeholder={t("ค้นหา/เลือกสินค้า")}
                                  showSearch
                                  optionFilterProp="label"
                                  options={items.map((item) => ({
                                    value: item.id,
                                    label: `${item.itemCode} — ${item.itemNameTh}`,
                                  }))}
                                  onChange={(itemId) => {
                                    const selected = items.find(
                                      (item) => item.id === itemId,
                                    );
                                    if (selected?.unitId) {
                                      form.setFieldValue(
                                        ["items", name, "unitId"],
                                        selected.unitId,
                                      );
                                    }
                                    form.setFieldValue(
                                      ["items", name, "lotId"],
                                      undefined,
                                    );
                                  }}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("หน่วย")}
                                name={[name, "unitId"]}
                                rules={[{ required: true, message: t("เลือกหน่วย") }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="title"
                                  {...resolveUnitField(
                                    watchedItems[name]?.itemId,
                                    watchedItems[name]?.unitId,
                                  )}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("Lot (ยอดระบบ)")}
                                name={[name, "lotId"]}
                                rules={[{ required: true, message: t("เลือก Lot") }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={
                                    !line?.itemId ||
                                    !headerWarehouseId ||
                                    !headerLocationId
                                  }
                                  placeholder={
                                    !headerWarehouseId || !headerLocationId
                                      ? t("เลือกคลัง/ตำแหน่งด้านบนก่อน")
                                      : !line?.itemId
                                        ? t("เลือกสินค้าก่อน")
                                        : t("เลือก Lot")
                                  }
                                  options={availableLots.map((lot) => ({
                                    value: lot.lotId,
                                    label: `${lot.lotNo} — ${t("ระบบ")} ${lot.quantityOnHand}`,
                                  }))}
                                />
                              </Form.Item>
                            </div>

                            <div className={styles.lineGridTwo}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("จำนวนที่นับได้จริง")}
                                name={[name, "countedQuantity"]}
                                rules={[{ required: true, message: t("ระบุจำนวนที่นับได้") }]}
                              >
                                <InputNumber
                                  min={0}
                                  style={{ width: "100%" }}
                                  placeholder="0"
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("หมายเหตุรายการ")}
                                name={[name, "remark"]}
                              >
                                <Input placeholder={t("หมายเหตุ (ถ้ามี)")} />
                              </Form.Item>
                            </div>

                            {selectedLot ? (
                              <div className={styles.varianceRow}>
                                <span>{t("ยอดระบบ")} {selectedLot.quantityOnHand}</span>
                                <span>·</span>
                                <span>
                                  {t("ส่วนต่าง:")}{" "}
                                  <span
                                    className={`${styles.varianceValue} ${varianceTone}`}
                                  >
                                    {variance != null
                                      ? variance > 0
                                        ? `+${variance.toFixed(3)}`
                                        : variance.toFixed(3)
                                      : "-"}
                                  </span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                      <Button
                        block
                        className={styles.addLineButton}
                        icon={<PlusOutlined />}
                        onClick={() => add({})}
                      >
                        {t("เพิ่มรายการ")}
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}
                </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                {t("บันทึกแล้วสถานะจะเป็น DRAFT — หัวหน้าคลังต้องอนุมัติก่อนปรับปรุงสต๊อกจริง (ระบบจะคำนวณส่วนต่างจากยอดปัจจุบันจริงอีกครั้งตอนอนุมัติ)")}
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push(scopePath("/inventory/stock-counts"))}
                >
                  {t("ยกเลิก")}
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? t("บันทึกใบนับสต๊อก") : t("บันทึกการแก้ไข")}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>{t("สรุปแบบฟอร์ม")}</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? t("ใบนับสต๊อกใหม่") : t("แก้ไข DRAFT")}
              </h2>
              <p className={styles.summaryLead}>
                {t("ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ")}
              </p>
            </div>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {t("รายการนับสต๊อก")}
              </Typography.Text>
              {previewLines.length > 0 ? (
                <ul className={styles.previewList}>
                  {previewLines.map((line) => (
                    <li key={line.key}>{line.text}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.previewMeta}>{t("ยังไม่มีรายการ")}</p>
              )}
            </div>

            <div className={styles.flowNote}>
              <strong>{t("ขั้นตอนถัดไป")}</strong>
              <p>
                {t("หลังบันทึก → เปิดหน้ารายละเอียด → กด “อนุมัติ” → หัวหน้าคลังปรับปรุงสต๊อกจริงตามส่วนต่าง")}
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
