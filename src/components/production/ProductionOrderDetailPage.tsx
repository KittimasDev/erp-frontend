"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
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
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  PRODUCTION_ORDER_STATUS_LABEL,
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
  const canOperate =
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    isAdministrator();
  const canRequestOutput =
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    isAdministrator();

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

  const [completeOpen, setCompleteOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [downtimeOpen, setDowntimeOpen] = useState(false);
  const [downtimeReason, setDowntimeReason] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm] = Form.useForm();

  const readyOrdersQuery = useProductionOutputReadyOrdersQuery(
    { all: true },
    { enabled: requestOpen },
  );
  const blockedItemIds = useMemo(
    () =>
      readyOrdersQuery.data?.data.find((row) => row.id === orderId)
        ?.blockedItemIds ?? [],
    [readyOrdersQuery.data, orderId],
  );

  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const unitsQuery = useUnitsQuery();
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

  const handleSubmitOutputRequest = async () => {
    const values = await requestForm.validateFields();
    const body: CreateProductionOutputStockRequestFromOrderBody = {
      itemId: values.itemId,
      unitId: values.unitId,
      quantity: String(values.quantity),
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
          void relatedRequestsQuery.refetch();
        },
      },
    );
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
              {order ? PRODUCTION_ORDER_STATUS_LABEL[order.status] ?? order.status : ""}
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
                  onClick={() => setCompleteOpen(true)}
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
                  onClick={() => setRequestOpen(true)}
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
                  <h3>สรุป Yield / Mass Balance</h3>
                </div>
                <div className={styles.yieldGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>วัตถุดิบเข้าจริง</span>
                    <span className={styles.infoValue}>{fmt(summary.totalInputQty)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ผลผลิตเข้าคลังแล้ว</span>
                    <span className={styles.infoValue}>{fmt(summary.totalOutputQty)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Yield %</span>
                    <span className={styles.infoValue}>{summary.yieldPercent}%</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Downtime รวม</span>
                    <span className={styles.infoValue}>
                      {summary.totalDowntimeHours} ชม.
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>รายการวัตถุดิบ</h3>
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
          }}
          okText="ยืนยัน"
          okButtonProps={{
            disabled: signatureName.trim().toLowerCase() !== "done",
          }}
          confirmLoading={completeMutation.isPending}
          onOk={() =>
            completeMutation.mutate(
              { id: orderId, body: { signature: { typedName: signatureName.trim() } } },
              {
                onSuccess: () => {
                  setCompleteOpen(false);
                  setSignatureName("");
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
          width={640}
        >
          <Typography.Paragraph type="secondary">
            อ้างอิงใบสั่งผลิต {order?.orderNo} — ยังไม่ POST สต๊อก รอ WAREHOUSE_MANAGER
            อนุมัติ
          </Typography.Paragraph>
          <Form form={requestForm} layout="vertical">
            <Form.Item
              name="itemId"
              label="สินค้าที่ได้ (ผลผลิต)"
              rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
            >
              <Select
                showSearch
                placeholder="เลือกสินค้า"
                optionFilterProp="label"
                loading={itemsQuery.isLoading}
                options={(itemsQuery.data?.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.itemCode} — ${item.itemNameTh}`,
                  disabled: blockedItemIds.includes(item.id),
                  unitId: item.unitId,
                }))}
                onChange={(value, option) => {
                  const opt = option as { unitId?: string } | undefined;
                  if (opt?.unitId) {
                    requestForm.setFieldValue("unitId", opt.unitId);
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="unitId"
              label="หน่วยนับ"
              rules={[{ required: true, message: "กรุณาเลือกหน่วยนับ" }]}
            >
              <Select
                showSearch
                placeholder="เลือกหน่วยนับ"
                optionFilterProp="label"
                loading={unitsQuery.isLoading}
                options={(unitsQuery.data?.data ?? []).map((u) => ({
                  value: u.id,
                  label: `${u.code} — ${u.nameTh}`,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="จำนวน"
              rules={[{ required: true, message: "กรุณากรอกจำนวน" }]}
            >
              <InputNumber min={0.001} style={{ width: "100%" }} />
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
      </section>
    </MasterPageGate>
  );
}
