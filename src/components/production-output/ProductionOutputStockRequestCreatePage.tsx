"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  useProductionOrderQuery,
  useProductionOrderSummaryQuery,
} from "@/hooks/production-orders/useProductionOrderQueries";
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
} from "@/types/production-output-stock-request";
import {
  PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL,
  REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
  REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET,
  resolveProductionOutputTicketLock,
} from "@/types/production-output-stock-request";
import { PRODUCTION_ORDER_STATUS_LABEL } from "@/types/production-order";
import {
  clearProductionOutputTicketBatch,
  peekProductionOutputTicketBatch,
  type ProductionOutputTicketBatchItem,
} from "@/types/production-output-pending-tickets";
import type { ClassificationItem } from "@/types/raw-tire-classification";
import { RECEIPT_STATUS_LABELS } from "@/types/raw-tire-classification";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOutputStockRequestCreatePage.module.css";

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
  return n.toLocaleString("th-TH", {
    maximumFractionDigits: 3,
  });
}

const EMPTY_LINE: LineValues = {
  itemId: undefined,
  unitId: undefined,
  quantity: undefined,
  lotNo: undefined,
};

const SOURCE_ITEM_COLUMNS: ColumnsType<ClassificationItem> = [
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
          ? (RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status)
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

  const productionOrderDetailQuery = useProductionOrderQuery(
    selectedProductionOrderId ?? undefined,
  );
  const productionOrderSummaryQuery = useProductionOrderSummaryQuery(
    selectedProductionOrderId ?? undefined,
  );
  const productionOrderRequestsQuery = useProductionOutputStockRequestsQuery(
    selectedProductionOrderId
      ? {
          referenceDocType: REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
          referenceDocId: selectedProductionOrderId,
        }
      : undefined,
    { enabled: Boolean(selectedProductionOrderId) },
  );

  const productionOrderRefLoading =
    productionOrderDetailQuery.isLoading ||
    productionOrderSummaryQuery.isLoading ||
    productionOrderRequestsQuery.isLoading;

  const productionOrderRefError =
    (productionOrderDetailQuery.isError &&
      productionOrderDetailQuery.error instanceof Error &&
      productionOrderDetailQuery.error.message) ||
    (productionOrderSummaryQuery.isError &&
      productionOrderSummaryQuery.error instanceof Error &&
      productionOrderSummaryQuery.error.message) ||
    (productionOrderRequestsQuery.isError &&
      productionOrderRequestsQuery.error instanceof Error &&
      productionOrderRequestsQuery.error.message) ||
    null;

  const productionOrderRefSummary = useMemo(() => {
    if (!selectedProductionOrderId) {
      return null;
    }

    const summary = productionOrderSummaryQuery.data?.data;
    const order = productionOrderDetailQuery.data?.data;
    const requests = productionOrderRequestsQuery.data?.data ?? [];
    const orderNo =
      selectedProductionOrder?.orderNo ?? order?.orderNo ?? "—";

    if (!summary && !order && requests.length === 0) {
      return null;
    }

    const inputItems = (order?.inputItems ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        key: item.id,
        label:
          item.itemCode && item.itemNameTh
            ? `${item.itemCode} — ${item.itemNameTh}`
            : item.itemNameTh || item.itemCode || "—",
        qty: formatQty(item.actualQty || item.plannedQty),
        unitCode: item.unitCode,
      }));

    const outputByItem = (summary?.outputByItem ?? []).map((item) => ({
      key: item.itemId,
      label:
        item.itemCode && item.itemNameTh
          ? `${item.itemCode} — ${item.itemNameTh}`
          : item.itemNameTh || item.itemCode || "—",
      qty: formatQty(item.quantity),
    }));

    const previousRequests = requests.map((req) => ({
      key: req.id,
      requestNo: req.requestNo,
      itemLabel:
        req.itemCode && req.itemNameTh
          ? `${req.itemCode} — ${req.itemNameTh}`
          : req.itemNameTh || req.itemCode || "—",
      qty: formatQty(req.quantity),
      unitCode: req.unitCode,
      status: req.status,
      statusLabel:
        PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[req.status] ?? req.status,
    }));

    return {
      orderNo,
      totalInputQty: summary?.totalInputQty ?? "0",
      totalOutputQty: summary?.totalOutputQty ?? "0",
      yieldPercent: summary?.yieldPercent ?? 0,
      inputItems,
      outputByItem,
      previousRequests,
    };
  }, [
    selectedProductionOrderId,
    selectedProductionOrder?.orderNo,
    productionOrderSummaryQuery.data?.data,
    productionOrderDetailQuery.data?.data,
    productionOrderRequestsQuery.data?.data,
  ]);

  const items = itemsQuery.data?.data ?? [];
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
      lines: [{ ...EMPTY_LINE }],
      productionOrderId: initialProductionOrderId,
      referenceDocNo:
        batchTickets.length === 1
          ? batchTickets[0].ticketNo
          : undefined,
    });
  }, [form, batchTickets, initialProductionOrderId]);

  useEffect(() => {
    form.setFieldValue("warehouseLocationId", undefined);
  }, [warehouseId, form]);

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.itemCode} — ${item.itemNameTh}`,
        disabled: blockedItemIds.includes(item.id),
      })),
    [items, blockedItemIds],
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

  const unitOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.nameTh}`,
      })),
    [units],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehouses],
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
              : `รายการที่ ${index + 1} (รอเลือกสินค้า)`,
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
    [lines, items, units],
  );

  const handleItemChange = (index: number, itemId?: string) => {
    const item = items.find((row) => row.id === itemId);
    if (item?.unitId) {
      form.setFieldValue(["lines", index, "unitId"], item.unitId);
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
          errors: ["เพิ่มอย่างน้อย 1 รายการสินค้า"],
        },
      ]);
      return;
    }

    if (selectedProductionOrder && blockedItemIds.length > 0) {
      const duplicateItems = filledLines.filter((line) =>
        blockedItemIds.includes(line.itemId as string),
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
              "สินค้านี้มีคำขอรออนุมัติหรืออนุมัติแล้วสำหรับใบสั่งผลิตนี้",
            ],
          })),
        );
        return;
      }
    }

    const itemsBody: CreateProductionOutputStockRequestBody[] =
      filledLines.map((line) => ({
        itemId: line.itemId as string,
        unitId: line.unitId as string,
        quantity: Number(line.quantity).toFixed(3),
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
      }));

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
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent} aria-hidden>
            <InboxOutlined />
          </div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              PRODUCTION OUTPUT · STOCK IN
            </div>
            <Typography.Title level={2} className={masterStyles.pageTitle}>
              ขอรับผลผลิตเข้าคลัง
            </Typography.Title>
            <Typography.Text className={masterStyles.pageSubtitle}>
              เลือกสินค้าจาก master ที่เป็นสินค้าคลัง (is stock item) —
              เช่น ผลผลิตหรือวัสดุอื่นที่ต้องการรับเข้า — เริ่มจากใบสั่งผลิต
              ไม่ใช่ตั๋วชั่งรับซื้อยาง
            </Typography.Text>
          </div>
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
              ? "กลับ flow รับซื้อยาง"
              : fromBatch
                ? "กลับรายการรอรับผลผลิต"
                : ticketId
                  ? "กลับตั๋วชั่ง"
                  : "กลับรายการ"}
          </Button>
        </div>

        {isPurchaseInTicket ? (
          <Alert
            type="warning"
            showIcon
            title="ตั๋วชั่งรับซื้อยางไม่ใช้หน้านี้"
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  ตั๋วนี้เป็น PURCHASE_IN — ใช้ flow คัดแยก / ใบรับซื้อ / จ่ายเงิน
                  / รับยางดิบเข้าคลังเท่านั้น
                </p>
                <Button
                  type="primary"
                  onClick={() => router.push(purchaseInRedirectHref)}
                >
                  {purchaseTicket?.nextAction || "ไปดำเนินการรับซื้อยาง"}
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
            title="ต้องมีสิทธิ์ WAREHOUSE_OFFICER (หรือ Administrator) จึงจะสร้างคำขอได้"
          />
        ) : null}

        {primaryTicketId && !isPurchaseInTicket && ticketLock.message ? (
          <Alert
            type={ticketLock.locked ? "info" : "warning"}
            showIcon
            title={ticketLock.label}
            description={
              <div>
                <div>{ticketLock.message}</div>
                {ticketLock.requests.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    {ticketLock.requests.map((row) => (
                      <div key={row.id}>
                        {row.requestNo} ·{" "}
                        {PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[row.status] ??
                          row.status}
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
                <h3 className={styles.sourceTitle}>ยอดที่รับมาแล้วจากตั๋วชั่ง</h3>
                <p className={styles.sourceLead}>
                  ใช้เทียบก่อนกรอกจำนวนผลผลิตเข้าคลัง — ไม่ใช่ยอดที่จะ POST อัตโนมัติ
                </p>
              </div>
              <div className={styles.sourceTotals}>
                <div className={styles.sourceTotalItem}>
                  <span>น้ำหนักสุทธิรวม</span>
                  <strong>{formatQty(sourceTotals.net)} กก.</strong>
                </div>
                <div className={styles.sourceTotalItem}>
                  <span>น้ำหนักคัดแยกรวม</span>
                  <strong>{formatQty(sourceTotals.classified)} กก.</strong>
                </div>
                <div className={styles.sourceTotalItem}>
                  <span>น้ำหนักจ่ายรวม</span>
                  <strong>{formatQty(sourceTotals.payable)} กก.</strong>
                </div>
              </div>
            </div>

            {sourceLoading ? (
              <div className={styles.sourceLoading}>
                <Spin size="small" /> กำลังโหลดข้อมูลรับเข้า...
              </div>
            ) : null}

            {sourceError instanceof Error ? (
              <Alert
                type="warning"
                showIcon
                title="โหลดยอดรับก่อนหน้าไม่สำเร็จ"
                description={sourceError.message}
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {!sourceLoading && sourceSummaries.length === 0 ? (
              <Alert
                type="info"
                showIcon
                title="ยังไม่พบข้อมูลรับเข้าของตั๋วนี้"
                description="อาจยังไม่ได้คัดแยก/สร้างใบรับซื้อ — ยังสร้างคำขอรับผลผลิตได้ แต่ไม่มีตัวเลขอ้างอิง"
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
                            ? `ทะเบียน ${source.truckLicensePlate}`
                            : null,
                          source.receiptNo
                            ? `ใบรับซื้อ ${source.receiptNo}`
                            : null,
                          source.receiptStatus
                            ? `สถานะ ${source.receiptStatus}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className={styles.sourceWeightChips}>
                      <span>เข้า {formatQty(source.grossWeightKg)}</span>
                      <span>ออก {formatQty(source.tareWeightKg)}</span>
                      <span>สุทธิ {formatQty(source.netWeightKg)} กก.</span>
                    </div>
                  </div>

                  {source.items.length > 0 ? (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      columns={SOURCE_ITEM_COLUMNS}
                      dataSource={source.items}
                      className={styles.sourceTable}
                    />
                  ) : (
                    <Typography.Text type="secondary">
                      ยังไม่มีรายการคัดแยกในใบรับซื้อ
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
                      <strong>1. รายการผลผลิตที่รับเข้าคลัง</strong>
                      <span>
                        เลือกสินค้าจาก master ที่ใช้งานและเป็นสินค้าคลัง —
                        เพิ่มได้หลายรายการ
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
                    <Link href="/masters/items">สินค้า / วัตถุดิบ</Link>
                    {" · "}
                    <Link href="/masters/units">หน่วยนับ</Link>
                  </p>

                  <Form.List name="lines">
                    {(fields, { add, remove }) => (
                      <div className={styles.lineList}>
                        {fields.map((field, index) => (
                          <div key={field.key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>รายการที่ {index + 1}</strong>
                              {fields.length > 1 ? (
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                  aria-label={`ลบรายการที่ ${index + 1}`}
                                >
                                  ลบ
                                </Button>
                              ) : null}
                            </div>

                            <div className={styles.formGrid}>
                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "itemId"]}
                                label="สินค้า"
                                rules={[
                                  { required: true, message: "เลือกสินค้า" },
                                ]}
                              >
                                <Select
                                  size="large"
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder="ค้นหารหัสหรือชื่อสินค้า"
                                  options={itemOptions}
                                  loading={itemsQuery.isFetching}
                                  onChange={(value) =>
                                    handleItemChange(index, value)
                                  }
                                  notFoundContent={
                                    itemsQuery.isFetching
                                      ? "กำลังโหลด..."
                                      : "ไม่พบสินค้าคลังที่ใช้งาน"
                                  }
                                />
                              </Form.Item>

                              <Form.Item
                                name={[field.name, "quantity"]}
                                label="จำนวน"
                                rules={[
                                  { required: true, message: "กรอกจำนวน" },
                                ]}
                              >
                                <InputNumber
                                  size="large"
                                  min={0.001}
                                  step={0.001}
                                  style={{ width: "100%" }}
                                  placeholder="เช่น 15 / 500 / 20"
                                />
                              </Form.Item>

                              <Form.Item
                                name={[field.name, "unitId"]}
                                label="หน่วยนับ"
                                rules={[
                                  {
                                    required: true,
                                    message: "เลือกหน่วยนับ",
                                  },
                                ]}
                              >
                                <Select
                                  size="large"
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder="กรัม / ลิตร / kg"
                                  options={unitOptions}
                                  loading={unitsQuery.isFetching}
                                />
                              </Form.Item>

                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "lotNo"]}
                                label="เลข Lot (ถ้ามี)"
                              >
                                <Input
                                  size="large"
                                  placeholder="ถ้าว่าง ระบบสร้างตอนอนุมัติ"
                                />
                              </Form.Item>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="dashed"
                          block
                          size="large"
                          icon={<PlusOutlined />}
                          className={styles.addLineButton}
                          onClick={() => add({ ...EMPTY_LINE })}
                        >
                          เพิ่มรายการผลผลิต
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>

                <div className={styles.sectionBlock}>
                  <div className={masterStyles.sectionTitle}>
                    <span className={masterStyles.sectionLine} />
                    <div>
                      <strong>2. ปลายทางคลัง (ใช้ร่วมทุกรายการ)</strong>
                      <span>คลังและตำแหน่งเดียวกันสำหรับทุกรายการในชุดนี้</span>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <Form.Item
                      name="warehouseId"
                      label="คลังสินค้า"
                      rules={[{ required: true, message: "เลือกคลัง" }]}
                    >
                      <Select
                        size="large"
                        showSearch
                        optionFilterProp="label"
                        options={warehouseOptions}
                        placeholder="เลือกคลัง"
                      />
                    </Form.Item>

                    <Form.Item
                      name="warehouseLocationId"
                      label="ตำแหน่งจัดเก็บ"
                      rules={[{ required: true, message: "เลือกตำแหน่ง" }]}
                    >
                      <Select
                        size="large"
                        showSearch
                        optionFilterProp="label"
                        options={locationOptions}
                        placeholder={
                          warehouseId ? "เลือกตำแหน่ง" : "เลือกคลังก่อน"
                        }
                        disabled={!warehouseId}
                      />
                    </Form.Item>

                    <Form.Item
                      name="postingDate"
                      label="วันที่รับเข้า"
                      rules={[{ required: true, message: "เลือกวันที่" }]}
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
                      <strong>3. เอกสารอ้างอิง</strong>
                      <span>
                        {isMultiTicket
                          ? `ตั๋วชั่ง ${batchTickets.length} ใบ — ใช้ร่วมทุกรายการผลผลิต (จำนวนด้านบนเป็นยอดรวม)`
                          : showProductionOrderRef
                            ? "เลือกใบสั่งผลิตที่เสร็จสิ้นแล้ว หรือใส่เลขที่เอกสารอื่น (ถ้ามี)"
                            : "ใส่เพิ่มได้ถ้ามี — ใช้ร่วมทุกรายการ"}
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
                          ตัวอย่าง: ใส่น้ำมัน 70 ลิตร = ยอดรวมของทั้ง{" "}
                          {batchTickets.length} ตั๋ว ไม่ใช่ใบละ 70
                        </Typography.Text>
                      ) : null}
                    </div>
                  ) : showProductionOrderRef ? (
                    <>
                      <Row gutter={14}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="productionOrderId"
                            label="ใบสั่งผลิต"
                            extra="เฉพาะใบที่สถานะเสร็จสิ้น (COMPLETED)"
                          >
                            <Select
                              size="large"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              placeholder="เลือกใบสั่งผลิต"
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
                            label="เลขที่เอกสารอ้างอิง (อื่น)"
                            extra={
                              selectedProductionOrderId
                                ? "ล้างใบสั่งผลิตก่อน ถ้าต้องการใส่เลขที่เอง"
                                : "ใช้เมื่อไม่ได้เลือกใบสั่งผลิต"
                            }
                          >
                            <Input
                              size="large"
                              placeholder="ถ้ามี"
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
                                  `ผลิต ${dayjs(selectedProductionOrder.productionDate).format("DD/MM/YYYY")}`,
                                  selectedProductionOrder.completedAt
                                    ? `เสร็จ ${dayjs(selectedProductionOrder.completedAt).format("DD/MM/YYYY HH:mm")}`
                                    : null,
                                  PRODUCTION_ORDER_STATUS_LABEL[
                                    selectedProductionOrder.status
                                  ] ?? selectedProductionOrder.status,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            <div className={styles.refOrderStats}>
                              <span>
                                คำขอที่เคยสร้าง{" "}
                                <strong>
                                  {selectedProductionOrder.totalRequestCount}
                                </strong>
                              </span>
                              {blockedItemIds.length > 0 ? (
                                <span className={styles.refOrderBlocked}>
                                  มี {blockedItemIds.length} สินค้าที่ขอซ้ำไม่ได้
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
                          title="ยังไม่มีใบสั่งผลิตที่เสร็จสิ้น"
                          description={
                            <>
                              สร้างและปิดใบสั่งผลิตที่{" "}
                              <Link href="/production/production-orders">
                                /production/production-orders
                              </Link>{" "}
                              ก่อน หรือใส่เลขที่เอกสารอ้างอิงด้านบน
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
                          label="เลขที่เอกสารอ้างอิง"
                        >
                          <Input size="large" placeholder="ถ้ามี" />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}

                  <Row gutter={14}>
                    <Col xs={24}>
                      <Form.Item name="remark" label="หมายเหตุ">
                        <Input.TextArea
                          rows={3}
                          placeholder="เช่น ผลผลิตจากรอบย่อยยางเช้า"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>

              <div className={styles.footerBar}>
                <p className={styles.footerHint}>
                  {isMultiTicket
                    ? `ส่งครั้งเดียว — อ้างอิง ${batchTickets.length} ตั๋ว · แต่ละวัตถุดิบเป็นคำขอแยก (PENDING) · สต๊อกเพิ่มเมื่ออนุมัติ`
                    : "แต่ละรายการจะสร้างเป็นคำขอแยก (PENDING_APPROVAL) — สต๊อกยังไม่เพิ่มจนกว่าจะอนุมัติทีละรายการ"}
                </p>
                <div className={styles.footerActions}>
                  <Button
                    size="large"
                    onClick={() => router.push(backHref)}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    className={masterStyles.createButton}
                    loading={createMutation.isPending}
                    disabled={!canRequest || formLocked}
                  >
                    ส่งคำขอ {previewLines.length > 0 ? `(${previewLines.length})` : ""}
                  </Button>
                </div>
              </div>
            </Form>
          </div>

          <aside className={styles.summaryCard}>
            <div>
              <div className={styles.summaryEyebrow}>LIVE PREVIEW</div>
              <h3 className={styles.summaryTitle}>สรุปคำขอ</h3>
              <p className={styles.summaryLead}>
                {previewLines.length} รายการผลผลิตจะถูกส่งเข้าคลังชุดเดียวกัน
              </p>
            </div>

            {sourceSummaries.length > 0 ? (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>รับมาก่อนหน้า</div>
                <p className={styles.previewValue}>
                  สุทธิ {formatQty(sourceTotals.net)} กก.
                </p>
                <p className={styles.previewMeta}>
                  คัดแยก {formatQty(sourceTotals.classified)} กก. · จ่าย{" "}
                  {formatQty(sourceTotals.payable)} กก.
                </p>
              </div>
            ) : null}

            {selectedProductionOrderId ? (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>
                  จากใบสั่งผลิต{" "}
                  {productionOrderRefSummary?.orderNo ??
                    selectedProductionOrder?.orderNo ??
                    "—"}
                </div>
                {productionOrderRefLoading ? (
                  <div className={styles.previewLoading}>
                    <Spin size="small" />
                  </div>
                ) : productionOrderRefError ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={productionOrderRefError}
                  />
                ) : productionOrderRefSummary ? (
                  <>
                    <p className={styles.previewMeta}>
                      <strong>วัตถุดิบเข้าจริง</strong>{" "}
                      {formatQty(productionOrderRefSummary.totalInputQty)}
                    </p>
                    {productionOrderRefSummary.inputItems.length > 0 ? (
                      <ul className={styles.previewSubList}>
                        {productionOrderRefSummary.inputItems.map((item) => (
                          <li key={item.key}>
                            {item.label}{" "}
                            <span className={styles.previewSubQty}>
                              {item.qty}
                              {item.unitCode ? ` ${item.unitCode}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className={styles.previewMeta}>
                      <strong>ผลผลิตเข้าคลังแล้ว</strong>{" "}
                      {formatQty(productionOrderRefSummary.totalOutputQty)}
                      {" · "}Yield{" "}
                      {productionOrderRefSummary.yieldPercent.toLocaleString(
                        "th-TH",
                        { maximumFractionDigits: 2 },
                      )}
                      %
                    </p>
                    {productionOrderRefSummary.outputByItem.length > 0 ? (
                      <ul className={styles.previewSubList}>
                        {productionOrderRefSummary.outputByItem.map((item) => (
                          <li key={item.key}>
                            {item.label}{" "}
                            <span className={styles.previewSubQty}>
                              {item.qty}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className={styles.previewMeta}>
                      <strong>คำขอที่เคยส่ง</strong>{" "}
                      {productionOrderRefSummary.previousRequests.length} รายการ
                    </p>
                    {productionOrderRefSummary.previousRequests.length > 0 ? (
                      <ul className={styles.previewSubList}>
                        {productionOrderRefSummary.previousRequests.map(
                          (req) => (
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
                          ),
                        )}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.previewMeta}>
                    ไม่พบข้อมูลสรุปจากใบสั่งผลิต
                  </p>
                )}
              </div>
            ) : null}

            <div className={styles.previewBox}>
              <div className={styles.previewLabel}>จะรับเข้า</div>
              {previewLines.length === 0 ? (
                <p className={styles.previewValue}>
                  เพิ่มรายการผลผลิตเพื่อดูสรุป
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
                      selectedLocation?.locationName ?? "รอเลือกตำแหน่ง"
                    }`
                  : "ยังไม่ได้เลือกคลัง"}
              </p>
            </div>

            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>เอกสารอ้างอิง</span>
                <strong>
                  {batchTickets.length > 0
                    ? `${batchTickets.length} ตั๋ว`
                    : selectedProductionOrder
                      ? productionOrderRefSummary
                        ? `${selectedProductionOrder.orderNo} · วัตถุดิบ ${formatQty(productionOrderRefSummary.totalInputQty)}`
                        : selectedProductionOrder.orderNo
                      : "—"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>จำนวนรายการ</span>
                <strong>{previewLines.length} รายการ</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>วันที่</span>
                <strong>
                  {postingDate
                    ? dayjs(postingDate).format("DD/MM/YYYY")
                    : "—"}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>คลัง</span>
                <strong>
                  {selectedWarehouse
                    ? `${selectedWarehouse.warehouseCode} — ${selectedWarehouse.warehouseName}`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className={styles.flowNote}>
              <strong>ตัวอย่างรอบย่อยยาง</strong>
              <p>
                ผงยาง 15 กรัม + น้ำมัน Pyrolysis 500 ลิตร + เศษเหล็ก 20 kg
                ในคำขอชุดเดียวกัน
              </p>
            </div>

            <div className={styles.exampleChips}>
              <span className={styles.exampleChip}>ผงยาง 15 กรัม</span>
              <span className={styles.exampleChip}>
                น้ำมัน Pyrolysis 500 ลิตร
              </span>
              <span className={styles.exampleChip}>เศษเหล็ก 20 kg</span>
            </div>
          </aside>
        </div>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
