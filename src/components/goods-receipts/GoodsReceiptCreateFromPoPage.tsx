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
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateGoodsReceiptFromPoMutation } from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import styles from "./GoodsReceiptFormPage.module.css";

const EMPTY_GRS: never[] = [];
const EMPTY_WAREHOUSES: never[] = [];
const EMPTY_LOCATIONS: never[] = [];

type DestinationValues = {
  quantity?: number;
  warehouseId?: string;
  locationId?: string;
  lotNo?: string;
};

type LineValues = {
  selected: boolean;
  purchaseOrderItemId: string;
  destinations: DestinationValues[];
};

type FormValues = {
  grDate: dayjs.Dayjs;
  remark?: string;
  items: LineValues[];
};

type Props = {
  purchaseOrderId: string;
  backHref?: string;
  pageTitle?: string;
};

export default function GoodsReceiptCreateFromPoPage({
  purchaseOrderId,
  backHref,
  pageTitle = "รับของจากใบสั่งซื้อ",
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const goodsReceiptActions = useScreenActionPermissions("GOODS_RECEIPTS");
  const canView = goodsReceiptActions.canView;
  const canAdd = goodsReceiptActions.canAdd;
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

  const resolvedBackHref =
    backHref ?? `/purchase-orders/${purchaseOrderId}`;

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
        expectedWarehouseId?: string;
        expectedLocationId?: string;
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
        expectedWarehouseId: item.expectedWarehouseId,
        expectedLocationId: item.expectedLocationId,
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
          destinations:
            remaining > 0
              ? [
                  {
                    quantity: remaining,
                    warehouseId: item.expectedWarehouseId ?? undefined,
                    locationId: item.expectedLocationId ?? undefined,
                    lotNo: undefined,
                  },
                ]
              : [],
        };
      }),
    });
  }, [form, po, receivable, lineMetaByPoItemId]);

  if (!canView) {
    return (
      <AccessDenied screenCodes={["GOODS_RECEIPTS"]} />
    );
  }

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
          <Link href={resolvedBackHref}>กลับ</Link>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className={styles.page}>
        ไม่พบใบสั่งซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href={resolvedBackHref}>กลับ</Link>
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
    const flat: Array<{
      purchaseOrderItemId: string;
      quantity: number;
      warehouseId: string;
      locationId: string;
      lotNo?: string;
      label: string;
    }> = [];

    for (const item of values.items) {
      if (!item.selected) continue;
      const meta = lineMetaByPoItemId.get(item.purchaseOrderItemId);
      const remaining = meta?.remainingQty ?? 0;
      if (remaining <= 0) continue;
      const label = meta?.itemLabel ?? "รายการ";
      const destinations = (item.destinations ?? []).filter(
        (d) => (d.quantity ?? 0) > 0,
      );
      if (!destinations.length) continue;

      let sumQty = 0;
      for (const dest of destinations) {
        if (!dest.warehouseId || !dest.locationId) {
          form.setFields([
            {
              name: "items",
              errors: [`${label}: ระบุคลังและตำแหน่งให้ครบทุกปลายทาง`],
            },
          ]);
          return;
        }
        sumQty += Number(dest.quantity);
        flat.push({
          purchaseOrderItemId: item.purchaseOrderItemId,
          quantity: Number(dest.quantity),
          warehouseId: dest.warehouseId,
          locationId: dest.locationId,
          lotNo: dest.lotNo?.trim() || undefined,
          label,
        });
      }
      sumQty = Number(sumQty.toFixed(3));
      if (sumQty > remaining + 1e-9) {
        form.setFields([
          {
            name: "items",
            errors: [
              `${label}: รวมจำนวนปลายทาง ${sumQty} เกินที่เหลือ ${remaining}`,
            ],
          },
        ]);
        return;
      }
    }

    if (!flat.length) {
      form.setFields([
        {
          name: "items",
          errors: ["เลือกอย่างน้อย 1 รายการและระบุจำนวนรับ"],
        },
      ]);
      return;
    }

    const response = await createMutation.mutateAsync({
      purchaseOrderId,
      body: {
        grDate: values.grDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        items: flat.map(({ label: _label, ...item }) => item),
      },
    });
    router.push(`/goods-receipts/${response.data.id}`);
  };

  const hasReceivableLines = Array.from(lineMetaByPoItemId.values()).some(
    (meta) => meta.remainingQty > 0,
  );

  const selectedPreview = watchedItems.flatMap((item) => {
    if (!item?.selected) return [];
    const meta = lineMetaByPoItemId.get(item.purchaseOrderItemId);
    const dests = (item.destinations ?? []).filter((d) => (d.quantity ?? 0) > 0);
    if (!dests.length) return [];
    return [
      {
        label: meta?.itemLabel ?? "—",
        qty: dests.reduce((s, d) => s + Number(d.quantity ?? 0), 0),
        unit: meta?.unitLabel ?? "",
        destCount: dests.length,
      },
    ];
  });

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Goods Receipt</p>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <p className={styles.pageSubtitle}>
            {po.poNo} · {po.creditor?.nameTh ?? "—"}
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href={resolvedBackHref}>
            <Button icon={<ArrowLeftOutlined />}>กลับ</Button>
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
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>รายการรับเข้าคลัง</h2>
                  <p className={styles.sectionHint}>
                    แยกสินค้าบรรทัดเดียวเข้าได้หลายคลัง — รวมจำนวนห้ามเกินที่เหลือ
                  </p>
                </div>
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
                        const remaining = meta?.remainingQty ?? 0;
                        const disabled = remaining <= 0;
                        const destinations = line?.destinations ?? [];
                        const destSum = Number(
                          destinations
                            .reduce((s, d) => s + Number(d.quantity ?? 0), 0)
                            .toFixed(3),
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
                                  <strong>
                                    {meta?.itemLabel || `รายการที่ ${index + 1}`}
                                  </strong>
                                </Checkbox>
                              </Form.Item>
                              <span className={styles.sectionHint}>
                                สั่ง {meta?.orderedQty ?? 0} · รับแล้ว{" "}
                                {meta?.receivedQty ?? 0} · เหลือ {remaining}{" "}
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

                            {line?.selected && !disabled ? (
                              <Form.List name={[name, "destinations"]}>
                                {(destFields, { add, remove }) => (
                                  <div className={styles.destList}>
                                    {destFields.map(({ key: destKey, name: destName, ...destRest }) => {
                                      const dest =
                                        destinations[destName] ?? {};
                                      const locs = locations.filter(
                                        (loc) =>
                                          loc.warehouseId === dest.warehouseId,
                                      );
                                      const otherSum = Number(
                                        destinations
                                          .reduce((s, d, i) => {
                                            if (i === destName) return s;
                                            return s + Number(d.quantity ?? 0);
                                          }, 0)
                                          .toFixed(3),
                                      );
                                      const maxForThis = Number(
                                        Math.max(
                                          0.001,
                                          remaining - otherSum,
                                        ).toFixed(3),
                                      );

                                      return (
                                        <div
                                          key={destKey}
                                          className={styles.destCard}
                                        >
                                          <div className={styles.destCardHead}>
                                            <span>
                                              ปลายทางที่ {destName + 1}
                                            </span>
                                            {destFields.length > 1 ? (
                                              <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() =>
                                                  remove(destName)
                                                }
                                              >
                                                ลบ
                                              </Button>
                                            ) : null}
                                          </div>
                                          <div className={styles.lineGrid}>
                                            <Form.Item
                                              {...destRest}
                                              className={styles.field}
                                              label="จำนวนรับ"
                                              name={[destName, "quantity"]}
                                              rules={[
                                                {
                                                  validator: async (_, value) => {
                                                    if (!(value > 0)) {
                                                      throw new Error(
                                                        "ต้องมากกว่า 0",
                                                      );
                                                    }
                                                    if (
                                                      value >
                                                      maxForThis + 1e-9
                                                    ) {
                                                      throw new Error(
                                                        "เกินจำนวนที่เหลือของบรรทัดนี้",
                                                      );
                                                    }
                                                  },
                                                },
                                              ]}
                                            >
                                              <InputNumber
                                                min={0.001}
                                                max={maxForThis}
                                                style={{ width: "100%" }}
                                              />
                                            </Form.Item>
                                            <Form.Item
                                              {...destRest}
                                              className={styles.field}
                                              label="คลัง"
                                              name={[destName, "warehouseId"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: "เลือกคลัง",
                                                },
                                              ]}
                                            >
                                              <Select
                                                showSearch
                                                optionFilterProp="label"
                                                options={warehouses.map(
                                                  (w) => ({
                                                    value: w.id,
                                                    label: `${w.warehouseCode} — ${w.warehouseName}`,
                                                  }),
                                                )}
                                                onChange={() => {
                                                  form.setFieldValue(
                                                    [
                                                      "items",
                                                      name,
                                                      "destinations",
                                                      destName,
                                                      "locationId",
                                                    ],
                                                    undefined,
                                                  );
                                                }}
                                              />
                                            </Form.Item>
                                            <Form.Item
                                              {...destRest}
                                              className={styles.field}
                                              label="ตำแหน่ง"
                                              name={[destName, "locationId"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: "เลือกตำแหน่ง",
                                                },
                                              ]}
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
                                              {...destRest}
                                              className={styles.field}
                                              label="Lot (ถ้ามี)"
                                              name={[destName, "lotNo"]}
                                            >
                                              <Input />
                                            </Form.Item>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className={styles.destFooter}>
                                      <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        disabled={destSum >= remaining - 1e-9}
                                        onClick={() =>
                                          add({
                                            quantity: Number(
                                              Math.max(
                                                0.001,
                                                remaining - destSum,
                                              ).toFixed(3),
                                            ),
                                            warehouseId: undefined,
                                            locationId: undefined,
                                          })
                                        }
                                      >
                                        เพิ่มปลายทางคลัง
                                      </Button>
                                      <span className={styles.sectionHint}>
                                        รวมรับ {destSum} / เหลือ {remaining}{" "}
                                        {meta?.unitLabel}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </Form.List>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                บันทึกเป็น DRAFT — Confirm ที่ใบรับของเพื่อเข้าสต๊อกตามคลังที่เลือก
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push(resolvedBackHref)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  disabled={!hasReceivableLines || !canAdd}
                >
                  บันทึกใบรับของ
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปการรับ</p>
              <h2 className={styles.summaryTitle}>{po.poNo}</h2>
            </div>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>ผู้ขาย</span>
                <strong>{po.creditor?.nameTh ?? "—"}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>รายการที่รับ</span>
                <strong>{selectedPreview.length}</strong>
              </div>
            </div>
            {selectedPreview.length > 0 ? (
              <ul className={styles.previewList}>
                {selectedPreview.map((row) => (
                  <li key={row.label}>
                    {row.label}: {row.qty} {row.unit}
                    {row.destCount > 1 ? ` (${row.destCount} คลัง)` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sectionHint}>ยังไม่ได้เลือกจำนวนรับ</p>
            )}
            <div className={styles.flowNote}>
              <strong>หมายเหตุ</strong>
              <p>
                สามารถแยกจำนวนของสินค้าเดียวกันเข้าหลายคลังได้
                รวมแล้วต้องไม่เกินจำนวนที่เหลือบน PO
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
