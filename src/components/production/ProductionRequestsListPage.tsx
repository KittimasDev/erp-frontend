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

import FilterCard, { FilterField } from "@/components/common/FilterCard";
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
import { useUnitOptionContext } from "@/hooks/unit-conversions/useUnitOptionContext";
import { useProductionRequestsQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  PRODUCTION_ORDER_STATUS_LABEL,
  ProductionOrderPlanLineType,
} from "@/types/production-order";
import type { ProductionRequest } from "@/types/production-request";
import {
  PRODUCTION_REQUEST_STATUS_FILTER_LABEL,
  getProductionRequestStatusDisplay,
  ProductionRequestStatus,
  tProductionStatus,
} from "@/types/production-request";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionRequestsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

export default function ProductionRequestsListPage() {
  const router = useRouter();
  const t = useT();
  const { message } = App.useApp();
  const productionRequestActions =
    useScreenActionPermissions("PRODUCTION_REQUESTS");
  const canViewAll = productionRequestActions.canViewAll;
  /** สิทธิ์ของหน้านี้ล้วน ๆ — ใครติ๊ก PRODUCTION_REQUESTS.ADD ใน Permission Matrix ก็เปิดใบขอผลิตได้ */
  const canCreate = productionRequestActions.canAdd;
  /**
   * การเปิด "ใบสั่งผลิต" เป็นงานของหน้า PRODUCTION_ORDERS ไม่ใช่ของหน้านี้
   * จึงตัดสินด้วยสิทธิ์ของหน้าปลายทาง แล้วพาไปกดยืนยันที่หน้านั้น
   */
  const canCreateProductionOrder =
    useScreenActionPermissions("PRODUCTION_ORDERS").canAdd;

  const [draftRequestNo, setDraftRequestNo] = useState("");
  const [draftSoNo, setDraftSoNo] = useState("");
  const [draftStatus, setDraftStatus] = useState<string | undefined>();
  const [requestNo, setRequestNo] = useState("");
  const [soNo, setSoNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const applyFilters = () => {
    setRequestNo(draftRequestNo);
    setSoNo(draftSoNo);
    setStatus(draftStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftRequestNo("");
    setDraftSoNo("");
    setDraftStatus(undefined);
    setRequestNo("");
    setSoNo("");
    setStatus(undefined);
    setPage(1);
  };
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
  // สร้างครั้งเดียวที่ระดับหน้า ไม่ใช่ในโมดัล เพื่อให้ identity นิ่ง
  const unitCtx = useUnitOptionContext();

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
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("เลขที่ใบขอผลิต"),
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
            <Tooltip title={t("ใบสั่งขายที่อ้างอิงถูกยกเลิก — กรุณาตรวจสอบ")}>
              <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: t("ใบสั่งขายอ้างอิง"),
      dataIndex: "soNo",
      key: "soNo",
      render: (value: string | undefined, row) =>
        value ? (
          <button
            type="button"
            className={masterStyles.codeBadge}
            style={{ border: 0, cursor: "pointer" }}
            onClick={() => router.push(`/sales-orders/${row.salesOrderId}`)}
          >
            {value}
          </button>
        ) : (
          "-"
        ),
    },
    {
      title: t("ลูกค้า"),
      dataIndex: "customerName",
      key: "customerName",
      render: (value?: string) => value || "-",
    },
    {
      title: t("วันที่ขอ"),
      dataIndex: "requestDate",
      key: "requestDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: t("ต้องการภายใน"),
      dataIndex: "requiredDate",
      key: "requiredDate",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: t("รายการ"),
      key: "itemCount",
      align: "right",
      render: (_, row) => t("{n} รายการ", { n: row.items.length }),
    },
    {
      title: t("ค้างส่ง SO"),
      key: "outstanding",
      align: "right",
      width: 120,
      render: (_, row) => {
        const outstanding = (row.items ?? []).reduce(
          (sum, item) => sum + (Number(item.outstandingQty) || 0),
          0,
        );
        if (!(outstanding > 0.0005) || row.status === "CANCELLED") {
          return "—";
        }
        return (
          <Tooltip title={t("ยอดที่ผูกไว้ให้ใบสั่งขายนี้แล้วแต่ยังผลิตไม่เสร็จ — ผลิตเสร็จเมื่อไหร่ระบบจองกลับให้ SO อัตโนมัติ ใบอื่นแย่งไม่ได้")}>
            <span style={{ color: "#0958d9" }}>
              {outstanding.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", {
                maximumFractionDigits: 3,
              })}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t("ผลิตได้แล้ว"),
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
      title: t("ใบสั่งผลิต"),
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
                {tProductionStatus(PRODUCTION_ORDER_STATUS_LABEL[order.status] ?? order.status)})
              </button>
            ))}
          </span>
        ) : (
          "-"
        ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      render: (_, row) => {
        const display = getProductionRequestStatusDisplay(
          row.status,
          row.productionOrders,
        );
        return <Tag color={display.color}>{tProductionStatus(display.label)}</Tag>;
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
      message.warning(t("ยังไม่ได้เลือกใบขอผลิต"));
      return;
    }
    if (!outstandingSelections.length) {
      message.warning(t("ใบที่เลือกไม่มีรายการคงค้างที่ต้องผลิต"));
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
        <PageHeader
          eyebrow={t("PRODUCTION · จากใบสั่งขาย")}
          title={t("ใบขอผลิต")}
          subtitle={<>{t("เลือกหลายใบสถานะรอเปิดใบสั่งผลิต เพื่อสร้างใบสั่งผลิตใบเดียว ที่ผูกทุกรายการไว้ด้วยกัน")}
              {canViewAll ? "" : ` · ${t("แสดงเฉพาะใบที่คุณเป็นผู้ขอ")}`}</>}
          actions={
            <>
{canCreate ? (
            <Button
              type="primary"
              className={masterStyles.createButton}
              icon={<PlusOutlined className={masterStyles.plusIcon} />}
              onClick={() =>
                router.push("/production/production-requests/create")
              }
            >
              {t("สร้างใบขอผลิต")}
            </Button>
          ) : null}
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
          <FilterField label={t("เลขที่ใบขอผลิต")}>
            <Input
              allowClear
              aria-label={t("ค้นหาเลขที่ใบขอผลิต")}
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหาเลขที่ใบขอผลิต")}
              value={draftRequestNo}
              onChange={(e) => setDraftRequestNo(e.target.value)}
            />
          </FilterField>
          <FilterField label={t("ใบสั่งขายอ้างอิง")}>
            <Input
              allowClear
              aria-label={t("ค้นหาเลขที่ใบสั่งขาย")}
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหาเลขที่ใบสั่งขาย")}
              value={draftSoNo}
              onChange={(e) => setDraftSoNo(e.target.value)}
            />
          </FilterField>
          <FilterField label={t("สถานะ")}>
            <Select
              allowClear
              style={{ width: "100%" }}
              aria-label={t("กรองตามสถานะ")}
              placeholder={t("สถานะทั้งหมด")}
              value={draftStatus}
              onChange={setDraftStatus}
              options={Object.entries(PRODUCTION_REQUEST_STATUS_FILTER_LABEL).map(
                ([value, label]) => ({ value, label: tProductionStatus(label) }),
              )}
            />
          </FilterField>
        </FilterCard>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t("ใบขอผลิต")}</h3>
            </div>
            <div className={styles.queueActions}>
              {selectedRowKeys.length ? (
                <>
                  <Button onClick={handleClearSelection}>{t("ล้างที่เลือก")}</Button>
                  {canCreateProductionOrder ? (
                    <Button type="primary" onClick={handleOpenCreateModal}>
                      {t("สร้างใบสั่งผลิตจากที่เลือก")} ({selectedRowKeys.length})
                    </Button>
                  ) : null}
                </>
              ) : null}
              <span className={masterStyles.tableCount}>{t("{n} ใบ", { n: total })}</span>
            </div>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            rowSelection={
              /* ติ๊กเลือกไว้เพื่อเปิดใบสั่งผลิต — ไม่มีสิทธิ์หน้านั้นก็ไม่ต้องมีช่องติ๊ก */
              canCreateProductionOrder
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
              showTotal: (n) => t("ทั้งหมด {n} รายการ", { n }),
            }}
          />
        </div>
      </section>

      <Modal
        title={t("สร้างใบสั่งผลิตจากใบขอผลิตที่เลือก")}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleConsolidatedCreate}
        okText={t("สร้างใบสั่งผลิต 1 ใบ")}
        width={1000}
        destroyOnHidden
        confirmLoading={consolidatedCreateMutation.isPending}
        okButtonProps={{ disabled: !canSubmitBulkCreate }}
      >
        <div className={styles.modalContent}>
          <div className={styles.modalGrid}>
            <div>
              <span className={styles.modalLabel}>{t("วันที่ผลิต")}</span>
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
              <span className={styles.modalLabel}>{t("Cycle เป้าหมาย (ชั่วโมง)")}</span>
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                value={cycleTargetHours}
                onChange={setCycleTargetHours}
              />
            </div>
            <div>
              <span className={styles.modalLabel}>{t("ชั่วโมงแรงงานที่วางแผน")}</span>
              <InputNumber
                min={0.01}
                style={{ width: "100%" }}
                value={plannedLaborHours}
                onChange={setPlannedLaborHours}
              />
            </div>
          </div>

          <div>
            <span className={styles.modalLabel}>{t("หมายเหตุรวม")}</span>
            <Input.TextArea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionHead}>
              <h4>{t("ใบขอผลิตที่จะผูกกับใบสั่งผลิต")}</h4>
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
                      {t("ต้องการรวม")} {formatQty(row.need)} {row.unitCode ?? ""} ·{" "}
                      {t("พร้อมใช้ในคลัง")} {formatQty(row.warehouseAvailable)}{" "}
                      {row.unitCode ?? ""} · {t("ขาดรวม")}{" "}
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
                                  t("{item} ต้องการ {need} · ใช้จากคลัง {covered} · ขาด {shortage} {unit}", {
                                    item: line.itemCode ?? line.itemId,
                                    need: formatQty(line.need),
                                    covered: formatQty(line.covered),
                                    shortage: formatQty(line.shortage),
                                    unit: line.unitCode ?? "",
                                  }),
                              )
                              .join(" · ")}`
                          : ` · ${t("ไม่มีรายการคงค้าง")}`}
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
              <h4>{t("วัตถุดิบที่ใช้ร่วมกันทุกใบ")}</h4>
              <Button onClick={() => setInputRows((prev) => [...prev, emptyRow()])}>
                {t("เพิ่มวัตถุดิบ")}
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
              <h4>{t("ของเสีย/แผนเสริม")}</h4>
              <Button
                onClick={() => setWasteRows((prev) => [...prev, emptyPlanRow()])}
              >
                {t("เพิ่มของเสีย")}
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
                    unitCtx={unitCtx}
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
                  {t("ถ้าไม่มีของเสีย/แผนเสริม สามารถปล่อยว่างได้")}
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
  return value.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", { maximumFractionDigits: 3 });
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
