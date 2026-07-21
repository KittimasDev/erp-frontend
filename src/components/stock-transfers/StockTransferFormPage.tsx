"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, InputNumber, Select, Typography } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  useCreateStockTransferMutation,
  useUpdateStockTransferMutation,
} from "@/hooks/stock-transfers/useStockTransferMutations";
import { useStockTransferQuery } from "@/hooks/stock-transfers/useStockTransfersQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateStockTransferBody } from "@/types/stock-transfers";
import styles from "./StockTransferFormPage.module.css";

type LineValues = {
  itemId?: string;
  unitId?: string;
  quantity?: number;
  fromWarehouseId?: string;
  fromLocationId?: string;
  toWarehouseId?: string;
  toLocationId?: string;
  lotId?: string;
  remark?: string;
};

type FormValues = {
  transferDate: dayjs.Dayjs;
  remark?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

export default function StockTransferFormPage({ mode, id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useStockTransferQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateStockTransferMutation();
  const updateMutation = useUpdateStockTransferMutation();

  const itemsQuery = useItemsQuery({ isActive: true });
  const unitsQuery = useUnitsQuery({ isActive: true });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const lotsQuery = useInventoryLotsQuery({ hasStock: true });

  const items = (itemsQuery.data?.data ?? []).filter((item) => item.isIssueItem);
  const units = unitsQuery.data?.data ?? [];
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
      form.setFieldsValue({ transferDate: dayjs(), items: [{}] });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(`/inventory/stock-transfers/${data.id}`);
      return;
    }

    form.setFieldsValue({
      transferDate: dayjs(data.transferDate),
      remark: data.remark,
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        fromWarehouseId: item.fromWarehouseId,
        fromLocationId: item.fromLocationId,
        toWarehouseId: item.toWarehouseId,
        toLocationId: item.toLocationId,
        lotId: item.lotId,
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
          if (!item && line.quantity == null) return null;
          return {
            key: index,
            text: item
              ? `${item.itemNameTh} ${line.quantity ?? "-"}`
              : `รายการที่ ${index + 1} (รอเลือกสินค้า)`,
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items],
  );

  const onFinish = async (values: FormValues) => {
    for (const [index, line] of (values.items ?? []).entries()) {
      if (
        line.fromWarehouseId === line.toWarehouseId &&
        line.fromLocationId === line.toLocationId
      ) {
        form.setFields([
          {
            name: ["items", index, "toLocationId"],
            errors: ["ปลายทางต้องไม่ใช่ที่เดียวกับต้นทาง"],
          },
        ]);
        return;
      }
    }

    const body: CreateStockTransferBody = {
      transferDate: values.transferDate.format("YYYY-MM-DD"),
      remark: values.remark?.trim() || undefined,
      items: (values.items ?? []).map((item, index) => ({
        itemId: item.itemId as string,
        unitId: item.unitId as string,
        quantity: Number(item.quantity),
        fromWarehouseId: item.fromWarehouseId as string,
        fromLocationId: item.fromLocationId as string,
        toWarehouseId: item.toWarehouseId as string,
        toLocationId: item.toLocationId as string,
        lotId: item.lotId as string,
        remark: item.remark?.trim() || undefined,
        sortOrder: index,
      })),
    };

    if (mode === "create") {
      const response = await createMutation.mutateAsync(body);
      router.push(`/inventory/stock-transfers/${response.data.id}`);
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(`/inventory/stock-transfers/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SwapOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Stock Transfer</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "สร้างใบโอนย้ายสินค้า" : "แก้ไขใบโอนย้ายสินค้า"}
          </h1>
          <p className={styles.pageSubtitle}>
            เลือกสินค้า/Lot ต้นทางที่มีสต๊อกพอ และปลายทางที่ไม่ใช่ที่เดียวกับต้นทาง
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href="/inventory/stock-transfers">
            <Button icon={<ArrowLeftOutlined />}>กลับรายการ</Button>
          </Link>
        </div>
      </header>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ items: [{}] }}
        requiredMark="optional"
      >
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
                  <p className={styles.sectionHint}>
                    เลขที่ใบโอนย้ายจะสร้างอัตโนมัติเมื่อบันทึก
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่โอนย้าย"
                    name="transferDate"
                    rules={[{ required: true, message: "กรุณาเลือกวันที่โอนย้าย" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="หมายเหตุ"
                    name="remark"
                  >
                    <Input.TextArea rows={2} placeholder="หมายเหตุหัวเอกสาร (ถ้ามี)" />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>รายการโอนย้าย</h2>
                  <p className={styles.sectionHint}>
                    ต้องเลือก Lot ต้นทางที่มีสต๊อกคงเหลือพอ และปลายทางต้องไม่ใช่ที่เดียวกับต้นทาง
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
                        const toLocations = locations.filter(
                          (loc) => loc.warehouseId === line?.toWarehouseId,
                        );
                        const itemLots = lots.filter(
                          (lot) => lot.itemId === line?.itemId,
                        );
                        const availableLots = itemLots.filter(
                          (lot) =>
                            lot.warehouseId === line?.fromWarehouseId &&
                            lot.locationId === line?.fromLocationId,
                        );

                        const fromWarehouseStock = new Map<
                          string,
                          { code: string; name: string; qty: number }
                        >();
                        for (const lot of itemLots) {
                          const qty = Number(lot.quantityAvailable);
                          const existing = fromWarehouseStock.get(lot.warehouseId);
                          if (existing) {
                            existing.qty += qty;
                          } else {
                            fromWarehouseStock.set(lot.warehouseId, {
                              code: lot.warehouseCode,
                              name: lot.warehouseName,
                              qty,
                            });
                          }
                        }
                        const fromWarehouseOptions = Array.from(
                          fromWarehouseStock.entries(),
                        ).map(([value, info]) => ({
                          value,
                          label: `${info.code} — ${info.name} (คงเหลือ ${info.qty.toFixed(3)})`,
                        }));

                        const fromLocationStock = new Map<
                          string,
                          { code: string; name: string; qty: number }
                        >();
                        for (const lot of itemLots) {
                          if (lot.warehouseId !== line?.fromWarehouseId) continue;
                          const qty = Number(lot.quantityAvailable);
                          const existing = fromLocationStock.get(lot.locationId);
                          if (existing) {
                            existing.qty += qty;
                          } else {
                            fromLocationStock.set(lot.locationId, {
                              code: lot.locationCode,
                              name: lot.locationName,
                              qty,
                            });
                          }
                        }
                        const fromLocationOptions = Array.from(
                          fromLocationStock.entries(),
                        ).map(([value, info]) => ({
                          value,
                          label: `${info.code} — ${info.name} (คงเหลือ ${info.qty.toFixed(3)})`,
                        }));

                        const selectedLot = availableLots.find(
                          (lot) => lot.lotId === line?.lotId,
                        );
                        const selectedLotQty = selectedLot
                          ? Number(selectedLot.quantityAvailable)
                          : undefined;

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
                                rules={[{ required: true, message: "เลือกสินค้า" }]}
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
                                      ["items", name, "fromWarehouseId"],
                                      undefined,
                                    );
                                    form.setFieldValue(
                                      ["items", name, "fromLocationId"],
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
                                label="จำนวนโอนย้าย"
                                name={[name, "quantity"]}
                                dependencies={[["items", name, "lotId"]]}
                                rules={[
                                  { required: true, message: "ระบุจำนวน" },
                                  {
                                    validator: async (_, value) => {
                                      if (
                                        selectedLotQty != null &&
                                        value != null &&
                                        Number(value) > selectedLotQty
                                      ) {
                                        throw new Error(
                                          `จำนวนต้องไม่เกินคงเหลือ (${selectedLotQty.toFixed(3)})`,
                                        );
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={0.001}
                                  max={selectedLotQty}
                                  style={{ width: "100%" }}
                                  placeholder="0"
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="หน่วย"
                                name={[name, "unitId"]}
                                rules={[{ required: true, message: "เลือกหน่วย" }]}
                              >
                                <Select
                                  placeholder="หน่วย"
                                  showSearch
                                  optionFilterProp="label"
                                  options={units.map((unit) => ({
                                    value: unit.id,
                                    label: `${unit.code} — ${unit.nameTh}`,
                                  }))}
                                />
                              </Form.Item>
                            </div>

                            <div className={styles.routeBlock}>
                              <div className={styles.routeLabel}>ต้นทาง</div>
                              <div className={styles.lineGrid}>
                                <Form.Item
                                  {...restField}
                                  className={styles.field}
                                  label="คลังต้นทาง (มีสต๊อก)"
                                  name={[name, "fromWarehouseId"]}
                                  rules={[{ required: true, message: "เลือกคลังต้นทาง" }]}
                                >
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={!line?.itemId}
                                    placeholder={
                                      !line?.itemId
                                        ? "เลือกสินค้าก่อน"
                                        : fromWarehouseOptions.length === 0
                                          ? "ไม่มีสต๊อกคงเหลือสำหรับสินค้านี้"
                                          : "เลือกคลังต้นทาง"
                                    }
                                    options={fromWarehouseOptions}
                                    onChange={() => {
                                      form.setFieldValue(
                                        ["items", name, "fromLocationId"],
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
                                  label="ตำแหน่งต้นทาง (มีสต๊อก)"
                                  name={[name, "fromLocationId"]}
                                  rules={[{ required: true, message: "เลือกตำแหน่งต้นทาง" }]}
                                >
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={!line?.fromWarehouseId}
                                    options={fromLocationOptions}
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
                                  label="Lot ต้นทาง (คงเหลือ)"
                                  name={[name, "lotId"]}
                                  rules={[{ required: true, message: "เลือก Lot ต้นทาง" }]}
                                >
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={
                                      !line?.itemId ||
                                      !line?.fromWarehouseId ||
                                      !line?.fromLocationId
                                    }
                                    placeholder={
                                      !line?.itemId ||
                                      !line?.fromWarehouseId ||
                                      !line?.fromLocationId
                                        ? "เลือกสินค้า/คลัง/ตำแหน่งต้นทางก่อน"
                                        : "เลือก Lot"
                                    }
                                    options={availableLots.map((lot) => ({
                                      value: lot.lotId,
                                      label: `${lot.lotNo} — คงเหลือ ${lot.quantityAvailable}`,
                                    }))}
                                  />
                                </Form.Item>
                              </div>
                            </div>

                            <div className={styles.routeBlock}>
                              <div className={styles.routeLabel}>ปลายทาง</div>
                              <div className={styles.lineGridTwo}>
                                <Form.Item
                                  {...restField}
                                  className={styles.field}
                                  label="คลังปลายทาง"
                                  name={[name, "toWarehouseId"]}
                                  rules={[{ required: true, message: "เลือกคลังปลายทาง" }]}
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
                                        ["items", name, "toLocationId"],
                                        undefined,
                                      );
                                    }}
                                  />
                                </Form.Item>

                                <Form.Item
                                  {...restField}
                                  className={styles.field}
                                  label="ตำแหน่งปลายทาง"
                                  name={[name, "toLocationId"]}
                                  rules={[{ required: true, message: "เลือกตำแหน่งปลายทาง" }]}
                                >
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={!line?.toWarehouseId}
                                    options={toLocations.map((loc) => ({
                                      value: loc.id,
                                      label: `${loc.locationCode} — ${loc.locationName}`,
                                    }))}
                                  />
                                </Form.Item>
                              </div>
                            </div>

                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="หมายเหตุรายการ"
                              name={[name, "remark"]}
                            >
                              <Input placeholder="หมายเหตุ (ถ้ามี)" />
                            </Form.Item>
                          </div>
                        );
                      })}

                      <Button
                        block
                        className={styles.addLineButton}
                        icon={<PlusOutlined />}
                        onClick={() => add({})}
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
                บันทึกแล้วสถานะจะเป็น DRAFT — หัวหน้าคลังต้องอนุมัติก่อนตัด+เพิ่มสต๊อกจริง
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push("/inventory/stock-transfers")}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? "บันทึกใบโอนย้าย" : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปแบบฟอร์ม</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? "ใบโอนย้ายใหม่" : "แก้ไข DRAFT"}
              </h2>
              <p className={styles.summaryLead}>
                ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ
              </p>
            </div>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                รายการโอนย้าย
              </Typography.Text>
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
                หลังบันทึก → เปิดหน้ารายละเอียด → กด “อนุมัติ” →
                หัวหน้าคลังตัด+เพิ่มสต๊อกจริง
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
