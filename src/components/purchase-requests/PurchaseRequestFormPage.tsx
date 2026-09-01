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
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileAddOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { usePurchaseRequestTypesQuery } from "@/hooks/purchase-request-types/usePurchaseRequestTypesQuery";
import {
  useCreatePurchaseRequestMutation,
  useUpdatePurchaseRequestMutation,
} from "@/hooks/purchase-requests/usePurchaseRequestMutations";
import { usePurchaseRequestQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import type { CreatePurchaseRequestBody } from "@/types/purchase-requests";
import styles from "./PurchaseRequestFormPage.module.css";

type LineValues = {
  itemId?: string;
  unitId?: string;
  quantity?: number;
  requiredDate?: dayjs.Dayjs | null;
  description?: string;
  remark?: string;
};

type FormValues = {
  prDate: dayjs.Dayjs;
  purchaseRequestTypeId: string;
  departmentId?: string;
  objective?: string;
  remark?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

function formatQty(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("th-TH", {
    maximumFractionDigits: 3,
  });
}

export default function PurchaseRequestFormPage({ mode, id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = usePurchaseRequestQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreatePurchaseRequestMutation();
  const updateMutation = useUpdatePurchaseRequestMutation();

  const typesQuery = usePurchaseRequestTypesQuery({ isActive: true });
  const departmentsQuery = useDepartmentsQuery({ isActive: true });
  const itemsQuery = useItemsQuery({ isActive: true, isPurchaseItem: true });
  const unitsQuery = useUnitsQuery({ isActive: true });

  const types = typesQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  const { resolveUnitField } = useUnitFieldResolver(items);
  const units = unitsQuery.data?.data ?? [];

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedPrDate = Form.useWatch("prDate", form);
  const watchedTypeId = Form.useWatch("purchaseRequestTypeId", form);
  const watchedDeptId = Form.useWatch("departmentId", form);
  const watchedObjective = Form.useWatch("objective", form);

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({
        prDate: dayjs(),
        items: [{}],
      });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    // ใบที่ถูกส่งกลับแก้ไขต้องเข้าฟอร์มได้ ไม่งั้นแก้ตามที่สั่งไม่ได้
    if (data.status !== "DRAFT" && data.status !== "REVISING") {
      router.replace(`/purchase-requests/${data.id}`);
      return;
    }

    form.setFieldsValue({
      prDate: dayjs(data.prDate),
      purchaseRequestTypeId: data.purchaseRequestTypeId,
      departmentId: data.departmentId,
      objective: data.objective,
      remark: data.remark,
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        requiredDate: item.requiredDate ? dayjs(item.requiredDate) : null,
        description: item.description,
        remark: item.remark,
      })),
    });
  }, [detailQuery.data, form, mode, router]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const selectedType = useMemo(
    () => types.find((type) => type.id === watchedTypeId),
    [types, watchedTypeId],
  );

  const selectedDept = useMemo(
    () => departments.find((dept) => dept.id === watchedDeptId),
    [departments, watchedDeptId],
  );

  const previewLines = useMemo(
    () =>
      watchedItems
        .map((line, index) => {
          const item = items.find((row) => row.id === line.itemId);
          const unit = units.find((row) => row.id === line.unitId);
          if (!item && line.quantity == null) {
            return null;
          }
          return {
            key: index,
            text: item
              ? `${item.itemNameTh} ${formatQty(line.quantity)} ${
                  unit?.nameTh ?? unit?.code ?? ""
                }`.trim()
              : `รายการที่ ${index + 1} (รอเลือกสินค้า)`,
          };
        })
        .filter(Boolean) as Array<{ key: number; text: string }>,
    [watchedItems, items, units],
  );

  const filledCount = watchedItems.filter(
    (line) => line.itemId && line.unitId && line.quantity,
  ).length;

  const onFinish = async (values: FormValues) => {
    const body: CreatePurchaseRequestBody = {
      prDate: values.prDate.format("YYYY-MM-DD"),
      purchaseRequestTypeId: values.purchaseRequestTypeId,
      departmentId: values.departmentId,
      objective: values.objective?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
      items: (values.items ?? []).map((item, index) => ({
        itemId: item.itemId as string,
        unitId: item.unitId as string,
        quantity: Number(item.quantity),
        requiredDate: item.requiredDate
          ? item.requiredDate.format("YYYY-MM-DD")
          : undefined,
        description: item.description?.trim() || undefined,
        remark: item.remark?.trim() || undefined,
        sortOrder: index,
      })),
    };

    if (mode === "create") {
      const response = await createMutation.mutateAsync(body);
      router.push(`/purchase-requests/${response.data.id}`);
      return;
    }

    if (!id) return;
    const response = await updateMutation.mutateAsync({ id, body });
    router.push(`/purchase-requests/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileAddOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Request</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "สร้างใบขอซื้อ" : "แก้ไขใบขอซื้อ"}
          </h1>
          <p className={styles.pageSubtitle}>
            กรอกข้อมูลหัวเอกสารและรายการสินค้า บันทึกเป็น DRAFT
            แล้วส่งอนุมัติได้จากหน้ารายละเอียด
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href="/purchase-requests">
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
                    เลขที่ใบขอซื้อจะสร้างอัตโนมัติเมื่อบันทึก
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่ขอซื้อ"
                    name="prDate"
                    rules={[
                      { required: true, message: "กรุณาเลือกวันที่ขอซื้อ" },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label="ประเภทใบขอซื้อ"
                    name="purchaseRequestTypeId"
                    rules={[
                      {
                        required: true,
                        message: "กรุณาเลือกประเภทใบขอซื้อ",
                      },
                    ]}
                  >
                    <Select
                      placeholder="เลือกประเภท"
                      options={types.map((type) => ({
                        value: type.id,
                        label: `${type.code} — ${type.nameTh}`,
                      }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    className={styles.field}
                    label="ส่วนงานที่ขอซื้อ"
                    name="departmentId"
                  >
                    <Select
                      allowClear
                      placeholder="เลือกแผนก (ถ้ามี)"
                      options={departments.map((dept) => ({
                        value: dept.id,
                        label: `${dept.code} — ${dept.nameTh}`,
                      }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="วัตถุประสงค์"
                    name="objective"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="เช่น ใช้ในกระบวนการผลิต / ซ่อมบำรุง"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
                  <p className={styles.sectionHint}>
                    อย่างน้อย 1 รายการ · เลือกสินค้าแล้วหน่วยจะเติมให้อัตโนมัติ
                  </p>
                </div>

                <Form.List
                  name="items"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (!value || value.length < 1) {
                          return Promise.reject(
                            new Error("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ"),
                          );
                        }
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => (
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
                                options={items.map((item) => ({
                                  value: item.id,
                                  label: `${item.itemCode} — ${item.itemNameTh}`,
                                }))}
                                showSearch
                                optionFilterProp="label"
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
                                }}
                              />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="จำนวน"
                              name={[name, "quantity"]}
                              rules={[
                                { required: true, message: "ระบุจำนวน" },
                              ]}
                            >
                              <InputNumber
                                min={0.001}
                                step={1}
                                placeholder="0"
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
                          </div>

                          <div className={styles.lineGridSecondary}>
                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="ต้องการภายในวันที่"
                              name={[name, "requiredDate"]}
                            >
                              <DatePicker
                                style={{ width: "100%" }}
                                format="DD/MM/YYYY"
                                placeholder="ไม่ระบุ"
                              />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="รายละเอียด"
                              name={[name, "description"]}
                            >
                              <Input placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" />
                            </Form.Item>
                          </div>
                        </div>
                      ))}

                      <Button
                        block
                        className={styles.addLineButton}
                        icon={<PlusOutlined />}
                        onClick={() => add({})}
                      >
                        เพิ่มรายการสินค้า
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}
                </Form.List>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
                </div>
                <Form.Item className={styles.field} name="remark">
                  <Input.TextArea
                    rows={3}
                    placeholder="หมายเหตุหัวเอกสาร (ถ้ามี)"
                  />
                </Form.Item>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                บันทึกแล้วสถานะจะเป็น DRAFT — สามารถแก้ไขและส่งอนุมัติทีหลังได้
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push("/purchase-requests")}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  {mode === "create" ? "บันทึกใบขอซื้อ" : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปแบบฟอร์ม</p>
              <h2 className={styles.summaryTitle}>
                {mode === "create" ? "ใบขอซื้อใหม่" : "แก้ไข DRAFT"}
              </h2>
              <p className={styles.summaryLead}>
                ตรวจข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่เอกสารให้อัตโนมัติ
              </p>
            </div>

            <div className={styles.previewBox}>
              <span className={styles.previewLabel}>จำนวนรายการ</span>
              <p className={styles.previewValue}>
                {filledCount} / {Math.max(watchedItems.length, 1)}
              </p>
              <p className={styles.previewMeta}>
                รายการที่กรอกครบสินค้า · จำนวน · หน่วย
              </p>
            </div>

            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>วันที่</span>
                <strong>
                  {watchedPrDate
                    ? dayjs(watchedPrDate).format("DD/MM/YYYY")
                    : "—"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>ประเภท</span>
                <strong>
                  {selectedType
                    ? `${selectedType.code} — ${selectedType.nameTh}`
                    : "ยังไม่เลือก"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>แผนก</span>
                <strong>
                  {selectedDept
                    ? `${selectedDept.code} — ${selectedDept.nameTh}`
                    : "ไม่ระบุ"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>วัตถุประสงค์</span>
                <strong>
                  {watchedObjective?.trim()
                    ? watchedObjective.trim()
                    : "ไม่ระบุ"}
                </strong>
              </div>
            </div>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                รายการสินค้า
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
                หลังบันทึก → เปิดหน้ารายละเอียด → กด “ส่งอนุมัติ” →
                ผู้จัดการจัดซื้ออนุมัติ
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
