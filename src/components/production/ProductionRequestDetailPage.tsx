"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Input,
  Modal,
  Progress,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCancelProductionRequestMutation } from "@/hooks/production-requests/useProductionRequestMutations";
import { useProductionRequestQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  getProductionRequestStatusDisplay,
  ProductionRequestStatus,
} from "@/types/production-request";
import type {
  ProductionRequestItem,
  ProductionRequestProductionOrderRef,
} from "@/types/production-request";
import { PRODUCTION_ORDER_STATUS_LABEL } from "@/types/production-order";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOrderDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = {
  requestId: string;
};

function fmt(value?: string) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function ProductionRequestDetailPage({ requestId }: Props) {
  const router = useRouter();
  /** แก้ไข/ยกเลิกใบขอผลิต = งานของหน้านี้ (backend ใช้ PRODUCTION_REQUESTS.EDIT ทั้งคู่) */
  const canManage = useScreenActionPermissions("PRODUCTION_REQUESTS").canEdit;
  /** เปิดใบสั่งผลิตเป็นงานของหน้า PRODUCTION_ORDERS — ปุ่มนี้พาไปกดต่อที่หน้านั้น */
  const canOpenProductionOrder =
    useScreenActionPermissions("PRODUCTION_ORDERS").canAdd;

  const detailQuery = useProductionRequestQuery(requestId);
  const request = detailQuery.data?.data;
  const statusDisplay = request
    ? getProductionRequestStatusDisplay(
        request.status,
        request.productionOrders,
      )
    : null;
  const cancelMutation = useCancelProductionRequestMutation();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const itemColumns: ColumnsType<ProductionRequestItem> = [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.itemCode ?? "-"}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{row.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: "จำนวนที่ขอผลิต",
      dataIndex: "requestedQty",
      key: "requestedQty",
      align: "right",
      render: (value: string, row) => `${fmt(value)} ${row.unitCode ?? ""}`,
    },
    {
      title: "ผลิตได้จริง",
      dataIndex: "producedQty",
      key: "producedQty",
      align: "right",
      render: (value: string, row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <strong>{fmt(value)}</strong>
          {row.hasUnitMismatch ? (
            <Tooltip title="รับผลผลิตเข้าคลังด้วยหน่วยที่ต่างจากหน่วยที่ขอผลิต ระบบไม่แปลงหน่วยให้ — ตัวเลขนี้เชื่อไม่ได้ ต้องตรวจสอบเอง">
              <WarningOutlined style={{ color: "#faad14" }} />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: "ยังขาดอีก",
      dataIndex: "outstandingQty",
      key: "outstandingQty",
      align: "right",
      render: (value: string) =>
        Number(value) > 0 ? (
          <Tag color="orange">{fmt(value)}</Tag>
        ) : (
          <Tag color="green">ครบแล้ว</Tag>
        ),
    },
    {
      title: "จำนวนตาม SO",
      dataIndex: "salesOrderQty",
      key: "salesOrderQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
    {
      title: "ส่งแล้ว",
      dataIndex: "deliveredQty",
      key: "deliveredQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
    {
      title: "ขอผลิตรวมทุกใบ",
      dataIndex: "alreadyRequestedQty",
      key: "alreadyRequestedQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
    {
      title: "คงค้างขอได้อีก",
      dataIndex: "remainingQty",
      key: "remainingQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
  ];

  const orderColumns: ColumnsType<ProductionRequestProductionOrderRef> = [
    {
      title: "เลขที่ใบสั่งผลิต",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (value: string, row) => (
        <button
          type="button"
          className={masterStyles.codeBadge}
          style={{ border: 0, cursor: "pointer" }}
          onClick={() => router.push(`/production/production-orders/${row.id}`)}
        >
          {value}
        </button>
      ),
    },
    {
      title: "วันที่ผลิต",
      dataIndex: "productionDate",
      key: "productionDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag>{PRODUCTION_ORDER_STATUS_LABEL[value] ?? value}</Tag>
      ),
    },
  ];

  const canCancel =
    canManage &&
    request &&
    request.status !== ProductionRequestStatus.CANCELLED &&
    request.status !== ProductionRequestStatus.COMPLETED;

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="PRODUCTION · ใบขอผลิต"
          title={request?.requestNo ?? "-"}
          subtitle={<>อ้างอิงใบสั่งขาย {request?.soNo ?? "-"} ·{" "}
              {request?.customerName ?? "-"}</>}
          back={
            <>
<button
              type="button"
              style={{
                border: 0,
                background: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => router.push("/production/production-requests")}
            >
              <ArrowLeftOutlined /> กลับรายการ
            </button>
            </>
          }
          actions={
            <>
{statusDisplay ? (
            <Tag color={statusDisplay.color}>{statusDisplay.label}</Tag>
          ) : null}
            </>
          }
        />

        {request?.sourceSoCancelled ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            title={`ใบสั่งขาย ${request.soNo ?? ""} ถูกยกเลิกแล้ว`}
            description="ระบบไม่ยกเลิกใบขอผลิตหรือใบสั่งผลิตให้อัตโนมัติ — ฝ่ายผลิตพิจารณาตามสถานะงาน ผลผลิตที่เสร็จแล้วจะรับเข้าสต๊อกกลางและจ่ายให้คำสั่งขายอื่นได้"
          />
        ) : null}

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>ข้อมูลใบขอผลิต</h3>
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>วันที่ขอ</span>
              <span className={styles.infoValue}>
                {request ? dayjs(request.requestDate).format("DD/MM/YYYY") : "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ต้องการภายใน</span>
              <span className={styles.infoValue}>
                {request?.requiredDate
                  ? dayjs(request.requiredDate).format("DD/MM/YYYY")
                  : "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>สถานะ SO ที่อ้างอิง</span>
              <span className={styles.infoValue}>
                {request?.salesOrderStatus ?? "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ผู้ขอ</span>
              <span className={styles.infoValue}>
                {request?.requestedBy?.displayName ?? "-"}
              </span>
            </div>
            {request?.status === ProductionRequestStatus.CANCELLED ? (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>เหตุผลที่ยกเลิก</span>
                <span className={styles.infoValue}>
                  {request.cancelReason || "-"}
                </span>
              </div>
            ) : null}
          </div>
          {request?.remark ? (
            <Typography.Paragraph style={{ marginTop: 12 }}>
              หมายเหตุ: {request.remark}
            </Typography.Paragraph>
          ) : null}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>รายการที่ขอผลิต</h3>
          </div>
          {request ? (
            <div style={{ marginBottom: 16 }}>
              <Progress
                percent={request.producedPercent}
                status={
                  request.status === ProductionRequestStatus.CANCELLED
                    ? "exception"
                    : request.producedPercent >= 100
                      ? "success"
                      : "active"
                }
                format={(percent) => `${percent ?? 0}%`}
              />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                ผลิตได้ {fmt(request.totalProducedQty)} จากที่ขอ{" "}
                {fmt(request.totalRequestedQty)} — นับจากคำขอรับผลผลิตเข้าคลัง
                ที่อนุมัติแล้วของใบสั่งผลิตที่ผูกกับใบขอผลิตนี้
              </span>
            </div>
          ) : null}
          <Table
            rowKey="id"
            columns={itemColumns}
            dataSource={request?.items ?? []}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>ใบสั่งผลิตที่เปิดจากใบขอผลิตนี้</h3>
          </div>
          <Table
            rowKey="id"
            columns={orderColumns}
            dataSource={request?.productionOrders ?? []}
            pagination={false}
            locale={{ emptyText: "ยังไม่มีใบสั่งผลิต" }}
          />
        </div>

        <div className={styles.actionBar}>
          {canManage &&
          request &&
          request.status === ProductionRequestStatus.PENDING &&
          request.productionOrders.length === 0 ? (
            <Button
              icon={<EditOutlined />}
              onClick={() =>
                router.push(
                  `/production/production-requests/${request.id}/edit`,
                )
              }
            >
              แก้ไขใบขอผลิต
            </Button>
          ) : null}
          {canOpenProductionOrder &&
          request &&
          request.status !== ProductionRequestStatus.CANCELLED &&
          request.status !== ProductionRequestStatus.COMPLETED ? (
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={() =>
                router.push(
                  `/production/production-orders/create?productionRequestId=${request.id}`,
                )
              }
            >
              เปิดใบสั่งผลิตจากใบขอผลิตนี้
            </Button>
          ) : null}
          {canCancel ? (
            <Button danger onClick={() => setCancelOpen(true)}>
              ยกเลิกใบขอผลิต
            </Button>
          ) : null}
        </div>

        <Modal
          title="ยกเลิกใบขอผลิต"
          open={cancelOpen}
          okText="ยืนยันยกเลิก"
          cancelText="ปิด"
          okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
          onCancel={() => setCancelOpen(false)}
          onOk={() =>
            cancelMutation.mutate(
              {
                id: requestId,
                body: { cancelReason: cancelReason.trim() || undefined },
              },
              {
                onSuccess: () => {
                  setCancelOpen(false);
                  setCancelReason("");
                },
              },
            )
          }
        >
          <Input.TextArea
            rows={3}
            aria-label="เหตุผลที่ยกเลิก"
            placeholder="เหตุผลที่ยกเลิก (ไม่บังคับ)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </Modal>
      </section>
    </MasterPageGate>
  );
}
