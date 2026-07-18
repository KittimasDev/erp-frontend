"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, Modal, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelPurchasePaymentMutation,
  useConfirmPurchasePaymentMutation,
} from "@/hooks/purchase-payments/usePurchasePaymentMutations";
import { usePurchasePaymentQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
} from "@/types/purchase-payments";
import styles from "./PurchasePaymentDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusClass(status: string) {
  switch (status) {
    case "PAID":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function PurchasePaymentDetailPage({ id }: Props) {
  const router = useRouter();
  const query = usePurchasePaymentQuery(id);
  const confirmMutation = useConfirmPurchasePaymentMutation();
  const cancelMutation = useCancelPurchasePaymentMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmForm] = Form.useForm<{
    paymentDate: dayjs.Dayjs;
    transactionRef?: string;
    remark?: string;
  }>();

  const data = query.data?.data;
  const canWrite =
    userHasRole(RoleCode.ACCOUNTING_OFFICER) || isAdministrator();

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
        ไม่พบใบสำคัญจ่าย
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-payments">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy = confirmMutation.isPending || cancelMutation.isPending;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <DollarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Payments</p>
          <h1 className={styles.pageTitle}>{data.voucherNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.creditor?.nameTh ?? "—"} · {formatDate(data.voucherDate)} ·{" "}
            {formatMoney(data.totalAmount)} บาท
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/purchase-payments")}
          >
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบสำคัญจ่าย</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.voucherNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(data.voucherDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขาย</span>
                <div className={styles.metaValue}>
                  {data.creditor
                    ? `${data.creditor.creditorCode} — ${data.creditor.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อ้างอิง PO</span>
                <div className={styles.metaValue}>
                  {data.purchaseOrder ? (
                    <Link href={`/purchase-orders/${data.purchaseOrder.id}`}>
                      {data.purchaseOrder.poNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วิธีจ่าย</span>
                <div className={styles.metaValue}>
                  {SUPPLIER_PAYMENT_METHOD_LABEL[data.paymentMethod] ??
                    data.paymentMethod}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "ไม่ระบุ"}
                </div>
              </div>
            </div>
          </div>

          {(data.payments ?? []).length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>รายการจ่ายเงิน</h2>
              </div>
              <div className={styles.itemList}>
                {data.payments.map((payment, index) => (
                  <div key={payment.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>
                        {formatDate(payment.paymentDate)} ·{" "}
                        {SUPPLIER_PAYMENT_METHOD_LABEL[payment.paymentMethod] ??
                          payment.paymentMethod}
                      </p>
                      <p className={styles.itemCode}>
                        {payment.transactionRef
                          ? `อ้างอิง ${payment.transactionRef}`
                          : "ไม่มีเลขอ้างอิง"}
                        {payment.paidBy
                          ? ` · โดย ${payment.paidBy.displayName}`
                          : ""}
                      </p>
                    </div>
                    <div className={styles.itemQty}>
                      <strong>{formatMoney(payment.amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.voucherNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {SUPPLIER_PAYMENT_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>ยอดจ่าย</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>จ่ายเมื่อ</span>
              <strong>
                {data.paidAt
                  ? dayjs(data.paidAt).format("DD/MM/YYYY HH:mm")
                  : "—"}
              </strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {canWrite && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() => {
                    confirmForm.setFieldsValue({
                      paymentDate: dayjs(data.voucherDate),
                    });
                    setConfirmOpen(true);
                  }}
                >
                  Confirm จ่ายเงิน
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    Modal.confirm({
                      title: "ยืนยันยกเลิกใบสำคัญจ่าย?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}
          </div>

          <div className={styles.flowNote}>
            <strong>ขั้นตอนถัดไป</strong>
            <p>
              {data.status === "DRAFT"
                ? "กด Confirm เพื่อบันทึก supplier_payments และอัปเดต PO เป็น PAID"
                : data.status === "PAID"
                  ? "จ่ายเงินเรียบร้อยแล้ว (ไม่กระทบสต๊อก)"
                  : "เอกสารถูกยกเลิกแล้ว"}
            </p>
          </div>
        </aside>
      </div>

      <Modal
        title="Confirm จ่ายเงิน"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={confirmMutation.isPending}
        okText="จ่ายเงิน"
        onOk={async () => {
          const values = await confirmForm.validateFields();
          await confirmMutation.mutateAsync({
            id: data.id,
            body: {
              paymentDate: values.paymentDate.format("YYYY-MM-DD"),
              transactionRef: values.transactionRef?.trim() || undefined,
              remark: values.remark?.trim() || undefined,
            },
          });
          setConfirmOpen(false);
        }}
      >
        <Form form={confirmForm} layout="vertical">
          <Form.Item
            label="วันที่จ่าย"
            name="paymentDate"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            label="เลขอ้างอิงการโอน"
            name="transactionRef"
            rules={
              data.paymentMethod === "TRANSFER"
                ? [{ required: true, message: "กรณีโอนต้องระบุเลขอ้างอิง" }]
                : undefined
            }
          >
            <Input placeholder="TRX-..." />
          </Form.Item>
          <Form.Item label="หมายเหตุ" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
