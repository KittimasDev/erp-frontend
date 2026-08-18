"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
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
  CheckCircleFilled,
  ClusterOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  TagsOutlined,
  ClockCircleOutlined,
  ProfileOutlined,
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
import {
  useProductionRequestPlanningSummaryQuery,
  useProductionRequestsQuery,
} from "@/hooks/production-requests/useProductionRequestQueries";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { ProductionOrderPlanLineType } from "@/types/production-order";
import type {
  ProductionRequest,
  ProductionRequestPlanningSummaryItem,
  ProductionRequestPlanningTag,
} from "@/types/production-request";
import { PRODUCTION_REQUEST_STATUS_LABEL } from "@/types/production-request";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionRequestsListPage.module.css";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "default",
  IN_PRODUCTION: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

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
  const [viewMode, setViewMode] = useState<"documents" | "planning">(
    "documents",
  );
  const [activeGroupKey, setActiveGroupKey] = useState<string>();
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [productionDate, setProductionDate] = useState<Dayjs>(dayjs());
  const [batchNo, setBatchNo] = useState("");
  const [cycleTargetHours, setCycleTargetHours] = useState<number | null>(48);
  const [plannedLaborHours, setPlannedLaborHours] = useState<number | null>(null);
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
  const planningSummaryQuery = useProductionRequestPlanningSummaryQuery(
    queryParams,
    { enabled: viewMode === "planning" },
  );
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;
  const planning = planningSummaryQuery.data?.data;
  const consolidatedCreateMutation = useConsolidatedCreateProductionOrderMutation();

  const summaryCards = [
    {
      key: "items",
      label: "สินค้าที่ต้องวางแผนผลิต",
      value: planning?.itemCount ?? 0,
      icon: <InboxOutlined />,
    },
    {
      key: "requests",
      label: "ใบขอผลิตที่ยังค้าง",
      value: planning?.requestCount ?? 0,
      icon: <ClusterOutlined />,
    },
    {
      key: "customers",
      label: "ลูกค้าที่ได้รับผลกระทบ",
      value: planning?.customerCount ?? 0,
      icon: <TagsOutlined />,
    },
  ];

  const planningItems = planning?.items ?? [];
  const selectedPlanningItem = useMemo(
    () =>
      planningItems.find(
        (item) => `${item.itemId}-${item.unitId}` === activeGroupKey,
      ),
    [activeGroupKey, planningItems],
  );

  const selectedPlanningTags = useMemo(() => {
    if (!selectedPlanningItem) {
      return [];
    }
    const selected = new Set(selectedTagKeys);
    return selectedPlanningItem.tags.filter((tag) =>
      selected.has(getPlanningTagKey(tag)),
    );
  }, [selectedPlanningItem, selectedTagKeys]);

  const sortedSelectedTags = useMemo(
    () => [...selectedPlanningTags].sort(comparePlanningTags),
    [selectedPlanningTags],
  );

  const canSubmitBulkCreate =
    sortedSelectedTags.length > 0 &&
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
        row.productionOrders.length
          ? row.productionOrders.map((order) => order.orderNo).join(", ")
          : "-",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={STATUS_COLOR[value] ?? "default"}>
          {PRODUCTION_REQUEST_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
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

  const handleToggleTag = (
    planningItem: ProductionRequestPlanningSummaryItem,
    tag: ProductionRequestPlanningTag,
  ) => {
    if (tag.isCompleted) {
      return;
    }
    const groupKey = `${planningItem.itemId}-${planningItem.unitId}`;
    const tagKey = getPlanningTagKey(tag);
    if (
      activeGroupKey &&
      activeGroupKey !== groupKey &&
      selectedTagKeys.length > 0
    ) {
      message.warning("รอบนี้เลือกได้ทีละกลุ่มสินค้า เพื่อใช้ output และวัตถุดิบร่วมกัน");
      return;
    }
    setActiveGroupKey(groupKey);
    setSelectedTagKeys((prev) =>
      prev.includes(tagKey)
        ? prev.filter((key) => key !== tagKey)
        : [...prev, tagKey],
    );
  };

  const handleSelectAllForItem = (planningItem: ProductionRequestPlanningSummaryItem) => {
    const groupKey = `${planningItem.itemId}-${planningItem.unitId}`;
    const selectable = planningItem.tags
      .filter((tag) => !tag.isCompleted)
      .map(getPlanningTagKey);
    setActiveGroupKey(groupKey);
    setSelectedTagKeys(selectable);
  };

  const handleClearSelection = () => {
    setActiveGroupKey(undefined);
    setSelectedTagKeys([]);
  };

  const handleOpenCreateModal = () => {
    if (!selectedPlanningItem || !sortedSelectedTags.length) {
      message.warning("ยังไม่ได้เลือกรายการที่จะเปิดใบสั่งผลิต");
      return;
    }
    setCreateModalOpen(true);
  };

  const handleConsolidatedCreate = () => {
    if (!selectedPlanningItem || !sortedSelectedTags.length) {
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
        selections: sortedSelectedTags.map((tag, index) => ({
          productionRequestId: tag.productionRequestId,
          productionRequestItemId: tag.productionRequestItemId as string,
          itemId: selectedPlanningItem.itemId,
          unitId: selectedPlanningItem.unitId,
          plannedQty: Number(tag.outstandingQty),
          sortOrder: index,
          remark: `สร้างจากมุมมองรวมเพื่อผลิต — ${tag.requestNo} / ${tag.soNo ?? "-"}`,
        })),
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

  const renderPlanningCard = (item: ProductionRequestPlanningSummaryItem) => (
    <div key={`${item.itemId}-${item.unitId}`} className={styles.planningCard}>
      <div className={styles.planningCardHead}>
        <div>
          <p className={styles.planningItemCode}>{item.itemCode ?? "-"}</p>
          <h4 className={styles.planningItemName}>{item.itemNameTh ?? "-"}</h4>
        </div>
        <div className={styles.cardHeadActions}>
          <Tag color="orange">
            ขาด {Number(item.totalOutstandingQty).toLocaleString("th-TH")}{" "}
            {item.unitCode ?? ""}
          </Tag>
          <Button size="small" onClick={() => handleSelectAllForItem(item)}>
            เลือกทั้งหมดที่ยังไม่ครบ
          </Button>
        </div>
      </div>

      <div className={styles.planningMetrics}>
        <div className={styles.metricCard}>
          <span>ขอผลิตรวม</span>
          <strong>
            {Number(item.totalRequestedQty).toLocaleString("th-TH")}{" "}
            {item.unitCode ?? ""}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span>ผลิตได้แล้ว</span>
          <strong>
            {Number(item.totalProducedQty).toLocaleString("th-TH")}{" "}
            {item.unitCode ?? ""}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span>อ้างอิง</span>
          <strong>{item.requestCount} ใบขอผลิต</strong>
        </div>
      </div>

      <div className={styles.tagList}>
        {item.tags.map((tag) => (
          <div
            key={`${tag.productionRequestId}-${tag.soNo}-${tag.outstandingQty}`}
            className={`${styles.tagCard} ${
              selectedTagKeys.includes(getPlanningTagKey(tag))
                ? styles.tagCardSelected
                : ""
            } ${tag.isCompleted ? styles.tagCardCompleted : ""}`}
          >
            <div className={styles.tagCardTop}>
              <div className={styles.tagTitleWrap}>
                <button
                  type="button"
                  className={styles.tagSelectBtn}
                  disabled={tag.isCompleted}
                  onClick={() => handleToggleTag(item, tag)}
                >
                  {tag.isCompleted ? (
                    <CheckCircleFilled className={styles.tagDoneIcon} />
                  ) : tag.hasActiveProductionOrder ? (
                    <ClockCircleOutlined className={styles.tagActiveIcon} />
                  ) : (
                    <ProfileOutlined />
                  )}{" "}
                  {tag.requestNo}
                </button>
                <span className={styles.tagRequestNo}>{tag.soNo ?? "-"}</span>
              </div>
              <Tag color={tag.isCompleted ? "success" : tag.hasActiveProductionOrder ? "processing" : "blue"}>
                {tag.isCompleted
                  ? "ครบแล้ว"
                  : tag.hasActiveProductionOrder
                    ? "กำลังผลิต"
                    : (PRODUCTION_REQUEST_STATUS_LABEL[
                        tag.productionRequestStatus as keyof typeof PRODUCTION_REQUEST_STATUS_LABEL
                      ] ?? tag.productionRequestStatus)}
              </Tag>
            </div>
            <div className={styles.tagMeta}>
              <span>{tag.customerName ?? "-"}</span>
              <span>
                ขาด {Number(tag.outstandingQty).toLocaleString("th-TH")}{" "}
                {item.unitCode ?? ""}
              </span>
              <span>
                ต้องการภายใน{" "}
                {tag.requiredDate
                  ? dayjs(tag.requiredDate).format("DD/MM/YYYY")
                  : "-"}
              </span>
              <span>
                เปิดคำขอ{" "}
                {tag.createdAt ? dayjs(tag.createdAt).format("DD/MM/YYYY HH:mm") : "-"}
              </span>
            </div>
            <div className={styles.tagCardActions}>
              <Button
                size="small"
                type={
                  selectedTagKeys.includes(getPlanningTagKey(tag))
                    ? "primary"
                    : "default"
                }
                disabled={tag.isCompleted}
                onClick={() => handleToggleTag(item, tag)}
              >
                {selectedTagKeys.includes(getPlanningTagKey(tag))
                  ? "เลือกแล้ว"
                  : "เลือกเข้าคิว"}
              </Button>
              <Button
                size="small"
                onClick={() =>
                  router.push(`/production/production-requests/${tag.productionRequestId}`)
                }
              >
                เปิดเอกสาร
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>PR</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · จากใบสั่งขาย</div>
            <h2 className={masterStyles.pageTitle}>ใบขอผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              อ้างอิงใบสั่งขายที่ยังไม่อนุมัติ 1 ใบขอผลิตต่อ 1 SO —
              ผลผลิตที่เสร็จรับเข้าสต๊อกกลาง ไม่ผูกกับ SO เดิม
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
                options={Object.entries(PRODUCTION_REQUEST_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
            <div className={styles.viewToggle}>
              <Button
                type={viewMode === "documents" ? "primary" : "default"}
                onClick={() => setViewMode("documents")}
              >
                มุมมองเอกสาร
              </Button>
              <Button
                type={viewMode === "planning" ? "primary" : "default"}
                onClick={() => setViewMode("planning")}
              >
                มุมมองรวมเพื่อผลิต
              </Button>
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3>
                {viewMode === "documents" ? "ใบขอผลิต" : "สรุปยอดคงค้างเพื่อผลิต"}
              </h3>
            </div>
            <span className={masterStyles.tableCount}>
              {viewMode === "documents"
                ? `${total} ใบ`
                : `${planning?.itemCount ?? 0} สินค้า`}
            </span>
          </div>
          {viewMode === "documents" ? (
            <Table
              className={masterStyles.dataTable}
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={listQuery.isFetching}
              pagination={{
                current: page,
                pageSize: 20,
                total,
                onChange: setPage,
                showTotal: (t) => `ทั้งหมด ${t} รายการ`,
              }}
            />
          ) : (
            <div className={styles.planningWrap}>
              <Alert
                type="info"
                showIcon
                title="เลือกได้ทีละกลุ่มสินค้า"
                description="ระบบจะสร้างหลายใบสั่งผลิตแยกตาม PR/SO เดิม แต่ใช้ batch เดียวกันได้ และเรียงคิวจาก required date เร็วสุดก่อน"
              />
              <div className={styles.summaryGrid}>
                {summaryCards.map((card) => (
                  <div key={card.key} className={styles.summaryCard}>
                    <span className={styles.summaryIcon}>{card.icon}</span>
                    <div>
                      <p className={styles.summaryLabel}>{card.label}</p>
                      <strong>{card.value.toLocaleString("th-TH")}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPlanningItem ? (
                <div className={styles.queuePanel}>
                  <div className={styles.queueHead}>
                    <div>
                      <p className={styles.queueEyebrow}>Queue Preview</p>
                      <h4 className={styles.queueTitle}>
                        {selectedPlanningItem.itemCode ?? "-"} —{" "}
                        {selectedPlanningItem.itemNameTh ?? "-"}
                      </h4>
                      <p className={styles.queueHint}>
                        เรียงตามวันที่ต้องการก่อน แล้วค่อยวันที่สร้างใบขอผลิต
                      </p>
                    </div>
                    <div className={styles.queueActions}>
                      <Button onClick={handleClearSelection}>ล้างที่เลือก</Button>
                      <Button
                        type="primary"
                        disabled={!sortedSelectedTags.length}
                        onClick={handleOpenCreateModal}
                      >
                        สร้างใบสั่งผลิตรวมจากที่เลือก ({sortedSelectedTags.length})
                      </Button>
                    </div>
                  </div>
                  {sortedSelectedTags.length ? (
                    <div className={styles.queueList}>
                      {sortedSelectedTags.map((tag, index) => (
                        <div
                          key={getPlanningTagKey(tag)}
                          className={styles.queueItem}
                        >
                          <span className={styles.queueIndex}>{index + 1}</span>
                          <div className={styles.queueBody}>
                            <strong>
                              {tag.requestNo} · {tag.soNo ?? "-"}
                            </strong>
                            <span>
                              {tag.customerName ?? "-"} · ขาด{" "}
                              {Number(tag.outstandingQty).toLocaleString("th-TH")}{" "}
                              {selectedPlanningItem.unitCode ?? ""}
                            </span>
                          </div>
                          <span className={styles.queueDate}>
                            {tag.requiredDate
                              ? dayjs(tag.requiredDate).format("DD/MM/YYYY")
                              : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      เลือก PR/SO จาก card ด้านล่างเพื่อเข้าคิวสร้างใบสั่งผลิต
                    </div>
                  )}
                </div>
              ) : null}

              {planningSummaryQuery.isFetching ? (
                <div className={styles.emptyState}>กำลังโหลดสรุปเพื่อวางแผนผลิต...</div>
              ) : planning?.items.length ? (
                <div className={styles.planningGrid}>
                  {planning.items.map(renderPlanningCard)}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  ไม่พบรายการที่ยังผลิตขาดตามเงื่อนไขค้นหาปัจจุบัน
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Modal
        title="สร้างใบสั่งผลิตรวมจากมุมมองรวมเพื่อผลิต"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleConsolidatedCreate}
        okText="สร้างใบสั่งผลิตรวม 1 ใบ"
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
              <span className={styles.modalLabel}>Batch เดียวกัน</span>
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
              <h4>คิวที่จะเปิดใบสั่งผลิต</h4>
            </div>
            <div className={styles.queueList}>
              {sortedSelectedTags.map((tag, index) => (
                <div key={getPlanningTagKey(tag)} className={styles.queueItem}>
                  <span className={styles.queueIndex}>{index + 1}</span>
                  <div className={styles.queueBody}>
                    <strong>
                      {tag.requestNo} · {tag.soNo ?? "-"}
                    </strong>
                    <span>
                      ขาด {Number(tag.outstandingQty).toLocaleString("th-TH")}{" "}
                      {selectedPlanningItem?.unitCode ?? ""}
                    </span>
                  </div>
                  <span className={styles.queueDate}>
                    {tag.requiredDate
                      ? dayjs(tag.requiredDate).format("DD/MM/YYYY")
                      : "-"}
                  </span>
                </div>
              ))}
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
                      prev.map((current) => (current.key === row.key ? next : current)),
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
              <h4>ของเสีย/แผนเสริมที่ copy ให้ทุกใบ</h4>
              <Button onClick={() => setWasteRows((prev) => [...prev, emptyPlanRow()])}>
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
                        prev.map((current) => (current.key === row.key ? next : current)),
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

function getPlanningTagKey(tag: ProductionRequestPlanningTag) {
  return tag.productionRequestItemId ?? tag.productionRequestId;
}

function comparePlanningTags(
  a: ProductionRequestPlanningTag,
  b: ProductionRequestPlanningTag,
) {
  const requiredCompare = (a.requiredDate ?? "").localeCompare(
    b.requiredDate ?? "",
  );
  if (requiredCompare !== 0) {
    return requiredCompare;
  }
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}
