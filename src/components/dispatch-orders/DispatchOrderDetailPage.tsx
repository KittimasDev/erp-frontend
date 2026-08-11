"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Form, Input, Modal, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import DocumentAuditTrail from "@/components/common/DocumentAuditTrail";
import {
  useCancelDispatchOrderMutation,
  useConfirmPickingDispatchOrderMutation,
  useDispatchDispatchOrderMutation,
  usePackDispatchOrderMutation,
} from "@/hooks/dispatch-orders/useDispatchOrderMutations";
import { useDispatchOrderQuery } from "@/hooks/dispatch-orders/useDispatchOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  DISPATCH_ORDER_STATUS_LABEL,
  type DeliverDispatchOrderBody,
  type DispatchOrderStatus,
} from "@/types/dispatch-orders";
import styles from "./DispatchOrderDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function statusClass(status: string) {
  switch (status) {
    case "DISPATCHED":
      return styles.statusApproved;
    case "PACKED":
    case "PICKED":
      return styles.statusPending;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function DispatchOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useDispatchOrderQuery(id);
  const confirmPickingMutation = useConfirmPickingDispatchOrderMutation();
  const packMutation = usePackDispatchOrderMutation();
  const cancelMutation = useCancelDispatchOrderMutation();
  const dispatchMutation = useDispatchDispatchOrderMutation();
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [form] = Form.useForm<DeliverDispatchOrderBody>();

  const data = query.data?.data;
  const dispatchActions = useScreenActionPermissions("DISPATCH_ORDERS");
  const canWrite = dispatchActions.canEdit;
  const canApprove = dispatchActions.canApprove;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบจ่ายสินค้า
        <div style={{ marginTop: 12 }}>
          <Link href="/dispatch-orders">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy =
    confirmPickingMutation.isPending ||
    packMutation.isPending ||
    cancelMutation.isPending ||
    dispatchMutation.isPending;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <CarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Dispatch Order</p>
          <h1 className={styles.pageTitle}>{data.dispatchNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.salesOrderNo ? `ใบสั่งขาย ${data.salesOrderNo}` : "—"} ·{" "}
            {formatDate(data.dispatchDate)} · คลัง {data.warehouseCode ?? "—"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/dispatch-orders")}
          >
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบจ่ายสินค้า</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบสั่งขายอ้างอิง</span>
                <div className={styles.metaValue}>
                  {data.salesOrderNo ? (
                    <Link href={`/sales-orders/${data.salesOrderId}`}>
                      {data.salesOrderNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ใบส่งของ</span>
                <div className={styles.metaValue}>{data.deliveryNo ?? "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้รับสินค้า</span>
                <div className={styles.metaValue}>
                  {data.recipientName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่ยืนยันหยิบสินค้า</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.pickedAt)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่แพ็คเสร็จ</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.packedAt)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่จ่ายออก</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.dispatchedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            </div>
            <div className={styles.itemList}>
              {data.items.map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>
                      {item.itemCode
                        ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
                        : (item.itemNameTh ?? "—")}
                    </p>
                    <p className={styles.itemCode}>
                      {Number(item.quantity).toLocaleString("th-TH")}{" "}
                      {item.unitCode ?? ""} · Lot {item.lotNo ?? "—"} · ตำแหน่ง{" "}
                      {item.locationCode ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}

          <div className={styles.section}>
            <DocumentAuditTrail documentId={data.id} />
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.dispatchNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {DISPATCH_ORDER_STATUS_LABEL[data.status as DispatchOrderStatus] ??
              data.status}
          </div>

          <div className={styles.actionStack}>
            {data.status === "PICKING" ? (
              <>
                {canWrite ? (
                  <Button
                    className={styles.primaryBtn}
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={busy}
                    onClick={() => confirmPickingMutation.mutate(data.id)}
                  >
                    ยืนยันหยิบสินค้า (ตัดสต๊อก)
                  </Button>
                ) : null}
                {canWrite ? (
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={busy}
                    onClick={() =>
                      modal.confirm({
                        title: "ยืนยันยกเลิกใบจ่ายสินค้า?",
                        onOk: () => cancelMutation.mutateAsync(data.id),
                      })
                    }
                  >
                    ยกเลิกเอกสาร
                  </Button>
                ) : null}
              </>
            ) : null}

            {data.status === "PICKED" && canWrite ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<InboxOutlined />}
                loading={busy}
                onClick={() => packMutation.mutate(data.id)}
              >
                ยืนยันแพ็คสินค้า
              </Button>
            ) : null}

            {data.status === "PACKED" && canApprove ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => setDispatchModalOpen(true)}
              >
                ยืนยันจ่ายสินค้าออก
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      <Modal
        title="ยืนยันจ่ายสินค้าออก"
        open={dispatchModalOpen}
        confirmLoading={dispatchMutation.isPending}
        onCancel={() => setDispatchModalOpen(false)}
        onOk={() => form.submit()}
        okText="ยืนยัน"
        cancelText="ยกเลิก"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            dispatchMutation.mutate(
              { id: data.id, body: values },
              {
                onSuccess: () => {
                  setDispatchModalOpen(false);
                  form.resetFields();
                },
              },
            );
          }}
        >
          <Form.Item name="recipientName" label="ชื่อผู้รับสินค้า (ถ้ามี)">
            <Input placeholder="คุณสมชาย ใจดี" />
          </Form.Item>
          <Form.Item
            name="recipientSignature"
            label="ลายเซ็นผู้รับสินค้า (ถ้ามี)"
          >
            <Input.TextArea rows={3} placeholder="พิมพ์ชื่อยืนยันหรือหมายเหตุ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
