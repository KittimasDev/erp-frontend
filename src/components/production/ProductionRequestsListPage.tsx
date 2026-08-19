"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  MaterialRow,
  PlanLineRow,
  emptyPlanRow,
  emptyRow,
  type PlanRow,
  type Row,
} from "@/components/production/ProductionOrderCreatePage";
import { useConsolidatedCreateProductionOrderMutation } from "@/hooks/production-orders/useProductionOrderMutations";
import { useProductionRequestsQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  PRODUCTION_ORDER_STATUS_LABEL,
  ProductionOrderPlanLineType,
} from "@/types/production-order";
import type { ProductionRequest } from "@/types/production-request";
import {
  PRODUCTION_REQUEST_STATUS_FILTER_LABEL,
  getProductionRequestStatusDisplay,
  ProductionRequestStatus,
} from "@/types/production-request";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionRequestsListPage.module.css";

export default function ProductionRequestsListPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const canCreate =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    isAdministrator();

  const [requestNo, setRequestNo] = useState("");
  const [soNo, setSoNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [selectedById, setSelectedById] = useState<
    Record<string, ProductionRequest>
  >({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [productionDate, setProductionDate] = useState<Dayjs>(dayjs());
  const [batchNo, setBatchNo] = useState("");
  const [cycleTargetHours, setCycleTargetHours] = useState<number | null>(48);
  const [plannedLaborHours, setPlannedLaborHours] = useState<number | null>(
    null,
  );
  const [remark, setRemark] = useState("");
  const [inputRows, setInputRows] = useState<Row[]>([emptyRow()]);
  const [wasteRows, setWasteRows] = useState<PlanRow[]>([]);

  const queryParams = useMemo(
    () => ({
      requestNo: requestNo.trim() || undefined,
      soNo: soNo.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [requestNo, soNo, status, page],
  );

  const listQuery = useProductionRequestsQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;
  const consolidatedCreateMutation =
    useConsolidatedCreateProductionOrderMutation();

  const selectedRequests = useMemo(
    () => Object.values(selectedById),
    [selectedById],
  );
  const selectedRowKeys = useMemo(
    () => Object.keys(selectedById),
    [selectedById],
  );

  const outstandingSelections = useMemo(
    () => buildOutstandingSelections(selectedRequests),
    [selectedRequests],
  );
  const sharedShortage = useMemo(
    () => buildSharedWarehouseShortage(selectedRequests),
    [selectedRequests],
  );

  const canSubmitBulkCreate =
    outstandingSelections.length > 0 &&
    inputRows.length > 0 &&
    inputRows.every(
      (row) =>
        row.itemId &&
        row.unitId &&
        row.warehouseId &&
        row.locationId &&
        row.lotId &&
        row.plannedQty,
    ) &&
    wasteRows.every((row) => row.itemId && row.unitId && row.plannedQty);

  const columns: ColumnsType<ProductionRequest> = [
    {
      title: "เลขที่ใบขอผลิต",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (value: string, row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className={masterStyles.codeBadge}
            style={{ border: 0, cursor: "pointer" }}
            onClick={() =>
              router.push(`/production/production-requests/${row.id}`)
            }
          >
            {value}
          </button>
          {row.sourceSoCancelled ? (
            <Tooltip title="ใบสั่งขายที่อ้างอิงถูกยกเลิก — กรุณาตรวจสอบ">
              <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: "ใบสั่งขายอ้างอิง",
      dataIndex: "soNo",
      key: "soNo",
      render: (value?: string) => value || "-",
    },
    {
      title: "ลูกค้า",
      dataIndex: "customerName",
      key: "customerName",
      render: (value?: string) => value || "-",
    },
    {
      title: "วันที่ขอ",
      dataIndex: "requestDate",
      key: "requestDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "ต้องการภายใน",
      dataIndex: "requiredDate",
      key: "requiredDate",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "รายการ",
      key: "itemCount",
      align: "right",
      render: (_, row) => `${row.items.length} รายการ`,
    },
    {
      title: "ผลิตได้แล้ว",
      key: "progress",
      width: 160,
      render: (_, row) => (
        <Progress
          percent={row.producedPercent}
          size="small"
          status={
            row.status === "CANCELLED"
              ? "exception"
              : row.producedPercent >= 100
                ? "success"
                : "active"
          }
          format={(percent) => `${percent ?? 0}%`}
        />
      ),
    },
    {
      title: "ใบสั่งผลิต",
      key: "productionOrders",
      render: (_, row) =>
        row.productionOrders.length ? (
          <span
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
            }}
          >
            {row.productionOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                className={masterStyles.codeBadge}
                style={{ border: 0, cursor: "pointer" }}
                onClick={() =>
                  router.push(`/production/production-orders/${order.id}`)
                }
              >
                {order.orderNo} (
                {PRODUCTION_ORDER_STATUS_LABEL[order.status] ?? order.status})
              </button>
            ))}
          </span>
        ) : (
          "-"
        ),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (_, row) => {
        const display = getProductionRequestStatusDisplay(
          row.status,
          row.productionOrders,
        );
        return <Tag color={display.color}>{display.label}</Tag>;
      },
    },
  ];

  const resetCreatePanel = () => {
    setProductionDate(dayjs());
    setBatchNo("");
    setCycleTargetHours(48);
    setPlannedLaborHours(null);
    setRemark("");
    setInputRows([emptyRow()]);
    setWasteRows([]);
  };

  const handleClearSelection = () => {
    setSelectedById({});
  };

  const handleOpenCreateModal = () => {
    if (!selectedRequests.length) {
      message.warning("ยังไม่ได้เลือกใบขอผลิต");
      return;
    }
    if (!outstandingSelections.length) {
      message.warning("ใบที่เลือกไม่มีรายการคงค้างที่ต้องผลิต");
      return;
    }
    setCreateModalOpen(true);
  };

  const handleConsolidatedCreate = () => {
    if (!outstandingSelections.length) {
      return;
    }
    consolidatedCreateMutation.mutate(
      {
        productionDate: productionDate.format("YYYY-MM-DD"),
        batchNo: batchNo.trim() || undefined,
        cycleTargetHours: cycleTargetHours ?? undefined,
        plannedLaborHours: plannedLaborHours ?? undefined,
        remark: remark.trim() || undefined,
        inputItems: inputRows.map((row, index) => ({
          itemId: row.itemId as string,
          warehouseId: row.warehouseId as string,
          locationId: row.locationId as string,
          lotId: row.lotId as string,
          unitId: row.unitId as string,
          plannedQty: row.plannedQty as number,
          sortOrder: index,
        })),
        sharedPlanLines: wasteRows.map((row, index) => ({
          lineType: ProductionOrderPlanLineType.WASTE,
          itemId: row.itemId as string,
          unitId: row.unitId as string,
          plannedQty: row.plannedQty as number,
          sortOrder: index,
        })),
        selections: outstandingSelections,
      },
      {
        onSuccess: (response) => {
          setCreateModalOpen(false);
          handleClearSelection();
          resetCreatePanel();
          router.push(`/production/production-orders/${response.data.id}`);
        },
      },
    );
  };

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>PR</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · จากใบสั่งขาย</div>
            <h2 className={masterStyles.pageTitle}>ใบขอผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              เลือกหลายใบสถานะรอเปิดใบสั่งผลิต เพื่อสร้างใบสั่งผลิตใบเดียว
              ที่ผูกทุกรายการไว้ด้วยกัน
            </span>
          </div>
          {canCreate ? (
            <Button
              type="primary"
              className={masterStyles.createButton}
              icon={<PlusOutlined className={masterStyles.plusIcon} />}
              onClick={() =>
                router.push("/production/production-requests/create")
              }
            >
              สร้างใบขอผลิต
            </Button>
          ) : null}
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหา</div>
              <h3>รายการใบขอผลิต</h3>
              <p>ทั้งหมด {total} ใบ</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบขอผลิต"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ใบขอผลิต"
                value={requestNo}
                onChange={(e) => {
                  setRequestNo(e.target.value);
                  setPage(1);
                }}
              />
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบสั่งขาย"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ใบสั่งขาย"
                value={soNo}
                onChange={(e) => {
                  setSoNo(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                aria-label="กรองตามสถานะ"
                placeholder="สถานะทั้งหมด"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={Object.entries(PRODUCTION_REQUEST_STATUS_FILTER_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3>ใบขอผลิต</h3>
            </div>
            <div className={styles.queueActions}>
              {selectedRowKeys.length ? (
                <>
                  <Button onClick={handleClearSelection}>ล้างที่เลือก</Button>
                  {canCreate ? (
                    <Button type="primary" onClick={handleOpenCreateModal}>
                      สร้างใบสั่งผลิตจากที่เลือก ({selectedRowKeys.length})
                    </Button>
                  ) : null}
                </>
              ) : null}
              <span className={masterStyles.tableCount}>{total} ใบ</span>
            </div>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            rowSelection={
              canCreate
                ? {
                    selectedRowKeys,
                    preserveSelectedRowKeys: true,
                    onChange: (keys) => {
                      const keySet = new Set(keys.map(String));
                      setSelectedById((prev) => {
                        const next: Record<string, ProductionRequest> = {};
                        for (const id of keySet) {
                          const row =
                            rows.find((item) => item.id === id) ?? prev[id];
                          if (row && canOpenProductionOrder(row)) {
                            next[id] = row;
                          }
                        }
                        return next;
                      });
                    },
                    getCheckboxProps: (record) => ({
                      disabled: !canOpenProductionOrder(record),
                    }),
                  }
                : undefined
            }
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
          />
        </div>
      </section>

      <Modal
        title="สร้างใบสั่งผลิตจากใบขอผลิตที่เลือก"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleConsolidatedCreate}
        okText="สร้างใบสั่งผลิต 1 ใบ"
        width={1000}
        destroyOnHidden
        confirmLoading={consolidatedCreateMutation.isPending}
        okButtonProps={{ disabled: !canSubmitBulkCreate }}
      >
        <div className={styles.modalContent}>
          <div className={styles.modalGrid}>
            <div>
              <span className={styles.modalLabel}>วันที่ผลิต</span>
              <DatePicker
                value={productionDate}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                onChange={(value) => value && setProductionDate(value)}
              />
            </div>
            <div>
              <span className={styles.modalLabel}>Batch</span>
              <Input
                value={batchNo}
                placeholder="BATCH-..."
                onChange={(e) => setBatchNo(e.target.value)}
              />
            </div>
            <div>
              <span className={styles.modalLabel}>Cycle เป้าหมาย (ชั่วโมง)</span>
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                value={cycleTargetHours}
                onChange={setCycleTargetHours}
              />
            </div>
            <div>
              <span className={styles.modalLabel}>ชั่วโมงแรงงานที่วางแผน</span>
              <InputNumber
                min={0.01}
                style={{ width: "100%" }}
                value={plannedLaborHours}
                onChange={setPlannedLaborHours}
              />
            </div>
          </div>

          <div>
            <span className={styles.modalLabel}>หมายเหตุรวม</span>
            <Input.TextArea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionHead}>
              <h4>ใบขอผลิตที่จะผูกกับใบสั่งผลิต</h4>
            </div>
            {sharedShortage.summaries.length ? (
              <div className={styles.shortageSummary}>
                {sharedShortage.summaries.map((row) => (
                  <div key={row.itemId} className={styles.shortageSummaryCard}>
                    <strong>
                      {row.itemCode ?? row.itemId}
                      {row.itemNameTh ? ` — ${row.itemNameTh}` : ""}
                    </strong>
                    <span>
                      ต้องการรวม {formatQty(row.need)} {row.unitCode ?? ""} ·
                      พร้อมใช้ในคลัง {formatQty(row.warehouseAvailable)}{" "}
                      {row.unitCode ?? ""} · ขาดรวม{" "}
                      <b>{formatQty(row.shortage)}</b> {row.unitCode ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className={styles.queueList}>
              {selectedRequests.map((request, index) => {
                const lines = sharedShortage.linesByRequestId.get(request.id) ?? [];
                return (
                  <div key={request.id} className={styles.queueItem}>
                    <span className={styles.queueIndex}>{index + 1}</span>
                    <div className={styles.queueBody}>
                      <strong>
                        {request.requestNo} · {request.soNo ?? "-"}
                      </strong>
                      <span>
                        {request.customerName ?? "-"}
                        {lines.length
                          ? ` · ${lines
                              .map(
                                (line) =>
                                  `${line.itemCode ?? line.itemId} ต้องการ ${formatQty(line.need)} · ใช้จากคลัง ${formatQty(line.covered)} · ขาด ${formatQty(line.shortage)} ${line.unitCode ?? ""}`,
                              )
                              .join(" · ")}`
                          : " · ไม่มีรายการคงค้าง"}
                      </span>
                    </div>
                    <span className={styles.queueDate}>
                      {request.requiredDate
                        ? dayjs(request.requiredDate).format("DD/MM/YYYY")
                        : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionHead}>
              <h4>วัตถุดิบที่ใช้ร่วมกันทุกใบ</h4>
              <Button onClick={() => setInputRows((prev) => [...prev, emptyRow()])}>
                เพิ่มวัตถุดิบ
              </Button>
            </div>
            <div className={styles.sharedRows}>
              {inputRows.map((row, index) => (
                <MaterialRow
                  key={row.key}
                  row={row}
                  index={index}
                  removable={inputRows.length > 1}
                  onChange={(next) =>
                    setInputRows((prev) =>
                      prev.map((current) =>
                        current.key === row.key ? next : current,
                      ),
                    )
                  }
                  onRemove={() =>
                    setInputRows((prev) =>
                      prev.filter((current) => current.key !== row.key),
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionHead}>
              <h4>ของเสีย/แผนเสริม</h4>
              <Button
                onClick={() => setWasteRows((prev) => [...prev, emptyPlanRow()])}
              >
                เพิ่มของเสีย
              </Button>
            </div>
            <div className={styles.sharedRows}>
              {wasteRows.length ? (
                wasteRows.map((row, index) => (
                  <PlanLineRow
                    key={row.key}
                    row={row}
                    index={index}
                    removable={wasteRows.length > 1}
                    stockItemsOnly
                    onChange={(next) =>
                      setWasteRows((prev) =>
                        prev.map((current) =>
                          current.key === row.key ? next : current,
                        ),
                      )
                    }
                    onRemove={() =>
                      setWasteRows((prev) =>
                        prev.filter((current) => current.key !== row.key),
                      )
                    }
                  />
                ))
              ) : (
                <div className={styles.emptyState}>
                  ถ้าไม่มีของเสีย/แผนเสริม สามารถปล่อยว่างได้
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </MasterPageGate>
  );
}

function canOpenProductionOrder(request: ProductionRequest) {
  if (request.status !== ProductionRequestStatus.PENDING) {
    return false;
  }
  return !request.productionOrders.some(
    (order) => order.status !== "CANCELLED",
  );
}

function formatQty(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

type SharedShortageLine = {
  itemId: string;
  itemCode?: string;
  unitCode?: string;
  need: number;
  covered: number;
  shortage: number;
};

type SharedShortageSummary = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  need: number;
  warehouseAvailable: number;
  shortage: number;
};

function buildSharedWarehouseShortage(requests: ProductionRequest[]) {
  const poolByItemId = new Map<string, number>();
  const metaByItemId = new Map<
    string,
    {
      itemCode?: string;
      itemNameTh?: string;
      unitCode?: string;
      warehouseAvailable: number;
    }
  >();

  for (const request of requests) {
    for (const item of request.items) {
      if (metaByItemId.has(item.itemId)) {
        continue;
      }
      const warehouseAvailable = Number(item.warehouseAvailableQty ?? 0);
      poolByItemId.set(item.itemId, warehouseAvailable);
      metaByItemId.set(item.itemId, {
        itemCode: item.itemCode,
        itemNameTh: item.itemNameTh,
        unitCode: item.unitCode,
        warehouseAvailable,
      });
    }
  }

  const linesByRequestId = new Map<string, SharedShortageLine[]>();
  const needByItemId = new Map<string, number>();

  for (const request of requests) {
    const lines: SharedShortageLine[] = [];
    const items = [...request.items].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of items) {
      const need = Number(item.outstandingQty);
      if (!(need > 0)) {
        continue;
      }
      const pool = poolByItemId.get(item.itemId) ?? 0;
      const covered = Math.min(need, Math.max(pool, 0));
      poolByItemId.set(item.itemId, pool - covered);
      needByItemId.set(item.itemId, (needByItemId.get(item.itemId) ?? 0) + need);
      lines.push({
        itemId: item.itemId,
        itemCode: item.itemCode,
        unitCode: item.unitCode,
        need,
        covered,
        shortage: need - covered,
      });
    }
    linesByRequestId.set(request.id, lines);
  }

  const summaries: SharedShortageSummary[] = [...metaByItemId.entries()]
    .map(([itemId, meta]) => {
      const need = needByItemId.get(itemId) ?? 0;
      return {
        itemId,
        itemCode: meta.itemCode,
        itemNameTh: meta.itemNameTh,
        unitCode: meta.unitCode,
        need,
        warehouseAvailable: meta.warehouseAvailable,
        shortage: Math.max(need - meta.warehouseAvailable, 0),
      };
    })
    .filter((row) => row.need > 0);

  return { linesByRequestId, summaries };
}

function buildOutstandingSelections(requests: ProductionRequest[]) {
  let sortOrder = 0;
  return requests.flatMap((request) =>
    request.items
      .filter((item) => Number(item.outstandingQty) > 0)
      .map((item) => ({
        productionRequestId: request.id,
        productionRequestItemId: item.id,
        itemId: item.itemId,
        unitId: item.unitId,
        plannedQty: Number(item.outstandingQty),
        sortOrder: sortOrder++,
        remark: `สร้างจากใบขอผลิต ${request.requestNo} / ${request.soNo ?? "-"}`,
      })),
  );
}
