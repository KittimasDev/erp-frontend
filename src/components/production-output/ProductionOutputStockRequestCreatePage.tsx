"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Table,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateProductionOutputStockRequestMutation } from "@/hooks/production-output/useProductionOutputMutations";
import {
  useProductionOutputReadyOrdersQuery,
  useProductionOutputStockRequestsQuery,
} from "@/hooks/production-output/useProductionOutputQueries";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { ticketClassificationQueryKey } from "@/hooks/raw-tire-classification/useTicketClassificationQuery";
import { useWeighbridgeTicketQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { getTicketClassification } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type {
  CreateProductionOutputStockRequestBatchBody,
  CreateProductionOutputStockRequestBody,
  ProductionOutputReadyOrder,
} from "@/types/production-output-stock-request";
import {
  productionOutputStatusLabel,
  REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
  REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET,
  resolveProductionOutputTicketLock,
} from "@/types/production-output-stock-request";
import {
  PRODUCTION_ORDER_RUNNING_STATUSES,
  PRODUCTION_ORDER_STATUS_LABEL,
} from "@/types/production-order";
import {
  clearProductionOutputTicketBatch,
  peekProductionOutputTicketBatch,
  type ProductionOutputTicketBatchItem,
} from "@/types/production-output-pending-tickets";
import type { ClassificationItem } from "@/types/raw-tire-classification";
import { RECEIPT_STATUS_LABELS } from "@/types/raw-tire-classification";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOutputStockRequestCreatePage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { tNow, useT } from "@/lib/i18n/useT";
import { appLocale, tLabel } from "@/components/weighbridge/receiving-i18n";

type LineValues = {
  itemId?: string;
  unitId?: string;
  quantity?: number;
  lotNo?: string;
};

type FormValues = {
  warehouseId: string;
  warehouseLocationId: string;
  postingDate: dayjs.Dayjs;
  productionOrderId?: string;
  referenceDocNo?: string;
  remark?: string;
  lines: LineValues[];
};

type Props = {
  ticketId?: string;
  ticketNo?: string;
  /** เปิดจาก pending แบบรวบหลายตั๋วในคำขอเดียว */
  fromBatch?: boolean;
  /** เปิดพร้อมอ้างอิงใบสั่งผลิต (จากหน้า production-orders) */
  productionOrderId?: string;
};

type SourceTicketSummary = {
  ticketId: string;
  ticketNo: string;
  sellerName?: string;
  truckLicensePlate?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  receiptNo?: string;
  receiptStatus?: string;
  payableWeightKg?: string;
  items: ClassificationItem[];
};

function formatQty(value?: number | string | null) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return "—";
  }
  return n.toLocaleString(appLocale(), {
    maximumFractionDigits: 3,
  });
}

const EMPTY_LINE: LineValues = {
  itemId: undefined,
  unitId: undefined,
  quantity: undefined,
  lotNo: undefined,
};

function linesFromReadyOrder(order: ProductionOutputReadyOrder): LineValues[] {
  const blocked = new Set(order.blockedItemIds ?? []);
  const lines = (order.outputItems ?? [])
    .filter(
      (item) => Number(item.remainingQty) > 0 && !blocked.has(item.itemId),
    )
    .map((item) => ({
      itemId: item.itemId,
      unitId: item.unitId,
      quantity: Number(item.remainingQty),
      lotNo: undefined,
    }));
  return lines.length > 0 ? lines : [{ ...EMPTY_LINE }];
}

function qtyPlanHint(
  itemId: string | undefined,
  order: ProductionOutputReadyOrder | undefined,
) {
  if (!itemId || !order?.outputItems) {
    return undefined;
  }
  const plan = order.outputItems.find((row) => row.itemId === itemId);
  if (!plan) {
    return undefined;
  }
  const unit = plan.unitCode ? ` ${plan.unitCode}` : "";
  return tNow("แผน {planned} · ขอแล้ว {requested} · ค้าง {remaining}", {
    planned: formatQty(plan.plannedQty),
    requested: formatQty(plan.requestedQty),
    remaining: formatQty(plan.remainingQty),
  }) + unit;
}

const SOURCE_ITEM_COLUMNS: ColumnsType<ClassificationItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
  {
    title: "ประเภทยางที่รับมา",
    key: "classification",
    render: (_v, row) =>
      row.classificationName
        ? `${row.classificationCode ?? ""} — ${row.classificationName}`.replace(
            /^ — /,
            "",
          )
        : row.classificationCode || "—",
  },
  {
    title: "น้ำหนัก (กก.)",
    dataIndex: "weightKg",
    key: "weightKg",
    align: "right",
    width: 120,
    render: (value: string) => formatQty(value),
  },
  {
    title: "ราคา/กก.",
    dataIndex: "pricePerKg",
    key: "pricePerKg",
    align: "right",
    width: 110,
    render: (value: string) => formatQty(value),
  },
  {
    title: "เป็นเงิน",
    dataIndex: "amount",
    key: "amount",
    align: "right",
    width: 120,
    render: (value: string) => formatQty(value),
  },
];

export default function ProductionOutputStockRequestCreatePage({
  ticketId,
  ticketNo,
  fromBatch = false,
  productionOrderId: initialProductionOrderId,
}: Props) {
  const t = useT();
  const sourceItemColumns = useMemo(
    () =>
      SOURCE_ITEM_COLUMNS.map((col) => ({
        ...col,
        title: t(col.title as string),
      })) as ColumnsType<ClassificationItem>,
    [t],
  );
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const warehouseId = Form.useWatch("warehouseId", form);
  const warehouseLocationId = Form.useWatch("warehouseLocationId", form);
  const postingDate = Form.useWatch("postingDate", form);
  const selectedProductionOrderId = Form.useWatch("productionOrderId", form);
  const lines = Form.useWatch("lines", form) ?? [];

  /** เปิดใบขอรับผลผลิตเข้าคลัง = งานของหน้านี้ ตัดสินจาก Permission Matrix */
  const canRequest = useScreenActionPermissions(
    "PRODUCTION_OUTPUT_STOCK_REQUESTS",
  ).canAdd;

  const [batchTickets, setBatchTickets] = useState<
    ProductionOutputTicketBatchItem[]
  >([]);

  useEffect(() => {
    if (fromBatch) {
      setBatchTickets(peekProductionOutputTicketBatch());
      return;
    }
    if (ticketId) {
      setBatchTickets([
        { id: ticketId, ticketNo: ticketNo || ticketId.slice(0, 8) },
      ]);
      return;
    }
    setBatchTickets([]);
  }, [fromBatch, ticketId, ticketNo]);

  const primaryTicketId = batchTickets[0]?.id ?? ticketId;
  const isMultiTicket = batchTickets.length > 1;

  const purchaseTicketQuery = useWeighbridgeTicketQuery(primaryTicketId ?? "");
  const purchaseTicket = purchaseTicketQuery.data?.data;
  const isPurchaseInTicket =
    Boolean(primaryTicketId) && purchaseTicket?.ticketType === "PURCHASE_IN";
  const purchaseInRedirectHref = purchaseTicket?.nextActionHref
    ? purchaseTicket.nextActionHref
    : purchaseTicket?.receiptId
      ? `/receiving/receipts/${purchaseTicket.receiptId}`
      : primaryTicketId
        ? `/receiving/${primaryTicketId}`
        : "/receiving";

  const sourceQueries = useQueries({
    queries: batchTickets.map((ticket) => ({
      queryKey: [...ticketClassificationQueryKey, ticket.id],
      queryFn: () => getTicketClassification(getAccessToken(), ticket.id),
      enabled: Boolean(ticket.id) && !isPurchaseInTicket,
    })),
  });

  const sourceDataVersion = sourceQueries
    .map((query) => `${query.dataUpdatedAt}:${query.status}`)
    .join("|");

  const sourceSummaries = useMemo(() => {
    const rows: SourceTicketSummary[] = [];
    batchTickets.forEach((ticket, index) => {
      const data = sourceQueries[index]?.data?.data;
      if (!data?.ticket) {
        return;
      }
      const receipt = data.receipt;
      rows.push({
        ticketId: ticket.id,
        ticketNo: data.ticket.ticketNo || ticket.ticketNo,
        sellerName: data.ticket.sellerName,
        truckLicensePlate: data.ticket.truckLicensePlate,
        grossWeightKg: data.ticket.grossWeightKg,
        tareWeightKg: data.ticket.tareWeightKg,
        netWeightKg: data.ticket.netWeightKg,
        receiptNo: receipt?.receiptNo,
        receiptStatus: receipt?.status
          ? tLabel(RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status)
          : undefined,
        payableWeightKg:
          receipt?.payableWeightKg ?? receipt?.summary?.payableWeightKg,
        items: receipt?.items ?? [],
      });
    });
    return rows;
    // sourceDataVersion tracks query result changes; sourceQueries is indexed by batchTickets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchTickets, sourceDataVersion]);

  const sourceTotals = useMemo(() => {
    const net = sourceSummaries.reduce(
      (sum, row) => sum + (Number(row.netWeightKg) || 0),
      0,
    );
    const payable = sourceSummaries.reduce(
      (sum, row) => sum + (Number(row.payableWeightKg) || 0),
      0,
    );
    const classified = sourceSummaries.reduce(
      (sum, row) =>
        sum +
        row.items.reduce(
          (itemSum, item) => itemSum + (Number(item.weightKg) || 0),
          0,
        ),
      0,
    );
    return { net, payable, classified };
  }, [sourceSummaries]);

  const sourceLoading = sourceQueries.some((query) => query.isLoading);
  const sourceError = sourceQueries.find((query) => query.isError)?.error;

  const ticketRequestsQuery = useProductionOutputStockRequestsQuery(
    primaryTicketId
      ? {
          referenceDocType: REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET,
          referenceDocId: primaryTicketId,
        }
      : undefined,
    { enabled: Boolean(primaryTicketId) && !isPurchaseInTicket },
  );
  const ticketLock = useMemo(
    () =>
      resolveProductionOutputTicketLock(ticketRequestsQuery.data?.data ?? []),
    [ticketRequestsQuery.data?.data],
  );
  const formLocked = Boolean(primaryTicketId && ticketLock.locked);

  const itemsQuery = useItemsQuery({
    isActive: true,
    isStockItem: true,
  });
  const unitsQuery = useUnitsQuery({ isActive: true });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    warehouseId ? { warehouseId, isActive: true } : undefined,
    { enabled: Boolean(warehouseId) },
  );
  const createMutation = useCreateProductionOutputStockRequestMutation();

  const showProductionOrderRef = batchTickets.length === 0 && !ticketId;
  const readyOrdersQuery = useProductionOutputReadyOrdersQuery(
    { all: true },
    { enabled: showProductionOrderRef },
  );
  const readyOrders = readyOrdersQuery.data?.data ?? [];
  const selectedProductionOrder = useMemo(
    () => readyOrders.find((row) => row.id === selectedProductionOrderId),
    [readyOrders, selectedProductionOrderId],
  );
  const blockedItemIds = selectedProductionOrder?.blockedItemIds ?? [];
  /*
    ครบตามแผน != ห้ามรับ — ใบที่ยังเดินเครื่องของจริงออกเกินแผนได้ ปลดล็อกให้เลือกและ
    กรอกเองได้ (ไม่ prefill ให้) ส่วนใบที่ปิดงานแล้วถือว่าจบยอด บล็อกเหมือนเดิม
  */
  const orderIsRunning = PRODUCTION_ORDER_RUNNING_STATUSES.includes(
    selectedProductionOrder?.status ?? "",
  );
  const lockedItemIds = orderIsRunning ? [] : blockedItemIds;
  const lastPrefillOrderIdRef = useRef<string | undefined>(undefined);

  /*
    ใช้ `productionOrderId` ไม่ใช่ `referenceDocType/Id` — เหตุผลเดียวกับหน้ารายละเอียด
    ใบสั่งผลิต · ตัวกรอง `referenceDocId` ไม่ครอบคอลัมน์ FK `production_order_id`
    ถ้านับคำขอเดิมได้ไม่ครบ หน้านี้จะคิดยอดคงเหลือสูงเกินจริงแล้วปล่อยให้ขอรับซ้ำ
  */
  const productionOrderRequestsQuery = useProductionOutputStockRequestsQuery(
    selectedProductionOrderId
      ? { productionOrderId: selectedProductionOrderId }
      : undefined,
    { enabled: Boolean(selectedProductionOrderId) },
  );

  const previousRequests = useMemo(
    () =>
      (productionOrderRequestsQuery.data?.data ?? []).map((req) => ({
        key: req.id,
        requestNo: req.requestNo,
        itemLabel:
          req.itemCode && req.itemNameTh
            ? `${req.itemCode} — ${req.itemNameTh}`
            : req.itemNameTh || req.itemCode || "—",
        qty: formatQty(req.quantity),
        unitCode: req.unitCode,
        status: req.status,
        statusLabel: productionOutputStatusLabel(req.status),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productionOrderRequestsQuery.data?.data, t],
  );

  const items = itemsQuery.data?.data ?? [];
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("PRODUCTION_OUTPUT_STOCK_REQUESTS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const units = unitsQuery.data?.data ?? [];
  const warehouses = warehousesQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const selectedLocation = locations.find(
    (loc) => loc.id === warehouseLocationId,
  );

  const itemsError =
    itemsQuery.isError && itemsQuery.error instanceof Error
      ? itemsQuery.error.message
      : null;
  const unitsError =
    unitsQuery.isError && unitsQuery.error instanceof Error
      ? unitsQuery.error.message
      : null;

  const backHref = fromBatch
    ? "/receiving/pending-production-output"
    : ticketId
      ? `/receiving/${ticketId}`
      : "/production/output-stock-requests";

  useEffect(() => {
    form.setFieldsValue({
      postingDate: dayjs(),
      productionOrderId: initialProductionOrderId,
      referenceDocNo:
        batchTickets.length === 1
          ? batchTickets[0].ticketNo
          : undefined,
      ...(initialProductionOrderId ? {} : { lines: [{ ...EMPTY_LINE }] }),
    });
  }, [form, batchTickets, initialProductionOrderId]);

  useEffect(() => {
    if (!showProductionOrderRef) {
      return;
    }
    if (!selectedProductionOrderId) {
      if (lastPrefillOrderIdRef.current) {
        lastPrefillOrderIdRef.current = undefined;
        form.setFieldsValue({ lines: [{ ...EMPTY_LINE }] });
      }
      return;
    }
    if (!selectedProductionOrder) {
      return;
    }
    if (lastPrefillOrderIdRef.current === selectedProductionOrder.id) {
      return;
    }
    lastPrefillOrderIdRef.current = selectedProductionOrder.id;
    form.setFieldsValue({
      lines: linesFromReadyOrder(selectedProductionOrder),
    });
  }, [
    form,
    showProductionOrderRef,
    selectedProductionOrder,
    selectedProductionOrderId,
  ]);

  useEffect(() => {
    form.setFieldValue("warehouseLocationId", undefined);
  }, [warehouseId, form]);

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.itemCode} — ${item.itemNameTh}`,
        disabled: lockedItemIds.includes(item.id),
      })),
    [items, lockedItemIds],
  );

  const productionOrderOptions = useMemo(
    () =>
      readyOrders.map((order) => ({
        value: order.id,
        label: [
          order.orderNo,
          order.batchNo ? `Batch ${order.batchNo}` : null,
          dayjs(order.productionDate).format("DD/MM/YYYY"),
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [readyOrders],
  );

  const selectedItemGroups = useMemo(() => {
    return lines
      .map((line) => items.find((it) => it.id === line?.itemId)?.warehouseGroup)
      .filter(Boolean) as string[];
  }, [lines, items]);

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => {
        let disabled = false;
        let hint = "";
        if (selectedItemGroups.length > 0) {
          for (const group of selectedItemGroups) {
            const whType = (w.warehouseType || w.warehouseGroup || "").toUpperCase();
            if (
              group === "FINISHED_GOODS" &&
              !["FINISHED_GOODS", "HOLD", "QC_HOLD", "INSPECTION"].includes(whType)
            ) {
              disabled = true;
              hint = ` (${t("สินค้าสำเร็จรูปต้องเข้าคลังสินค้าสำเร็จรูป / ตรวจสอบ")})`;
              break;
            } else if (group !== "FINISHED_GOODS" && whType === "FINISHED_GOODS") {
              disabled = true;
              hint = ` (${t("สินค้ากลุ่ม {group} ห้ามเข้าคลังสำเร็จรูป", { group })})`;
              break;
            }
          }
        }
        return {
          value: w.id,
          label: `${w.warehouseCode} — ${w.warehouseName}${hint}`,
          disabled,
        };
      }),
    [warehouses, selectedItemGroups, t],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.id,
        label: `${loc.locationCode} — ${loc.locationName}`,
      })),
    [locations],
  );

  const previewLines = useMemo(
    () =>
      lines
        .map((line, index) => {
          const item = items.find((row) => row.id === line.itemId);
          const unit = units.find((row) => row.id === line.unitId);
          if (!item && !line.quantity) {
            return null;
          }
          return {
            key: index,
            text: item
              ? `${item.itemNameTh} ${formatQty(line.quantity)} ${
                  unit?.nameTh ?? unit?.code ?? ""
                }`.trim()
              : t("รายการที่ {n} (รอเลือกสินค้า)", { n: index + 1 }),
            itemLabel: item
              ? `${item.itemCode} — ${item.itemNameTh}`
              : "—",
            qtyLabel: `${formatQty(line.quantity)} ${
              unit ? `${unit.code}` : ""
            }`.trim(),
          };
        })
        .filter(Boolean) as Array<{
        key: number;
        text: string;
        itemLabel: string;
        qtyLabel: string;
      }>,
    [lines, items, units, t],
  );

  const handleItemChange = (index: number, itemId?: string) => {
    const plan = selectedProductionOrder?.outputItems?.find(
      (row) => row.itemId === itemId,
    );
    const item = items.find((row) => row.id === itemId);
    form.setFieldValue(
      ["lines", index, "unitId"],
      plan?.unitId ?? item?.unitId,
    );
    if (plan && Number(plan.remainingQty) > 0) {
      form.setFieldValue(
        ["lines", index, "quantity"],
        Number(plan.remainingQty),
      );
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const filledLines = values.lines.filter(
      (line) => line.itemId && line.unitId && line.quantity,
    );

    if (filledLines.length === 0) {
      form.setFields([
        {
          name: ["lines", 0, "itemId"],
          errors: [t("เพิ่มอย่างน้อย 1 รายการสินค้า")],
        },
      ]);
      return;
    }

    if (selectedProductionOrder && lockedItemIds.length > 0) {
      const duplicateItems = filledLines.filter((line) =>
        lockedItemIds.includes(line.itemId as string),
      );
      if (duplicateItems.length > 0) {
        form.setFields(
          duplicateItems.map((line) => ({
            name: [
              "lines",
              values.lines.findIndex((row) => row.itemId === line.itemId),
              "itemId",
            ],
            errors: [
              t("สินค้านี้รับเข้าคลังครบตามแผนของใบสั่งผลิตนี้แล้ว"),
            ],
          })),
        );
        return;
      }
    }

    // ตรวจสอบความเข้ากันได้ของสินค้ากับคลังสินค้าตามกฎ Warehouse Routing
    const targetWh = warehouses.find((w) => w.id === values.warehouseId);
    const whType = (
      targetWh?.warehouseType ||
      targetWh?.warehouseGroup ||
      ""
    ).toUpperCase();
    for (const line of filledLines) {
      const it = items.find((row) => row.id === line.itemId);
      if (it?.warehouseGroup) {
        const group = it.warehouseGroup;
        if (
          group === "FINISHED_GOODS" &&
          !["FINISHED_GOODS", "HOLD", "QC_HOLD", "INSPECTION"].includes(whType)
        ) {
          form.setFields([
            {
              name: "warehouseId",
              errors: [
                t("สินค้า \"{name}\" เป็นสินค้าสำเร็จรูป ต้องรับเข้าคลังสินค้าสำเร็จรูป / กักกัน / ตรวจสอบ", { name: it.itemNameTh }),
              ],
            },
          ]);
          return;
        } else if (group !== "FINISHED_GOODS" && whType === "FINISHED_GOODS") {
          form.setFields([
            {
              name: "warehouseId",
              errors: [
                t("สินค้า \"{name}\" (กลุ่ม {group}) ไม่สามารถรับเข้าคลังสินค้าสำเร็จรูปได้", { name: it.itemNameTh, group }),
              ],
            },
          ]);
          return;
        }
      }
    }

    // ตรวจสอบความซ้ำซ้อนของเลข Lot ในฟอร์มเดียวกัน
    const lotsInForm = filledLines
      .map((l) => l.lotNo?.trim())
      .filter(Boolean) as string[];
    const lotSet = new Set<string>();
    for (const lot of lotsInForm) {
      if (lotSet.has(lot)) {
        form.setFields([
          {
            name: "warehouseId",
            errors: [t("มีเลข Lot \"{lot}\" ซ้ำกันในฟอร์ม", { lot })],
          },
        ]);
        return;
      }
      lotSet.add(lot);
    }

    const itemsBody: CreateProductionOutputStockRequestBody[] =
      filledLines.map((line) => {
        const lineUnit = units.find((u) => u.id === line.unitId);
        const dec = lineUnit?.decimalPlaces ?? 3;
        const qNum = Number(line.quantity);
        return {
          itemId: line.itemId as string,
          unitId: line.unitId as string,
          quantity:
            dec === 0
              ? String(Math.round(qNum))
              : qNum.toFixed(Math.min(dec, 3)),
          warehouseId: values.warehouseId,
          warehouseLocationId: values.warehouseLocationId,
          postingDate: values.postingDate.format("YYYY-MM-DD"),
          lotNo: line.lotNo?.trim() || undefined,
          remark: values.remark?.trim() || undefined,
          ...(batchTickets.length === 0 &&
          !ticketId &&
          !values.productionOrderId
            ? {
                referenceDocNo: values.referenceDocNo?.trim() || undefined,
              }
            : {}),
        };
      });

    const references =
      batchTickets.length > 0
        ? batchTickets.map((ticket) => ({
            referenceDocType: REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET,
            referenceDocId: ticket.id,
            referenceDocNo: ticket.ticketNo,
          }))
        : ticketId
          ? [
              {
                referenceDocType: REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET,
                referenceDocId: ticketId,
                referenceDocNo:
                  values.referenceDocNo?.trim() || ticketNo || undefined,
              },
            ]
          : values.productionOrderId
            ? [
                {
                  referenceDocType: REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
                  referenceDocId: values.productionOrderId,
                  referenceDocNo: selectedProductionOrder?.orderNo,
                },
              ]
            : undefined;

    const payload: CreateProductionOutputStockRequestBatchBody = {
      items: itemsBody,
      references,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        clearProductionOutputTicketBatch();
        router.push(backHref);
      },
    });
  };

  return (
    <MasterPageGate
      isLoading={
        (Boolean(primaryTicketId) && purchaseTicketQuery.isLoading) ||
        itemsQuery.isLoading ||
        unitsQuery.isLoading ||
        warehousesQuery.isLoading ||
        (Boolean(primaryTicketId) &&
          !isPurchaseInTicket &&
          ticketRequestsQuery.isLoading)
      }
    >
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="PRODUCTION OUTPUT · STOCK IN"
          icon={<InboxOutlined />}
          title={t("ขอรับผลผลิตเข้าคลัง")}
          subtitle={t("เลือกสินค้าจาก master ที่เป็นสินค้าคลัง (is stock item) — เช่น ผลผลิตหรือวัสดุอื่นที่ต้องการรับเข้า — เริ่มจากใบสั่งผลิต ไม่ใช่ตั๋วชั่งรับซื้อยาง")}
          actions={
            <>
<Button
            icon={<ArrowLeftOutlined />}
            className={masterStyles.editButton}
            onClick={() =>
              router.push(
                isPurchaseInTicket ? purchaseInRedirectHref : backHref,
              )
            }
          >
            {isPurchaseInTicket
              ? t("กลับ flow รับซื้อยาง")
              : fromBatch
                ? t("กลับรายการรอรับผลผลิต")
                : ticketId
                  ? t("กลับตั๋วชั่ง")
                  : t("กลับรายการ")}
          </Button>
            </>
          }
        />

        {isPurchaseInTicket ? (
          <Alert
            type="warning"
            showIcon
            title={t("ตั๋วชั่งรับซื้อยางไม่ใช้หน้านี้")}
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  {t("ตั๋วนี้เป็น PURCHASE_IN — ใช้ flow คัดแยก / ใบรับซื้อ / จ่ายเงิน / รับยางดิบเข้าคลังเท่านั้น")}
                </p>
                <Button
                  type="primary"
                  onClick={() => router.push(purchaseInRedirectHref)}
                >
                  {purchaseTicket?.nextAction || t("ไปดำเนินการรับซื้อยาง")}
                </Button>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {!canRequest ? (
          <Alert
            type="warning"
            showIcon
            title={t("ต้องมีสิทธิ์ WAREHOUSE_OFFICER (หรือ Administrator) จึงจะสร้างคำขอได้")}
          />
        ) : null}

        {primaryTicketId && !isPurchaseInTicket && ticketLock.message ? (
          <Alert
            type={ticketLock.locked ? "info" : "warning"}
            showIcon
            title={t(ticketLock.label)}
            description={
              <div>
                <div>{t(ticketLock.message)}</div>
                {ticketLock.requests.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    {ticketLock.requests.map((row) => (
                      <div key={row.id}>
                        {row.requestNo} ·{" "}
                        {productionOutputStatusLabel(row.status)}
                        {row.itemNameTh
                          ? ` · ${row.itemNameTh} ${row.quantity} ${row.unitCode ?? ""}`
                          : ""}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            }
          />
        ) : null}

        {!isPurchaseInTicket && batchTickets.length > 0 ? (
          <div className={styles.sourceCard}>
            <div className={styles.sourceHeader}>
              <div>
                <div className={styles.sourceEyebrow}>SOURCE RECEIVING</div>
                <h3 className={styles.sourceTitle}>{t("ยอดที่รับมาแล้วจากตั๋วชั่ง")}</h3>
                <p className={styles.sourceLead}>
                  {t("ใช้เทียบก่อนกรอกจำนวนผลผลิตเข้าคลัง — ไม่ใช่ยอดที่จะ POST อัตโนมัติ")}
                </p>
              </div>
              <div className={styles.sourceTotals}>
                <div className={styles.sourceTotalItem}>
                  <span>{t("น้ำหนักสุทธิรวม")}</span>
                  <strong>{formatQty(sourceTotals.net)} {t("กก.")}</strong>
                </div>
                <div className={styles.sourceTotalItem}>
                  <span>{t("น้ำหนักคัดแยกรวม")}</span>
                  <strong>{formatQty(sourceTotals.classified)} {t("กก.")}</strong>
                </div>
                <div className={styles.sourceTotalItem}>
                  <span>{t("น้ำหนักจ่ายรวม")}</span>
                  <strong>{formatQty(sourceTotals.payable)} {t("กก.")}</strong>
                </div>
              </div>
            </div>

            {sourceLoading ? (
              <div className={styles.sourceLoading}>
                <Spin size="small" /> {t("กำลังโหลดข้อมูลรับเข้า...")}
              </div>
            ) : null}

            {sourceError instanceof Error ? (
              <Alert
                type="warning"
                showIcon
                title={t("โหลดยอดรับก่อนหน้าไม่สำเร็จ")}
                description={sourceError.message}
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {!sourceLoading && sourceSummaries.length === 0 ? (
              <Alert
                type="info"
                showIcon
                title={t("ยังไม่พบข้อมูลรับเข้าของตั๋วนี้")}
                description={t("อาจยังไม่ได้คัดแยก/สร้างใบรับซื้อ — ยังสร้างคำขอรับผลผลิตได้ แต่ไม่มีตัวเลขอ้างอิง")}
              />
            ) : null}

            <div className={styles.sourceList}>
              {sourceSummaries.map((source) => (
                <div key={source.ticketId} className={styles.sourceTicket}>
                  <div className={styles.sourceTicketHead}>
                    <div>
                      <Link
                        href={`/receiving/${source.ticketId}`}
                        className={styles.sourceTicketNo}
                      >
                        {source.ticketNo}
                      </Link>
                      <div className={styles.sourceTicketMeta}>
                        {[
                          source.sellerName,
                          source.truckLicensePlate
                            ? t("ทะเบียน {plate}", { plate: source.truckLicensePlate })
                            : null,
                          source.receiptNo
                            ? t("ใบรับซื้อ {no}", { no: source.receiptNo })
                            : null,
                          source.receiptStatus
                            ? t("สถานะ {status}", { status: source.receiptStatus })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className={styles.sourceWeightChips}>
                      <span>{t("เข้า")} {formatQty(source.grossWeightKg)}</span>
                      <span>{t("ออก")} {formatQty(source.tareWeightKg)}</span>
                      <span>{t("สุทธิ")} {formatQty(source.netWeightKg)} {t("กก.")}</span>
                    </div>
                  </div>

                  {source.items.length > 0 ? (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      columns={sourceItemColumns}
                      dataSource={source.items}
                      className={styles.sourceTable}
                    />
                  ) : (
                    <Typography.Text type="secondary">
                      {t("ยังไม่มีรายการคัดแยกในใบรับซื้อ")}
                    </Typography.Text>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isPurchaseInTicket ? (
        <div className={styles.layout}>
          <div className={styles.formCard}>
            <Form
              form={form}
              layout="vertical"
              requiredMark="optional"
              disabled={
                !canRequest || createMutation.isPending || formLocked
              }
              onFinish={() => void handleSubmit()}
              initialValues={{
                lines: [{ ...EMPTY_LINE }],
              }}
            >
              <div className={styles.formBody}>
                <div className={styles.sectionBlock}>
                  <div className={masterStyles.sectionTitle}>
                    <span className={masterStyles.sectionLine} />
                    <div>
                      <strong>{t("1. รายการผลผลิตที่รับเข้าคลัง")}</strong>
                      <span>
                        {t("เลือกสินค้าจาก master ที่ใช้งานและเป็นสินค้าคลัง — เพิ่มได้หลายรายการ")}
                      </span>
                    </div>
                  </div>

                  {(itemsError || unitsError) && (
                    <Alert
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                      title={itemsError || unitsError}
                    />
                  )}

                  <p className={styles.masterHint}>
                    Master:{" "}
                    <Link href="/masters/items">{t("สินค้า / วัตถุดิบ")}</Link>
                    {" · "}
                    <Link href="/masters/units">{t("หน่วยนับ")}</Link>
                  </p>

                  <Form.List name="lines">
                    {(fields, { add, remove }) => (
                      <div className={styles.lineList}>
                        {fields.map((field, index) => {
                          const currentLine = lines[field.name];
                          const lineItem = items.find(
                            (row) => row.id === currentLine?.itemId,
                          );
                          const lineUnit = units.find(
                            (row) => row.id === currentLine?.unitId,
                          );
                          const plan = selectedProductionOrder?.outputItems?.find(
                            (row) => row.itemId === currentLine?.itemId,
                          );
                          const plannedRemaining =
                            plan && Number(plan.remainingQty) > 0
                              ? Number(plan.remainingQty)
                              : undefined;
                          const decimalPlaces = lineUnit?.decimalPlaces ?? 3;
                          const isCountUnit = decimalPlaces === 0;
                          const step = isCountUnit
                            ? 1
                            : Math.pow(10, -Math.min(decimalPlaces, 3));
                          const min = isCountUnit
                            ? 1
                            : Math.pow(10, -Math.min(decimalPlaces, 3));
                          const isSubGram = [
                            "G",
                            "MG",
                            "กรัม",
                            "มิลลิกรัม",
                          ].includes((lineUnit?.code || "").toUpperCase());
                          const safetyCeiling = isSubGram
                            ? 1_000_000_000
                            : 1_000_000;
                          const maxAllowed = plannedRemaining
                            ? Math.min(
                                Math.round(plannedRemaining * 1.2 * 1000) / 1000,
                                safetyCeiling,
                              )
                            : safetyCeiling;

                          return (
                          <div key={field.key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>{t("รายการที่ {n}", { n: index + 1 })}</strong>
                              {fields.length > 1 ? (
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                  aria-label={t("ลบรายการที่ {n}", { n: index + 1 })}
                                >
                                  {t("ลบ")}
                                </Button>
                              ) : null}
                            </div>

                            <div className={styles.formGrid}>
                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "itemId"]}
                                label={t("สินค้า")}
                                rules={[
                                  { required: true, message: t("เลือกสินค้า") },
                                ]}
                              >
                                <Select
                                  size="large"
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder={t("ค้นหารหัสหรือชื่อสินค้า")}
                                  options={itemOptions}
                                  loading={itemsQuery.isFetching}
                                  onChange={(value) =>
                                    handleItemChange(index, value)
                                  }
                                  notFoundContent={
                                    itemsQuery.isFetching
                                      ? t("กำลังโหลด...")
                                      : t("ไม่พบสินค้าคลังที่ใช้งาน")
                                  }
                                />
                              </Form.Item>

                              <Form.Item
                                name={[field.name, "quantity"]}
                                label={t("จำนวน")}
                                rules={[
                                  { required: true, message: t("กรอกจำนวน") },
                                  {
                                    validator: async (_, value) => {
                                      if (value == null || value === "") return;
                                      const num = Number(value);
                                      if (Number.isNaN(num) || num <= 0) {
                                        throw new Error(t("จำนวนต้องมากกว่า 0"));
                                      }
                                      if (isCountUnit && !Number.isInteger(num)) {
                                        throw new Error(
                                          t("หน่วย {unit} ต้องเป็นจำนวนเต็ม", { unit: lineUnit?.nameTh || lineUnit?.code || "" }),
                                        );
                                      }
                                      if (num > maxAllowed) {
                                        throw new Error(
                                          t("จำนวนเกินเพดานที่อนุญาต (สูงสุด {max})", { max: maxAllowed.toLocaleString() }),
                                        );
                                      }
                                    },
                                  },
                                ]}
                                extra={qtyPlanHint(
                                  lines[field.name]?.itemId,
                                  selectedProductionOrder,
                                )}
                              >
                                <InputNumber
                                  size="large"
                                  min={min}
                                  max={maxAllowed}
                                  step={step}
                                  precision={decimalPlaces}
                                  style={{ width: "100%" }}
                                  placeholder={
                                    isCountUnit
                                      ? t("เช่น 10 / 50 / 100")
                                      : t("เช่น 15 / 500 / 20")
                                  }
                                />
                              </Form.Item>

                              <Form.Item
                                name={[field.name, "unitId"]}
                                label={t("หน่วยนับ")}
                                rules={[
                                  {
                                    required: true,
                                    message: t("เลือกหน่วยนับ"),
                                  },
                                ]}
                              >
                                <Select
                                  size="large"
                                  showSearch
                                  optionFilterProp="title"
                                  loading={unitsQuery.isFetching}
                                  {...resolveUnitField(
                                    lines[field.name]?.itemId,
                                    lines[field.name]?.unitId,
                                  )}
                                />
                              </Form.Item>

                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "lotNo"]}
                                label={t("เลข Lot (ถ้ามี)")}
                              >
                                <Input
                                  size="large"
                                  placeholder={t("ถ้าว่าง ระบบสร้างตอนอนุมัติ")}
                                />
                              </Form.Item>
                            </div>
                          </div>
                        );
                      })}

                        <Button
                          type="dashed"
                          block
                          size="large"
                          icon={<PlusOutlined />}
                          className={styles.addLineButton}
                          onClick={() => add({ ...EMPTY_LINE })}
                        >
                          {t("เพิ่มรายการผลผลิต")}
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>

                <div className={styles.sectionBlock}>
                  <div className={masterStyles.sectionTitle}>
                    <span className={masterStyles.sectionLine} />
                    <div>
                      <strong>{t("2. ปลายทางคลัง (ใช้ร่วมทุกรายการ)")}</strong>
                      <span>{t("คลังและตำแหน่งเดียวกันสำหรับทุกรายการในชุดนี้")}</span>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <Form.Item
                      name="warehouseId"
                      label={t("คลังสินค้า")}
                      rules={[{ required: true, message: t("เลือกคลัง") }]}
                    >
                      <Select
                        size="large"
                        showSearch
                        optionFilterProp="label"
                        options={warehouseOptions}
                        placeholder={t("เลือกคลัง")}
                      />
                    </Form.Item>

                    <Form.Item
                      name="warehouseLocationId"
                      label={t("ตำแหน่งจัดเก็บ")}
                      rules={[{ required: true, message: t("เลือกตำแหน่ง") }]}
                    >
                      <Select
                        size="large"
                        showSearch
                        optionFilterProp="label"
                        options={locationOptions}
                        placeholder={
                          warehouseId ? t("เลือกตำแหน่ง") : t("เลือกคลังก่อน")
                        }
                        disabled={!warehouseId}
                      />
                    </Form.Item>

                    <Form.Item
                      name="postingDate"
                      label={t("วันที่รับเข้า")}
                      rules={[{ required: true, message: t("เลือกวันที่") }]}
                    >
                      <DatePicker
                        size="large"
                        format="DD/MM/YYYY"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className={styles.sectionBlock}>
                  <div className={masterStyles.sectionTitle}>
                    <span className={masterStyles.sectionLine} />
                    <div>
                      <strong>{t("3. เอกสารอ้างอิง")}</strong>
                      <span>
                        {isMultiTicket
                          ? t("ตั๋วชั่ง {n} ใบ — ใช้ร่วมทุกรายการผลผลิต (จำนวนด้านบนเป็นยอดรวม)", { n: batchTickets.length })
                          : showProductionOrderRef
                            ? t("เลือกใบสั่งผลิตที่เริ่มผลิตแล้ว หรือใส่เลขที่เอกสารอื่น (ถ้ามี)")
                            : t("ใส่เพิ่มได้ถ้ามี — ใช้ร่วมทุกรายการ")}
                      </span>
                    </div>
                  </div>

                  {batchTickets.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: isMultiTicket ? 0 : 12,
                        }}
                      >
                        {batchTickets.map((ticket) => (
                          <span
                            key={ticket.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              height: 28,
                              padding: "0 12px",
                              borderRadius: 999,
                              background: "rgba(115, 152, 22, 0.12)",
                              color: "#627F13",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {ticket.ticketNo}
                          </span>
                        ))}
                      </div>
                      {isMultiTicket ? (
                        <Typography.Text
                          type="secondary"
                          style={{ display: "block", marginTop: 10, fontSize: 13 }}
                        >
                          {t("ตัวอย่าง: ใส่น้ำมัน 70 ลิตร = ยอดรวมของทั้ง {n} ตั๋ว ไม่ใช่ใบละ 70", { n: batchTickets.length })}
                        </Typography.Text>
                      ) : null}
                    </div>
                  ) : showProductionOrderRef ? (
                    <>
                      <Row gutter={14}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="productionOrderId"
                            label={t("ใบสั่งผลิต")}
                            extra={t("ใบที่เริ่มผลิตแล้ว — กำลังผลิต / หยุดชั่วคราว / เสร็จสิ้น")}
                          >
                            <Select
                              size="large"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              placeholder={t("เลือกใบสั่งผลิต")}
                              loading={readyOrdersQuery.isLoading}
                              options={productionOrderOptions}
                              onChange={(value) => {
                                if (value) {
                                  form.setFieldValue("referenceDocNo", undefined);
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="referenceDocNo"
                            label={t("เลขที่เอกสารอ้างอิง (อื่น)")}
                            extra={
                              selectedProductionOrderId
                                ? t("ล้างใบสั่งผลิตก่อน ถ้าต้องการใส่เลขที่เอง")
                                : t("ใช้เมื่อไม่ได้เลือกใบสั่งผลิต")
                            }
                          >
                            <Input
                              size="large"
                              placeholder={t("ถ้ามี")}
                              disabled={Boolean(selectedProductionOrderId)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {selectedProductionOrder ? (
                        <div className={styles.refOrderCard}>
                          <div className={styles.refOrderHead}>
                            <div>
                              <Link
                                href={`/production/production-orders/${selectedProductionOrder.id}`}
                                className={styles.refOrderNo}
                              >
                                {selectedProductionOrder.orderNo}
                              </Link>
                              <div className={styles.refOrderMeta}>
                                {[
                                  selectedProductionOrder.batchNo
                                    ? `Batch ${selectedProductionOrder.batchNo}`
                                    : null,
                                  t("ผลิต {date}", { date: dayjs(selectedProductionOrder.productionDate).format("DD/MM/YYYY") }),
                                  selectedProductionOrder.completedAt
                                    ? t("เสร็จ {date}", { date: dayjs(selectedProductionOrder.completedAt).format("DD/MM/YYYY HH:mm") })
                                    : null,
                                  tLabel(
                                    PRODUCTION_ORDER_STATUS_LABEL[
                                      selectedProductionOrder.status
                                    ] ?? selectedProductionOrder.status,
                                  ),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            <div className={styles.refOrderStats}>
                              <span>
                                {t("คำขอที่เคยสร้าง")}{" "}
                                <strong>
                                  {selectedProductionOrder.totalRequestCount}
                                </strong>
                              </span>
                              {blockedItemIds.length > 0 ? (
                                <span className={styles.refOrderBlocked}>
                                  {t("ครบตามแผนแล้ว {n} รายการ", { n: blockedItemIds.length })}
                                  {orderIsRunning
                                    ? ` — ${t("รับเพิ่มได้ นับเป็นส่วนเกินแผน")}`
                                    : ""}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : readyOrdersQuery.isSuccess &&
                        readyOrders.length === 0 ? (
                        <Alert
                          type="info"
                          showIcon
                          title={t("ยังไม่มีใบสั่งผลิตที่เริ่มผลิต")}
                          description={
                            <>
                              {t("เปิดและกด \"เริ่มผลิต\" ที่")}{" "}
                              <Link href="/production/production-orders">
                                /production/production-orders
                              </Link>{" "}
                              {t("ก่อน หรือใส่เลขที่เอกสารอ้างอิงด้านบน")}
                            </>
                          }
                          style={{ marginBottom: 16 }}
                        />
                      ) : null}
                    </>
                  ) : (
                    <Row gutter={14}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="referenceDocNo"
                          label={t("เลขที่เอกสารอ้างอิง")}
                        >
                          <Input size="large" placeholder={t("ถ้ามี")} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}

                  <Row gutter={14}>
                    <Col xs={24}>
                      <Form.Item name="remark" label={t("หมายเหตุ")}>
                        <Input.TextArea
                          rows={3}
                          placeholder={t("เช่น ผลผลิตจากรอบย่อยยางเช้า")}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>

              <div className={styles.footerBar}>
                <p className={styles.footerHint}>
                  {isMultiTicket
                    ? t("ส่งครั้งเดียว — อ้างอิง {n} ตั๋ว · แต่ละวัตถุดิบเป็นคำขอแยก (PENDING) · สต๊อกเพิ่มเมื่ออนุมัติ", { n: batchTickets.length })
                    : t("แต่ละรายการจะสร้างเป็นคำขอแยก (PENDING_APPROVAL) — สต๊อกยังไม่เพิ่มจนกว่าจะอนุมัติทีละรายการ")}
                </p>
                <div className={styles.footerActions}>
                  <Button
                    size="large"
                    onClick={() => router.push(backHref)}
                  >
                    {t("ยกเลิก")}
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    className={masterStyles.createButton}
                    loading={createMutation.isPending}
                    disabled={!canRequest || formLocked}
                  >
                    {t("ส่งคำขอ")} {previewLines.length > 0 ? `(${previewLines.length})` : ""}
                  </Button>
                </div>
              </div>
            </Form>
          </div>

          <aside className={styles.summaryCard}>
            <div>
              <div className={styles.summaryEyebrow}>LIVE PREVIEW</div>
              <h3 className={styles.summaryTitle}>{t("สรุปคำขอ")}</h3>
              <p className={styles.summaryLead}>
                {t("{n} รายการผลผลิตจะถูกส่งเข้าคลังชุดเดียวกัน", { n: previewLines.length })}
              </p>
            </div>

            {sourceSummaries.length > 0 ? (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>{t("รับมาก่อนหน้า")}</div>
                <p className={styles.previewValue}>
                  {t("สุทธิ")} {formatQty(sourceTotals.net)} {t("กก.")}
                </p>
                <p className={styles.previewMeta}>
                  {t("คัดแยก")} {formatQty(sourceTotals.classified)} {t("กก.")} · {t("จ่าย")}{" "}
                  {formatQty(sourceTotals.payable)} {t("กก.")}
                </p>
              </div>
            ) : null}

            {selectedProductionOrderId ? (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>
                  {t("จากใบสั่งผลิต")} {selectedProductionOrder?.orderNo ?? "—"}
                </div>
                {readyOrdersQuery.isLoading && !selectedProductionOrder ? (
                  <div className={styles.previewLoading}>
                    <Spin size="small" />
                  </div>
                ) : selectedProductionOrder ? (
                  <>
                    <p className={styles.previewMeta}>
                      <strong>{t("วัตถุดิบเข้าจริง")}</strong>{" "}
                      {formatQty(selectedProductionOrder.totalInputQty)}
                    </p>
                    {(selectedProductionOrder.outputItems ?? []).length > 1 ? null : (
                      <p className={styles.previewMeta}>
                        <strong>{t("ผลผลิตตามแผน")}</strong>{" "}
                        {formatQty(selectedProductionOrder.totalPlannedOutputQty)}
                      </p>
                    )}
                    {(selectedProductionOrder.outputItems ?? []).length > 0 ? (
                      <ul className={styles.previewSubList}>
                        {(selectedProductionOrder.outputItems ?? []).map(
                          (item) => (
                            <li key={item.itemId}>
                              {item.itemCode && item.itemNameTh
                                ? `${item.itemCode} — ${item.itemNameTh}`
                                : item.itemNameTh || item.itemCode || "—"}{" "}
                              <span className={styles.previewSubQty}>
                                {t("แผน")} {formatQty(item.plannedQty)} · {t("ขอแล้ว")}{" "}
                                {formatQty(item.requestedQty)} · {t("ค้าง")}{" "}
                                {formatQty(item.remainingQty)}
                                {item.unitCode ? ` ${item.unitCode}` : ""}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : null}
                    {(selectedProductionOrder.outputItems ?? []).length > 1 ? (
                      <p className={styles.previewMeta}>
                        <strong>{t("ผลผลิตเข้าคลังแล้ว")}</strong> {t("แยกตามสินค้าด้านบน — ไม่คิด Yield รวม")}
                      </p>
                    ) : (
                      <p className={styles.previewMeta}>
                        <strong>{t("ผลผลิตเข้าคลังแล้ว")}</strong>{" "}
                        {formatQty(selectedProductionOrder.totalOutputQty)}
                        {" · "}Yield{" "}
                        {selectedProductionOrder.yieldPercent.toLocaleString(
                          appLocale(),
                          { maximumFractionDigits: 2 },
                        )}
                        %
                      </p>
                    )}
                    <p className={styles.previewMeta}>
                      <strong>{t("คำขอที่เคยส่ง")}</strong>{" "}
                      {t("{n} รายการ", { n: previousRequests.length })}
                    </p>
                    {previousRequests.length > 0 ? (
                      <ul className={styles.previewSubList}>
                        {previousRequests.map((req) => (
                          <li key={req.key}>
                            {req.requestNo} · {req.itemLabel}{" "}
                            <span className={styles.previewSubQty}>
                              {req.qty}
                              {req.unitCode ? ` ${req.unitCode}` : ""}
                            </span>{" "}
                            <span className={styles.previewStatus}>
                              ({req.statusLabel})
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.previewMeta}>
                    {t("ไม่พบใบสั่งผลิตในคิวรับเข้าคลัง")}
                  </p>
                )}
              </div>
            ) : null}

            <div className={styles.previewBox}>
              <div className={styles.previewLabel}>{t("จะรับเข้า")}</div>
              {previewLines.length === 0 ? (
                <p className={styles.previewValue}>
                  {t("เพิ่มรายการผลผลิตเพื่อดูสรุป")}
                </p>
              ) : (
                <ul className={styles.previewList}>
                  {previewLines.map((line) => (
                    <li key={line.key}>{line.text}</li>
                  ))}
                </ul>
              )}
              <p className={styles.previewMeta}>
                {selectedWarehouse
                  ? `${selectedWarehouse.warehouseCode} · ${
                      selectedLocation?.locationName ?? t("รอเลือกตำแหน่ง")
                    }`
                  : t("ยังไม่ได้เลือกคลัง")}
              </p>
            </div>

            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>{t("เอกสารอ้างอิง")}</span>
                <strong>
                  {batchTickets.length > 0
                    ? t("{n} ตั๋ว", { n: batchTickets.length })
                    : selectedProductionOrder
                      ? t("{orderNo} · วัตถุดิบ {qty}", { orderNo: selectedProductionOrder.orderNo, qty: formatQty(selectedProductionOrder.totalInputQty) })
                      : "—"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("จำนวนรายการ")}</span>
                <strong>{t("{n} รายการ", { n: previewLines.length })}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("วันที่")}</span>
                <strong>
                  {postingDate
                    ? dayjs(postingDate).format("DD/MM/YYYY")
                    : "—"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("คลัง")}</span>
                <strong>
                  {selectedWarehouse
                    ? `${selectedWarehouse.warehouseCode} — ${selectedWarehouse.warehouseName}`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className={styles.flowNote}>
              <strong>{t("ตัวอย่างรอบย่อยยาง")}</strong>
              <p>
                {t("ผงยาง 15 กรัม + น้ำมัน Pyrolysis 500 ลิตร + เศษเหล็ก 20 kg ในคำขอชุดเดียวกัน")}
              </p>
            </div>

            <div className={styles.exampleChips}>
              <span className={styles.exampleChip}>{t("ผงยาง 15 กรัม")}</span>
              <span className={styles.exampleChip}>
                {t("น้ำมัน Pyrolysis 500 ลิตร")}
              </span>
              <span className={styles.exampleChip}>{t("เศษเหล็ก 20 kg")}</span>
            </div>
          </aside>
        </div>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
