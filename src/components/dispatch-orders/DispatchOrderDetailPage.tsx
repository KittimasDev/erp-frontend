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
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { statusT } from "@/lib/i18n/fulfillmentStatus";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB HH:mm");
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
  const t = useT();
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
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบจ่ายสินค้า")}
        <div style={{ marginTop: 12 }}>
          <Link href="/dispatch-orders">{t("กลับรายการ")}</Link>
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
      <PageHeader
        eyebrow="Sales · Dispatch Order"
        icon={<CarOutlined />}
        title={data.dispatchNo}
        subtitle={<>{data.salesOrderNo ? t("ใบสั่งขาย {salesOrderNo}", { salesOrderNo: data.salesOrderNo }) : "—"} ·{" "}
            {formatDate(data.dispatchDate)} · {t("คลัง")} {data.warehouseCode ?? "—"}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/dispatch-orders")}
          >
            {t("กลับ")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลใบจ่ายสินค้า")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ใบสั่งขายอ้างอิง")}</span>
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
                <span className={styles.metaLabel}>{t("เลขที่ใบส่งของ")}</span>
                <div className={styles.metaValue}>{data.deliveryNo ?? "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้รับสินค้า")}</span>
                <div className={styles.metaValue}>
                  {data.recipientName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่ยืนยันหยิบสินค้า")}</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.pickedAt)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่แพ็คเสร็จ")}</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.packedAt)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่จ่ายออก")}</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.dispatchedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการสินค้า")}</h2>
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
                      {item.unitCode ?? ""} · Lot {item.lotNo ?? "—"} · {t("ตำแหน่ง")}{" "}
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
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
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
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.dispatchNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {statusT(t, DISPATCH_ORDER_STATUS_LABEL[data.status as DispatchOrderStatus] ??
              data.status)}
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
                    {t("ยืนยันหยิบสินค้า (ตัดสต๊อก)")}
                  </Button>
                ) : null}
                {canWrite ? (
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={busy}
                    onClick={() =>
                      modal.confirm({
                        title: t("ยืนยันยกเลิกใบจ่ายสินค้า?"),
                        onOk: () => cancelMutation.mutateAsync(data.id),
                      })
                    }
                  >
                    {t("ยกเลิกเอกสาร")}
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
                {t("ยืนยันแพ็คสินค้า")}
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
                {t("ยืนยันจ่ายสินค้าออก")}
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      <Modal
        title={t("ยืนยันจ่ายสินค้าออก")}
        open={dispatchModalOpen}
        confirmLoading={dispatchMutation.isPending}
        onCancel={() => setDispatchModalOpen(false)}
        onOk={() => form.submit()}
        okText={t("ยืนยัน")}
        cancelText={t("ยกเลิก")}
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
          <Form.Item name="recipientName" label={t("ชื่อผู้รับสินค้า (ถ้ามี)")}>
            <Input placeholder={t("คุณสมชาย ใจดี")} />
          </Form.Item>
          <Form.Item
            name="recipientSignature"
            label={t("ลายเซ็นผู้รับสินค้า (ถ้ามี)")}
          >
            <Input.TextArea rows={3} placeholder={t("พิมพ์ชื่อยืนยันหรือหมายเหตุ")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
