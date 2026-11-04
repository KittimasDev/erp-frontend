"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, Select, Spin } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import QuantityUnitInput, {
  makeQtyUnitValidator,
  type QuantityUnitValue,
} from "@/components/common/QuantityUnitInput";
import { useUpdateGoodsReceiptMutation } from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useUnitConversionIndex } from "@/hooks/unit-conversions/useUnitConversionIndex";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useGoodsReceiptQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import type { Item } from "@/types/items";
import type { Unit } from "@/types/units";
import styles from "./GoodsReceiptFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const EMPTY_ITEMS: Item[] = [];
const EMPTY_UNITS: Unit[] = [];

type LineValues = {
  id: string;
  purchaseOrderItemId?: string;
  itemLabel: string;
  itemId: string;
  /** หน่วยหลักของสินค้า — ถอยไปใช้หน่วยเดิมของบรรทัดถ้าหาไม่เจอ */
  baseUnitId?: string;
  baseUnitLabel?: string;
  qty?: QuantityUnitValue;
  warehouseId: string;
  locationId: string;
  lotNo?: string;
};

type FormValues = {
  grDate: dayjs.Dayjs;
  remark?: string;
  items: LineValues[];
};

type Props = { id: string };

export default function GoodsReceiptEditPage({ id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useGoodsReceiptQuery(id);
  const updateMutation = useUpdateGoodsReceiptMutation();
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  // ต้องรู้หน่วยหลักของสินค้าเพื่อเทียบกับหน่วยที่ผู้ใช้กรอกไว้เดิม
  const itemsQuery = useItemsQuery({ isActive: true });
  const unitsQuery = useUnitsQuery({ isActive: true });
  const { index: conversionIndex } = useUnitConversionIndex();

  const data = detailQuery.data?.data;
  const warehouses = warehousesQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? EMPTY_ITEMS;
  const units = unitsQuery.data?.data ?? EMPTY_UNITS;
  const mastersLoading = itemsQuery.isLoading || unitsQuery.isLoading;
  const watchedItems = Form.useWatch("items", form) ?? [];
  // กัน setFieldsValue ทับจำนวนที่ผู้ใช้กำลังพิมพ์ เมื่อ items/units เปลี่ยน identity
  const hydratedForIdRef = useRef<string | null>(null);

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const unitLabelById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.nameTh || unit.code])),
    [units],
  );

  useEffect(() => {
    if (!data) return;
    if (data.status !== "DRAFT") {
      router.replace(`/goods-receipts/${data.id}`);
      return;
    }
    if (mastersLoading) return;
    if (hydratedForIdRef.current === data.id) return;
    hydratedForIdRef.current = data.id;

    form.setFieldsValue({
      grDate: dayjs(data.grDate),
      remark: data.remark,
      items: (data.items ?? []).map((item) => {
        // หน่วยที่ผู้ใช้กรอกไว้เดิม — เอกสารก่อนเปิดใช้การแปลงหน่วยจะไม่มี entered*
        const enteredUnitId = item.enteredUnitId ?? item.unitId;
        const baseUnitId =
          item.baseUnitId ?? itemById.get(item.itemId)?.unitId ?? item.unitId;
        return {
          id: item.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          itemLabel: `${item.itemCode ?? ""} — ${item.itemNameTh ?? ""}`,
          itemId: item.itemId,
          baseUnitId,
          baseUnitLabel: unitLabelById.get(baseUnitId) ?? "",
          qty: {
            // decimal จาก backend เป็น string ต้อง Number() ก่อน
            quantity: Number(item.enteredQuantity ?? item.quantity),
            unitId: enteredUnitId,
          },
          warehouseId: item.warehouseId,
          locationId: item.locationId,
          lotNo: item.lotNo,
        };
      }),
    });
  }, [data, form, router, itemById, unitLabelById, mastersLoading]);

  if (detailQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        ไม่พบใบรับของ
        <div style={{ marginTop: 12 }}>
          <Link href="/goods-receipts">กลับ</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const response = await updateMutation.mutateAsync({
      id,
      body: {
        grDate: values.grDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        items: values.items.map((item, index) => ({
          id: item.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          // ส่งจำนวน+หน่วยที่กรอกไป backend เป็นคนแปลงเป็นหน่วยหลักให้
          quantity: Number(item.qty?.quantity),
          unitId: item.qty?.unitId,
          warehouseId: item.warehouseId,
          locationId: item.locationId,
          lotNo: item.lotNo?.trim() || undefined,
          sortOrder: index,
        })),
      },
    });
    router.push(`/goods-receipts/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Goods Receipt"
        icon={<EditOutlined />}
        title="แก้ไขใบรับของ"
        subtitle={data.grNo}
        actions={
          <>
<div className={styles.backLink}>
          <Link href={`/goods-receipts/${data.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ</Button>
          </Link>
        </div>
          </>
        }
      />

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่รับ"
                    name="grDate"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="หมายเหตุ"
                    name="remark"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <Form.List name="items">
                  {(fields) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => {
                        const line = watchedItems[index];
                        const persisted =
                          data.items?.find((item) => item.id === line?.id) ??
                          data.items?.[index];
                        const itemId = persisted?.itemId ?? line?.itemId;
                        const baseUnitId =
                          persisted?.baseUnitId ??
                          (itemId ? itemById.get(itemId)?.unitId : undefined) ??
                          persisted?.unitId ??
                          line?.baseUnitId;
                        const baseUnitLabel =
                          (baseUnitId
                            ? unitLabelById.get(baseUnitId)
                            : undefined) ?? line?.baseUnitLabel;
                        const locs = locations.filter(
                          (loc) => loc.warehouseId === line?.warehouseId,
                        );
                        const itemLabel =
                          line?.itemLabel ||
                          (persisted
                            ? `${persisted.itemCode ?? ""} — ${persisted.itemNameTh ?? ""}`
                            : `รายการที่ ${index + 1}`);
                        return (
                          <div key={key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>{itemLabel}</strong>
                            </div>
                            <Form.Item {...restField} name={[name, "id"]} hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "purchaseOrderItemId"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "itemId"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "baseUnitId"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "itemLabel"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <div className={styles.destGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="จำนวนรับ"
                                name={[name, "qty"]}
                                rules={[
                                  {
                                    validator: makeQtyUnitValidator({
                                      index: conversionIndex,
                                      itemId,
                                      baseUnitId,
                                      baseUnitLabel,
                                      units,
                                    }),
                                  },
                                ]}
                              >
                                <QuantityUnitInput
                                  index={conversionIndex}
                                  units={units}
                                  itemId={itemId}
                                  baseUnitId={baseUnitId}
                                  size="middle"
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="คลัง"
                                name={[name, "warehouseId"]}
                                rules={[{ required: true }]}
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
                                  }}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="ตำแหน่ง"
                                name={[name, "locationId"]}
                                rules={[{ required: true }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  options={locs.map((loc) => ({
                                    value: loc.id,
                                    label: `${loc.locationCode} — ${loc.locationName}`,
                                  }))}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="Lot"
                                name={[name, "lotNo"]}
                              >
                                <Input />
                              </Form.Item>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Form.List>
              </div>
            </div>
            <div className={styles.footerBar}>
              <div />
              <div className={styles.footerActions}>
                <Button onClick={() => router.push(`/goods-receipts/${id}`)}>
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                >
                  บันทึก
                </Button>
              </div>
            </div>
          </section>
          <aside className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>แก้ไข DRAFT</p>
            <h2 className={styles.summaryTitle}>{data.grNo}</h2>
            <p className={styles.summaryLead}>
              Confirm แล้วยังไม่ได้ — แก้ได้จนกว่าจะโพสต์สต๊อก
            </p>
          </aside>
        </div>
      </Form>
    </div>
  );
}
