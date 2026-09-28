"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
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
import QuantityUnitInput, {
  makeQtyUnitValidator,
  type QuantityUnitValue,
} from "@/components/common/QuantityUnitInput";
import { useCreateGoodsReceiptFromPoMutation } from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useUnitConversionIndex } from "@/hooks/unit-conversions/useUnitConversionIndex";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import {
  convertQty,
  fromBaseQty,
  roundQty,
  toBaseQty,
  type ConversionIndex,
} from "@/lib/units/conversion";
import { formatQtyUnit, formatQtyWithBase } from "@/lib/units/format";
import type { Item } from "@/types/items";
import type { Unit } from "@/types/units";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import styles from "./GoodsReceiptFormPage.module.css";

const EMPTY_GRS: never[] = [];
const EMPTY_WAREHOUSES: never[] = [];
const EMPTY_LOCATIONS: never[] = [];
const EMPTY_ITEMS: Item[] = [];
const EMPTY_UNITS: Unit[] = [];

type DestinationValues = {
  /** จำนวน + หน่วยที่ผู้ใช้เลือก — หน่วยอยู่ระดับปลายทาง เพราะแต่ละคลังอาจนับคนละหน่วย */
  qty?: QuantityUnitValue;
  warehouseId?: string;
  locationId?: string;
  lotNo?: string;
};

type LineMeta = {
  itemId: string;
  itemLabel: string;
  /** หน่วยที่ใบสั่งซื้อใช้ */
  poUnitId: string;
  unitLabel: string;
  /**
   * หน่วยที่ใช้เป็นฐานของบรรทัดนี้
   * ปกติคือหน่วยหลักของสินค้า แต่ถ้าแปลงจากหน่วย PO ไม่ได้ (ข้อมูลเก่า)
   * จะถอยไปใช้หน่วย PO เพื่อให้หน้าทำงานเหมือนเดิม ไม่พัง
   */
  baseUnitId: string;
  baseUnitLabel: string;
  /** แปลงหน่วย PO เป็นหน่วยหลักได้จริงไหม — false = โหมดถอยกลับ ล็อกหน่วยไว้ */
  convertible: boolean;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  remainingBaseQty: number;
  requiresLotControl: boolean;
  expectedWarehouseId?: string;
  expectedLocationId?: string;
};

/** จำนวนของปลายทางหนึ่งในหน่วยฐานของบรรทัด — null = หน่วยที่เลือกแปลงไม่ได้ */
function destBaseQty(
  index: ConversionIndex,
  meta: LineMeta | undefined,
  dest: DestinationValues | undefined,
): number | null {
  if (!meta) {
    return null;
  }
  return toBaseQty(index, {
    qty: dest?.qty?.quantity,
    unitId: dest?.qty?.unitId,
    baseUnitId: meta.baseUnitId,
    itemId: meta.itemId,
  });
}

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
  // ต้องรู้หน่วยหลักของสินค้าจริง — หน่วยบน PO อาจเป็นหน่วยรอง
  const itemsQuery = useItemsQuery({ isActive: true });
  const unitsQuery = useUnitsQuery({ isActive: true });
  const { index: conversionIndex } = useUnitConversionIndex();

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
  const items = Array.isArray(itemsQuery.data?.data)
    ? itemsQuery.data.data
    : EMPTY_ITEMS;
  const units = Array.isArray(unitsQuery.data?.data)
    ? unitsQuery.data.data
    : EMPTY_UNITS;
  const watchedItems = Form.useWatch("items", form) ?? [];

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const unitLabelById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.nameTh || unit.code])),
    [units],
  );

  const resolvedBackHref =
    backHref ?? `/purchase-orders/${purchaseOrderId}`;

  /**
   * ยอดรับสะสมต่อรายการ PO ในหน่วยฐานของสินค้า
   * ต้องใช้ baseQuantity ไม่ใช่ quantity ดิบ ไม่งั้นถ้าใบก่อนรับเป็นมัดใบนี้เป็นกิโลกรัม
   * ยอดจะถูกบวกข้ามหน่วยแบบเงียบๆ
   */
  const receivedByPoItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const gr of existingGrs) {
      if (gr.status === "CANCELLED") continue;
      for (const item of gr.items ?? []) {
        if (!item.purchaseOrderItemId) continue;
        const prev = map.get(item.purchaseOrderItemId) ?? 0;
        map.set(
          item.purchaseOrderItemId,
          prev + Number(item.baseQuantity ?? item.quantity),
        );
      }
    }
    return map;
  }, [existingGrs]);

  const lineMetaByPoItemId = useMemo(() => {
    const map = new Map<string, LineMeta>();

    for (const poItem of po?.items ?? []) {
      const poUnitId = poItem.unitId;
      const unitLabel = poItem.unitNameTh ?? poItem.unitCode ?? "";
      const itemMasterUnitId = itemById.get(poItem.itemId)?.unitId;
      const orderedInPoUnit = Number(poItem.quantity);

      // ยอดสั่งบน PO อยู่ในหน่วย PO ต้องแปลงเป็นหน่วยหลักก่อนหักยอดที่รับไปแล้ว
      const orderedBase =
        itemMasterUnitId === undefined
          ? null
          : convertQty(conversionIndex, {
              qty: orderedInPoUnit,
              fromUnitId: poUnitId,
              toUnitId: itemMasterUnitId,
              itemId: poItem.itemId,
            });

      // แปลงไม่ได้ (ข้อมูลเก่า/ยังไม่ได้ตั้งกฎ) → ถอยไปคิดทุกอย่างในหน่วย PO เหมือนเดิม
      const convertible = orderedBase !== null && itemMasterUnitId !== undefined;
      const baseUnitId = convertible ? (itemMasterUnitId as string) : poUnitId;
      const orderedBaseQty = convertible
        ? (orderedBase as number)
        : orderedInPoUnit;

      const receivedBase = receivedByPoItem.get(poItem.id) ?? 0;
      const remainingBaseQty = roundQty(
        Math.max(0, orderedBaseQty - receivedBase),
      );

      const remainingInPoUnit = convertible
        ? (fromBaseQty(conversionIndex, {
            baseQty: remainingBaseQty,
            unitId: poUnitId,
            baseUnitId,
            itemId: poItem.itemId,
          }) ?? remainingBaseQty)
        : remainingBaseQty;

      map.set(poItem.id, {
        itemId: poItem.itemId,
        itemLabel: `${poItem.itemCode ?? ""} — ${poItem.itemNameTh ?? ""}`,
        poUnitId,
        unitLabel,
        baseUnitId,
        baseUnitLabel: unitLabelById.get(baseUnitId) ?? unitLabel,
        convertible,
        orderedQty: orderedInPoUnit,
        receivedQty: receivedBase,
        remainingQty: remainingInPoUnit,
        remainingBaseQty,
        requiresLotControl: Boolean(
          itemById.get(poItem.itemId)?.requiresLotControl,
        ),
        expectedWarehouseId: poItem.expectedWarehouseId,
        expectedLocationId: poItem.expectedLocationId,
      });
    }

    return map;
  }, [po?.items, receivedByPoItem, itemById, unitLabelById, conversionIndex]);

  const hasReceivableLines = Array.from(lineMetaByPoItemId.values()).some(
    (meta) => meta.remainingBaseQty > 0,
  );
  const latestDraftGr = useMemo(() => {
    const drafts = existingGrs.filter((gr) => gr.status === "DRAFT");
    if (!drafts.length) return undefined;
    return [...drafts].sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )[0];
  }, [existingGrs]);
  const listsReady =
    !poQuery.isLoading &&
    !grByPoQuery.isLoading &&
    !itemsQuery.isLoading &&
    !unitsQuery.isLoading;
  const redirectToDraft =
    listsReady && !hasReceivableLines && Boolean(latestDraftGr?.id);

  const receivable =
    po?.status === "CONFIRMED" || po?.status === "PARTIALLY_RECEIVED";

  // meta ขึ้นกับ query หลายตัวที่โหลดเสร็จไม่พร้อมกัน — ถ้าไม่กันไว้
  // effect จะยิงซ้ำแล้วทับค่าที่ผู้ใช้กรอกไปแล้ว
  const prefilledForRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!redirectToDraft || !latestDraftGr) return;
    router.replace(`/goods-receipts/${latestDraftGr.id}`);
  }, [latestDraftGr, redirectToDraft, router]);

  useEffect(() => {
    if (!po || !receivable) return;
    // รอ query ที่ meta ต้องใช้ให้ครบก่อน ไม่งั้น prefill ด้วยหน่วยที่ยังไม่รู้จัก
    if (itemsQuery.isLoading || unitsQuery.isLoading) return;
    if (prefilledForRef.current === po.id) return;
    prefilledForRef.current = po.id;

    form.setFieldsValue({
      grDate: dayjs(),
      remark: undefined,
      items: (po.items ?? [])
        .filter((item) => (lineMetaByPoItemId.get(item.id)?.remainingBaseQty ?? 0) > 0)
        .map((item) => {
          const meta = lineMetaByPoItemId.get(item.id);
          return {
            selected: false,
            purchaseOrderItemId: item.id,
            destinations: [
              {
                qty: { quantity: undefined, unitId: meta?.poUnitId },
                warehouseId: item.expectedWarehouseId ?? undefined,
                locationId: item.expectedLocationId ?? undefined,
                lotNo: undefined,
              },
            ],
          };
        }),
    });
  }, [
    form,
    po,
    receivable,
    lineMetaByPoItemId,
    itemsQuery.isLoading,
    unitsQuery.isLoading,
  ]);

  if (!canView) {
    return (
      <AccessDenied screenCodes={["GOODS_RECEIPTS"]} />
    );
  }

  if (
    poQuery.isLoading ||
    grByPoQuery.isLoading ||
    itemsQuery.isLoading ||
    unitsQuery.isLoading ||
    redirectToDraft
  ) {
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
      unitId?: string;
      warehouseId: string;
      locationId: string;
      lotNo?: string;
      label: string;
    }> = [];

    for (const item of values.items) {
      if (!item.selected) continue;
      const meta = lineMetaByPoItemId.get(item.purchaseOrderItemId);
      const remainingBase = meta?.remainingBaseQty ?? 0;
      if (remainingBase <= 0) continue;
      const label = meta?.itemLabel ?? "รายการ";
      const baseUnitLabel = meta?.baseUnitLabel ?? "";
      const destinations = (item.destinations ?? []).filter(
        (d) => (d.qty?.quantity ?? 0) > 0,
      );
      if (!destinations.length) continue;

      let sumBase = 0;
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

        if (meta?.requiresLotControl && !dest.lotNo?.trim()) {
          form.setFields([
            {
              name: "items",
              errors: [`${label}: กรุณาระบุเลข Lot`],
            },
          ]);
          return;
        }

        // ด่านที่สองต่อจาก validator — กันเอกสารเก่าที่หน่วยไม่มีกฎแปลงหลุดไปถึง backend
        const base = destBaseQty(conversionIndex, meta, dest);
        if (base === null) {
          form.setFields([
            {
              name: "items",
              errors: [
                `${label}: หน่วยที่เลือกยังไม่มีกฎแปลงเป็น ${baseUnitLabel} กรุณาแก้หน่วยก่อนบันทึก`,
              ],
            },
          ]);
          return;
        }

        sumBase += base;
        flat.push({
          purchaseOrderItemId: item.purchaseOrderItemId,
          quantity: Number(dest.qty?.quantity),
          unitId: dest.qty?.unitId,
          warehouseId: dest.warehouseId,
          locationId: dest.locationId,
          lotNo: meta?.requiresLotControl
            ? dest.lotNo?.trim() || undefined
            : undefined,
          label,
        });
      }

      sumBase = roundQty(sumBase);
      if (sumBase > remainingBase + 1e-9) {
        form.setFields([
          {
            name: "items",
            errors: [
              `${label}: รวมจำนวนปลายทาง ${formatQtyUnit(sumBase, baseUnitLabel)} เกินที่เหลือ ${formatQtyUnit(remainingBase, baseUnitLabel)}`,
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

  const selectedPreview = watchedItems.flatMap((item) => {
    if (!item?.selected) return [];
    const meta = lineMetaByPoItemId.get(item.purchaseOrderItemId);
    const dests = (item.destinations ?? []).filter(
      (d) => (d.qty?.quantity ?? 0) > 0,
    );
    if (!dests.length) return [];

    const unitIds = new Set(
      dests.map((d) => d.qty?.unitId).filter(Boolean) as string[],
    );

    return [
      {
        key: item.purchaseOrderItemId,
        label: meta?.itemLabel ?? "—",
        // สรุปรวมต้องอยู่ในหน่วยเดียวกันเสมอ จึงรวมในหน่วยฐาน
        qty: roundQty(
          dests.reduce(
            (s, d) => s + (destBaseQty(conversionIndex, meta, d) ?? 0),
            0,
          ),
        ),
        unit: meta?.baseUnitLabel ?? "",
        mixed: unitIds.size > 1,
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
          title={
            existingGrs.some((gr) => gr.status === "DRAFT")
              ? "มีใบรับของแบบร่างอยู่แล้ว"
              : "รายการในใบสั่งซื้อนี้รับครบแล้ว"
          }
          description={
            <div>
              <p style={{ margin: 0 }}>
                {existingGrs.some((gr) => gr.status === "DRAFT")
                  ? "ยอดในใบร่างถูกนับเป็นค้างรับแล้ว จึงสร้างใบใหม่ไม่ได้ — เปิดใบร่างเพื่อแก้ไขหรือยืนยันรับเข้าสต๊อก"
                  : "ไม่มีจำนวนคงเหลือให้รับเพิ่ม"}
              </p>
              {existingGrs.length > 0 ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {existingGrs.map((gr) => (
                    <li key={gr.id}>
                      <Link href={`/goods-receipts/${gr.id}`}>{gr.grNo}</Link>
                      {" · "}
                      {GOODS_RECEIPT_STATUS_LABEL[gr.status] ?? gr.status}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          }
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
                    แสดงเฉพาะรายการที่ยังรับไม่ครบ — ติ๊กเฉพาะบรรทัดที่จะรับรอบนี้
                    รับไม่ครบได้ จะเปิดใบรับใหม่ภายหลัง
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
                        const remainingBase = meta?.remainingBaseQty ?? 0;
                        const baseUnitLabel = meta?.baseUnitLabel ?? "";
                        const disabled = remainingBase <= 0;
                        const destinations = line?.destinations ?? [];
                        // รวมยอดในหน่วยฐานเสมอ แต่ละปลายทางอาจเลือกคนละหน่วย
                        const destSumBase = roundQty(
                          destinations.reduce(
                            (s, d) =>
                              s + (destBaseQty(conversionIndex, meta, d) ?? 0),
                            0,
                          ),
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
                            </div>

                            {/*
                              แยกตัวเลขเป็นป้ายละค่า — ของเดิมต่อกันเป็นประโยคเดียว
                              พอชื่อสินค้ายาวก็ตัดบรรทัดกลางตัวเลขจนอ่านไม่ออก
                            */}
                            <div className={styles.lineStats}>
                              <span className={styles.lineStat}>
                                <span className={styles.lineStatLabel}>
                                  สั่ง
                                </span>
                                <span className={styles.lineStatValue}>
                                  {formatQtyUnit(
                                    meta?.orderedQty ?? 0,
                                    meta?.unitLabel ?? "",
                                  )}
                                </span>
                              </span>
                              <span className={styles.lineStat}>
                                <span className={styles.lineStatLabel}>
                                  รับแล้ว
                                </span>
                                <span className={styles.lineStatValue}>
                                  {formatQtyUnit(
                                    meta?.receivedQty ?? 0,
                                    baseUnitLabel,
                                  )}
                                </span>
                              </span>
                              <span
                                className={`${styles.lineStat} ${
                                  disabled
                                    ? styles.lineStatEmpty
                                    : styles.lineStatRemaining
                                }`}
                              >
                                <span className={styles.lineStatLabel}>
                                  คงเหลือ
                                </span>
                                <span className={styles.lineStatValue}>
                                  {disabled
                                    ? "รับครบแล้ว"
                                    : formatQtyWithBase({
                                        qty: remaining,
                                        unitLabel: meta?.unitLabel ?? "",
                                        baseQty: remainingBase,
                                        baseUnitLabel,
                                      })}
                                </span>
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
                                      const otherBaseSum = roundQty(
                                        destinations.reduce((s, d, i) => {
                                          if (i === destName) return s;
                                          return (
                                            s +
                                            (destBaseQty(
                                              conversionIndex,
                                              meta,
                                              d,
                                            ) ?? 0)
                                          );
                                        }, 0),
                                      );
                                      // เดิมใช้ Math.max(0.001, ...) ซึ่งยังปล่อยให้กรอกได้ทั้งที่เต็มแล้ว
                                      const maxBaseForThis = roundQty(
                                        Math.max(
                                          0,
                                          remainingBase - otherBaseSum,
                                        ),
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
                                          <div className={styles.destGrid}>
                                            <Form.Item
                                              {...destRest}
                                              className={styles.field}
                                              label="จำนวนที่รับครั้งนี้"
                                              extra={`คงเหลือ ${formatQtyUnit(remaining, meta?.unitLabel ?? "")} — รับไม่ครบได้ จะเปิดใบรับใหม่ภายหลัง`}
                                              name={[destName, "qty"]}
                                              rules={[
                                                {
                                                  validator:
                                                    makeQtyUnitValidator({
                                                      index: conversionIndex,
                                                      itemId: meta?.itemId,
                                                      baseUnitId:
                                                        meta?.baseUnitId,
                                                      baseUnitLabel,
                                                      maxBaseQty:
                                                        maxBaseForThis,
                                                    }),
                                                },
                                              ]}
                                            >
                                              <QuantityUnitInput
                                                index={conversionIndex}
                                                units={units}
                                                itemId={meta?.itemId}
                                                baseUnitId={meta?.baseUnitId}
                                                maxBaseQty={maxBaseForThis}
                                                // แปลงจากหน่วย PO ไปหน่วยหลักไม่ได้ = ล็อกไว้หน่วยเดียว
                                                allowUnitChange={
                                                  meta?.convertible ?? false
                                                }
                                                size="middle"
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
                                            {meta?.requiresLotControl ? (
                                              <Form.Item
                                                {...destRest}
                                                className={styles.field}
                                                label="Lot"
                                                name={[destName, "lotNo"]}
                                                rules={[
                                                  {
                                                    required: true,
                                                    message: "กรุณาระบุเลข Lot",
                                                  },
                                                ]}
                                              >
                                                <Input placeholder="กรอกเลข Lot" />
                                              </Form.Item>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className={styles.destFooter}>
                                      <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        disabled={
                                          destSumBase >= remainingBase - 1e-9
                                        }
                                        onClick={() => {
                                          add({
                                            qty: {
                                              quantity: undefined,
                                              unitId: meta?.poUnitId,
                                            },
                                            warehouseId: undefined,
                                            locationId: undefined,
                                            lotNo: undefined,
                                          });
                                        }}
                                      >
                                        เพิ่มปลายทางคลัง
                                      </Button>
                                    </div>

                                    {/*
                                      ยอดรวมเทียบเพดาน — ตัวเลขนี้คือสิ่งที่ตัดสินว่า
                                      กรอกครบหรือยัง เดิมพ่วงท้ายปุ่มเป็นข้อความสีจาง
                                    */}
                                    <div
                                      className={`${styles.destSummary} ${
                                        destSumBase >= remainingBase - 1e-9
                                          ? styles.destSummaryDone
                                          : ""
                                      }`}
                                    >
                                      <span>
                                        รวมที่กรอก{" "}
                                        <span
                                          className={styles.destSummaryValue}
                                        >
                                          {formatQtyUnit(
                                            destSumBase,
                                            baseUnitLabel,
                                          )}
                                        </span>{" "}
                                        จากคงเหลือ{" "}
                                        <span
                                          className={styles.destSummaryValue}
                                        >
                                          {formatQtyUnit(
                                            remainingBase,
                                            baseUnitLabel,
                                          )}
                                        </span>
                                      </span>
                                      <span>
                                        {destSumBase >= remainingBase - 1e-9
                                          ? "กรอกครบตามยอดคงเหลือแล้ว"
                                          : `ยังกรอกได้อีก ${formatQtyUnit(
                                              roundQty(
                                                Math.max(
                                                  0,
                                                  remainingBase - destSumBase,
                                                ),
                                              ),
                                              baseUnitLabel,
                                            )}`}
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
                  <li key={row.key}>
                    {row.label}: {formatQtyUnit(row.qty, row.unit)}
                    {row.mixed ? " (หลายหน่วย)" : ""}
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
