"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import StockAdjustmentTypeFormModal from "@/components/masters/stock-adjustment-types/StockAdjustmentTypeFormModal";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  useCreateStockAdjustmentMutation,
  useUpdateStockAdjustmentMutation,
} from "@/hooks/stock-adjustments/useStockAdjustmentMutations";
import { useStockAdjustmentQuery } from "@/hooks/stock-adjustments/useStockAdjustmentsQuery";
import { useCreateStockAdjustmentTypeMutation } from "@/hooks/stock-adjustment-types/useCreateStockAdjustmentTypeMutation";
import { useStockAdjustmentTypesQuery } from "@/hooks/stock-adjustment-types/useStockAdjustmentTypesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import {
  itemInWarehouseGroup,
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateStockAdjustmentBody } from "@/types/stock-adjustments";
import { STOCK_ADJUSTMENT_TYPE_LABEL } from "@/types/stock-adjustments";
import { useT } from "@/lib/i18n/useT";
import styles from "./StockAdjustmentFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type LineValues = {
  itemId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  unitId?: string;
  adjustQuantity?: number;
  unitCost?: number;
  remark?: string;
};

type FormValues = {
  adjustmentDate: dayjs.Dayjs;
  adjustmentType: string;
  reason: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

export default function StockAdjustmentFormPage({ mode, id }: Props) {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useStockAdjustmentQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateStockAdjustmentMutation();
  const updateMutation = useUpdateStockAdjustmentMutation();
  const typeActions = useScreenActionPermissions(
    "MASTERS_STOCK_ADJUSTMENT_TYPES",
  );
  const canCreateType = typeActions.canAdd;
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const typesQuery = useStockAdjustmentTypesQuery({ isActive: true });
  const createTypeMutation = useCreateStockAdjustmentTypeMutation();
  const activeTypes = typesQuery.data?.data ?? [];

  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const warehousesQuery = useWarehousesQuery({
    isActive: true,
    menuScope: warehouseGroup,
  });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const lotsQuery = useInventoryLotsQuery({});

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
  const canPickUnit = useDomainConvertsUnits("STOCK_ADJUSTMENTS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const warehouses = Array.isArray(warehousesQuery.data?.data)
    ? warehousesQuery.data.data
    : [];
  const locations = Array.isArray(locationsQuery.data?.data)
    ? locationsQuery.data.data
    : [];
  const lots = lotsQuery.data?.data ?? [];

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedType = Form.useWatch("adjustmentType", form);
  const detail = detailQuery.data?.data;

  const typeOptions = useMemo(() => {
    const options = activeTypes.map((item) => ({
      value: item.code,
      label: `${item.code} — ${item.nameTh}`,
    }));
    const current = watchedType || detail?.adjustmentType;
    if (current && !options.some((option) => option.value === current)) {
      const name =
        detail?.adjustmentTypeName ||
        (STOCK_ADJUSTMENT_TYPE_LABEL[current]
          ? t(STOCK_ADJUSTMENT_TYPE_LABEL[current])
          : "") ||
        current;
      options.push({
        value: current,
        label: `${current} — ${name}`,
      });
    }
    return options;
  }, [activeTypes, watchedType, detail, t]);

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({
        adjustmentDate: dayjs(),
        adjustmentType: "CORRECTION",
        items: [{}],
      });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(scopePath(`/inventory/stock-adjustments/${data.id}`));
      return;
    }

    form.setFieldsValue({
      adjustmentDate: dayjs(data.adjustmentDate),
      adjustmentType: data.adjustmentType,
      reason: data.reason ?? "",
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        lotId: item.lotId,
        unitId: item.unitId,
        adjustQuantity: Number(item.adjustQuantity),
        unitCost: item.unitCost != null ? Number(item.unitCost) : undefined,
        remark: item.remark,
      })),
    });
  }, [detailQuery.data, form, mode, router]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }
    const codes = activeTypes.map((item) => item.code);
    if (codes.length === 0) {
      return;
    }
    const current = form.getFieldValue("adjustmentType") as string | undefined;
    if (current && codes.includes(current)) {
      return;
    }
    form.setFieldValue(
      "adjustmentType",
      codes.includes("CORRECTION") ? "CORRECTION" : codes[0],
    );
  }, [mode, activeTypes, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const previewLines = useMemo(
    () =>
      watchedItems
        .map((line, index) => {
          const item = items.find((row) => row.id === line.itemId);
          if (!item && line.adjustQuantity == null) return null;
          const qty = line.adjustQuantity;
          const qtyText =
            qty == null
              ? "-"
              : qty > 0
                ? `+${qty}`
                : String(qty);
          return {
            key: index,
            text: item
              ? `${item.itemNameTh} ${qtyText}`
              : t("รายการที่ {n} (รอเลือกสินค้า)", { n: index + 1 }),
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items, t],
  );

  const onFinish = async (values: FormValues) => {
    const body: CreateStockAdjustmentBody = {
      adjustmentDate: values.adjustmentDate.format("YYYY-MM-DD"),
      adjustmentType: values.adjustmentType,
      reason: values.reason.trim(),
      warehouseGroup,
      items: (values.items ?? []).map((item, index) => ({
        itemId: item.itemId as string,
        warehouseId: item.warehouseId as string,
        locationId: item.locationId as string,
        lotId: item.lotId || undefined,
        unitId: item.unitId as string,
        adjustQuantity: Number(item.adjustQuantity),
        unitCost:
          item.unitCost != null && !Number.isNaN(Number(item.unitCost))
            ? Number(item.unitCost)
            : undefined,
        remark: item.remark?.trim() || undefined,
        sortOrder: index,
      })),
    };

    if (mode === "create") {
      const response = await createMutation.mutateAsync(body);
      router.push(scopePath(`/inventory/stock-adjustments/${response.data.id}`));
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(scopePath(`/inventory/stock-adjustments/${response.data.id}`));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Stock Adjustment"
        icon={<SwapOutlined />}
        title={
          mode === "create"
            ? t("สร้างใบปรับปรุงสต๊อก")
            : t("แก้ไขใบปรับปรุงสต๊อก")
        }
        subtitle={t("กรอกจำนวนแบบมีเครื่องหมาย (+ เพิ่ม / − ลด) ต่อบรรทัด — สต๊อกจะเปลี่ยนเมื่ออนุมัติเท่านั้น")}
        actions={
          <>
<div className={styles.backLink}>
          <Link href={scopePath("/inventory/stock-adjustments")}>
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
        initialValues={{ adjustmentType: "CORRECTION", items: [{}] }}
        requiredMark="optional"
      >
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{t("ข้อมูลเอกสาร")}</h2>
                  <p className={styles.sectionHint}>
                    {t("เลขที่ใบปรับปรุงจะสร้างอัตโนมัติเมื่อบันทึก")}
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label={t("วันที่")}
                    name="adjustmentDate"
                    rules={[{ required: true, message: t("กรุณาเลือกวันที่") }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
                  </Form.Item>

                  <Form.Item className={styles.field} label={t("ประเภท")} required>
                    <div className={styles.typeFieldRow}>
                      <Form.Item
                        name="adjustmentType"
                        rules={[{ required: true, message: t("เลือกประเภท") }]}
                        noStyle
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          loading={typesQuery.isLoading}
                          options={typeOptions}
                          popupRender={(menu) => (
                            <>
                              {menu}
                              {canCreateType ? (
                                <div className={styles.typeDropdownFooter}>
                                  <Button
                                    type="link"
                                    icon={<PlusOutlined />}
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => setTypeModalOpen(true)}
                                  >
                                    {t("สร้างประเภทใหม่")}
                                  </Button>
                                </div>
                              ) : null}
                            </>
                          )}
                        />
                      </Form.Item>
                      {canCreateType ? (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => setTypeModalOpen(true)}
                          aria-label={t("สร้างประเภทใหม่")}
                        >
                          {t("สร้าง")}
                        </Button>
                      ) : null}
                    </div>
                    <p className={styles.typeHint}>
                      <Link href="/masters/stock-adjustment-types">
                        {t("จัดการประเภทใบปรับปรุงสต๊อก")}
                      </Link>
                    </p>
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label={t("เหตุผล")}
                    name="reason"
                    rules={[
                      { required: true, message: t("กรุณาระบุเหตุผล") },
                      { whitespace: true, message: t("กรุณาระบุเหตุผล") },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder={t("เช่น พบของเกินจากการนับ / ของเสียหาย")}
                    />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{t("รายการปรับปรุง")}</h2>
                  <p className={styles.sectionHint}>
                    {t("Lot ไม่บังคับ — ถ้าเลือก Lot จะปรับทั้งยอด Lot และยอดคลัง")}
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
                        const lineLocations = locations.filter(
                          (loc) => loc.warehouseId === line?.warehouseId,
                        );
                        const availableLots = lots.filter(
                          (lot) =>
                            lot.itemId === line?.itemId &&
                            (!line?.warehouseId ||
                              lot.warehouseId === line.warehouseId) &&
                            (!line?.locationId ||
                              lot.locationId === line.locationId),
                        );
                        const selectedLot = availableLots.find(
                          (lot) => lot.lotId === line?.lotId,
                        );

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
                                rules={[
                                  { required: true, message: t("เลือกสินค้า") },
                                ]}
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
                                rules={[
                                  { required: true, message: t("เลือกหน่วย") },
                                ]}
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
                                label={t("คลัง")}
                                name={[name, "warehouseId"]}
                                rules={[
                                  { required: true, message: t("เลือกคลัง") },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  options={warehouses.map((w) => ({
                                    value: w.id,
                                    label: `${w.warehouseCode} — ${w.warehouseName}`,
                                  }))}
                                  onChange={() => {
                                    form.setFieldValue(
                                      ["items", name, "locationId"],
                                      undefined,
                                    );
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
                                label={t("ตำแหน่ง")}
                                name={[name, "locationId"]}
                                rules={[
                                  { required: true, message: t("เลือกตำแหน่ง") },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.warehouseId}
                                  placeholder={
                                    !line?.warehouseId
                                      ? t("เลือกคลังก่อน")
                                      : t("เลือกตำแหน่ง")
                                  }
                                  options={lineLocations.map((loc) => ({
                                    value: loc.id,
                                    label: `${loc.locationCode} — ${loc.locationName}`,
                                  }))}
                                  onChange={() => {
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
                                label={t("Lot (ถ้ามี)")}
                                name={[name, "lotId"]}
                              >
                                <Select
                                  allowClear
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.itemId || !line?.locationId}
                                  placeholder={
                                    !line?.itemId || !line?.locationId
                                      ? t("เลือกสินค้าและตำแหน่งก่อน")
                                      : t("ไม่ระบุ Lot")
                                  }
                                  options={availableLots.map((lot) => ({
                                    value: lot.lotId,
                                    label: `${lot.lotNo} (${t("คงเหลือ")} ${lot.quantityOnHand})`,
                                  }))}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("จำนวนปรับ (+/−)")}
                                name={[name, "adjustQuantity"]}
                                rules={[
                                  {
                                    required: true,
                                    message: t("กรอกจำนวนปรับ"),
                                  },
                                  {
                                    validator: async (_, value) => {
                                      if (
                                        value == null ||
                                        Number(value) === 0
                                      ) {
                                        return Promise.reject(
                                          new Error(t("จำนวนต้องไม่เป็นศูนย์")),
                                        );
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  placeholder={t("เช่น 10 หรือ -5")}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label={t("ต้นทุน/หน่วย")}
                                name={[name, "unitCost"]}
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  placeholder={t("ถ้ามี")}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={`${styles.field} ${styles.formGridFull}`}
                                label={t("หมายเหตุบรรทัด")}
                                name={[name, "remark"]}
                              >
                                <Input placeholder={t("ถ้ามี")} />
                              </Form.Item>
                            </div>

                            {selectedLot ? (
                              <p className={styles.sectionHint}>
                                {t("ยอด Lot ปัจจุบัน (อ้างอิง):")}{" "}
                                {selectedLot.quantityOnHand} —{" "}
                                {t("ยอดจริงตอนอนุมัติ จะคำนวณจากฐานข้อมูลอีกครั้ง")}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}

                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => add({})}
                        block
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
                {t("บันทึกแล้วสถานะจะเป็น DRAFT — ส่งอนุมัติแล้วให้หัวหน้าคลังอนุมัติก่อนปรับสต๊อกจริง")}
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push(scopePath("/inventory/stock-adjustments"))}
                >
                  {t("ยกเลิก")}
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? t("บันทึกร่าง") : t("บันทึกการแก้ไข")}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>{t("สรุปแบบฟอร์ม")}</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? t("ใบปรับปรุงใหม่") : t("แก้ไข DRAFT")}
              </h2>
              <p className={styles.summaryLead}>
                {t("ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ")}
              </p>
            </div>

            <div>
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
                {t("หลังบันทึก → ส่งอนุมัติ → หัวหน้าคลังอนุมัติ → ปรับสต๊อกจริง")}
              </p>
            </div>
          </aside>
        </div>
      </Form>

      <StockAdjustmentTypeFormModal
        open={typeModalOpen}
        mode="create"
        confirmLoading={createTypeMutation.isPending}
        onCancel={() => setTypeModalOpen(false)}
        onSubmit={(values) => {
          createTypeMutation.mutate(values, {
            onSuccess: (response) => {
              form.setFieldValue("adjustmentType", response.data.code);
              setTypeModalOpen(false);
            },
          });
        }}
      />
    </div>
  );
}
