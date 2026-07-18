"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useUpdateGoodsReceiptMutation } from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import { useGoodsReceiptQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import styles from "./GoodsReceiptFormPage.module.css";

type LineValues = {
  id: string;
  purchaseOrderItemId?: string;
  itemLabel: string;
  quantity: number;
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

  const data = detailQuery.data?.data;
  const warehouses = warehousesQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];
  const watchedItems = Form.useWatch("items", form) ?? [];

  useEffect(() => {
    if (!data) return;
    if (data.status !== "DRAFT") {
      router.replace(`/goods-receipts/${data.id}`);
      return;
    }
    form.setFieldsValue({
      grDate: dayjs(data.grDate),
      remark: data.remark,
      items: (data.items ?? []).map((item) => ({
        id: item.id,
        purchaseOrderItemId: item.purchaseOrderItemId,
        itemLabel: `${item.itemCode ?? ""} — ${item.itemNameTh ?? ""}`,
        quantity: Number(item.quantity),
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        lotNo: item.lotNo,
      })),
    });
  }, [data, form, router]);

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
          quantity: Number(item.quantity),
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
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <EditOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Goods Receipt</p>
          <h1 className={styles.pageTitle}>แก้ไขใบรับของ</h1>
          <p className={styles.pageSubtitle}>{data.grNo}</p>
        </div>
        <div className={styles.backLink}>
          <Link href={`/goods-receipts/${data.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ</Button>
          </Link>
        </div>
      </header>

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
                        const locs = locations.filter(
                          (loc) => loc.warehouseId === line?.warehouseId,
                        );
                        return (
                          <div key={key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>
                                {line?.itemLabel || `รายการที่ ${index + 1}`}
                              </strong>
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
                            <div className={styles.lineGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="จำนวนรับ"
                                name={[name, "quantity"]}
                                rules={[{ required: true }]}
                              >
                                <InputNumber
                                  min={0.001}
                                  style={{ width: "100%" }}
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
