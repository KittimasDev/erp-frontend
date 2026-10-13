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
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
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
  PRODUCTION_ORDER_STATUS_LABEL,
  PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL,
  ProductionOrderPlanLineType,
  ProductionOrderStatus,
} from "@/types/production-order";
import {
  canRequestMoreProductionOutput,
  PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL,
  ProductionOutputRequestStatus,
  REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
} from "@/types/production-output-stock-request";
import type { CreateProductionOutputStockRequestFromOrderBody } from "@/types/production-output-stock-request";
import { STOCK_ISSUE_STATUS_LABEL } from "@/types/stock-issues";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ProductionOrderStartModal from "./ProductionOrderStartModal";
import ShiftRecordsPanel from "@/components/production-cycles/ShiftRecordsPanel";
import Link from "next/link";
import ProductionOrderYieldCard from "./ProductionOrderYieldCard";
import ProductionOrderFormulaModal from "./ProductionOrderFormulaModal";
import {
  ProductionOrderCancelModal,
  ProductionOrderPauseModal,
} from "./ProductionOrderRunControlModals";
import styles from "./ProductionOrderDetailPage.module.css";

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
  return Number.isNaN(num) ? value : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function fmtDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-";
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
    {
      referenceDocType: REFERENCE_DOC_TYPE_PRODUCTION_ORDER,
      referenceDocId: orderId,
    },
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

  const receiveLines = useMemo(() => {
    const byItemId = new Map<string, (typeof outputPlanLines)[number]>();
    for (const line of outputPlanLines) {
      const existing = byItemId.get(line.itemId);
      if (existing) {
        byItemId.set(line.itemId, {
          ...existing,
          plannedQty: String(
            Number(existing.plannedQty) + Number(line.plannedQty),
          ),
        });
      } else {
        byItemId.set(line.itemId, { ...line });
      }
    }
    return [...byItemId.values()];
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
      message.warning("กรุณาเลือกผลผลิตอย่างน้อย 1 รายการ");
      return;
    }
    const items = selectedLines.map((line) => {
      const qty = Number(receiveQtyByItemId[line.itemId] ?? line.plannedQty);
      return {
        itemId: line.itemId,
        unitId: line.unitId,
        quantity: Number(qty).toFixed(3),
      };
    });
    if (items.some((item) => !(Number(item.quantity) > 0))) {
      message.warning("จำนวนรับเข้าต้องมากกว่า 0");
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
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>
            {order?.status?.slice(0, 2) ?? "PO"}
          </div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · PYROLYSIS</div>
            <h2 className={masterStyles.pageTitle}>
              {order?.orderNo ?? "ใบสั่งผลิต"}
            </h2>
            <span className={masterStyles.pageSubtitle}>
              {order
                ? PRODUCTION_ORDER_STATUS_LABEL[order.status] ?? order.status
                : ""}
              {linkedRequestNos.length
                ? ` · ใบขอผลิต ${linkedRequestNos.join(" · ")}`
                : ""}
            </span>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/production/production-orders")}
          >
            กลับรายการ
          </Button>
        </div>

        {order ? (
          <>
            <div className={styles.actionBar}>
              {isDraft && canOperate ? (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={startMutation.isPending}
                  onClick={() => setStartOpen(true)}
                >
                  เริ่มผลิต
                </Button>
              ) : null}

              {isDraft && canOperate ? (
                <Button
                  danger
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  ยกเลิกใบสั่งผลิต
                </Button>
              ) : null}

              {isCompleted &&
              canOperate &&
              !(relatedRequestsQuery.data?.data ?? []).some(
                (r) => r.status === "APPROVED",
              ) ? (
                <Button
                  danger
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  ยกเลิกใบสั่งผลิต
                </Button>
              ) : null}

              {/* เตาพังกลางคัน — เดิมเส้นทางนี้ถูกบล็อกสนิท ใบค้าง IN_PROGRESS ตลอดกาล */}
              {isRunning && canOperate ? (
                <Button
                  danger
                  loading={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  ยกเลิกกลางคัน
                </Button>
              ) : null}

              {isInProgress && canOperate ? (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={openCompleteModal}
                >
                  ยืนยันเสร็จสิ้นการผลิต
                </Button>
              ) : null}

              {isInProgress && canOperate ? (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => setPauseOpen(true)}
                >
                  หยุดเดินเครื่องชั่วคราว
                </Button>
              ) : null}

              {isPaused && canOperate ? (
                <Popconfirm
                  title="กลับมาเดินเครื่อง?"
                  description="ระบบจะปิดรายการ Downtime ที่เปิดค้างอยู่ให้อัตโนมัติ"
                  okText="กลับมาเดินเครื่อง"
                  cancelText="ปิด"
                  onConfirm={() => resumeMutation.mutate({ id: orderId })}
                >
                  <Button type="primary" loading={resumeMutation.isPending}>
                    กลับมาเดินเครื่อง
                  </Button>
                </Popconfirm>
              ) : null}

              {isRunning && canOperate ? (
                <Button onClick={() => setLogOpen(true)}>
                  บันทึกค่าระหว่างผลิต
                </Button>
              ) : null}

              {canReceiveOutput && canRequestOutput && canStillRequestOutput ? (
                <Button
                  type="primary"
                  className={masterStyles.createButton}
                  onClick={openReceiveModal}
                >
                  {/* ระหว่างผลิตเป็นการรับ "งวด" หนึ่ง ไม่ใช่ปิดยอดทั้งใบ */}
                  {isCompleted
                    ? "ขอรับผลผลิตเข้าคลัง"
                    : "ขอรับผลผลิตเข้าคลัง (งวดนี้)"}
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
                  label: "งาน",
                  children: (
                    <>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>วันที่ผลิต</span>
                <span className={styles.infoValue}>
                  {dayjs(order.productionDate).format("DD/MM/YYYY")}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Batch</span>
                <span className={styles.infoValue}>{order.batchNo || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>รอบผลิต</span>
                <span className={styles.infoValue}>
                  {order.cycleId ? (
                    <Link href={`/production/cycles/${order.cycleId}`}>{order.cycleNo ?? "ดูรอบ"}</Link>
                  ) : (
                    "ไม่ได้สังกัดรอบ"
                  )}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ผู้ปฏิบัติงานหลัก / กะ</span>
                <span className={styles.infoValue}>
                  {order.leadOperatorName ?? "-"}
                  {order.shiftName ? ` · ${order.shiftName}` : ""}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>สูตรที่ใช้</span>
                <span className={styles.infoValue}>
                  {order.productionFormulaCode ?? "กรอกเอง (ไม่ได้ใช้สูตร)"}
                  {/*
                    ปุ่มขึ้นทุกใบ แม้ใบที่กรอกมือ — คนดูใบมักอยากเทียบกับสูตรมาตรฐาน
                    ว่ารอบนี้ใส่ต่างจากสูตรตรงไหน ซึ่งเป็นคำถามที่เกิดกับใบที่กรอกมือ
                    มากกว่าใบที่คิดจากสูตรเสียอีก
                  */}
                  <Button
                    size="small"
                    type="link"
                    style={{ paddingInline: 4 }}
                    onClick={() => setFormulaOpen(true)}
                  >
                    ดูสูตร
                  </Button>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cycle เป้าหมาย</span>
                <span className={styles.infoValue}>
                  {order.cycleTargetHours} ชม.
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ชั่วโมงแรงงาน (แผน)</span>
                <span className={styles.infoValue}>
                  {order.plannedLaborHours
                    ? `${order.plannedLaborHours} ชม.`
                    : "-"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>สถานะ</span>
                <span className={styles.infoValue}>
                  <Tag>{PRODUCTION_ORDER_STATUS_LABEL[order.status] ?? order.status}</Tag>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>เริ่มผลิตโดย</span>
                <span className={styles.infoValue}>
                  {order.startedBy?.displayName ?? "-"} · {fmtDate(order.startedAt)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>เสร็จสิ้นโดย</span>
                <span className={styles.infoValue}>
                  {order.completedBy?.displayName ?? "-"} · {fmtDate(order.completedAt)}
                </span>
              </div>
            </div>

            {summary ? <ProductionOrderYieldCard summary={summary} /> : null}

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>แผนผลผลิต</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={outputPlanLines}
                locale={{ emptyText: "ไม่มีแผนผลผลิต" }}
                columns={[
                  {
                    title: "สินค้า",
                    key: "item",
                    render: (_, row) =>
                      row.itemCode
                        ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                        : row.itemId,
                  },
                  {
                    title: "แผน",
                    dataIndex: "plannedQty",
                    key: "plannedQty",
                    align: "right",
                    render: (v: string, row) => `${fmt(v)} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: "เข้าคลังแล้ว",
                    dataIndex: "actualQty",
                    key: "actualQty",
                    align: "right",
                    render: (_, row) =>
                      `${fmt(row.actualQty ?? "0")} ${row.unitCode ?? ""}`,
                  },
                ]}
              />
            </div>

            {wastePlanLines.length > 0 || isCompleted ? (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3>ของเสีย (ไม่เข้าคลัง)</h3>
                </div>
                <Table
                  className={masterStyles.dataTable}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={wastePlanLines}
                  locale={{ emptyText: "ไม่มีของเสีย" }}
                  columns={[
                    {
                      title: "สินค้า",
                      key: "item",
                      render: (_, row) =>
                        row.itemCode
                          ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                          : row.itemId,
                    },
                    {
                      title: "แผน",
                      dataIndex: "plannedQty",
                      key: "plannedQty",
                      align: "right",
                      render: (v: string, row) => `${fmt(v)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: "เสียจริง",
                      dataIndex: "actualQty",
                      key: "actualQty",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.actualQty ?? "-")} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: "สถานะ",
                      dataIndex: "disposalStatus",
                      key: "disposalStatus",
                      render: (v?: string) =>
                        v ? (
                          <Tag>
                            {PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL[v] ?? v}
                          </Tag>
                        ) : (
                          "-"
                        ),
                    },
                  ]}
                />
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>วัตถุดิบที่ต้องใช้</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.inputItems}
                columns={[
                  {
                    title: "สินค้า",
                    key: "item",
                    render: (_, row) =>
                      row.itemCode ? `${row.itemCode} — ${row.itemNameTh ?? ""}` : row.itemId,
                  },
                  { title: "คลัง", dataIndex: "warehouseCode", key: "warehouseCode" },
                  { title: "ตำแหน่ง", dataIndex: "locationCode", key: "locationCode" },
                  { title: "Lot", dataIndex: "lotNo", key: "lotNo" },
                  {
                    title: "วางแผน",
                    dataIndex: "plannedQty",
                    key: "plannedQty",
                    align: "right",
                    render: (v: string) => fmt(v),
                  },
                  {
                    title: "ตัดจริง",
                    dataIndex: "actualQty",
                    key: "actualQty",
                    align: "right",
                    render: (v: string) => fmt(v),
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>บันทึกการผลิตรายกะ</h3>
              </div>
              <ShiftRecordsPanel
                orderId={order.id}
                canEdit={orderActions.canEdit}
                started={isRunning || order.status === ProductionOrderStatus.COMPLETED}
              />
            </div>

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
                locale={{ emptyText: "ไม่มีรายการ Downtime" }}
                columns={[
                  { title: "เริ่ม", dataIndex: "startAt", key: "startAt", render: fmtDate },
                  {
                    title: "สิ้นสุด",
                    dataIndex: "endAt",
                    key: "endAt",
                    render: (v?: string) => (v ? fmtDate(v) : "ยังไม่ปิด"),
                  },
                  {
                    title: "หมวด",
                    dataIndex: "category",
                    key: "category",
                    // แถวที่บันทึกก่อนมีหมวดจะว่าง — backfill ไม่ได้ ต้องโชว์ตามจริง
                    render: (v?: string) =>
                      v
                        ? PRODUCTION_DOWNTIME_CATEGORY_LABEL[v] ?? v
                        : PRODUCTION_DOWNTIME_UNCATEGORIZED_LABEL,
                  },
                  {
                    title: "ประเภทการหยุด",
                    dataIndex: "stopType",
                    key: "stopType",
                    render: (v: string) => (v === "PLANNED" ? "ตามแผน" : "ไม่ตามแผน"),
                  },
                  { title: "เหตุผล", dataIndex: "reason", key: "reason" },
                  {
                    title: "Root Cause",
                    dataIndex: "rootCause",
                    key: "rootCause",
                    render: (v?: string) => v ?? "-",
                  },
                  {
                    title: "ผู้บันทึก",
                    dataIndex: "recordedByName",
                    key: "recordedByName",
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>บันทึกระหว่างผลิต</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.logs}
                locale={{ emptyText: "ยังไม่มีบันทึก" }}
                columns={[
                  { title: "เวลา", dataIndex: "loggedAt", key: "loggedAt", render: fmtDate },
                  { title: "รายละเอียด", dataIndex: "note", key: "note" },
                  {
                    title: "ผู้บันทึก",
                    dataIndex: "recordedByName",
                    key: "recordedByName",
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>Trace: วัตถุดิบที่เบิก / ผลผลิตเข้าคลัง</h3>
              </div>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                ใบเบิกวัตถุดิบที่ผูกใบสั่งผลิตนี้ และคำขอรับผลผลิตเข้าคลังที่เกี่ยวข้อง
              </Typography.Paragraph>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                loading={relatedMaterialIssuesQuery.isFetching}
                pagination={false}
                style={{ marginBottom: 16 }}
                dataSource={relatedMaterialIssuesQuery.data?.data.items ?? []}
                locale={{ emptyText: "ยังไม่มีใบเบิกวัตถุดิบที่ผูกใบสั่งผลิตนี้" }}
                columns={[
                  { title: "เลขที่เบิก", dataIndex: "issueNo", key: "issueNo" },
                  {
                    title: "วันที่",
                    dataIndex: "issueDate",
                    key: "issueDate",
                    render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
                  },
                  {
                    title: "สถานะ",
                    dataIndex: "status",
                    key: "status",
                    render: (v: string) => (
                      <Tag>{STOCK_ISSUE_STATUS_LABEL[v] ?? v}</Tag>
                    ),
                  },
                  {
                    title: "รายการ",
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
                        เปิดใบเบิก
                      </Button>
                    ),
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>สต๊อกที่ใบนี้ตัดจริง</h3>
              </div>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                ตอนกดเริ่มผลิต ระบบหักคลังตรงโดยไม่ออกเอกสารเบิก — นี่คือร่องรอย
                ที่บันทึกไว้จริง ใช้เลขใบสั่งผลิตแทนเลขใบเบิก · ต่างจากตารางใบเบิก
                ด้านบนซึ่งเป็นเอกสารที่คนเปิดเองแล้วผูกกลับมา
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
                    "ยังไม่มีการตัดสต๊อก — สต๊อกจะขยับตอนกดเริ่มผลิตเท่านั้น",
                }}
                columns={[
                  {
                    title: "วันที่",
                    dataIndex: "movementDate",
                    key: "movementDate",
                    width: 150,
                    render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
                  },
                  {
                    title: "สินค้า",
                    key: "item",
                    render: (_, row) =>
                      `${row.itemCode} — ${row.itemNameTh ?? ""}`,
                  },
                  {
                    title: "คลัง / ตำแหน่ง",
                    key: "place",
                    render: (_, row) =>
                      `${row.warehouseCode ?? "-"} / ${row.locationCode ?? "-"}`,
                  },
                  {
                    title: "ตัดออก",
                    key: "out",
                    align: "right",
                    width: 130,
                    render: (_, row) =>
                      `${fmt(row.quantityOut)} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: "คงเหลือหลังตัด",
                    dataIndex: "balanceQuantityAfter",
                    key: "balanceQuantityAfter",
                    align: "right",
                    width: 140,
                    render: (v: string) => fmt(v),
                  },
                ]}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h3>ประวัติการรับผลผลิตเข้าคลังของใบสั่งผลิตนี้</h3>
                  <p className={styles.sectionHint}>
                    ทุกงวดที่ขอรับเข้าคลัง เรียงใหม่สุดก่อน — ของจะเข้าคลังจริง
                    เมื่อหัวหน้าคลังอนุมัติเท่านั้น
                  </p>
                </div>
                {outputHistorySummary ? (
                  <span className={styles.sectionHint}>
                    เข้าคลังแล้วรวม {fmt(String(outputHistorySummary.approved))}
                    {outputHistorySummary.pending > 0
                      ? ` · รออนุมัติ ${fmt(String(outputHistorySummary.pending))}`
                      : ""}
                    {` จากแผน ${fmt(String(outputHistorySummary.planned))}`}
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
                locale={{ emptyText: "ยังไม่มีคำขอรับผลผลิต" }}
                columns={[
                  {
                    title: "วันที่รับเข้า",
                    key: "postingDate",
                    width: 115,
                    render: (_, row) =>
                      row.postingDate
                        ? dayjs(row.postingDate).format("DD/MM/YYYY")
                        : "—",
                  },
                  { title: "เลขที่คำขอ", dataIndex: "requestNo", key: "requestNo" },
                  {
                    title: "สินค้า",
                    key: "item",
                    render: (_, row) =>
                      row.itemCode ? `${row.itemCode} — ${row.itemNameTh ?? ""}` : row.itemId,
                  },
                  {
                    title: "จำนวน",
                    key: "qty",
                    align: "right",
                    render: (_, row) => `${fmt(row.quantity)} ${row.unitCode ?? ""}`,
                  },
                  {
                    title: "คลัง / ตำแหน่ง",
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
                    title: "สถานะ",
                    dataIndex: "status",
                    key: "status",
                    render: (v: string, row) => (
                      <>
                        <Tag>
                          {PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[v] ?? v}
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
                    title: "ผู้ขอ / ผู้อนุมัติ",
                    key: "people",
                    render: (_, row) => (
                      <div className={styles.sectionHint}>
                        <div>
                          ขอ: {row.requestedByName ?? "—"}
                          {row.requestedAt
                            ? ` · ${dayjs(row.requestedAt).format("DD/MM/YYYY HH:mm")}`
                            : ""}
                        </div>
                        <div>
                          อนุมัติ: {row.approvedByName ?? "—"}
                          {row.approvedAt
                            ? ` · ${dayjs(row.approvedAt).format("DD/MM/YYYY HH:mm")}`
                            : ""}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "หมายเหตุ",
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
                        ดูรายละเอียด
                      </Button>
                    ),
                  },
                ]}
              />
            </div>

            {hasSourceLines ? (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <div>
                    <h3>จัดสรรผลผลิตด้วยตนเอง (กรณีระบบจัดให้ไม่ได้)</h3>
                    <p className={styles.sectionHint}>
                      จัดสรรได้หลังรับผลผลิตเข้าคลังและหัวหน้าคลังอนุมัติแล้ว
                      และเฉพาะสินค้าเดียวกันกับใบขอผลิต — ส่วนเกินหรือสินค้าที่ไม่มี PR
                      อยู่ในคลังกลาง
                    </p>
                  </div>
                  <Button
                    type="primary"
                    disabled={!selectedSourceLineIds.length || !canOperate}
                    loading={allocateMutation.isPending}
                    onClick={handleAllocateOutput}
                  >
                    จองสต๊อกให้ SO ที่เลือก
                  </Button>
                </div>

                {relatedRequestsQuery.isFetched &&
                missingWarehouseLines.length > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    title="สินค้าที่ใบขอผลิตรอรับยังไม่ได้รับเข้าคลัง"
                    description={
                      <>
                        ต้องกดขอรับผลผลิตแล้วให้หัวหน้าคลังอนุมัติก่อน ของถึงจะเข้าคลังและจัดสรรได้
                        {otherReceivedItems.length > 0 ? (
                          <>
                            {" "}
                            ของที่เข้าคลังแล้วคือ{" "}
                            {otherReceivedItems
                              .map(
                                (item) =>
                                  `${item.label} ${fmt(String(item.qty))}`,
                              )
                              .join(", ")}{" "}
                            — คนละสินค้ากับที่ PR รอรับ (
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
                          ขอรับผลผลิตเข้าคลัง
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
                    title="มีคำขอรอคลังอนุมัติ — ของยังไม่เข้าคลัง"
                    description="ดูตารางคำขอรับผลผลิตด้านบน จนกว่าคลังจะกดอนุมัติจึงจัดสรรให้ PR/SO ได้"
                  />
                ) : null}

                {allocationSummary ? (
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        รับเข้าคลังแล้ว (ทุกสินค้า)
                      </span>
                      <span className={styles.infoValue}>
                        {fmt(allocationSummary.totalApprovedOutputQty)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>จัดสรรแล้ว</span>
                      <span className={styles.infoValue}>
                        {fmt(allocationSummary.totalAllocatedQty)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        คงเหลือคลังกลาง (ทุกสินค้า)
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
                  locale={{ emptyText: "ไม่มีรายการอ้างอิง" }}
                  columns={[
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
                      title: "ใบขอผลิต",
                      key: "pr",
                      render: (_, row) =>
                        row.productionRequestNo ?? row.productionRequestId,
                    },
                    {
                      title: "ใบสั่งขาย",
                      key: "so",
                      render: (_, row) => row.salesOrderNo ?? row.salesOrderId,
                    },
                    {
                      title: "สินค้า",
                      key: "item",
                      render: (_, row) => outputItemLabel(row),
                    },
                    {
                      title: "ต้องการ",
                      key: "allocated",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.allocatedQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: "รับเข้าคลังแล้ว",
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
                                รออนุมัติ {fmt(String(pending))}
                              </Typography.Text>
                            ) : null}
                          </>
                        );
                      },
                    },
                    {
                      title: "จัดสรรแล้ว",
                      key: "fulfilled",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.fulfilledQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: "คงเหลือ",
                      key: "remaining",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.remainingQty)} ${row.unitCode ?? ""}`,
                    },
                    {
                      title: "จัดสรรครั้งนี้",
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
                      title: "สถานะ",
                      key: "status",
                      render: (_, row) => {
                        const approved =
                          approvedQtyByItemId.get(row.itemId) ?? 0;
                        const pending =
                          pendingQtyByItemId.get(row.itemId) ?? 0;
                        if (row.isFulfilled) {
                          return (
                            <Tag color="success" icon={<CheckOutlined />}>
                              ครบแล้ว
                            </Tag>
                          );
                        }
                        if (approved <= 0 && pending > 0) {
                          return <Tag color="warning">รอคลังอนุมัติ</Tag>;
                        }
                        if (approved <= 0) {
                          return <Tag>ยังไม่ได้รับเข้าคลัง</Tag>;
                        }
                        return <Tag color="processing">รอจัดสรร</Tag>;
                      },
                    },
                  ]}
                />
              </div>
            ) : null}
                    </>
                  ),
                },
                {
                  key: "data",
                  label: "ข้อมูล",
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
          <div className={masterStyles.errorBox}>ไม่พบใบสั่งผลิตที่ต้องการ</div>
        )}

        <Modal
          title="ยืนยันเสร็จสิ้นการผลิต"
          open={completeOpen}
          onCancel={() => {
            setCompleteOpen(false);
            setSignatureName("");
            setWasteActualRows([]);
          }}
          okText="ยืนยัน"
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
              message={`ยังรับเข้าคลังไม่ครบแผน — เข้าคลังแล้ว ${fmt(
                String(outputHistorySummary.approved),
              )} จากแผน ${fmt(String(outputHistorySummary.planned))}`}
              description="ปิดงานได้ตามปกติ และยังขอรับผลผลิตเข้าคลังเพิ่มได้หลังปิดงาน"
            />
          ) : null}
          <p>
            พิมพ์ <strong>done</strong> เพื่อยืนยันเสร็จสิ้นการผลิต
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
                ของเสียจริง (ไม่เข้าคลัง) — ปรับจำนวนได้ก่อนยืนยัน
              </Typography.Paragraph>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={wasteActualRows}
                columns={[
                  {
                    title: "สินค้า",
                    dataIndex: "itemLabel",
                    key: "itemLabel",
                  },
                  {
                    title: "จำนวนเสียจริง",
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
          title="บันทึกค่าระหว่างผลิต"
          open={logOpen}
          onCancel={() => setLogOpen(false)}
          okText="บันทึก"
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
            placeholder="เช่น อุณหภูมิเตา 450°C ตรงตามแผน"
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
              ? "ขอรับผลผลิตเข้าคลัง"
              : "ขอรับผลผลิตเข้าคลัง (งวดนี้)"
          }
          open={requestOpen}
          onCancel={() => setRequestOpen(false)}
          okText="ส่งคำขอ"
          confirmLoading={createFromOrderMutation.isPending}
          onOk={handleSubmitOutputRequest}
          destroyOnHidden
          width={760}
        >
          <Typography.Paragraph type="secondary">
            อ้างอิงใบสั่งผลิต {order?.orderNo} — เลือกหลายรายการผลผลิตได้ในครั้งเดียว
            ระบบจะสร้างคำขอแยกตามสินค้า ยังไม่ POST สต๊อก รอ WAREHOUSE_MANAGER อนุมัติ
            {isCompleted ? null : (
              <>
                {" "}
                · ใบนี้ยังผลิตอยู่ รับเข้าได้เป็นงวด ส่วนที่เหลือขอเพิ่มภายหลังได้
              </>
            )}
          </Typography.Paragraph>
          {showOverPlanHint ? (
            <Alert
              type="info"
              showIcon
              title="รับครบตามแผนแล้ว"
              description="ถ้าของจริงออกมากกว่าแผน ติ๊กรายการแล้วกรอกจำนวนเองได้ ระบบไม่เติมยอดให้เพราะส่วนนี้นับเป็นผลผลิตเกินแผน"
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Table
            rowKey="itemId"
            size="small"
            pagination={false}
            dataSource={receiveLines}
            locale={{ emptyText: "ไม่มีแผนผลผลิต" }}
            rowSelection={{
              selectedRowKeys: selectedReceiveItemIds,
              onChange: (keys) => setSelectedReceiveItemIds(keys.map(String)),
              getCheckboxProps: (record) => ({
                disabled: lockedItemIds.includes(record.itemId),
              }),
            }}
            columns={[
              {
                title: "สินค้า",
                key: "item",
                render: (_, row) =>
                  row.itemCode
                    ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                    : row.itemId,
              },
              {
                title: "แผน",
                dataIndex: "plannedQty",
                key: "plannedQty",
                align: "right",
                render: (v: string, row) => `${fmt(v)} ${row.unitCode ?? ""}`,
              },
              {
                title: "เข้าคลังแล้ว",
                dataIndex: "actualQty",
                key: "actualQty",
                align: "right",
                render: (_, row) =>
                  `${fmt(row.actualQty ?? "0")} ${row.unitCode ?? ""}`,
              },
              {
                title: "คงเหลือตามแผน",
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
                title: "จำนวนรับเข้า",
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
                      เกินแผน {fmt(String(qty - remaining))}{" "}
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
              label="วันที่รับเข้า"
              rules={[{ required: true, message: "กรุณาระบุวันที่รับเข้า" }]}
              extra="วันที่ของออกจากเครื่องจริง — งานยาวหลายวันอาจไม่ใช่วันที่กรอก"
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="warehouseId"
              label="คลังปลายทาง"
              rules={[{ required: true, message: "กรุณาเลือกคลัง" }]}
            >
              <Select
                showSearch
                placeholder="เลือกคลัง"
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
              label="ตำแหน่งจัดเก็บ"
              rules={[{ required: true, message: "กรุณาเลือกตำแหน่งจัดเก็บ" }]}
            >
              <Select
                showSearch
                placeholder={selectedWarehouseId ? "เลือกตำแหน่งจัดเก็บ" : "เลือกคลังก่อน"}
                optionFilterProp="label"
                disabled={!selectedWarehouseId}
                loading={locationsQuery.isLoading}
                options={(locationsQuery.data?.data ?? []).map((loc) => ({
                  value: loc.id,
                  label: `${loc.locationCode} — ${loc.locationName}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="remark" label="หมายเหตุ">
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
