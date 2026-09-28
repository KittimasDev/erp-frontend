"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  useCreateStockAdjustmentMutation,
  useUpdateStockAdjustmentMutation,
} from "@/hooks/stock-adjustments/useStockAdjustmentMutations";
import { useStockAdjustmentQuery } from "@/hooks/stock-adjustments/useStockAdjustmentsQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateStockAdjustmentBody } from "@/types/stock-adjustments";
import { STOCK_ADJUSTMENT_TYPE_LABEL } from "@/types/stock-adjustments";
import styles from "./StockAdjustmentFormPage.module.css";

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
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useStockAdjustmentQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateStockAdjustmentMutation();
  const updateMutation = useUpdateStockAdjustmentMutation();

  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const lotsQuery = useInventoryLotsQuery({});

  const items = itemsQuery.data?.data ?? [];
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
      router.replace(`/inventory/stock-adjustments/${data.id}`);
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
              : `รายการที่ ${index + 1} (รอเลือกสินค้า)`,
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items],
  );

  const onFinish = async (values: FormValues) => {
    const body: CreateStockAdjustmentBody = {
      adjustmentDate: values.adjustmentDate.format("YYYY-MM-DD"),
      adjustmentType: values.adjustmentType,
      reason: values.reason.trim(),
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
      router.push(`/inventory/stock-adjustments/${response.data.id}`);
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(`/inventory/stock-adjustments/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SwapOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Stock Adjustment</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "สร้างใบปรับปรุงสต๊อก" : "แก้ไขใบปรับปรุงสต๊อก"}
          </h1>
          <p className={styles.pageSubtitle}>
            กรอกจำนวนแบบมีเครื่องหมาย (+ เพิ่ม / − ลด) ต่อบรรทัด — สต๊อกจะเปลี่ยนเมื่ออนุมัติเท่านั้น
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href="/inventory/stock-adjustments">
            <Button icon={<ArrowLeftOutlined />}>กลับรายการ</Button>
          </Link>
        </div>
      </header>

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
                  <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
                  <p className={styles.sectionHint}>
                    เลขที่ใบปรับปรุงจะสร้างอัตโนมัติเมื่อบันทึก
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่"
                    name="adjustmentDate"
                    rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label="ประเภท"
                    name="adjustmentType"
                    rules={[{ required: true, message: "เลือกประเภท" }]}
                  >
                    <Select
                      options={Object.entries(STOCK_ADJUSTMENT_TYPE_LABEL).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="เหตุผล"
                    name="reason"
                    rules={[
                      { required: true, message: "กรุณาระบุเหตุผล" },
                      { whitespace: true, message: "กรุณาระบุเหตุผล" },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="เช่น พบของเกินจากการนับ / ของเสียหาย"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>รายการปรับปรุง</h2>
                  <p className={styles.sectionHint}>
                    Lot ไม่บังคับ — ถ้าเลือก Lot จะปรับทั้งยอด Lot และยอดคลัง
                  </p>
                </div>

                <Form.List
                  name="items"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (!value || value.length < 1) {
                          return Promise.reject(
                            new Error("ต้องมีรายการอย่างน้อย 1 รายการ"),
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
                              <strong>รายการที่ {index + 1}</strong>
                              {fields.length > 1 ? (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                >
                                  ลบ
                                </Button>
                              ) : null}
                            </div>

                            <div className={styles.lineGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="สินค้า"
                                name={[name, "itemId"]}
                                rules={[
                                  { required: true, message: "เลือกสินค้า" },
                                ]}
                              >
                                <Select
                                  placeholder="ค้นหา/เลือกสินค้า"
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
                                label="หน่วย"
                                name={[name, "unitId"]}
                                rules={[
                                  { required: true, message: "เลือกหน่วย" },
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
                                label="คลัง"
                                name={[name, "warehouseId"]}
                                rules={[
                                  { required: true, message: "เลือกคลัง" },
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
                                label="ตำแหน่ง"
                                name={[name, "locationId"]}
                                rules={[
                                  { required: true, message: "เลือกตำแหน่ง" },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.warehouseId}
                                  placeholder={
                                    !line?.warehouseId
                                      ? "เลือกคลังก่อน"
                                      : "เลือกตำแหน่ง"
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
                                label="Lot (ถ้ามี)"
                                name={[name, "lotId"]}
                              >
                                <Select
                                  allowClear
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.itemId || !line?.locationId}
                                  placeholder={
                                    !line?.itemId || !line?.locationId
                                      ? "เลือกสินค้าและตำแหน่งก่อน"
                                      : "ไม่ระบุ Lot"
                                  }
                                  options={availableLots.map((lot) => ({
                                    value: lot.lotId,
                                    label: `${lot.lotNo} (คงเหลือ ${lot.quantityOnHand})`,
                                  }))}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="จำนวนปรับ (+/−)"
                                name={[name, "adjustQuantity"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "กรอกจำนวนปรับ",
                                  },
                                  {
                                    validator: async (_, value) => {
                                      if (
                                        value == null ||
                                        Number(value) === 0
                                      ) {
                                        return Promise.reject(
                                          new Error("จำนวนต้องไม่เป็นศูนย์"),
                                        );
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  placeholder="เช่น 10 หรือ -5"
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="ต้นทุน/หน่วย"
                                name={[name, "unitCost"]}
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  placeholder="ถ้ามี"
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={`${styles.field} ${styles.formGridFull}`}
                                label="หมายเหตุบรรทัด"
                                name={[name, "remark"]}
                              >
                                <Input placeholder="ถ้ามี" />
                              </Form.Item>
                            </div>

                            {selectedLot ? (
                              <p className={styles.sectionHint}>
                                ยอด Lot ปัจจุบัน (อ้างอิง):{" "}
                                {selectedLot.quantityOnHand} — ยอดจริงตอนอนุมัติ
                                จะคำนวณจากฐานข้อมูลอีกครั้ง
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
                        เพิ่มรายการ
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}
                </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                บันทึกแล้วสถานะจะเป็น DRAFT — ส่งอนุมัติแล้วให้หัวหน้าคลังอนุมัติก่อนปรับสต๊อกจริง
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push("/inventory/stock-adjustments")}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? "บันทึกร่าง" : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปแบบฟอร์ม</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? "ใบปรับปรุงใหม่" : "แก้ไข DRAFT"}
              </h2>
              <p className={styles.summaryLead}>
                ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ
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
                <p className={styles.previewMeta}>ยังไม่มีรายการ</p>
              )}
            </div>

            <div className={styles.flowNote}>
              <strong>ขั้นตอนถัดไป</strong>
              <p>
                หลังบันทึก → ส่งอนุมัติ → หัวหน้าคลังอนุมัติ → ปรับสต๊อกจริง
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
