"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, InputNumber, Select, Typography } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCreateChemicalIssueMutation,
  useUpdateChemicalIssueMutation,
} from "@/hooks/chemical-issues/useChemicalIssueMutations";
import { useChemicalIssueQuery } from "@/hooks/chemical-issues/useChemicalIssuesQuery";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useEnteredUnitCeiling } from "@/hooks/unit-conversions/useEnteredUnitCeiling";
import { BaseQtyHint } from "@/components/common/BaseQtyHint";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateChemicalIssueBody } from "@/types/chemical-issues";
import { CHEMICAL_ISSUE_PURPOSE_OPTIONS } from "@/types/chemical-issues";
import styles from "./ChemicalIssueFormPage.module.css";

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
  purpose?: string;
  purposeDetail?: string;
  remark?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

export default function ChemicalIssueFormPage({ mode, id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useChemicalIssueQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateChemicalIssueMutation();
  const updateMutation = useUpdateChemicalIssueMutation();

  const itemsQuery = useItemsQuery({ isActive: true, itemCategoryCode: "CHEMICAL" });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const lotsQuery = useInventoryLotsQuery({ hasStock: true });

  const items = itemsQuery.data?.data ?? [];
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("CHEMICAL_ISSUES");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const resolveCeiling = useEnteredUnitCeiling();
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
      form.setFieldsValue({ issueDate: dayjs(), items: [{}] });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(`/inventory/chemical-issues/${data.id}`);
      return;
    }

    form.setFieldsValue({
      issueDate: dayjs(data.issueDate),
      purpose: data.purpose,
      purposeDetail: data.purposeDetail,
      remark: data.remark,
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
              : `รายการที่ ${index + 1} (รอเลือกสารเคมี)`,
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items],
  );

  const onFinish = async (values: FormValues) => {
    const body: CreateChemicalIssueBody = {
      issueDate: values.issueDate.format("YYYY-MM-DD"),
      purpose: values.purpose as string,
      purposeDetail: values.purposeDetail?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
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
      router.push(`/inventory/chemical-issues/${response.data.id}`);
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(`/inventory/chemical-issues/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ExperimentOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Chemical Issue</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "สร้างใบเบิกจ่ายสารเคมี" : "แก้ไขใบเบิกจ่ายสารเคมี"}
          </h1>
          <p className={styles.pageSubtitle}>
            เลือกสารเคมี/Lot ที่มีสต๊อกพอ บันทึกเป็น DRAFT แล้วส่งอนุมัติจากหน้ารายละเอียด
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href="/inventory/chemical-issues">
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
                    label="วัตถุประสงค์การใช้"
                    name="purpose"
                    rules={[{ required: true, message: "กรุณาเลือกวัตถุประสงค์" }]}
                  >
                    <Select
                      placeholder="เลือกวัตถุประสงค์"
                      options={CHEMICAL_ISSUE_PURPOSE_OPTIONS}
                    />
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="รายละเอียดวัตถุประสงค์"
                    name="purposeDetail"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="เช่น ใช้ในกระบวนการผลิตไลน์ 2 Batch #123 (ถ้ามี)"
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
                  <h2 className={styles.sectionTitle}>รายการเบิกจ่ายสารเคมี</h2>
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
                        const availableLocations = locations.filter(
                          (loc) => loc.warehouseId === line?.warehouseId,
                        );
                        const availableLots = lots.filter(
                          (lot) =>
                            lot.itemId === line?.itemId &&
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
                                label="สารเคมี"
                                name={[name, "itemId"]}
                                rules={[{ required: true, message: "เลือกสารเคมี" }]}
                              >
                                <Select
                                  placeholder="ค้นหา/เลือกสารเคมี"
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
                                rules={[{ required: true, message: "เลือกตำแหน่ง" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!line?.warehouseId}
                                  options={availableLocations.map((loc) => ({
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
                                      ? "เลือกสารเคมี/คลัง/ตำแหน่งก่อน"
                                      : "เลือก Lot"
                                  }
                                  options={availableLots.map((lot) => ({
                                    value: lot.lotId,
                                    label: `${lot.lotNo} — คงเหลือ ${lot.quantityAvailable}`,
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
                  onClick={() => router.push("/inventory/chemical-issues")}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? "บันทึกใบเบิกจ่ายสารเคมี" : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปแบบฟอร์ม</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? "ใบเบิกจ่ายสารเคมีใหม่" : "แก้ไข DRAFT"}
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
