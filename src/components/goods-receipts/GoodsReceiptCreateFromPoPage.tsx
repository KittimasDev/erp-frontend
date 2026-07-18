"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import { ArrowLeftOutlined, InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useCreateGoodsReceiptFromPoMutation } from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import styles from "./GoodsReceiptFormPage.module.css";

const EMPTY_GRS: never[] = [];
const EMPTY_WAREHOUSES: never[] = [];
const EMPTY_LOCATIONS: never[] = [];

type LineValues = {
  selected: boolean;
  purchaseOrderItemId: string;
  quantity?: number;
  warehouseId?: string;
  locationId?: string;
  lotNo?: string;
};

type FormValues = {
  grDate: dayjs.Dayjs;
  remark?: string;
  items: LineValues[];
};

type Props = { purchaseOrderId: string };

export default function GoodsReceiptCreateFromPoPage({
  purchaseOrderId,
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const poQuery = usePurchaseOrderQuery(purchaseOrderId);
  const grByPoQuery = useGoodsReceiptsByPoQuery(purchaseOrderId);
  const createMutation = useCreateGoodsReceiptFromPoMutation();
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });

  const po = poQuery.data?.data;
  const existingGrs = Array.isArray(grByPoQuery.data?.data)
    ? grByPoQuery.data.data
    : EMPTY_GRS;
  const warehouses = Array.isArray(warehousesQuery.data?.data)
    ? warehousesQuery.data.data
    : EMPTY_WAREHOUSES;
  const locations = Array.isArray(locationsQuery.data?.data)
    ? locationsQuery.data.data
    : EMPTY_LOCATIONS;
  const watchedItems = Form.useWatch("items", form) ?? [];

  const receivedByPoItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const gr of existingGrs) {
      if (gr.status === "CANCELLED") continue;
      for (const item of gr.items ?? []) {
        if (!item.purchaseOrderItemId) continue;
        const prev = map.get(item.purchaseOrderItemId) ?? 0;
        map.set(item.purchaseOrderItemId, prev + Number(item.quantity));
      }
    }
    return map;
  }, [existingGrs]);

  const lineMetaByPoItemId = useMemo(() => {
    const map = new Map<
      string,
      {
        itemLabel: string;
        orderedQty: number;
        receivedQty: number;
        remainingQty: number;
        unitLabel: string;
      }
    >();
    for (const item of po?.items ?? []) {
      const ordered = Number(item.quantity);
      const received = receivedByPoItem.get(item.id) ?? 0;
      const remaining = Number(Math.max(0, ordered - received).toFixed(3));
      map.set(item.id, {
        itemLabel: `${item.itemCode ?? ""} — ${item.itemNameTh ?? ""}`,
        orderedQty: ordered,
        receivedQty: received,
        remainingQty: remaining,
        unitLabel: item.unitNameTh ?? item.unitCode ?? "",
      });
    }
    return map;
  }, [po?.items, receivedByPoItem]);

  const receivable =
    po?.status === "CONFIRMED" || po?.status === "PARTIALLY_RECEIVED";

  useEffect(() => {
    if (!po || !receivable) return;

    form.setFieldsValue({
      grDate: dayjs(),
      remark: undefined,
      items: (po.items ?? []).map((item) => {
        const meta = lineMetaByPoItemId.get(item.id);
        const remaining = meta?.remainingQty ?? 0;
        return {
          selected: remaining > 0,
          purchaseOrderItemId: item.id,
          quantity: remaining > 0 ? remaining : undefined,
          warehouseId: item.expectedWarehouseId ?? undefined,
          locationId: item.expectedLocationId ?? undefined,
          lotNo: undefined,
        };
      }),
    });
  }, [form, po, receivable, lineMetaByPoItemId]);

  if (poQuery.isLoading || grByPoQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (poQuery.isError || grByPoQuery.isError) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          title="โหลดข้อมูลไม่สำเร็จ"
          description="ไม่สามารถโหลดใบสั่งซื้อหรือประวัติการรับของได้ ลองรีเฟรชหน้าอีกครั้ง"
        />
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className={styles.page}>
        ไม่พบใบสั่งซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับ</Link>
        </div>
      </div>
    );
  }

  if (!receivable) {
    return (
      <div className={styles.page}>
        <Alert
          type="warning"
          showIcon
          title="ใบสั่งซื้อนี้ยังรับของไม่ได้"
          description={`สถานะปัจจุบัน: ${po.status} — รับของได้เมื่อสถานะเป็น CONFIRMED หรือ PARTIALLY_RECEIVED`}
        />
        <div style={{ marginTop: 12 }}>
          <Link href={`/purchase-orders/${po.id}`}>กลับไปใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const selected = values.items.filter((item) => {
      if (!item.selected || (item.quantity ?? 0) <= 0) return false;
      const remaining =
        lineMetaByPoItemId.get(item.purchaseOrderItemId)?.remainingQty ?? 0;
      return remaining > 0;
    });
    if (!selected.length) {
      form.setFields([
        {
          name: "items",
          errors: ["เลือกอย่างน้อย 1 รายการที่ต้องการรับ"],
        },
      ]);
      return;
    }

    for (const item of selected) {
      const remaining =
        lineMetaByPoItemId.get(item.purchaseOrderItemId)?.remainingQty ?? 0;
      const label =
        lineMetaByPoItemId.get(item.purchaseOrderItemId)?.itemLabel ??
        "รายการ";
      if (!item.warehouseId || !item.locationId) {
        form.setFields([
          {
            name: "items",
            errors: ["ระบุคลังและตำแหน่งจัดเก็บให้ครบทุกรายการที่รับ"],
          },
        ]);
        return;
      }
      if ((item.quantity ?? 0) > remaining + 1e-9) {
        form.setFields([
          {
            name: "items",
            errors: [`${label} รับเกินจำนวนที่เหลือ`],
          },
        ]);
        return;
      }
    }

    const response = await createMutation.mutateAsync({
      purchaseOrderId,
      body: {
        grDate: values.grDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        items: selected.map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          quantity: Number(item.quantity),
          warehouseId: item.warehouseId!,
          locationId: item.locationId!,
          lotNo: item.lotNo?.trim() || undefined,
        })),
      },
    });
    router.push(`/goods-receipts/${response.data.id}`);
  };

  const hasReceivableLines = Array.from(lineMetaByPoItemId.values()).some(
    (meta) => meta.remainingQty > 0,
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Goods Receipt</p>
          <h1 className={styles.pageTitle}>สร้างใบรับของจาก PO</h1>
          <p className={styles.pageSubtitle}>
            {po.poNo} · {po.creditor?.nameTh ?? "—"}
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href={`/purchase-orders/${po.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ PO</Button>
          </Link>
        </div>
      </header>

      {!hasReceivableLines ? (
        <Alert
          type="info"
          showIcon
          title="รายการในใบสั่งซื้อนี้รับครบแล้ว"
          description="ไม่มีจำนวนคงเหลือให้รับเพิ่ม"
        />
      ) : null}

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
                        const poItemId =
                          line?.purchaseOrderItemId ??
                          (po.items ?? [])[index]?.id ??
                          "";
                        const meta = lineMetaByPoItemId.get(poItemId);
                        const remainingQty = meta?.remainingQty ?? 0;
                        const disabled = remainingQty <= 0;
                        const locs = locations.filter(
                          (loc) => loc.warehouseId === line?.warehouseId,
                        );
                        return (
                          <div key={key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <Form.Item
                                {...restField}
                                name={[name, "selected"]}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Checkbox disabled={disabled}>
                                  {meta?.itemLabel || `รายการที่ ${index + 1}`}
                                </Checkbox>
                              </Form.Item>
                              <span>
                                สั่ง {meta?.orderedQty ?? 0} · รับแล้ว{" "}
                                {meta?.receivedQty ?? 0} · เหลือ {remainingQty}{" "}
                                {meta?.unitLabel}
                              </span>
                            </div>
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
                                rules={[
                                  {
                                    validator: async (_, value) => {
                                      if (!line?.selected) return;
                                      if (!(value > 0)) {
                                        throw new Error("ต้องมากกว่า 0");
                                      }
                                      if (value > remainingQty + 1e-9) {
                                        throw new Error("เกินจำนวนที่เหลือ");
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={0.001}
                                  max={remainingQty || undefined}
                                  style={{ width: "100%" }}
                                  disabled={disabled || !line?.selected}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="คลัง"
                                name={[name, "warehouseId"]}
                                rules={[
                                  {
                                    validator: async (_, value) => {
                                      if (!line?.selected) return;
                                      if (!value) throw new Error("เลือกคลัง");
                                    },
                                  },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={disabled || !line?.selected}
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
                                rules={[
                                  {
                                    validator: async (_, value) => {
                                      if (!line?.selected) return;
                                      if (!value)
                                        throw new Error("เลือกตำแหน่ง");
                                    },
                                  },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={
                                    disabled ||
                                    !line?.selected ||
                                    !line?.warehouseId
                                  }
                                  options={locs.map((loc) => ({
                                    value: loc.id,
                                    label: `${loc.locationCode} — ${loc.locationName}`,
                                  }))}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="Lot (ถ้ามี)"
                                name={[name, "lotNo"]}
                              >
                                <Input
                                  disabled={disabled || !line?.selected}
                                />
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
                <Button
                  onClick={() =>
                    router.push(`/purchase-orders/${purchaseOrderId}`)
                  }
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  disabled={!hasReceivableLines}
                >
                  สร้างใบรับของ
                </Button>
              </div>
            </div>
          </section>
          <aside className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>จาก PO</p>
            <h2 className={styles.summaryTitle}>{po.poNo}</h2>
            <p className={styles.summaryLead}>
              เลือกเฉพาะรายการที่รับรอบนี้ได้ (partial receive)
            </p>
          </aside>
        </div>
      </Form>
    </div>
  );
}
