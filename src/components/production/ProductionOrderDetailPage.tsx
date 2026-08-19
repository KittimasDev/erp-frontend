"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
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
  useEndProductionOrderDowntimeMutation,
  useRecordProductionOrderDowntimeMutation,
  useStartProductionOrderMutation,
} from "@/hooks/production-orders/useProductionOrderMutations";
import {
  useProductionOutputReadyOrdersQuery,
  useProductionOutputStockRequestsQuery,
} from "@/hooks/production-output/useProductionOutputQueries";
import { useCreateProductionOutputStockRequestFromOrderMutation } from "@/hooks/production-output/useProductionOutputMutations";
import { useStockIssuesQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  PRODUCTION_ORDER_STATUS_LABEL,
  PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL,
  ProductionOrderPlanLineType,
  ProductionOrderStatus,
} from "@/types/production-order";
import { PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL } from "@/types/production-output-stock-request";
import type { CreateProductionOutputStockRequestFromOrderBody } from "@/types/production-output-stock-request";
import { STOCK_ISSUE_STATUS_LABEL } from "@/types/stock-issues";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOrderDetailPage.module.css";

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

export default function ProductionOrderDetailPage({ orderId }: Props) {
  const router = useRouter();
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

  const relatedRequestsQuery = useProductionOutputStockRequestsQuery(
    { referenceDocType: "PRODUCTION_ORDER", referenceDocId: orderId },
    { enabled: Boolean(orderId) },
  );
  const relatedMaterialIssuesQuery = useStockIssuesQuery({
    productionOrderId: orderId,
    limit: 100,
  });

  const startMutation = useStartProductionOrderMutation();
  const cancelMutation = useCancelProductionOrderMutation();
  const completeMutation = useCompleteProductionOrderMutation();
  const downtimeStartMutation = useRecordProductionOrderDowntimeMutation();
  const downtimeEndMutation = useEndProductionOrderDowntimeMutation();
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
  const [downtimeOpen, setDowntimeOpen] = useState(false);
  const [downtimeReason, setDowntimeReason] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
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
  const blockedItemIds = useMemo(
    () =>
      readyOrdersQuery.data?.data.find((row) => row.id === orderId)
        ?.blockedItemIds ?? [],
    [readyOrdersQuery.data, orderId],
  );

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const selectedWarehouseId = Form.useWatch("warehouseId", requestForm);
  const locationsQuery = useWarehouseLocationsQuery(
    { warehouseId: selectedWarehouseId, isActive: true },
    { enabled: Boolean(selectedWarehouseId) },
  );

  const createFromOrderMutation =
    useCreateProductionOutputStockRequestFromOrderMutation();

  if (!orderId) {
    return null;
  }

  const isDraft = order?.status === ProductionOrderStatus.DRAFT;
  const isInProgress = order?.status === ProductionOrderStatus.IN_PROGRESS;
  const isCompleted = order?.status === ProductionOrderStatus.COMPLETED;
  const openDowntime = order?.downtimes.find((d) => !d.endAt);

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
  const linkedRequestNos = useMemo(() => {
    const nos = (order?.sourceLines ?? [])
      .map((line) => line.productionRequestNo)
      .filter((value): value is string => Boolean(value));
    if (nos.length) {
      return [...new Set(nos)];
    }
    return order?.productionRequestNo ? [order.productionRequestNo] : [];
  }, [order?.productionRequestNo, order?.sourceLines]);
  const allocationSummary = order?.allocationSummary;
  const hasSourceLines = sourceLines.length > 0;
  const unallocatedQty = Number(allocationSummary?.unallocatedQty ?? 0);

  const handleToggleSourceLine = (lineId: string, remainingQty: number, checked: boolean) => {
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
      .map((sourceLineId) => ({
        sourceLineId,
        qtyToAllocate: allocationQtyByLineId[sourceLineId],
      }))
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
      qtyByItemId[line.itemId] = Number(line.plannedQty);
      if (!blockedItemIds.includes(line.itemId)) {
        selectable.push(line.itemId);
      }
    }
    setReceiveQtyByItemId(qtyByItemId);
    setSelectedReceiveItemIds(selectable);
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
                <Popconfirm
                  title="เริ่มผลิต?"
                  description="ระบบจะตัดวัตถุดิบตาม Lot ที่เลือกไว้ทันที"
                  okText="เริ่มผลิต"
                  cancelText="ยกเลิก"
                  onConfirm={() => startMutation.mutate(orderId)}
                >
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={startMutation.isPending}
                  >
                    เริ่มผลิต
                  </Button>
                </Popconfirm>
              ) : null}

              {isDraft && canOperate ? (
                <Popconfirm
                  title="ยกเลิกใบสั่งผลิต?"
                  okText="ยกเลิก"
                  cancelText="ปิด"
                  onConfirm={() => cancelMutation.mutate(orderId)}
                >
                  <Button danger loading={cancelMutation.isPending}>
                    ยกเลิกใบสั่งผลิต
                  </Button>
                </Popconfirm>
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

              {isInProgress && canOperate && !openDowntime ? (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => setDowntimeOpen(true)}
                >
                  บันทึก Downtime
                </Button>
              ) : null}

              {isInProgress && canOperate && openDowntime ? (
                <Popconfirm
                  title="ปิดรายการ Downtime นี้?"
                  okText="ปิด Downtime"
                  cancelText="ยกเลิก"
                  onConfirm={() =>
                    downtimeEndMutation.mutate({
                      id: orderId,
                      downtimeId: openDowntime.id,
                      body: {},
                    })
                  }
                >
                  <Button loading={downtimeEndMutation.isPending}>
                    ปิด Downtime ที่เปิดค้างอยู่
                  </Button>
                </Popconfirm>
              ) : null}

              {isInProgress && canOperate ? (
                <Button onClick={() => setLogOpen(true)}>
                  บันทึกค่าระหว่างผลิต
                </Button>
              ) : null}

              {isCompleted && canRequestOutput ? (
                <Button
                  type="primary"
                  className={masterStyles.createButton}
                  onClick={openReceiveModal}
                >
                  ขอรับผลผลิตเข้าคลัง
                </Button>
              ) : null}
            </div>

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

            {summary ? (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3>เปรียบเทียบ Yield / Mass Balance</h3>
                </div>
                <div className={styles.yieldGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>วัตถุดิบ (แผน)</span>
                    <span className={styles.infoValue}>
                      {fmt(summary.totalPlannedInputQty)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>วัตถุดิบ (ตัดจริง)</span>
                    <span className={styles.infoValue}>{fmt(summary.totalInputQty)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ผลผลิต (แผน)</span>
                    <span className={styles.infoValue}>
                      {fmt(summary.totalPlannedOutputQty)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ผลผลิต (เข้าคลังแล้ว)</span>
                    <span className={styles.infoValue}>{fmt(summary.totalOutputQty)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Yield แผน</span>
                    <span className={styles.infoValue}>
                      {summary.plannedYieldPercent}%
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Yield จริง</span>
                    <span className={styles.infoValue}>{summary.yieldPercent}%</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ของเสีย (แผน)</span>
                    <span className={styles.infoValue}>
                      {fmt(summary.totalPlannedWasteQty)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ของเสีย (จริง · ไม่เข้าคลัง)</span>
                    <span className={styles.infoValue}>
                      {fmt(summary.totalActualWasteQty)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Mass balance</span>
                    <span className={styles.infoValue}>
                      {fmt(summary.massBalanceDiff)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Downtime รวม</span>
                    <span className={styles.infoValue}>
                      {summary.totalDowntimeHours} ชม.
                    </span>
                  </div>
                </div>
                {summary.yieldCompareByItem.length > 0 ? (
                  <Table
                    className={masterStyles.dataTable}
                    rowKey="itemId"
                    size="small"
                    pagination={false}
                    style={{ marginTop: 16 }}
                    dataSource={summary.yieldCompareByItem}
                    columns={[
                      {
                        title: "ผลผลิต",
                        key: "item",
                        render: (_, row) =>
                          row.itemCode
                            ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                            : row.itemId,
                      },
                      {
                        title: "แผน",
                        key: "planned",
                        align: "right",
                        render: (_, row) =>
                          `${fmt(row.plannedQty)} ${row.unitCode ?? ""}`,
                      },
                      {
                        title: "จริง (เข้าคลัง)",
                        key: "actual",
                        align: "right",
                        render: (_, row) =>
                          `${fmt(row.actualQty)} ${row.unitCode ?? ""}`,
                      },
                      {
                        title: "Yield แผน",
                        dataIndex: "plannedYieldPercent",
                        key: "plannedYieldPercent",
                        align: "right",
                        render: (v: number) => `${v}%`,
                      },
                      {
                        title: "Yield จริง",
                        dataIndex: "actualYieldPercent",
                        key: "actualYieldPercent",
                        align: "right",
                        render: (v: number) => `${v}%`,
                      },
                    ]}
                  />
                ) : null}
              </div>
            ) : null}

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
                  { title: "เหตุผล", dataIndex: "reason", key: "reason" },
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
                <h3>คำขอรับผลผลิตเข้าคลังจากใบสั่งผลิตนี้</h3>
              </div>
              <Table
                className={masterStyles.dataTable}
                rowKey="id"
                size="small"
                loading={relatedRequestsQuery.isFetching}
                pagination={false}
                dataSource={relatedRequestsQuery.data?.data ?? []}
                locale={{ emptyText: "ยังไม่มีคำขอรับผลผลิต" }}
                columns={[
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
                    title: "Lot",
                    key: "lotNo",
                    render: (_, row) =>
                      row.status === "APPROVED" ? row.lotNo || "-" : "-",
                  },
                  {
                    title: "สถานะ",
                    dataIndex: "status",
                    key: "status",
                    render: (v: string) => (
                      <Tag>{PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[v] ?? v}</Tag>
                    ),
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
                    <h3>จัดสรรผลผลิตให้ใบสั่งขาย</h3>
                    <p className={styles.sectionHint}>
                      หลังรับผลผลิตเข้าคลังแล้ว เลือก SO ที่ต้องการจัดสรรและกดจองสต๊อก
                      (ไม่เปลี่ยนสถานะ SO อัตโนมัติทั้งใบ)
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

                {allocationSummary ? (
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>รับเข้าคลังแล้ว</span>
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
                      <span className={styles.infoLabel}>คงเหลือจัดสรร</span>
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
                        const disabled = row.isFulfilled || remaining <= 0 || unallocatedQty <= 0;
                        return (
                          <Checkbox
                            checked={selectedSourceLineIds.includes(row.id)}
                            disabled={disabled}
                            onChange={(event) =>
                              handleToggleSourceLine(
                                row.id,
                                remaining,
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
                      render: (_, row) => row.productionRequestNo ?? row.productionRequestId,
                    },
                    {
                      title: "ใบสั่งขาย",
                      key: "so",
                      render: (_, row) => row.salesOrderNo ?? row.salesOrderId,
                    },
                    {
                      title: "ต้องการ",
                      key: "allocated",
                      align: "right",
                      render: (_, row) =>
                        `${fmt(row.allocatedQty)} ${row.unitCode ?? ""}`,
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
                        const selected = selectedSourceLineIds.includes(row.id);
                        if (!selected) {
                          return "-";
                        }
                        return (
                          <InputNumber
                            min={0.001}
                            max={Math.min(remaining, unallocatedQty)}
                            step={0.001}
                            style={{ width: "100%" }}
                            value={allocationQtyByLineId[row.id] ?? remaining}
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
                      render: (_, row) =>
                        row.isFulfilled ? (
                          <Tag color="success" icon={<CheckOutlined />}>
                            ครบแล้ว
                          </Tag>
                        ) : (
                          <Tag color="processing">รอจัดสรร</Tag>
                        ),
                    },
                  ]}
                />
              </div>
            ) : null}
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

        <Modal
          title="บันทึก Downtime"
          open={downtimeOpen}
          onCancel={() => setDowntimeOpen(false)}
          okText="บันทึก"
          okButtonProps={{ disabled: !downtimeReason.trim() }}
          confirmLoading={downtimeStartMutation.isPending}
          onOk={() =>
            downtimeStartMutation.mutate(
              {
                id: orderId,
                body: {
                  startAt: new Date().toISOString(),
                  reason: downtimeReason.trim(),
                },
              },
              {
                onSuccess: () => {
                  setDowntimeOpen(false);
                  setDowntimeReason("");
                },
              },
            )
          }
        >
          <Input.TextArea
            rows={3}
            value={downtimeReason}
            onChange={(e) => setDowntimeReason(e.target.value)}
            placeholder="เหตุผลที่หยุดเดินเครื่อง"
          />
        </Modal>

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

        <Modal
          title="ขอรับผลผลิตเข้าคลัง"
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
          </Typography.Paragraph>
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
                disabled: blockedItemIds.includes(record.itemId),
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
                title: "จำนวนรับเข้า",
                key: "receiveQty",
                width: 160,
                render: (_, row) => (
                  <InputNumber
                    min={0.001}
                    style={{ width: "100%" }}
                    disabled={blockedItemIds.includes(row.itemId)}
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
            ]}
          />
          <Form form={requestForm} layout="vertical" style={{ marginTop: 16 }}>
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
      </section>
    </MasterPageGate>
  );
}
