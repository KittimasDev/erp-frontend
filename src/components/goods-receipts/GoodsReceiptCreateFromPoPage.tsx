"use client";

import { tStatus } from "@/types/purchase-orders";
import { useT } from "@/lib/i18n/useT";
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
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
import { usePoDeliverySchedulesQuery } from "@/hooks/po-delivery-schedules/usePoDeliverySchedulesQuery";
import PoDeliverySchedulesSection from "@/components/purchase-orders/PoDeliverySchedulesSection";
import { isPoScheduleOpen } from "@/types/po-delivery-schedules";
import {
  isPoReceivableStatus,
  PURCHASE_ORDER_STATUS_LABEL,
} from "@/types/purchase-orders";
import styles from "./GoodsReceiptFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

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
  purchaseOrderDeliveryScheduleId?: string;
  items: LineValues[];
};

type Props = {
  purchaseOrderId: string;
  backHref?: string;
  pageTitle?: string;
  /** รอบจัดส่งที่ให้เลือกไว้ก่อน — ใช้เมื่อเป็นรอบที่ยังรับได้เท่านั้น */
  initialScheduleId?: string;
};

export default function GoodsReceiptCreateFromPoPage({
  purchaseOrderId,
  backHref,
  pageTitle = "รับของจากใบสั่งซื้อ",
  initialScheduleId,
}: Props) {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
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
  const schedulesQuery = usePoDeliverySchedulesQuery(purchaseOrderId);
  const schedules = schedulesQuery.data?.data ?? [];
  const openSchedules = schedules.filter((round) => isPoScheduleOpen(round.status));
  const watchedScheduleId = Form.useWatch(
    "purchaseOrderDeliveryScheduleId",
    form,
  );

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
  const selectedSchedule = openSchedules.find(
    (round) => round.id === watchedScheduleId,
  );
  const scheduleRemainingByPoItem = useMemo(() => {
    const map = new Map<string, { remaining: number; received: number }>();
    for (const item of selectedSchedule?.items ?? []) {
      map.set(item.purchaseOrderItemId, {
        remaining: Number(item.remainingQuantity),
        received: Number(item.receivedQuantity),
      });
    }
    return map;
  }, [selectedSchedule]);

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
        const rawBase = Number(item.baseQuantity ?? item.quantity);
        const itemMasterUnitId = itemById.get(item.itemId)?.unitId;
        const grBaseUnitId = item.baseUnitId ?? item.unitId;
        let convertedBase = rawBase;
        if (
          itemMasterUnitId &&
          grBaseUnitId &&
          itemMasterUnitId !== grBaseUnitId
        ) {
          const conv = convertQty(conversionIndex, {
            qty: rawBase,
            fromUnitId: grBaseUnitId,
            toUnitId: itemMasterUnitId,
            itemId: item.itemId,
          });
          if (conv !== null) {
            convertedBase = conv;
          }
        }
        map.set(item.purchaseOrderItemId, prev + convertedBase);
      }
    }
    return map;
  }, [existingGrs, conversionIndex, itemById]);

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

      const poOverallRemainingBase = roundQty(
        Math.max(0, orderedBaseQty - (receivedByPoItem.get(poItem.id) ?? 0)),
      );
      const scheduleQty = scheduleRemainingByPoItem.get(poItem.id);
      const receivedBase = scheduleQty
        ? scheduleQty.received
        : (receivedByPoItem.get(poItem.id) ?? 0);

      let remainingBaseQty = poOverallRemainingBase;
      let remainingInPoUnit = convertible
        ? (fromBaseQty(conversionIndex, {
            baseQty: poOverallRemainingBase,
            unitId: poUnitId,
            baseUnitId,
            itemId: poItem.itemId,
          }) ??
          Math.max(0, orderedInPoUnit - (receivedByPoItem.get(poItem.id) ?? 0)))
        : Math.max(0, orderedInPoUnit - (receivedByPoItem.get(poItem.id) ?? 0));

      if (scheduleQty) {
        const schedBase = convertible
          ? (convertQty(conversionIndex, {
              qty: scheduleQty.remaining,
              fromUnitId: poUnitId,
              toUnitId: baseUnitId,
              itemId: poItem.itemId,
            }) ?? scheduleQty.remaining)
          : scheduleQty.remaining;
        remainingBaseQty = roundQty(
          Math.min(poOverallRemainingBase, Math.max(0, schedBase)),
        );
        remainingInPoUnit = convertible
          ? (fromBaseQty(conversionIndex, {
              baseQty: remainingBaseQty,
              unitId: poUnitId,
              baseUnitId,
              itemId: poItem.itemId,
            }) ?? Math.min(scheduleQty.remaining, remainingBaseQty))
          : remainingBaseQty;
      }

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
  }, [
    po?.items,
    receivedByPoItem,
    itemById,
    unitLabelById,
    conversionIndex,
    scheduleRemainingByPoItem,
  ]);

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

  const receivable = isPoReceivableStatus(po?.status ?? "");

  // meta ขึ้นกับ query หลายตัวที่โหลดเสร็จไม่พร้อมกัน — ถ้าไม่กันไว้
  // effect จะยิงซ้ำแล้วทับค่าที่ผู้ใช้กรอกไปแล้ว
  const prefilledForRef = useRef<string | undefined>(undefined);
  const initialScheduleAppliedRef = useRef(false);

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
      purchaseOrderDeliveryScheduleId:
        form.getFieldValue("purchaseOrderDeliveryScheduleId") ||
        openSchedules[0]?.id,
      items: (po.items ?? [])
        .filter((item) => {
          if (selectedSchedule && !scheduleRemainingByPoItem.has(item.id)) {
            return false;
          }
          return (lineMetaByPoItemId.get(item.id)?.remainingBaseQty ?? 0) > 0;
        })
        .map((item) => {
          const meta = lineMetaByPoItemId.get(item.id);
          return {
            selected: false,
            purchaseOrderItemId: item.id,
            destinations: [
              {
                qty: { quantity: meta?.remainingQty, unitId: meta?.poUnitId },
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

  useEffect(() => {
    if (!initialScheduleId || initialScheduleAppliedRef.current) return;
    if (!listsReady || !receivable) return;
    if (!openSchedules.some((round) => round.id === initialScheduleId)) return;
    initialScheduleAppliedRef.current = true;
    form.setFieldValue("purchaseOrderDeliveryScheduleId", initialScheduleId);
  }, [form, initialScheduleId, listsReady, receivable, openSchedules]);

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
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (poQuery.isError || grByPoQuery.isError) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          title={t("โหลดข้อมูลไม่สำเร็จ")}
          description={t("ไม่สามารถโหลดใบสั่งซื้อหรือประวัติการรับของได้ ลองรีเฟรชหน้าอีกครั้ง")}
        />
        <div style={{ marginTop: 12 }}>
          <Link href={resolvedBackHref}>{t("กลับ")}</Link>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className={styles.page}>
        {t("ไม่พบใบสั่งซื้อ")}
        <div style={{ marginTop: 12 }}>
          <Link href={resolvedBackHref}>{t("กลับ")}</Link>
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
          title={t("ใบสั่งซื้อนี้ยังรับของไม่ได้")}
          description={t(
            "สถานะปัจจุบัน: {status} — รับของได้เมื่อสถานะเป็นอนุมัติแล้วหรือรับของบางส่วน และยังมีจำนวนคงเหลือ",
            { status: tStatus(PURCHASE_ORDER_STATUS_LABEL[po.status] ?? po.status) },
          )}
        />
        <div style={{ marginTop: 12 }}>
          <Link href={`/purchase-orders/${po.id}`}>{t("กลับไปใบสั่งซื้อ")}</Link>
        </div>
      </div>
    );
  }

  /** แจ้งสาเหตุทั้งแบบ toast (เห็นทันทีแม้ฟอร์มยาว) และข้อความใต้ช่องรายการ */
  const failItems = (text: string) => {
    form.setFields([{ name: "items", errors: [text] }]);
    message.error(text);
  };

  /** Validation ของฟิลด์ที่ต้องกรอก (เช่น ไม่เลือกรอบส่งของ) ไม่ผ่าน → แจ้งสาเหตุ + เลื่อนไปช่องแรกที่ผิด */
  const onFinishFailed = (info: { errorFields: Array<{ errors: string[] }> }) => {
    const first = info.errorFields[0]?.errors[0];
    message.error(
      first
        ? t("บันทึกใบรับของไม่ได้: {reason}", { reason: first })
        : t("บันทึกใบรับของไม่ได้: กรอกข้อมูลที่จำเป็นให้ครบ"),
    );
  };

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
      const label = meta?.itemLabel ?? t("รายการ");
      const baseUnitLabel = meta?.baseUnitLabel ?? "";
      const destinations = (item.destinations ?? []).filter(
        (d) => (d.qty?.quantity ?? 0) > 0,
      );
      if (!destinations.length) {
        // ติ๊กรับแล้วแต่ไม่ระบุจำนวน — เดิมถูกข้ามเงียบ ๆ ทำให้ดูเหมือนบันทึกไม่ทำงาน
        failItems(
          t(
            "{label}: ติ๊กรับแล้วแต่ยังไม่ระบุจำนวนรับ (กรอกจำนวนมากกว่า 0 หรือเอาเครื่องหมายถูกออก)",
            { label },
          ),
        );
        return;
      }

      let sumBase = 0;
      for (const dest of destinations) {
        if (!dest.warehouseId || !dest.locationId) {
          failItems(t("{label}: ระบุคลังและตำแหน่งให้ครบทุกปลายทาง", { label }));
          return;
        }

        if (meta?.requiresLotControl && !dest.lotNo?.trim()) {
          failItems(t("{label}: กรุณาระบุเลข Lot", { label }));
          return;
        }

        // ด่านที่สองต่อจาก validator — กันเอกสารเก่าที่หน่วยไม่มีกฎแปลงหลุดไปถึง backend
        const base = destBaseQty(conversionIndex, meta, dest);
        if (base === null) {
          failItems(
            t(
              "{label}: หน่วยที่เลือกยังไม่มีกฎแปลงเป็น {unit} กรุณาแก้หน่วยก่อนบันทึก",
              { label, unit: baseUnitLabel },
            ),
          );
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
        failItems(
          t(
            "{label}: รวมจำนวนที่รับ ({received}) เกินยอดคงเหลือของ PO ({remaining})",
            {
              label,
              received: formatQtyUnit(sumBase, baseUnitLabel),
              remaining: formatQtyUnit(remainingBase, baseUnitLabel),
            },
          ),
        );
        return;
      }
    }

    if (!flat.length) {
      failItems(t("เลือกอย่างน้อย 1 รายการและระบุจำนวนรับ"));
      return;
    }

    try {
      const response = await createMutation.mutateAsync({
        purchaseOrderId,
        body: {
          grDate: values.grDate.format("YYYY-MM-DD"),
          remark: values.remark?.trim() || undefined,
          purchaseOrderDeliveryScheduleId: values.purchaseOrderDeliveryScheduleId,
          items: flat.map(({ label: _label, ...item }) => item),
        },
      });
      // ไม่ถือว่าสำเร็จถ้า API ไม่คืนเลขเอกสาร — อยู่หน้าเดิมให้แก้ต่อ
      const createdId = response?.data?.id;
      if (!createdId) {
        message.error(t("บันทึกใบรับของไม่สำเร็จ: ระบบไม่คืนเลขเอกสาร กรุณาตรวจรายการแล้วลองใหม่"));
        return;
      }
      router.push(`/goods-receipts/${createdId}`);
    } catch {
      // สาเหตุแสดงโดย onError ของ mutation แล้ว (message.error) — อยู่หน้าเดิมเพื่อให้แก้และบันทึกใหม่
    }
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
      <PageHeader
        eyebrow="Goods Receipt"
        icon={<InboxOutlined />}
        title={t(pageTitle)}
        subtitle={<>{po.poNo} · {po.creditor?.nameTh ?? "—"}</>}
        actions={
          <>
<div className={styles.backLink}>
          <Link href={resolvedBackHref}>
            <Button icon={<ArrowLeftOutlined />}>{t("กลับ")}</Button>
          </Link>
        </div>
          </>
        }
      />

      {!hasReceivableLines ? (
        <Alert
          type="info"
          showIcon
          title={
            existingGrs.some((gr) => gr.status === "DRAFT")
              ? t("มีใบรับของแบบร่างอยู่แล้ว")
              : t("รายการในใบสั่งซื้อนี้รับครบแล้ว")
          }
          description={
            <div>
              <p style={{ margin: 0 }}>
                {existingGrs.some((gr) => gr.status === "DRAFT")
                  ? t("ยอดในใบร่างถูกนับเป็นค้างรับแล้ว จึงสร้างใบใหม่ไม่ได้ — เปิดใบร่างเพื่อแก้ไขหรือยืนยันรับเข้าสต๊อก")
                  : t("ไม่มีจำนวนคงเหลือให้รับเพิ่ม")}
              </p>
              {existingGrs.length > 0 ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {existingGrs.map((gr) => (
                    <li key={gr.id}>
                      <Link href={`/goods-receipts/${gr.id}`}>{gr.grNo}</Link>
                      {" · "}
                      {tStatus(GOODS_RECEIPT_STATUS_LABEL[gr.status] ?? gr.status)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          }
        />
      ) : null}

      <PoDeliverySchedulesSection
        purchaseOrderId={purchaseOrderId}
        canManage={goodsReceiptActions.canEdit}
        showCloseOnReceiving
        purchaseOrderCancelled={po?.status === "CANCELLED"}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        scrollToFirstError
      >
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label={t("รอบจัดส่ง")}
                    name="purchaseOrderDeliveryScheduleId"
                    rules={[{ required: true, message: t("เลือกรอบที่ต้องการรับ") }]}
                  >
                    <Select
                      placeholder={t("เลือกรอบ")}
                      options={openSchedules.map((round) => ({
                        value: round.id,
                        label: t("รอบที่ {n} · กำหนดส่ง {date}", {
                          n: round.roundNo,
                          date: dayjs(round.effectiveDeliveryDate).format("DD/MM/BBBB"),
                        }),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label={t("วันที่รับ")}
                    name="grDate"
                    rules={[{ required: true, message: t("เลือกวันที่รับ") }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
                  </Form.Item>
                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label={t("หมายเหตุ")}
                    name="remark"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{t("รายการรับเข้าคลัง")}</h2>
                  <p className={styles.sectionHint}>
                    {t(
                      "แสดงเฉพาะรายการที่ยังรับไม่ครบ — ติ๊กเฉพาะบรรทัดที่จะรับรอบนี้ รับไม่ครบได้ จะเปิดใบรับใหม่ภายหลัง",
                    )}
                  </p>
                </div>
                <Form.List name="items">
                  {(fields, _operation, { errors }) => (
                    <>
                      <Form.ErrorList errors={errors} />
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
                                    {meta?.itemLabel || t("รายการที่ {n}", { n: index + 1 })}
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
                                  {t("สั่ง")}
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
                                  {t("รับแล้ว")}
                                </span>
                                <span className={styles.lineStatValue}>
                                  {formatQtyUnit(
                                    roundQty(
                                      meta?.convertible && meta.baseUnitId !== meta.poUnitId
                                        ? (fromBaseQty(conversionIndex, {
                                            baseQty: meta.receivedQty,
                                            unitId: meta.poUnitId,
                                            baseUnitId: meta.baseUnitId,
                                            itemId: meta.itemId,
                                          }) ?? meta.receivedQty)
                                        : meta?.receivedQty ?? 0,
                                    ),
                                    meta?.unitLabel ?? "",
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
                                  {t("คงเหลือ")}
                                </span>
                                <span className={styles.lineStatValue}>
                                  {disabled
                                    ? t("รับครบแล้ว")
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
                                              {t("ปลายทางที่ {n}", { n: destName + 1 })}
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
                                                {t("ลบ")}
                                              </Button>
                                            ) : null}
                                          </div>
                                          <div className={styles.destGrid}>
                                            <Form.Item
                                              {...destRest}
                                              className={styles.field}
                                              label={t("จำนวนที่รับครั้งนี้")}
                                              extra={t(
                                                "คงเหลือ {qty} — รับไม่ครบได้ จะเปิดใบรับใหม่ภายหลัง",
                                                {
                                                  qty: formatQtyUnit(
                                                    remaining,
                                                    meta?.unitLabel ?? "",
                                                  ),
                                                },
                                              )}
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
                                                      units,
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
                                              label={t("คลัง")}
                                              name={[destName, "warehouseId"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: t("เลือกคลัง"),
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
                                              label={t("ตำแหน่ง")}
                                              name={[destName, "locationId"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: t("เลือกตำแหน่ง"),
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
                                                    message: t("กรุณาระบุเลข Lot"),
                                                  },
                                                ]}
                                              >
                                                <Input placeholder={t("กรอกเลข Lot")} />
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
                                        {t("เพิ่มปลายทางคลัง")}
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
                                        {t("รวมที่กรอก")}{" "}
                                        <span
                                          className={styles.destSummaryValue}
                                        >
                                          {formatQtyUnit(
                                            destSumBase,
                                            baseUnitLabel,
                                          )}
                                        </span>{" "}
                                        {t("จากคงเหลือ")}{" "}
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
                                          ? t("กรอกครบตามยอดคงเหลือแล้ว")
                                          : t("ยังกรอกได้อีก {qty}", {
                                              qty: formatQtyUnit(
                                                roundQty(
                                                  Math.max(
                                                    0,
                                                    remainingBase - destSumBase,
                                                  ),
                                                ),
                                                baseUnitLabel,
                                              ),
                                            })}
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
                  </>
                )}
              </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                {t("บันทึกเป็น DRAFT — Confirm ที่ใบรับของเพื่อเข้าสต๊อกตามคลังที่เลือก")}
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push(resolvedBackHref)}
                >
                  {t("ยกเลิก")}
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  disabled={!hasReceivableLines || !canAdd}
                >
                  {t("บันทึกใบรับของ")}
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>{t("สรุปการรับ")}</p>
              <h2 className={styles.summaryTitle}>{po.poNo}</h2>
            </div>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>{t("ผู้ขาย")}</span>
                <strong>{po.creditor?.nameTh ?? "—"}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("รายการที่รับ")}</span>
                <strong>{selectedPreview.length}</strong>
              </div>
            </div>
            {selectedPreview.length > 0 ? (
              <ul className={styles.previewList}>
                {selectedPreview.map((row) => (
                  <li key={row.key}>
                    {row.label}: {formatQtyUnit(row.qty, row.unit)}
                    {row.mixed ? ` ${t("(หลายหน่วย)")}` : ""}
                    {row.destCount > 1
                      ? ` ${t("({n} คลัง)", { n: row.destCount })}`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sectionHint}>{t("ยังไม่ได้เลือกจำนวนรับ")}</p>
            )}
            <div className={styles.flowNote}>
              <strong>{t("หมายเหตุ")}</strong>
              <p>
                {t(
                  "สามารถแยกจำนวนของสินค้าเดียวกันเข้าหลายคลังได้ รวมแล้วต้องไม่เกินจำนวนที่เหลือบน PO",
                )}
              </p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
