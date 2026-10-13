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
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useEnteredUnitCeiling } from "@/hooks/unit-conversions/useEnteredUnitCeiling";
import { BaseQtyHint } from "@/components/common/BaseQtyHint";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useProductionOrdersQuery } from "@/hooks/production-orders/useProductionOrderQueries";
import {
  useCreateStockIssueMutation,
  useUpdateStockIssueMutation,
} from "@/hooks/stock-issues/useStockIssueMutations";
import { useStockIssueQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import type { CreateStockIssueBody } from "@/types/stock-issues";
import styles from "./MaterialIssueFormPage.module.css";

type LineValues = {
  itemId?: string;
  unitId?: string;
  quantity?: number;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  remark?: string;
};

type FormValues = {
  issueDate: dayjs.Dayjs;
  remark?: string;
  productionOrderId?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
  /**
   * หน้าเบิกสารเคมีแยก (TOR M9.4): เลือกได้เฉพาะสินค้าประเภทสารเคมี และเสนอเฉพาะ Lot ที่ยังไม่หมดอายุ
   * (Lot ที่ COA ยังไม่ผ่านไม่มียอดพร้อมใช้อยู่แล้ว จึงไม่โผล่ในตัวเลือก) — ระบบหลังบ้านตรวจซ้ำตอนบันทึก/อนุมัติ
   */
  chemicalOnly?: boolean;
};

export default function MaterialIssueFormPage({ mode, id, chemicalOnly = false }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useStockIssueQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateStockIssueMutation();
  const updateMutation = useUpdateStockIssueMutation();

  const itemsQuery = useItemsQuery({ isActive: true });
  const lotsQuery = useInventoryLotsQuery({ hasStock: true });
  const productionOrdersQuery = useProductionOrdersQuery({ limit: 100 });

  const items = (itemsQuery.data?.data ?? []).filter((item) =>
    chemicalOnly ? item.itemType === "CHEMICAL" : item.isIssueItem,
  );
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("STOCK_ISSUES");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const resolveCeiling = useEnteredUnitCeiling();
  const lots = (lotsQuery.data?.data ?? []).filter(
    (lot) => !chemicalOnly || lot.expiryStatus !== "EXPIRED",
  );
  const productionOrders = productionOrdersQuery.data?.data.items ?? [];

  const watchedItems = Form.useWatch("items", form) ?? [];

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({ issueDate: dayjs(), items: [{}] });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(`/inventory/material-issues/${data.id}`);
      return;
    }

    form.setFieldsValue({
      issueDate: dayjs(data.issueDate),
      remark: data.remark,
      productionOrderId: data.productionOrderId,
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        warehouseId: item.warehouseId,
        locationId: item.locationId,
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
    const body: CreateStockIssueBody = {
      issueDate: values.issueDate.format("YYYY-MM-DD"),
      remark: values.remark?.trim() || undefined,
      productionOrderId: values.productionOrderId || undefined,
      items: (values.items ?? []).map((item, index) => ({
        itemId: item.itemId as string,
        unitId: item.unitId as string,
        quantity: Number(item.quantity),
        warehouseId: item.warehouseId as string,
        locationId: item.locationId as string,
        lotId: item.lotId as string,
        remark: item.remark?.trim() || undefined,
        sortOrder: index,
      })),
    };

    if (mode === "create") {
      const response = await createMutation.mutateAsync(body);
      router.push(`/inventory/material-issues/${response.data.id}`);
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(`/inventory/material-issues/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SwapOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>{chemicalOnly ? "Chemical Issue" : "Material Issue"}</p>
          <h1 className={styles.pageTitle}>
            {chemicalOnly
              ? "เบิกสารเคมี"
              : mode === "create"
                ? "สร้างใบเบิกของ"
                : "แก้ไขใบเบิกของ"}
          </h1>
          <p className={styles.pageSubtitle}>
            {chemicalOnly
              ? "เลือกสารเคมีและ Lot (ผ่านการตรวจ COA และยังไม่หมดอายุ) ผูกใบสั่งผลิตที่นำไปใช้ บันทึกเป็น DRAFT แล้วส่งอนุมัติจากหน้ารายละเอียด — ใบเบิกอยู่ในรายการใบเบิกของตามปกติ"
              : "เลือกสินค้า/Lot ที่มีสต๊อกพอ บันทึกเป็น DRAFT แล้วส่งอนุมัติจากหน้ารายละเอียด"}
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href="/inventory/material-issues">
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
                    เลขที่ใบเบิกจะสร้างอัตโนมัติเมื่อบันทึก
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่เบิก"
                    name="issueDate"
                    rules={[{ required: true, message: "กรุณาเลือกวันที่เบิก" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label="ใบสั่งผลิต (optional)"
                    name="productionOrderId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="ผูกกับใบสั่งผลิต (ถ้ามี)"
                      loading={productionOrdersQuery.isLoading}
                      options={productionOrders.map((order) => ({
                        value: order.id,
                        label: `${order.orderNo}${order.batchNo ? ` · ${order.batchNo}` : ""}`,
                      }))}
                    />
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
                  <h2 className={styles.sectionTitle}>รายการเบิก</h2>
                  <p className={styles.sectionHint}>
                    ต้องเลือก Lot ที่มีสต๊อกคงเหลือพอสำหรับแต่ละรายการ
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
                        const lotsForItem = lots.filter(
                          (lot) =>
                            lot.itemId === line?.itemId &&
                            Number(lot.quantityAvailable) > 0,
                        );
                        const warehouseOptions = Array.from(
                          new Map(
                            lotsForItem
                              .filter((lot) => Boolean(lot.warehouseId))
                              .map((lot) => [
                                lot.warehouseId,
                                {
                                  value: lot.warehouseId,
                                  label: `${lot.warehouseCode} — ${lot.warehouseName}`,
                                },
                              ]),
                          ).values(),
                        );
                        const locationOptions = Array.from(
                          new Map(
                            lotsForItem
                              .filter(
                                (lot) =>
                                  Boolean(lot.locationId) &&
                                  line?.warehouseId &&
                                  lot.warehouseId === line.warehouseId,
                              )
                              .map((lot) => [
                                lot.locationId,
                                {
                                  value: lot.locationId,
                                  label: `${lot.locationCode} — ${lot.locationName}`,
                                },
                              ]),
                          ).values(),
                        );
                        const availableLots = lotsForItem.filter(
                          (lot) =>
                            lot.warehouseId === line?.warehouseId &&
                            lot.locationId === line?.locationId,
                        );
                        const selectedLot = availableLots.find(
                          (lot) => lot.lotId === line?.lotId,
                        );
                        const selectedLotBaseQty = selectedLot
                          ? Number(selectedLot.quantityAvailable)
                          : undefined;
                        /*
                          ยอดคงเหลือของ Lot เป็นหน่วยฐาน — ต้องแปลงเป็นหน่วยที่ผู้ใช้
                          กำลังกรอกก่อนเอาไปเทียบ ไม่งั้น "1 ตัน ไม่เกินคงเหลือ 500 กก."
                          จะผ่านฉลุยแล้วไปโดนปฏิเสธเอาที่ backend
                        */
                        const lineBaseUnitId = line?.itemId
                          ? items.find((it) => it.id === line.itemId)?.unitId
                          : undefined;
                        const ceiling = resolveCeiling({
                          itemId: line?.itemId,
                          unitId: line?.unitId,
                          baseUnitId: lineBaseUnitId,
                          baseCeiling: selectedLotBaseQty,
                        });
                        const selectedLotQty = ceiling.max;

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
                                      ["items", name, "warehouseId"],
                                      undefined,
                                    );
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
                                label="จำนวนเบิก"
                                name={[name, "quantity"]}
                                dependencies={[["items", name, "lotId"]]}
                                rules={[
                                  { required: true, message: "ระบุจำนวน" },
                                  {
                                    validator: async (_, value) => {
                                      // แปลงเพดานไม่ได้ = ไม่มีกฎแปลงคู่นี้ กดบันทึกไปก็โดนปฏิเสธ
                                      if (ceiling.unconvertible) {
                                        throw new Error(
                                          "ยังไม่มีกฎแปลงหน่วยคู่นี้ — เลือกหน่วยหลักของสินค้า หรือตั้งกฎที่ ข้อมูลหลัก > กฎแปลงหน่วยนับ",
                                        );
                                      }
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

                              {/* เงียบสนิทเมื่อกรอกด้วยหน่วยหลักอยู่แล้ว */}
                              <BaseQtyHint
                                itemId={line?.itemId}
                                unitId={line?.unitId}
                                quantity={line?.quantity}
                                baseUnitId={lineBaseUnitId}
                              />

                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="หน่วย"
                                name={[name, "unitId"]}
                                rules={[{ required: true, message: "เลือกหน่วย" }]}
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
                            </div>

                            <div className={styles.lineGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="คลัง"
                                name={[name, "warehouseId"]}
                                rules={[{ required: true, message: "เลือกคลัง" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  loading={lotsQuery.isLoading}
                                  disabled={!line?.itemId}
                                  placeholder={
                                    !line?.itemId
                                      ? "เลือกสินค้าเพื่อดูคลัง"
                                      : warehouseOptions.length === 0
                                        ? "ไม่มีคลังที่มีสต๊อก"
                                        : "เลือกคลังที่มีสต๊อก"
                                  }
                                  options={warehouseOptions}
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
                                rules={[{ required: true, message: "เลือกตำแหน่ง" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.itemId || !line?.warehouseId}
                                  loading={lotsQuery.isLoading}
                                  placeholder={
                                    !line?.warehouseId
                                      ? "เลือกคลังก่อน"
                                      : locationOptions.length === 0
                                        ? "ไม่มีตำแหน่งที่มีสต๊อก"
                                        : "เลือกตำแหน่งที่มีสต๊อก"
                                  }
                                  options={locationOptions}
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
                                label="Lot (คงเหลือ)"
                                name={[name, "lotId"]}
                                rules={[{ required: true, message: "เลือก Lot" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={
                                    !line?.itemId ||
                                    !line?.warehouseId ||
                                    !line?.locationId
                                  }
                                  placeholder={
                                    !line?.itemId ||
                                    !line?.warehouseId ||
                                    !line?.locationId
                                      ? "เลือกสินค้า/คลัง/ตำแหน่งก่อน"
                                      : "เลือก Lot"
                                  }
                                  options={availableLots.map((lot) => ({
                                    value: lot.lotId,
                                    label: chemicalOnly
                                      ? `${lot.lotNo}${lot.batchNo ? ` (Batch ${lot.batchNo})` : ""} — คงเหลือ ${lot.quantityAvailable}${lot.expiryDate ? ` · หมดอายุ ${lot.expiryDate}` : ""}${lot.expiryStatus === "CRITICAL" || lot.expiryStatus === "WARNING" ? " ⚠ ใกล้หมดอายุ" : ""}`
                                      : `${lot.lotNo} — คงเหลือ ${lot.quantityAvailable}`,
                                  }))}
                                />
                              </Form.Item>
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
                บันทึกแล้วสถานะจะเป็น DRAFT — หัวหน้าคลังต้องอนุมัติก่อนตัดสต๊อกจริง
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push("/inventory/material-issues")}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? "บันทึกใบเบิกของ" : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปแบบฟอร์ม</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? "ใบเบิกใหม่" : "แก้ไข DRAFT"}
              </h2>
              <p className={styles.summaryLead}>
                ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ
              </p>
            </div>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                รายการเบิก
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
                หัวหน้าคลังตัดสต๊อกจริง
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
