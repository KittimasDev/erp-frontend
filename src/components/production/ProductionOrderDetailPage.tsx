"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  InboxOutlined,
  SettingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { formatProductionDateRange } from "@/utils/formatProductionDateRange";
import {
  useProductionOrderQuery,
  useProductionOrderSummaryQuery,
} from "@/hooks/production-orders/useProductionOrderQueries";
import {
  useAddProductionOrderLogMutation,
  useAllocateProductionOrderOutputMutation,
  useCancelProductionOrderMutation,
  useCompleteProductionOrderMutation,
  usePauseProductionOrderMutation,
  useResumeProductionOrderMutation,
  useStartProductionOrderMutation,
} from "@/hooks/production-orders/useProductionOrderMutations";
import {
  useProductionOutputReadyOrdersQuery,
  useProductionOutputStockRequestsQuery,
} from "@/hooks/production-output/useProductionOutputQueries";
import { useCreateProductionOutputStockRequestFromOrderMutation } from "@/hooks/production-output/useProductionOutputMutations";
import { useStockIssuesQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import { useStockMovementsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  PRODUCTION_DOWNTIME_CATEGORY_LABEL,
  PRODUCTION_DOWNTIME_UNCATEGORIZED_LABEL,
  PRODUCTION_ORDER_STATUS_COLOR,
  PRODUCTION_ORDER_STATUS_LABEL,
  PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL,
  ProductionOrderPlanLineType,
  ProductionOrderStatus,
  tPoLabel,
} from "@/types/production-order";
import {
  canRequestMoreProductionOutput,
  PRODUCTION_OUTPUT_REQUEST_STATUS_COLOR,
  productionOutputStatusLabel,
  ProductionOutputRequestStatus,
} from "@/types/production-output-stock-request";
import type { CreateProductionOutputStockRequestFromOrderBody } from "@/types/production-output-stock-request";
import { STOCK_ISSUE_STATUS_LABEL } from "@/types/stock-issues";
import { tStockLabel } from "@/types/stock-adjustments";
import { useT } from "@/lib/i18n/useT";
import { getStoredLanguage, useLanguage } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ProductionOrderStartModal from "./ProductionOrderStartModal";
import ShiftRecordsPanel from "@/components/production-cycles/ShiftRecordsPanel";
import Link from "next/link";
import ProductionOrderFormulaModal from "./ProductionOrderFormulaModal";
import {
  ProductionOrderCancelModal,
  ProductionOrderPauseModal,
} from "./ProductionOrderRunControlModals";
import styles from "./ProductionOrderDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const ProductionOrderDataTab = dynamic(
  () => import("./ProductionOrderDataTab"),
  { ssr: false },
);

type DetailTab = "work" | "data";

function resolveDetailTab(raw: string | null): DetailTab {
  return raw === "data" ? "data" : "work";
}

type Props = {
  orderId: string;
};

function fmt(value?: string) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num) ? value : formatNumber(num, getStoredLanguage(), 3);
}

function fmtDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/BBBB HH:mm") : "-";
}

function outputItemLabel(row: {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
}) {
  if (row.itemCode) {
    return `${row.itemCode} — ${row.itemNameTh ?? ""}`.trim();
  }
  return row.itemId;
}

function sumRequestQtyByItem(
  requests: { itemId: string; status: string; quantity: string }[],
  status: string,
) {
  const map = new Map<string, number>();
  for (const row of requests) {
    if (row.status !== status) {
      continue;
    }
    map.set(row.itemId, (map.get(row.itemId) ?? 0) + Number(row.quantity));
  }
  return map;
}

export default function ProductionOrderDetailPage({ orderId }: Props) {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => resolveDetailTab(searchParams.get("tab")),
    [searchParams],
  );
  const setTab = (key: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (key === "work") {
      next.delete("tab");
    } else {
      next.set("tab", key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };
  const [startOpen, setStartOpen] = useState(false);
  const [workSubTab, setWorkSubTab] = useState("ops");
  const { message } = App.useApp();
  const orderActions = useScreenActionPermissions("PRODUCTION_ORDERS");
  const outputActions = useScreenActionPermissions(
    "PRODUCTION_OUTPUT_STOCK_REQUESTS",
  );
  const canOperate =
    orderActions.canEdit || orderActions.canAdd || orderActions.canApprove;
  const canRequestOutput = outputActions.canAdd || canOperate;

  const detailQuery = useProductionOrderQuery(orderId);
  const summaryQuery = useProductionOrderSummaryQuery(orderId);
  const order = detailQuery.data?.data;

  /*
    ใช้ `productionOrderId` ไม่ใช่ `referenceDocType/Id`

    คำขอผูกกลับไปหาใบสั่งผลิตได้ 3 ทาง แต่ `referenceDocId` ครอบแค่ 2 —
    คำขอที่ผูกด้วยคอลัมน์ FK อย่างเดียวจึงถูกนับใน Yield ด้านบนแต่ไม่โผล่ในตารางนี้
    ทำให้ตัวเลขสองอันบนหน้าเดียวกันกระทบยอดกันไม่ลง
  */
  const relatedRequestsQuery = useProductionOutputStockRequestsQuery(
    { productionOrderId: orderId },
    { enabled: Boolean(orderId) },
  );
  /*
    การตัดสต๊อกจริงตอนกดเริ่มผลิต **ไม่ได้ออกเอกสารเบิกของตัวเอง** — มันหักคลังตรง
    แล้วทิ้งร่องรอยไว้เป็นแถวใน `stock_movements` ที่ใช้เลขใบสั่งผลิตแทนเลขใบเบิก

    ตารางใบเบิกข้างล่างโชว์เฉพาะเอกสาร `SI-` ที่คนเปิดเองแล้ว tag กลับมา ซึ่งเป็น
    คนละเส้นทาง · ถ้าไม่ดึง movement มาด้วย คนอ่านใบจะไม่มีทางเห็นเลยว่าใบนี้
    ตัดสต๊อกอะไรไปจริง ๆ
  */
  const stockMovementsQuery = useStockMovementsQuery(
    // รวมทั้งตัดตอนเริ่มผลิต และตัด/คืนจากยืนยัน/ยกเลิกยืนยันบันทึกกะ
    { productionOrderId: orderId },
    { enabled: Boolean(orderId) },
  );

  const relatedMaterialIssuesQuery = useStockIssuesQuery({
    productionOrderId: orderId,
    limit: 100,
  });

  const startMutation = useStartProductionOrderMutation();
  const cancelMutation = useCancelProductionOrderMutation();
  const completeMutation = useCompleteProductionOrderMutation();
  const pauseMutation = usePauseProductionOrderMutation();
  const resumeMutation = useResumeProductionOrderMutation();
  const logMutation = useAddProductionOrderLogMutation();
  const allocateMutation = useAllocateProductionOrderOutputMutation();

  const [selectedSourceLineIds, setSelectedSourceLineIds] = useState<string[]>([]);
  const [allocationQtyByLineId, setAllocationQtyByLineId] = useState<
    Record<string, number>
  >({});

  const [completeOpen, setCompleteOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [wasteActualRows, setWasteActualRows] = useState<
    {
      key: string;
      planLineId?: string;
      itemId: string;
      unitId: string;
      itemLabel: string;
      unitCode?: string;
      actualQty: number;
    }[]
  >([]);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [selectedReceiveItemIds, setSelectedReceiveItemIds] = useState<
    string[]
  >([]);
  const [receiveQtyByItemId, setReceiveQtyByItemId] = useState<
    Record<string, number>
  >({});
  const [requestForm] = Form.useForm();

  const readyOrdersQuery = useProductionOutputReadyOrdersQuery(
    { all: true },
    { enabled: Boolean(orderId) },
  );
  const readyOrder = useMemo(
    () =>
      readyOrdersQuery.data?.data.find((row) => row.id === orderId),
    [readyOrdersQuery.data, orderId],
  );
  const blockedItemIds = readyOrder?.blockedItemIds ?? [];
  const canStillRequestOutput =
    !readyOrdersQuery.isSuccess ||
    (readyOrder ? canRequestMoreProductionOutput(readyOrder) : false);

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const selectedWarehouseId = Form.useWatch("warehouseId", requestForm);
  const locationsQuery = useWarehouseLocationsQuery(
    { warehouseId: selectedWarehouseId, isActive: true },
    { enabled: Boolean(selectedWarehouseId) },
  );

  const createFromOrderMutation =
    useCreateProductionOutputStockRequestFromOrderMutation();

  const isDraft = order?.status === ProductionOrderStatus.DRAFT;
  const isInProgress = order?.status === ProductionOrderStatus.IN_PROGRESS;
  const isPaused = order?.status === ProductionOrderStatus.PAUSED;
  const isCompleted = order?.status === ProductionOrderStatus.COMPLETED;
  /** กำลังผลิตหรือหยุดชั่วคราว = ตัดสต๊อกไปแล้ว ยกเลิกได้แต่ต้องมีเหตุผล+ลายเซ็น */
  const isRunning = isInProgress || isPaused;
  /*
    งานผลิตยาวหลายสิบวันต้องทยอยรับของเข้าคลังระหว่างทาง ไม่ใช่รอปิดงาน
    ใบที่เริ่มผลิตแล้ว (ตัดวัตถุดิบไปแล้ว) จึงขอรับได้ — ตรงกับ guard ฝั่ง backend
  */
  const canReceiveOutput = isRunning || isCompleted;
  /*
    ครบตามแผน != ห้ามรับ — ใบที่ยังเดินเครื่องของจริงออกเกินแผนได้ จึงปลดล็อกให้ติ๊ก
    และกรอกยอดเองได้ (ระบบยังไม่เติมให้) ส่วนใบที่ปิดงานแล้วถือว่าจบยอด บล็อกเหมือนเดิม
  */
  const lockedItemIds = isRunning ? [] : blockedItemIds;
  /** ครบตามแผนแล้วแต่ยังรับต่อได้ — ต้องบอกให้เห็น ไม่งั้นคนกดจะนึกว่าจอค้าง */
  const showOverPlanHint = isRunning && blockedItemIds.length > 0;

  const summary = summaryQuery.data?.data;

  const outputPlanLines = useMemo(
    () =>
      (order?.planLines ?? []).filter(
        (line) => line.lineType === ProductionOrderPlanLineType.OUTPUT,
      ),
    [order?.planLines],
  );

  /** กระทบยอดผลผลิตต่อ (สินค้า, หน่วย) จาก backend — ไม่คำนวณซ้ำฝั่งหน้าจอ */
  const reconcile = summary?.outputReconcile ?? [];
  const reconcileApplicable = summary?.outputReconcileApplicable ?? false;
  const reconcileFor = (itemId: string, unitId: string) =>
    reconcile.find((r) => r.itemId === itemId && r.unitId === unitId);
  /**
   * สินค้าเดียว: รวมได้เฉพาะหน่วยเดียวกัน (คนละหน่วยคั่นด้วย ·)
   * หลายสินค้า: ไม่บวกข้ามรายการ แม้หน่วยเดียวกัน
   */
  const sumReconcile = (
    pick: (r: (typeof reconcile)[number]) => string,
  ): string => {
    const itemIds = new Set(reconcile.map((r) => r.itemId));
    if (itemIds.size > 1) {
      return reconcile
        .map((r) => {
          const name = r.itemNameTh || r.itemCode || r.itemId;
          return `${name} ${fmt(pick(r))} ${r.unitCode ?? ""}`.trim();
        })
        .join(" · ");
    }
    const byUnit = new Map<string, number>();
    for (const r of reconcile) {
      const key = r.unitCode ?? "";
      byUnit.set(key, (byUnit.get(key) ?? 0) + Number(pick(r)));
    }
    if (byUnit.size === 0) return "0";
    return [...byUnit.entries()]
      .map(([unit, qty]) => `${fmt(String(qty))} ${unit}`.trim())
      .join(" · ");
  };
  const anomalyLines = reconcile.filter((r) => r.isAnomaly);
  const outputTotals =
    summary?.yieldCompareByItem ??
    outputPlanLines.map((line) => ({
      itemId: line.itemId,
      itemCode: line.itemCode,
      itemNameTh: line.itemNameTh,
      unitCode: line.unitCode,
      plannedQty: line.plannedQty,
      actualQty: line.actualQty ?? "0",
    }));
  const multiOutput = outputTotals.length > 1;

  const receiveLines = useMemo(() => {
    const byItemUnit = new Map<string, (typeof outputPlanLines)[number]>();
    for (const line of outputPlanLines) {
      const key = `${line.itemId}|${line.unitId ?? ""}`;
      const existing = byItemUnit.get(key);
      if (existing) {
        byItemUnit.set(key, {
          ...existing,
          plannedQty: String(
            Number(existing.plannedQty) + Number(line.plannedQty),
          ),
        });
      } else {
        byItemUnit.set(key, { ...line });
      }
    }
    return [...byItemUnit.values()];
  }, [outputPlanLines]);

  const wastePlanLines = useMemo(
    () =>
      (order?.planLines ?? []).filter(
        (line) => line.lineType === ProductionOrderPlanLineType.WASTE,
      ),
    [order?.planLines],
  );

  const sourceLines = order?.sourceLines ?? [];
  const relatedOutputRequests = relatedRequestsQuery.data?.data;
  const approvedQtyByItemId = useMemo(
    () =>
      sumRequestQtyByItem(
        relatedOutputRequests ?? [],
        ProductionOutputRequestStatus.APPROVED,
      ),
    [relatedOutputRequests],
  );
  const pendingQtyByItemId = useMemo(
    () =>
      sumRequestQtyByItem(
        relatedOutputRequests ?? [],
        ProductionOutputRequestStatus.PENDING_APPROVAL,
      ),
    [relatedOutputRequests],
  );
  const linkedRequestNos = useMemo(() => {
    const nos = (order?.sourceLines ?? [])
      .map((line) => line.productionRequestNo)
      .filter((value): value is string => Boolean(value));
    if (nos.length) {
      return [...new Set(nos)];
    }
    return order?.productionRequestNo ? [order.productionRequestNo] : [];
  }, [order?.productionRequestNo, order?.sourceLines]);

  /** ยอดที่ยังรับเข้าคลังได้ต่อสินค้า — มาจากคิว ready-orders ที่หักงวดก่อน ๆ ให้แล้ว */
  const remainingByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of readyOrder?.outputItems ?? []) {
      map.set(item.itemId, Number(item.remainingQty));
    }
    return map;
  }, [readyOrder]);

  /* ประวัติเรียงใหม่สุดก่อน — ยึดวันที่รับเข้า ถ้าไม่มีค่อยใช้วันที่ยื่นคำขอ */
  const outputHistoryRows = useMemo(() => {
    const rows = [...(relatedRequestsQuery.data?.data ?? [])];
    const at = (row: (typeof rows)[number]) =>
      new Date(row.postingDate ?? row.requestedAt ?? row.createdAt ?? 0).getTime();
    return rows.sort((a, b) => at(b) - at(a));
  }, [relatedRequestsQuery.data]);

  /** ยอดสะสมของใบนี้ — แยก "เข้าคลังแล้ว" กับ "รออนุมัติ" ให้เห็นว่าทำไมตัวเลขยังไม่ขยับ */
  const outputHistorySummary = useMemo(() => {
    if (!receiveLines.length) {
      return null;
    }
    let approved = 0;
    let pending = 0;
    for (const row of outputHistoryRows) {
      const qty = Number(row.quantity) || 0;
      if (row.status === "APPROVED") {
        approved += qty;
      } else if (row.status === "PENDING_APPROVAL") {
        pending += qty;
      }
    }
    const planned = receiveLines.reduce(
      (sum, line) => sum + (Number(line.plannedQty) || 0),
      0,
    );
    return { approved, pending, planned };
  }, [outputHistoryRows, receiveLines]);

  /**
   * ต้องอยู่หลัง hook ทุกตัว — ถ้า return ก่อน จำนวน hook ที่เรียกจะไม่เท่ากัน
   * ระหว่าง render แล้ว React จะโยน
   * "Rendered more hooks than during the previous render"
   * ค่าที่คำนวณข้างบนใช้ optional chaining อยู่แล้ว จึงปลอดภัยตอน order ยังว่าง
   */
  if (!orderId) {
    return null;
  }

  const allocationSummary = order?.allocationSummary;
  const hasSourceLines = sourceLines.length > 0;

  const itemUnallocatedOf = (itemId: string, fulfilledQty: string) =>
    Math.max((approvedQtyByItemId.get(itemId) ?? 0) - Number(fulfilledQty), 0);

  const missingWarehouseLines = sourceLines.filter((line) => {
    if (line.isFulfilled) {
      return false;
    }
    const approved = approvedQtyByItemId.get(line.itemId) ?? 0;
    const pending = pendingQtyByItemId.get(line.itemId) ?? 0;
    return approved <= 0 && pending <= 0;
  });
  const pendingWarehouseLines = sourceLines.filter((line) => {
    if (line.isFulfilled) {
      return false;
    }
    const approved = approvedQtyByItemId.get(line.itemId) ?? 0;
    const pending = pendingQtyByItemId.get(line.itemId) ?? 0;
    return approved <= 0 && pending > 0;
  });
  const sourceItemIds = new Set(sourceLines.map((line) => line.itemId));
  const otherReceivedItems = [...approvedQtyByItemId.entries()]
    .filter(([itemId, qty]) => qty > 0 && !sourceItemIds.has(itemId))
    .map(([itemId, qty]) => {
      const request = (relatedOutputRequests ?? []).find(
        (row) =>
          row.itemId === itemId &&
          row.status === ProductionOutputRequestStatus.APPROVED,
      );
      return {
        qty,
        label: request ? outputItemLabel(request) : itemId,
      };
    });
  const showReceiveCta =
    missingWarehouseLines.length > 0 &&
    canReceiveOutput &&
    canRequestOutput &&
    canStillRequestOutput;

  const handleToggleSourceLine = (
    lineId: string,
    remainingQty: number,
    checked: boolean,
  ) => {
    setSelectedSourceLineIds((prev) =>
      checked ? [...prev, lineId] : prev.filter((id) => id !== lineId),
    );
    if (checked) {
      setAllocationQtyByLineId((prev) => ({
        ...prev,
        [lineId]: prev[lineId] ?? remainingQty,
      }));
    }
  };

  const handleAllocateOutput = () => {
    const lines = selectedSourceLineIds
      .map((sourceLineId) => {
        const row = sourceLines.find((line) => line.id === sourceLineId);
        const requested = Number(allocationQtyByLineId[sourceLineId] ?? 0);
        const remaining = Number(row?.remainingQty ?? 0);
        const itemUnallocated = row
          ? itemUnallocatedOf(row.itemId, row.fulfilledQty)
          : 0;
        const capped = Math.min(requested, remaining, itemUnallocated);
        return {
          sourceLineId,
          qtyToAllocate: Math.round(capped * 1000) / 1000,
        };
      })
      .filter((line) => line.qtyToAllocate > 0);
    if (!lines.length) {
      return;
    }
    allocateMutation.mutate(
      {
        id: orderId,
        body: { lines, reserveSalesOrders: true },
      },
      {
        onSuccess: () => {
          setSelectedSourceLineIds([]);
          setAllocationQtyByLineId({});
          void detailQuery.refetch();
        },
      },
    );
  };

  const openCompleteModal = () => {
    setWasteActualRows(
      wastePlanLines.map((line) => ({
        key: line.id,
        planLineId: line.id,
        itemId: line.itemId,
        unitId: line.unitId,
        itemLabel: line.itemCode
          ? `${line.itemCode} — ${line.itemNameTh ?? ""}`
          : line.itemId,
        unitCode: line.unitCode,
        actualQty: Number(line.plannedQty),
      })),
    );
    setCompleteOpen(true);
  };

  const handleSubmitOutputRequest = async () => {
    const values = await requestForm.validateFields();
    const selectedLines = receiveLines.filter((line) =>
      selectedReceiveItemIds.includes(line.itemId),
    );
    if (!selectedLines.length) {
      message.warning(t("กรุณาเลือกผลผลิตอย่างน้อย 1 รายการ"));
      return;
    }
    const items = selectedLines.map((line) => {
      const qty = Number(receiveQtyByItemId[line.itemId] ?? line.plannedQty);
      return {
        itemId: line.itemId,
        unitId: line.unitId,
        quantity: String(Number(Number(qty).toFixed(3))),
      };
    });
    if (items.some((item) => !(Number(item.quantity) > 0))) {
      message.warning(t("จำนวนรับเข้าต้องมากกว่า 0"));
      return;
    }
    const body: CreateProductionOutputStockRequestFromOrderBody = {
      items,
      warehouseId: values.warehouseId,
      warehouseLocationId: values.warehouseLocationId,
      /* งานยาวหลายสิบวัน วันที่ของออกจริงกับวันที่กรอกมักคนละวัน */
      postingDate: values.postingDate
        ? values.postingDate.format("YYYY-MM-DD")
        : undefined,
      remark: values.remark || undefined,
    };
    createFromOrderMutation.mutate(
      { productionOrderId: orderId, body },
      {
        onSuccess: () => {
          setRequestOpen(false);
          requestForm.resetFields();
          setSelectedReceiveItemIds([]);
          setReceiveQtyByItemId({});
          void relatedRequestsQuery.refetch();
          void readyOrdersQuery.refetch();
        },
      },
    );
  };

  const openReceiveModal = () => {
    const qtyByItemId: Record<string, number> = {};
    const selectable: string[] = [];
    for (const line of receiveLines) {
      /*
        เติมยอดคงเหลือ ไม่ใช่แผนเต็ม — ทยอยรับเป็นงวดได้แล้ว ถ้าเติมแผนเต็มทุกครั้ง
        คนกดจะรับเกินโดยไม่ตั้งใจตั้งแต่งวดที่สอง
      */
      const remaining = remainingByItemId.get(line.itemId);
      qtyByItemId[line.itemId] =
        remaining !== undefined ? remaining : Number(line.plannedQty);
      if (!blockedItemIds.includes(line.itemId)) {
        selectable.push(line.itemId);
      }
    }
    setReceiveQtyByItemId(qtyByItemId);
    setSelectedReceiveItemIds(selectable);
    requestForm.setFieldValue("postingDate", dayjs());
    setRequestOpen(true);
  };

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="PRODUCTION · PYROLYSIS"
          title={order?.orderNo ?? t("ใบสั่งผลิต")}
          subtitle={<>{order
                ? PRODUCTION_ORDER_STATUS_LABEL[order.status]
                  ? tPoLabel(PRODUCTION_ORDER_STATUS_LABEL[order.status], lang)
                  : order.status
                : ""}
              {linkedRequestNos.length
                ? ` · ${t("ใบขอผลิต")} ${linkedRequestNos.join(" · ")}`
                : ""}</>}
          actions={
            <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/production/production-orders")}
          >
            {t("กลับรายการ")}
          </Button>
            </>
          }
        />

        {order ? (
          <>
            <div className={styles.actionBar}>
              {isDraft && canOperate ? (
                <Button
                  icon={<PlayCircleOutlined />}
                  loading={startMutation.isPending}
                  onClick={() => setStartOpen(true)}
                >
                  {t("เริ่มผลิต")}
                </Button>
              ) : null}

              {isDraft && canOperate ? (
                <Button
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  {t("ยกเลิกใบสั่งผลิต")}
                </Button>
              ) : null}

              {isCompleted &&
              canOperate &&
              !(relatedRequestsQuery.data?.data ?? []).some(
                (r) => r.status === "APPROVED",
              ) ? (
                <Button
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  {t("ยกเลิกใบสั่งผลิต")}
                </Button>
              ) : null}

              {/* เตาพังกลางคัน — เดิมเส้นทางนี้ถูกบล็อกสนิท ใบค้าง IN_PROGRESS ตลอดกาล */}
              {isRunning && canOperate ? (
                <Button
                  danger
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  {t("ยกเลิกกลางคัน")}
                </Button>
              ) : null}

              {isInProgress && canOperate ? (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={openCompleteModal}
                >
                  {t("ยืนยันเสร็จสิ้นการผลิต")}
                </Button>
              ) : null}

              {isInProgress && canOperate ? (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => setPauseOpen(true)}
                >
                  {t("หยุดเดินเครื่องชั่วคราว")}
                </Button>
              ) : null}

              {isPaused && canOperate ? (
                <Popconfirm
                  title={t("กลับมาเดินเครื่อง?")}
                  description={t("ระบบจะปิดรายการ Downtime ที่เปิดค้างอยู่ให้อัตโนมัติ")}
                  okText={t("กลับมาเดินเครื่อง")}
                  cancelText={t("ปิด")}
                  onConfirm={() => resumeMutation.mutate({ id: orderId })}
                >
                  <Button loading={resumeMutation.isPending}>
                    {t("กลับมาเดินเครื่อง")}
                  </Button>
                </Popconfirm>
              ) : null}

              {isRunning && canOperate ? (
                <Button onClick={() => setLogOpen(true)}>
                  {t("บันทึกค่าระหว่างผลิต")}
                </Button>
              ) : null}

              {canReceiveOutput && canRequestOutput && canStillRequestOutput ? (
                <Button onClick={openReceiveModal}>
                  {/* ระหว่างผลิตเป็นการรับ "งวด" หนึ่ง ไม่ใช่ปิดยอดทั้งใบ */}
                  {isCompleted
                    ? t("ขอรับผลผลิตเข้าคลัง")
                    : t("ขอรับผลผลิตเข้าคลัง (งวดนี้)")}
                </Button>
              ) : null}
            </div>

            <Tabs
              className={styles.tabs}
              activeKey={activeTab}
              onChange={setTab}
              destroyOnHidden
              items={[
                {
                  key: "work",
                  label: t("งาน"),
                  children: (
                    <div className={styles.workTabBody}>
            <div className={styles.cardBlock}>
              <div className={styles.cardBlockTitleRow}>
                <h3 className={styles.cardBlockTitle}>{t("ข้อมูลทั่วไป")}</h3>
                {order.productionFormulaId || order.productionFormulaCode ? (
                  <Button
                    size="small"
                    type="link"
                    style={{ paddingInline: 0 }}
                    onClick={() => setFormulaOpen(true)}
                  >
                    {t("ดูสูตร")}
                  </Button>
                ) : null}
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("วันที่ผลิต")}</span>
                  <span className={styles.infoValue}>
                    {formatProductionDateRange(
                      order.productionDate,
                      order.productionDateEnd,
                    )}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("เลขที่ผลิต")}</span>
                  <span className={styles.infoValue}>{order.orderNo}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("ชื่อสินค้า")}</span>
                  <span className={styles.infoValue}>
                    {outputPlanLines
                      .map((l) => l.itemNameTh || l.itemCode)
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("สถานะ")}</span>
                  <span className={styles.statusValue}>
                    <Tag color={PRODUCTION_ORDER_STATUS_COLOR[order.status] ?? "default"}>
                      {PRODUCTION_ORDER_STATUS_LABEL[order.status]
                        ? tPoLabel(PRODUCTION_ORDER_STATUS_LABEL[order.status], lang)
                        : order.status}
                    </Tag>
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("ผู้ปฏิบัติงาน")}</span>
                  <span className={styles.infoValue}>
                    {order.leadOperatorName ?? "-"}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("เครื่องจักรหลัก")}</span>
                  <span className={styles.infoValue}>
                    {(() => {
                      // แสดงเครื่องทั้งหมดใน snapshot ของ MO (ลำดับตามสูตร · รวมเครื่องที่ผู้ใช้สลับแล้ว)
                      const machines = order.machineSnapshot?.machines ?? [];
                      if (machines.length === 0) return "-";
                      return machines.map((m) => (
                        <div key={m.equipmentId}>
                          {m.code} - {m.name}
                        </div>
                      ));
                    })()}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("รอบการผลิต")}</span>
                  <span className={styles.infoValue}>
                    {order.cycleId ? (
                      <Link href={`/production/cycles/${order.cycleId}`}>
                        {order.cycleNo ?? t("ดูรอบ")}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("หมายเหตุ")}</span>
                  <span className={styles.infoValue}>{order.remark || "-"}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("สรุปผลการผลิต")}</h3>
              </div>
              {multiOutput ? (
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardHead}>
                      <span className={styles.summaryIcon}>
                        <AppstoreOutlined />
                      </span>
                      <span className={styles.summaryCardTitle}>{t("ผลผลิตแยกตามสินค้า")}</span>
                    </div>
                    <ul className={styles.summaryRows}>
                      {outputTotals.map((line) => (
                        <li
                          key={`${line.itemId}-${line.unitCode ?? ""}`}
                          className={styles.summaryRow}
                        >
                          <span className={styles.summaryRowName}>
                            {line.itemNameTh || line.itemCode || line.itemId}
                          </span>
                          <span className={styles.summaryRowMeta}>
                            {t("แผน")} {fmt(line.plannedQty)} {line.unitCode ?? ""}
                            {" · "}
                            {t("เข้าคลัง")} {fmt(line.actualQty)} {line.unitCode ?? ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardHead}>
                      <span className={styles.summaryIcon}>
                        <SettingOutlined />
                      </span>
                      <span className={styles.summaryCardTitle}>{t("ผลิตจากกะที่ยืนยันแล้ว")}</span>
                    </div>
                    <ul className={styles.summaryRows}>
                      {reconcile.map((r) => (
                        <li key={`${r.itemId}-${r.unitId}`} className={styles.summaryRow}>
                          <span className={styles.summaryRowName}>
                            {r.itemNameTh || r.itemCode || r.itemId}
                          </span>
                          <span className={styles.summaryRowValue}>
                            {reconcileApplicable
                              ? `${fmt(r.confirmedShiftQty)} ${r.unitCode ?? ""}`.trim()
                              : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardHead}>
                      <span className={styles.summaryIcon}>
                        <InboxOutlined />
                      </span>
                      <span className={styles.summaryCardTitle}>{t("รอรับเข้าคลัง")}</span>
                    </div>
                    <ul className={styles.summaryRows}>
                      {reconcile.map((r) => (
                        <li key={`${r.itemId}-${r.unitId}`} className={styles.summaryRow}>
                          <span className={styles.summaryRowName}>
                            {r.itemNameTh || r.itemCode || r.itemId}
                          </span>
                          <span className={styles.summaryRowValue}>
                            {reconcileApplicable
                              ? `${fmt(r.pendingQty)} ${r.unitCode ?? ""}`.trim()
                              : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {anomalyLines.length > 0 ? (
                      <Typography.Text type="danger" style={{ fontSize: 12 }}>
                        {t("ผิดปกติ: รับเข้าคลังมากกว่ากะที่ยืนยัน")}{" "}
                        {anomalyLines
                          .map(
                            (r) =>
                              `${r.itemCode ?? r.itemId} +${fmt(r.excessQty)} ${r.unitCode ?? ""}`.trim(),
                          )
                          .join(", ")}
                      </Typography.Text>
                    ) : null}
                  </div>
                </div>
              ) : (
              <div className={styles.summaryGrid}>
                {multiOutput ? (
                  <div className={`${styles.summaryCard} ${styles.summaryCardWide}`}>
                    <span className={styles.summaryLabel}>{t("ผลผลิตแยกตามสินค้า")}</span>
                    <ul className={styles.outputByItem}>
                      {outputTotals.map((line) => (
                        <li key={`${line.itemId}-${line.unitCode ?? ""}`}>
                          <span>{line.itemNameTh || line.itemCode || line.itemId}</span>
                          <span>
                            {t("แผน")} {fmt(line.plannedQty)} {line.unitCode ?? ""}
                            {" · "}
                            {t("เข้าคลัง")} {fmt(line.actualQty)} {line.unitCode ?? ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t("รวมแผน")}</span>
                  <span className={styles.summaryValue}>
                    {fmt(summary?.totalPlannedOutputQty ?? "0")}
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 14, fontWeight: 500, marginLeft: 6 }}
                    >
                      {outputPlanLines[0]?.unitCode ?? ""}
                    </Typography.Text>
                  </span>
                </div>
                )}
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>
                    {t("ผลิตจากกะที่ยืนยันแล้ว")}
                  </span>
                  {multiOutput && reconcileApplicable ? (
                    <ul className={styles.outputByItem}>
                      {reconcile.map((r) => (
                        <li key={`${r.itemId}-${r.unitId}`}>
                          <span>{r.itemNameTh || r.itemCode || r.itemId}</span>
                          <span>{`${fmt(r.confirmedShiftQty)} ${r.unitCode ?? ""}`.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className={multiOutput ? styles.summaryDetail : styles.summaryValue}>
                      {reconcileApplicable
                        ? sumReconcile((r) => r.confirmedShiftQty)
                        : "—"}
                    </span>
                  )}
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t("รอรับเข้าคลัง")}</span>
                  {multiOutput && reconcileApplicable ? (
                    <ul className={styles.outputByItem}>
                      {reconcile.map((r) => (
                        <li key={`${r.itemId}-${r.unitId}`}>
                          <span>{r.itemNameTh || r.itemCode || r.itemId}</span>
                          <span>{`${fmt(r.pendingQty)} ${r.unitCode ?? ""}`.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className={multiOutput ? styles.summaryDetail : styles.summaryValue}>
                      {reconcileApplicable
                        ? sumReconcile((r) => r.pendingQty)
                        : "—"}
                    </span>
                  )}
                  {anomalyLines.length > 0 ? (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      {t("ผิดปกติ: รับเข้าคลังมากกว่ากะที่ยืนยัน")}{" "}
                      {anomalyLines
                        .map(
                          (r) =>
                            `${r.itemCode ?? r.itemId} +${fmt(r.excessQty)} ${r.unitCode ?? ""}`.trim(),
                        )
                        .join(", ")}
                    </Typography.Text>
                  ) : null}
                </div>
                {multiOutput ? null : (
                <>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t("รับเข้าคลังแล้ว")}</span>
                  <span
                    className={`${styles.summaryValue} ${styles.summaryValueAccent}`}
                  >
                    {fmt(summary?.totalOutputQty ?? "0")}
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 14, fontWeight: 500, marginLeft: 6 }}
                    >
                      {outputPlanLines[0]?.unitCode ?? ""}
                    </Typography.Text>
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t("ความคืบหน้า")}</span>
                  <span className={styles.summaryValue}>
                    {(() => {
                      const planned = Number(summary?.totalPlannedOutputQty ?? 0);
                      const actual = Number(summary?.totalOutputQty ?? 0);
                      const pct =
                        planned > 0
                          ? Math.min(100, Math.round((actual / planned) * 1000) / 10)
                          : 0;
                      return `${pct}%`;
                    })()}
                  </span>
                  <Progress
                    percent={(() => {
                      const planned = Number(summary?.totalPlannedOutputQty ?? 0);
                      const actual = Number(summary?.totalOutputQty ?? 0);
                      return planned > 0
                        ? Math.min(100, (actual / planned) * 100)
                        : 0;
                    })()}
                    showInfo={false}
                    strokeColor="#739816"
                    size="small"
                  />
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t("Yield เฉลี่ย (แผน)")}</span>
                  <span className={styles.summaryValue}>
                    {summary ? `${summary.plannedYieldPercent}%` : "-"}
                  </span>
                </div>
                </>
                )}
              </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("แผนผลิต")}</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={outputPlanLines}
                locale={{ emptyText: t("ไม่มีแผนผลผลิต") }}
                columns={[
                  {
                    title: t("ลำดับ"),
                    key: "seq",
                    width: 64,
                    align: "center",
                    render: (_: unknown, __: unknown, index: number) =>
                      index + 1,
                  },
                  {
                    title: t("สินค้า"),
                    key: "item",
                    render: (_, row) =>
                      row.itemCode
                        ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                        : row.itemId,
                  },
                  {
                    title: t("แผน"),
                    dataIndex: "plannedQty",
                    key: "plannedQty",
                    align: "right",
                    render: (v: string, row) =>
                      `${fmt(v)} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: t("ผลิตจากกะที่ยืนยันแล้ว"),
                    key: "confirmedShiftQty",
                    align: "right",
                    render: (_, row) => {
                      if (!reconcileApplicable) return "—";
                      const r = reconcileFor(row.itemId, row.unitId);
                      return `${fmt(r?.confirmedShiftQty ?? "0")} ${row.unitCode ?? ""}`;
                    },
                  },
                  {
                    title: t("รับเข้าคลังแล้ว"),
                    dataIndex: "actualQty",
                    key: "actualQty",
                    align: "right",
                    render: (_, row) =>
                      `${fmt(row.actualQty ?? "0")} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: t("รอรับเข้าคลัง"),
                    key: "pendingQty",
                    align: "right",
                    render: (_, row) => {
                      if (!reconcileApplicable) return "—";
                      const r = reconcileFor(row.itemId, row.unitId);
                      if (r?.isAnomaly) {
                        return (
                          <Tag color="error">
                            {t("ผิดปกติ: เกิน")} {fmt(r.excessQty)} {row.unitCode ?? ""}
                          </Tag>
                        );
                      }
                      return `${fmt(r?.pendingQty ?? "0")} ${row.unitCode ?? ""}`;
                    },
                  },
                  {
                    title: t("Yield (แผน)"),
                    key: "plannedYield",
                    align: "right",
                    render: (_, row) => {
                      const line = summary?.yieldCompareByItem.find(
                        (y) => y.itemId === row.itemId,
                      );
                      return line ? `${line.plannedYieldPercent}%` : "-";
                    },
                  },
                  {
                    title: t("Yield (จริง)"),
                    key: "actualYield",
                    align: "right",
                    render: (_, row) => {
                      const line = summary?.yieldCompareByItem.find(
                        (y) => y.itemId === row.itemId,
                      );
                      return line ? `${line.actualYieldPercent}%` : "-";
                    },
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("วัตถุดิบที่ใช้จริง")}</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.inputItems}
                columns={[
                  {
                    title: t("ลำดับ"),
                    key: "seq",
                    width: 64,
                    align: "center",
                    render: (_: unknown, __: unknown, index: number) =>
                      index + 1,
                  },
                  {
                    title: t("สินค้า"),
                    key: "item",
                    render: (_, row) =>
                      row.itemCode
                        ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                        : row.itemId,
                  },
                  {
                    title: t("คลัง"),
                    dataIndex: "warehouseCode",
                    key: "warehouseCode",
                  },
                  {
                    title: t("ตำแหน่ง"),
                    dataIndex: "locationCode",
                    key: "locationCode",
                  },
                  { title: "Lot", dataIndex: "lotNo", key: "lotNo" },
                  {
                    title: `${t("แผน")} (${order.inputItems[0]?.unitCode ?? t("กก.")})`,
                    dataIndex: "plannedQty",
                    key: "plannedQty",
                    align: "right",
                    render: (v: string) => fmt(v),
                  },
                  {
                    title: `${t("จริง")} (${order.inputItems[0]?.unitCode ?? t("กก.")})`,
                    dataIndex: "actualQty",
                    key: "actualQty",
                    align: "right",
                    render: (v: string) => fmt(v),
                  },
                  {
                    title: `${t("คงเหลือ")} (${order.inputItems[0]?.unitCode ?? t("กก.")})`,
                    key: "remaining",
                    align: "right",
                    render: (_, row) => {
                      const planned = Number(row.plannedQty) || 0;
                      const actual = Number(row.actualQty) || 0;
                      return fmt(String(Math.max(0, planned - actual)));
                    },
                  },
                ]}
              />
            </div>

            {wastePlanLines.length > 0 || isCompleted ? (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3>{t("ของเสีย (ไม่เข้าคลัง)")}</h3>
                </div>
                <Table
                  className={masterStyles.dataTable}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={wastePlanLines}
                  locale={{ emptyText: t("ไม่มีของเสีย") }}
                  columns={[
                    {
                      title: t("ลำดับ"),
                      key: "seq",
                      width: 64,
                      align: "center",
                      render: (_: unknown, __: unknown, index: number) =>
                        index + 1,
                    },
                    {
                      title: t("สินค้า"),
                      key: "item",
                      render: (_, row) =>
                        row.itemCode
                          ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                          : row.itemId,
                    },
                    {
                      title: t("แผน"),
                      dataIndex: "plannedQty",
                      key: "plannedQty",
                      align: "right",
                      render: (v: string, row) =>
                        `${fmt(v)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: t("เสียจริง"),
                      dataIndex: "actualQty",
                      key: "actualQty",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.actualQty ?? "-")} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: t("สถานะ"),
                      dataIndex: "disposalStatus",
                      key: "disposalStatus",
                      render: (v?: string) =>
                        v ? (
                          <Tag>
                            {PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL[v]
                              ? tPoLabel(PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL[v], lang)
                              : v}
                          </Tag>
                        ) : (
                          "-"
                        ),
                    },
                  ]}
                />
              </div>
            ) : null}

            <Tabs
              className={styles.workSubTabs}
              activeKey={workSubTab}
              onChange={setWorkSubTab}
              items={[
                {
                  key: "ops",
                  label: t("บันทึกการดำเนินงาน"),
                  children: (
                    <ShiftRecordsPanel
                      orderId={order.id}
                      canEdit={orderActions.canEdit}
                      started={
                        isRunning ||
                        order.status === ProductionOrderStatus.COMPLETED
                      }
                      recordingConfigSnapshot={order.recordingConfigSnapshot}
                      liveRecordingConfig={order.liveRecordingConfig}
                      machines={order.machineSnapshot?.machines}
                      inputStockMode={order.inputStockMode}
                      inputItems={order.inputItems}
                    />
                  ),
                },
                {
                  key: "downtime",
                  label: "Downtime",
                  children: (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>Downtime</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.downtimes}
                locale={{ emptyText: t("ไม่มีรายการ Downtime") }}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เริ่ม"), dataIndex: "startAt", key: "startAt", render: fmtDate },
                  {
                    title: t("สิ้นสุด"),
                    dataIndex: "endAt",
                    key: "endAt",
                    render: (v?: string) => (v ? fmtDate(v) : t("ยังไม่ปิด")),
                  },
                  {
                    title: t("หมวด"),
                    dataIndex: "category",
                    key: "category",
                    // แถวที่บันทึกก่อนมีหมวดจะว่าง — backfill ไม่ได้ ต้องโชว์ตามจริง
                    render: (v?: string) =>
                      v
                        ? PRODUCTION_DOWNTIME_CATEGORY_LABEL[v]
                          ? tPoLabel(PRODUCTION_DOWNTIME_CATEGORY_LABEL[v], lang)
                          : v
                        : tPoLabel(PRODUCTION_DOWNTIME_UNCATEGORIZED_LABEL, lang),
                  },
                  {
                    title: t("ประเภทการหยุด"),
                    dataIndex: "stopType",
                    key: "stopType",
                    render: (v: string) => (v === "PLANNED" ? t("ตามแผน") : t("ไม่ตามแผน")),
                  },
                  { title: t("เหตุผล"), dataIndex: "reason", key: "reason" },
                  {
                    title: "Root Cause",
                    dataIndex: "rootCause",
                    key: "rootCause",
                    render: (v?: string) => v ?? "-",
                  },
                  {
                    title: t("ผู้บันทึก"),
                    dataIndex: "recordedByName",
                    key: "recordedByName",
                  },
                ]}
              />
            </div>
                  ),
                },
                {
                  key: "logs",
                  label: t("บันทึกระหว่างผลิต"),
                  children: (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("บันทึกระหว่างผลิต")}</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.logs}
                locale={{ emptyText: t("ยังไม่มีบันทึก") }}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เวลา"), dataIndex: "loggedAt", key: "loggedAt", render: fmtDate },
                  { title: t("รายละเอียด"), dataIndex: "note", key: "note" },
                  {
                    title: t("ผู้บันทึก"),
                    dataIndex: "recordedByName",
                    key: "recordedByName",
                  },
                ]}
              />
            </div>
                  ),
                },
                {
                  key: "trace",
                  label: t("Trace วัตถุดิบ / ผลผลิต"),
                  children: (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("Trace: วัตถุดิบที่เบิก / ผลผลิตเข้าคลัง")}</h3>
              </div>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                {t("ใบเบิกวัตถุดิบที่ผูกใบสั่งผลิตนี้ และคำขอรับผลผลิตเข้าคลังที่เกี่ยวข้อง")}
              </Typography.Paragraph>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                loading={relatedMaterialIssuesQuery.isFetching}
                pagination={false}
                style={{ marginBottom: 16 }}
                dataSource={relatedMaterialIssuesQuery.data?.data.items ?? []}
                locale={{ emptyText: t("ยังไม่มีใบเบิกวัตถุดิบที่ผูกใบสั่งผลิตนี้") }}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เลขที่เบิก"), dataIndex: "issueNo", key: "issueNo" },
                  {
                    title: t("วันที่"),
                    dataIndex: "issueDate",
                    key: "issueDate",
                    render: (v: string) => dayjs(v).format("DD/MM/BBBB"),
                  },
                  {
                    title: t("สถานะ"),
                    dataIndex: "status",
                    key: "status",
                    render: (v: string) => (
                      <Tag>{tStockLabel(STOCK_ISSUE_STATUS_LABEL[v] ?? v, lang)}</Tag>
                    ),
                  },
                  {
                    title: t("รายการ"),
                    key: "items",
                    render: (_, row) =>
                      (row.items ?? [])
                        .map(
                          (line) =>
                            `${line.itemCode ?? line.itemId} ${fmt(line.quantity)}`,
                        )
                        .join(", ") || "-",
                  },
                  {
                    title: "",
                    key: "actions",
                    align: "right",
                    render: (_, row) => (
                      <Button
                        size="small"
                        onClick={() =>
                          router.push(`/inventory/material-issues/${row.id}`)
                        }
                      >
                        {t("เปิดใบเบิก")}
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
                  ),
                },
                {
                  key: "stockCut",
                  label: t("สต็อกที่ตัดจริง"),
                  children: (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>{t("สต๊อกที่ใบนี้ตัดจริง")}</h3>
              </div>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                {t("ตอนกดเริ่มผลิต ระบบหักคลังตรงโดยไม่ออกเอกสารเบิก — นี่คือร่องรอย ที่บันทึกไว้จริง ใช้เลขใบสั่งผลิตแทนเลขใบเบิก · ต่างจากตารางใบเบิก ด้านบนซึ่งเป็นเอกสารที่คนเปิดเองแล้วผูกกลับมา")}
              </Typography.Paragraph>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                loading={stockMovementsQuery.isFetching}
                pagination={false}
                style={{ marginBottom: 16 }}
                dataSource={stockMovementsQuery.data?.data ?? []}
                locale={{
                  emptyText:
                    t("ยังไม่มีการตัดสต๊อก — สต๊อกขยับตอนกดเริ่มผลิต หรือตอนยืนยันบันทึกกะ (ใบที่ตัดตอนยืนยันกะ)"),
                }}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
                    title: t("วันที่"),
                    dataIndex: "movementDate",
                    key: "movementDate",
                    width: 150,
                    render: (v: string) => dayjs(v).format("DD/MM/BBBB HH:mm"),
                  },
                  {
                    title: t("สินค้า"),
                    key: "item",
                    render: (_, row) =>
                      `${row.itemCode} — ${row.itemNameTh ?? ""}`,
                  },
                  {
                    title: t("คลัง / ตำแหน่ง"),
                    key: "place",
                    render: (_, row) =>
                      `${row.warehouseCode ?? "-"} / ${row.locationCode ?? "-"}`,
                  },
                  {
                    title: t("ตัดออก"),
                    key: "out",
                    align: "right",
                    width: 130,
                    render: (_, row) =>
                      Number(row.quantityOut) > 0
                        ? `${fmt(row.quantityOut)} ${row.unitCode ?? ""}`
                        : "—",
                  },
                  {
                    title: t("คืนเข้า"),
                    key: "in",
                    align: "right",
                    width: 130,
                    render: (_, row) =>
                      Number(row.quantityIn) > 0
                        ? `${fmt(row.quantityIn)} ${row.unitCode ?? ""}`
                        : "—",
                  },
                  {
                    title: t("คงเหลือหลังตัด"),
                    dataIndex: "balanceQuantityAfter",
                    key: "balanceQuantityAfter",
                    align: "right",
                    width: 140,
                    render: (v: string) => fmt(v),
                  },
                ]}
              />
            </div>
                  ),
                },
                {
                  key: "receiveHistory",
                  label: t("ประวัติการรับผลผลิตเข้าคลัง"),
                  children: (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h3>{t("ประวัติการรับผลผลิตเข้าคลังของใบสั่งผลิตนี้")}</h3>
                  <p className={styles.sectionHint}>
                    {t("ทุกงวดที่ขอรับเข้าคลัง เรียงใหม่สุดก่อน — ของจะเข้าคลังจริง เมื่อหัวหน้าคลังอนุมัติเท่านั้น")}
                  </p>
                </div>
                {outputHistorySummary ? (
                  <span className={styles.sectionHint}>
                    {t("เข้าคลังแล้วรวม")} {fmt(String(outputHistorySummary.approved))}
                    {outputHistorySummary.pending > 0
                      ? ` · ${t("รออนุมัติ")} ${fmt(String(outputHistorySummary.pending))}`
                      : ""}
                    {` ${t("จากแผน")} ${fmt(String(outputHistorySummary.planned))}`}
                  </span>
                ) : null}
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                loading={relatedRequestsQuery.isFetching}
                pagination={false}
                dataSource={outputHistoryRows}
                locale={{ emptyText: t("ยังไม่มีคำขอรับผลผลิต") }}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
                    title: t("วันที่รับเข้า"),
                    key: "postingDate",
                    width: 115,
                    render: (_, row) =>
                      row.postingDate
                        ? dayjs(row.postingDate).format("DD/MM/BBBB")
                        : "—",
                  },
                  { title: t("เลขที่คำขอ"), dataIndex: "requestNo", key: "requestNo" },
                  {
                    title: t("สินค้า"),
                    key: "item",
                    render: (_, row) =>
                      row.itemCode ? `${row.itemCode} — ${row.itemNameTh ?? ""}` : row.itemId,
                  },
                  {
                    title: t("จำนวน"),
                    key: "qty",
                    align: "right",
                    render: (_, row) => `${fmt(row.quantity)} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: t("คลัง / ตำแหน่ง"),
                    key: "warehouse",
                    render: (_, row) =>
                      [row.warehouseCode, row.locationCode]
                        .filter(Boolean)
                        .join(" / ") || "—",
                  },
                  {
                    title: "Lot",
                    key: "lotNo",
                    render: (_, row) =>
                      row.status === "APPROVED" ? row.lotNo || "-" : "-",
                  },
                  {
                    title: t("สถานะ"),
                    dataIndex: "status",
                    key: "status",
                    render: (v: string, row) => (
                      <>
                        <Tag color={PRODUCTION_OUTPUT_REQUEST_STATUS_COLOR[v] ?? "default"}>
                          {productionOutputStatusLabel(v)}
                        </Tag>
                        {v === "REJECTED" && row.rejectReason ? (
                          <div className={styles.sectionHint}>
                            {row.rejectReason}
                          </div>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    title: t("ผู้ขอ / ผู้อนุมัติ"),
                    key: "people",
                    render: (_, row) => (
                      <div className={styles.sectionHint}>
                        <div>
                          {t("ขอ:")} {row.requestedByName ?? "—"}
                          {row.requestedAt
                            ? ` · ${dayjs(row.requestedAt).format("DD/MM/BBBB HH:mm")}`
                            : ""}
                        </div>
                        <div>
                          {t("อนุมัติ:")} {row.approvedByName ?? "—"}
                          {row.approvedAt
                            ? ` · ${dayjs(row.approvedAt).format("DD/MM/BBBB HH:mm")}`
                            : ""}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: t("หมายเหตุ"),
                    dataIndex: "remark",
                    key: "remark",
                    ellipsis: true,
                    render: (v?: string) => v || "—",
                  },
                  {
                    title: "",
                    key: "actions",
                    align: "right",
                    render: (_, row) => (
                      <Button
                        size="small"
                        onClick={() =>
                          router.push(
                            `/production/output-stock-requests/${row.id}`,
                          )
                        }
                      >
                        {t("ดูรายละเอียด")}
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
                  ),
                },
              ]}
            />

            {hasSourceLines ? (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <div>
                    <h3>{t("จัดสรรผลผลิตด้วยตนเอง (กรณีระบบจัดให้ไม่ได้)")}</h3>
                    <p className={styles.sectionHint}>
                      {t("จัดสรรได้หลังรับผลผลิตเข้าคลังและหัวหน้าคลังอนุมัติแล้ว และเฉพาะสินค้าเดียวกันกับใบขอผลิต — ส่วนเกินหรือสินค้าที่ไม่มี PR อยู่ในคลังกลาง")}
                    </p>
                  </div>
                  <Button
                    type="primary"
                    disabled={!selectedSourceLineIds.length || !canOperate}
                    loading={allocateMutation.isPending}
                    onClick={handleAllocateOutput}
                  >
                    {t("จองสต๊อกให้ SO ที่เลือก")}
                  </Button>
                </div>

                {relatedRequestsQuery.isFetched &&
                missingWarehouseLines.length > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={t("สินค้าที่ใบขอผลิตรอรับยังไม่ได้รับเข้าคลัง")}
                    description={
                      <>
                        {t("ต้องกดขอรับผลผลิตแล้วให้หัวหน้าคลังอนุมัติก่อน ของถึงจะเข้าคลังและจัดสรรได้")}
                        {otherReceivedItems.length > 0 ? (
                          <>
                            {" "}
                            {t("ของที่เข้าคลังแล้วคือ")}{" "}
                            {otherReceivedItems
                              .map(
                                (item) =>
                                  `${item.label} ${fmt(String(item.qty))}`,
                              )
                              .join(", ")}{" "}
                            {t("— คนละสินค้ากับที่ PR รอรับ")} (
                            {[
                              ...new Map(
                                missingWarehouseLines.map((line) => [
                                  line.itemId,
                                  outputItemLabel(line),
                                ]),
                              ).values(),
                            ].join(", ")}
                            )
                          </>
                        ) : null}
                      </>
                    }
                    action={
                      showReceiveCta ? (
                        <Button size="small" type="primary" onClick={openReceiveModal}>
                          {t("ขอรับผลผลิตเข้าคลัง")}
                        </Button>
                      ) : undefined
                    }
                  />
                ) : null}

                {relatedRequestsQuery.isFetched &&
                pendingWarehouseLines.length > 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    title={t("มีคำขอรอคลังอนุมัติ — ของยังไม่เข้าคลัง")}
                    description={t("ดูตารางคำขอรับผลผลิตด้านบน จนกว่าคลังจะกดอนุมัติจึงจัดสรรให้ PR/SO ได้")}
                  />
                ) : null}

                {allocationSummary ? (
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("รับเข้าคลังแล้ว (ทุกสินค้า)")}
                      </span>
                      <span className={styles.infoValue}>
                        {fmt(allocationSummary.totalApprovedOutputQty)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("จัดสรรแล้ว")}</span>
                      <span className={styles.infoValue}>
                        {fmt(allocationSummary.totalAllocatedQty)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("คงเหลือคลังกลาง (ทุกสินค้า)")}
                      </span>
                      <span className={styles.infoValue}>
                        {fmt(allocationSummary.unallocatedQty)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <Table
                  className={masterStyles.dataTable}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={sourceLines}
                  locale={{ emptyText: t("ไม่มีรายการอ้างอิง") }}
                  columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
                      title: "",
                      key: "select",
                      width: 48,
                      render: (_, row) => {
                        const remaining = Number(row.remainingQty);
                        const itemUnallocated = itemUnallocatedOf(
                          row.itemId,
                          row.fulfilledQty,
                        );
                        const disabled =
                          row.isFulfilled ||
                          remaining <= 0 ||
                          itemUnallocated <= 0;
                        return (
                          <Checkbox
                            checked={selectedSourceLineIds.includes(row.id)}
                            disabled={disabled}
                            onChange={(event) =>
                              handleToggleSourceLine(
                                row.id,
                                Math.min(remaining, itemUnallocated),
                                event.target.checked,
                              )
                            }
                          />
                        );
                      },
                    },
                    {
                      title: t("ใบขอผลิต"),
                      key: "pr",
                      render: (_, row) =>
                        row.productionRequestNo ?? row.productionRequestId,
                    },
                    {
                      title: t("ใบสั่งขาย"),
                      key: "so",
                      render: (_, row) => row.salesOrderNo ?? row.salesOrderId,
                    },
                    {
                      title: t("สินค้า"),
                      key: "item",
                      render: (_, row) => outputItemLabel(row),
                    },
                    {
                      title: t("ต้องการ"),
                      key: "allocated",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.allocatedQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: t("รับเข้าคลังแล้ว"),
                      key: "received",
                      align: "right",
                      render: (_, row) => {
                        const approved =
                          approvedQtyByItemId.get(row.itemId) ?? 0;
                        const pending =
                          pendingQtyByItemId.get(row.itemId) ?? 0;
                        return (
                          <>
                            <div>
                              {fmt(String(approved))} {row.unitCode ?? ""}
                            </div>
                            {pending > 0 ? (
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                {t("รออนุมัติ")} {fmt(String(pending))}
                              </Typography.Text>
                            ) : null}
                          </>
                        );
                      },
                    },
                    {
                      title: t("จัดสรรแล้ว"),
                      key: "fulfilled",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.fulfilledQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: t("คงเหลือ"),
                      key: "remaining",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.remainingQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: t("จัดสรรครั้งนี้"),
                      key: "allocateQty",
                      align: "right",
                      width: 140,
                      render: (_, row) => {
                        const remaining = Number(row.remainingQty);
                        const itemUnallocated = itemUnallocatedOf(
                          row.itemId,
                          row.fulfilledQty,
                        );
                        const selected = selectedSourceLineIds.includes(row.id);
                        if (!selected) {
                          return "-";
                        }
                        const maxQty = Math.min(remaining, itemUnallocated);
                        return (
                          <InputNumber
                            min={0.001}
                            max={maxQty}
                            step={0.001}
                            style={{ width: "100%" }}
                            value={allocationQtyByLineId[row.id] ?? maxQty}
                            onChange={(value) =>
                              setAllocationQtyByLineId((prev) => ({
                                ...prev,
                                [row.id]: Number(value ?? 0),
                              }))
                            }
                          />
                        );
                      },
                    },
                    {
                      title: t("สถานะ"),
                      key: "status",
                      render: (_, row) => {
                        const approved =
                          approvedQtyByItemId.get(row.itemId) ?? 0;
                        const pending =
                          pendingQtyByItemId.get(row.itemId) ?? 0;
                        if (row.isFulfilled) {
                          return (
                            <Tag color="success" icon={<CheckOutlined />}>
                              {t("ครบแล้ว")}
                            </Tag>
                          );
                        }
                        if (approved <= 0 && pending > 0) {
                          return <Tag color="warning">{t("รอคลังอนุมัติ")}</Tag>;
                        }
                        if (approved <= 0) {
                          return <Tag>{t("ยังไม่ได้รับเข้าคลัง")}</Tag>;
                        }
                        return <Tag color="processing">{t("รอจัดสรร")}</Tag>;
                      },
                    },
                  ]}
                />
              </div>
            ) : null}
                    </div>
                  ),
                },
                {
                  key: "data",
                  label: t("ข้อมูล"),
                  children: (
                    <ProductionOrderDataTab
                      orderId={orderId}
                      startedAt={order.startedAt}
                      completedAt={order.completedAt}
                      productionDate={order.productionDate}
                    />
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className={masterStyles.errorBox}>{t("ไม่พบใบสั่งผลิตที่ต้องการ")}</div>
        )}

        <Modal
          title={t("ยืนยันเสร็จสิ้นการผลิต")}
          open={completeOpen}
          onCancel={() => {
            setCompleteOpen(false);
            setSignatureName("");
            setWasteActualRows([]);
          }}
          okText={t("ยืนยัน")}
          okButtonProps={{
            disabled: signatureName.trim().toLowerCase() !== "done",
          }}
          confirmLoading={completeMutation.isPending}
          width={720}
          onOk={() =>
            completeMutation.mutate(
              {
                id: orderId,
                body: {
                  signature: { typedName: signatureName.trim() },
                  wasteActualLines:
                    wasteActualRows.length > 0
                      ? wasteActualRows.map((row) => ({
                          planLineId: row.planLineId,
                          itemId: row.itemId,
                          unitId: row.unitId,
                          actualQty: row.actualQty,
                        }))
                      : undefined,
                },
              },
              {
                onSuccess: () => {
                  setCompleteOpen(false);
                  setSignatureName("");
                  setWasteActualRows([]);
                  void summaryQuery.refetch();
                },
              },
            )
          }
        >
          {/*
            ปิดงานได้แม้ยังรับเข้าไม่ครบ — ของที่ผลิตได้จริงอยู่หน้าเครื่องแล้ว
            แต่ต้องเห็นว่าเหลือเท่าไร และรู้ว่าปิดแล้วยังขอรับเพิ่มได้
          */}
          {outputHistorySummary &&
          outputHistorySummary.approved < outputHistorySummary.planned ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={t("ยังรับเข้าคลังไม่ครบแผน — เข้าคลังแล้ว {approved} จากแผน {planned}", {
                approved: fmt(String(outputHistorySummary.approved)),
                planned: fmt(String(outputHistorySummary.planned)),
              })}
              description={t("ปิดงานได้ตามปกติ และยังขอรับผลผลิตเข้าคลังเพิ่มได้หลังปิดงาน")}
            />
          ) : null}
          <p>
            {lang === "en" ? (
              <>Type <strong>done</strong> to confirm production completion</>
            ) : (
              <>พิมพ์ <strong>done</strong> เพื่อยืนยันเสร็จสิ้นการผลิต</>
            )}
          </p>
          <Input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="done"
            autoFocus
          />
          {wasteActualRows.length > 0 ? (
            <>
              <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
                {t("ของเสียจริง (ไม่เข้าคลัง) — ปรับจำนวนได้ก่อนยืนยัน")}
              </Typography.Paragraph>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={wasteActualRows}
                columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
                    title: t("สินค้า"),
                    dataIndex: "itemLabel",
                    key: "itemLabel",
                  },
                  {
                    title: t("จำนวนเสียจริง"),
                    key: "actualQty",
                    render: (_, row) => (
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={row.actualQty}
                        addonAfter={row.unitCode}
                        onChange={(value) =>
                          setWasteActualRows((prev) =>
                            prev.map((entry) =>
                              entry.key === row.key
                                ? { ...entry, actualQty: value ?? 0 }
                                : entry,
                            ),
                          )
                        }
                      />
                    ),
                  },
                ]}
              />
            </>
          ) : null}
        </Modal>

        <ProductionOrderPauseModal
          open={pauseOpen}
          loading={pauseMutation.isPending}
          onCancel={() => setPauseOpen(false)}
          onConfirm={(body) =>
            pauseMutation.mutate(
              { id: orderId, body },
              { onSuccess: () => setPauseOpen(false) },
            )
          }
        />

        <ProductionOrderCancelModal
          open={cancelOpen}
          loading={cancelMutation.isPending}
          started={isRunning}
          orderNo={order?.orderNo}
          onCancel={() => setCancelOpen(false)}
          onConfirm={(body) =>
            cancelMutation.mutate(
              { id: orderId, body },
              { onSuccess: () => setCancelOpen(false) },
            )
          }
        />

        <Modal
          title={t("บันทึกค่าระหว่างผลิต")}
          open={logOpen}
          onCancel={() => setLogOpen(false)}
          okText={t("บันทึก")}
          okButtonProps={{ disabled: !logNote.trim() }}
          confirmLoading={logMutation.isPending}
          onOk={() =>
            logMutation.mutate(
              { id: orderId, body: { note: logNote.trim() } },
              {
                onSuccess: () => {
                  setLogOpen(false);
                  setLogNote("");
                },
              },
            )
          }
        >
          <Input.TextArea
            rows={3}
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            placeholder={t("เช่น อุณหภูมิเตา 450°C ตรงตามแผน")}
          />
        </Modal>

        <ProductionOrderFormulaModal
          open={formulaOpen}
          onClose={() => setFormulaOpen(false)}
          formulaId={order?.productionFormulaId}
          versionUsed={order?.productionFormulaVersionNo}
          targetQty={order?.formulaTargetQty}
          driverItemId={order?.formulaDriverItemId}
        />

        <Modal
          title={
            isCompleted
              ? t("ขอรับผลผลิตเข้าคลัง")
              : t("ขอรับผลผลิตเข้าคลัง (งวดนี้)")
          }
          open={requestOpen}
          onCancel={() => setRequestOpen(false)}
          okText={t("ส่งคำขอ")}
          confirmLoading={createFromOrderMutation.isPending}
          onOk={handleSubmitOutputRequest}
          destroyOnHidden
          width={760}
        >
          <Typography.Paragraph type="secondary">
            {t("อ้างอิงใบสั่งผลิต {no} — เลือกหลายรายการผลผลิตได้ในครั้งเดียว", { no: order?.orderNo ?? "" })}
            {t("ระบบจะสร้างคำขอแยกตามสินค้า ยังไม่ POST สต๊อก รอ WAREHOUSE_MANAGER อนุมัติ")}
            {isCompleted ? null : (
              <>
                {" "}
                {t("· ใบนี้ยังผลิตอยู่ รับเข้าได้เป็นงวด ส่วนที่เหลือขอเพิ่มภายหลังได้")}
              </>
            )}
          </Typography.Paragraph>
          {showOverPlanHint ? (
            <Alert
              type="info"
              showIcon
              title={t("รับครบตามแผนแล้ว")}
              description={t("ถ้าของจริงออกมากกว่าแผน ติ๊กรายการแล้วกรอกจำนวนเองได้ ระบบไม่เติมยอดให้เพราะส่วนนี้นับเป็นผลผลิตเกินแผน")}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Table
            rowKey="itemId"
            size="small"
            pagination={false}
            dataSource={receiveLines}
            locale={{ emptyText: t("ไม่มีแผนผลผลิต") }}
            rowSelection={{
              selectedRowKeys: selectedReceiveItemIds,
              onChange: (keys) => setSelectedReceiveItemIds(keys.map(String)),
              getCheckboxProps: (record) => ({
                disabled: lockedItemIds.includes(record.itemId),
              }),
            }}
            columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
                title: t("สินค้า"),
                key: "item",
                render: (_, row) =>
                  row.itemCode
                    ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                    : row.itemId,
              },
              {
                title: t("แผน"),
                dataIndex: "plannedQty",
                key: "plannedQty",
                align: "right",
                render: (v: string, row) => `${fmt(v)} ${row.unitCode ?? ""}`,
              },
              {
                title: t("เข้าคลังแล้ว"),
                dataIndex: "actualQty",
                key: "actualQty",
                align: "right",
                render: (_, row) =>
                  `${fmt(row.actualQty ?? "0")} ${row.unitCode ?? ""}`,
              },
              {
                title: t("คงเหลือตามแผน"),
                key: "remainingQty",
                align: "right",
                render: (_, row) => {
                  const remaining = remainingByItemId.get(row.itemId);
                  return remaining === undefined
                    ? "—"
                    : `${fmt(String(remaining))} ${row.unitCode ?? ""}`;
                },
              },
              {
                title: t("จำนวนรับเข้า"),
                key: "receiveQty",
                width: 160,
                render: (_, row) => (
                  <InputNumber
                    min={0.001}
                    style={{ width: "100%" }}
                    disabled={lockedItemIds.includes(row.itemId)}
                    value={receiveQtyByItemId[row.itemId]}
                    onChange={(value) =>
                      setReceiveQtyByItemId((prev) => ({
                        ...prev,
                        [row.itemId]: Number(value ?? 0),
                      }))
                    }
                  />
                ),
              },
              {
                title: "",
                key: "overWarning",
                width: 150,
                render: (_, row) => {
                  /* เกินแผนรับได้ แต่ต้องเห็นว่าเกิน — ของจริงเท่าไรก็ต้องเข้าคลังเท่านั้น */
                  const remaining = remainingByItemId.get(row.itemId);
                  const qty = Number(receiveQtyByItemId[row.itemId] ?? 0);
                  if (remaining === undefined || qty <= remaining + 1e-9) {
                    return null;
                  }
                  return (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>
                      {t("เกินแผน")} {fmt(String(qty - remaining))}{" "}
                      {row.unitCode ?? ""}
                    </Typography.Text>
                  );
                },
              },
            ]}
          />
          <Form form={requestForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="postingDate"
              label={t("วันที่รับเข้า")}
              rules={[{ required: true, message: t("กรุณาระบุวันที่รับเข้า") }]}
              extra={t("วันที่ของออกจากเครื่องจริง — งานยาวหลายวันอาจไม่ใช่วันที่กรอก")}
            >
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="warehouseId"
              label={t("คลังปลายทาง")}
              rules={[{ required: true, message: t("กรุณาเลือกคลัง") }]}
            >
              <Select
                showSearch
                placeholder={t("เลือกคลัง")}
                optionFilterProp="label"
                loading={warehousesQuery.isLoading}
                options={(warehousesQuery.data?.data ?? []).map((w) => ({
                  value: w.id,
                  label: `${w.warehouseCode} — ${w.warehouseName}`,
                }))}
                onChange={() => requestForm.setFieldValue("warehouseLocationId", undefined)}
              />
            </Form.Item>
            <Form.Item
              name="warehouseLocationId"
              label={t("ตำแหน่งจัดเก็บ")}
              rules={[{ required: true, message: t("กรุณาเลือกตำแหน่งจัดเก็บ") }]}
            >
              <Select
                showSearch
                placeholder={selectedWarehouseId ? t("เลือกตำแหน่งจัดเก็บ") : t("เลือกคลังก่อน")}
                optionFilterProp="label"
                disabled={!selectedWarehouseId}
                loading={locationsQuery.isLoading}
                options={(locationsQuery.data?.data ?? []).map((loc) => ({
                  value: loc.id,
                  label: `${loc.locationCode} — ${loc.locationName}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="remark" label={t("หมายเหตุ")}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {order ? (
          <ProductionOrderStartModal
            open={startOpen}
            order={order}
            loading={startMutation.isPending}
            onCancel={() => setStartOpen(false)}
            onConfirm={(body) =>
              startMutation.mutate(
                { id: orderId, body },
                // ปิดกล่องเฉพาะตอนสำเร็จ — ของไม่พอต้องเห็นตัวเลขที่กรอกอยู่
                { onSuccess: () => setStartOpen(false) },
              )
            }
          />
        ) : null}
      </section>
    </MasterPageGate>
  );
}
