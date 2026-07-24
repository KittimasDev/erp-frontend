"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, DatePicker, Form, Input, Modal, Select, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelSalesInvoiceMutation,
  useConfirmSalesInvoiceMutation,
  useReceiveSalesInvoicePaymentMutation,
} from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { useSalesInvoiceQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/sales-invoices";
import {
  SALES_INVOICE_PAYMENT_METHOD_LABEL,
  SALES_INVOICE_PAYMENT_STATUS_LABEL,
  SALES_INVOICE_STATUS_LABEL,
} from "@/types/sales-invoices";
import { generateSalesInvoicePdf } from "@/utils/generateSalesInvoicePdf";
import styles from "./SalesInvoiceDetailPage.module.css";

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
    case "POSTED":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function SalesInvoiceDetailPage({ id }: Props) {
  const query = useSalesInvoiceQuery(id);
  const data = query.data?.data;

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
        ไม่พบใบแจ้งหนี้
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-invoices">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  return <SalesInvoiceDetailView data={data} />;
}

function SalesInvoiceDetailView({ data }: { data: SalesInvoice }) {
  const router = useRouter();
  const { modal } = App.useApp();
  const confirmMutation = useConfirmSalesInvoiceMutation();
  const receiveMutation = useReceiveSalesInvoicePaymentMutation();
  const cancelMutation = useCancelSalesInvoiceMutation();
  const [payOpen, setPayOpen] = useState(false);
  const [payForm] = Form.useForm<{
    paymentMethod: string;
    paidAt: dayjs.Dayjs;
    transactionRef?: string;
    remark?: string;
  }>();

  const canWrite =
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();

  const busy =
    confirmMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending;

  const printPdf = () => {
    void generateSalesInvoicePdf({
      invoiceNo: data.invoiceNo,
      invoiceDate: formatDate(data.invoiceDate),
      dueDate: formatDate(data.dueDate),
      customerName: data.customer?.nameTh ?? "—",
      customerCode: data.customer?.customerCode ?? "—",
      salesOrderNo: data.salesOrder?.soNo ?? "—",
      deliveryOrderNo: data.deliveryOrder?.deliveryOrderNo ?? "—",
      paymentTerm: data.paymentTerm?.name ?? "—",
      remark: data.remark?.trim() || "",
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      vatAmount: Number(data.vatAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemName ?? "—",
        unit: item.unitName ?? "—",
        qty: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        amount: Number(item.amount) || 0,
      })),
    });
  };

  const itemColumns: ColumnsType<SalesInvoiceItem> = [
    {
      title: "#",
      width: 48,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: "สินค้า",
      render: (_v, row) => (
        <div>
          <div>{row.itemName ?? "—"}</div>
          <div style={{ color: "#8a9199", fontSize: 12 }}>{row.itemCode}</div>
        </div>
      ),
    },
    {
      title: "จำนวน",
      dataIndex: "quantity",
      align: "right",
      width: 100,
    },
    {
      title: "หน่วย",
      dataIndex: "unitName",
      width: 80,
      render: (v?: string) => v ?? "—",
    },
    {
      title: "ราคา/หน่วย",
      dataIndex: "unitPrice",
      align: "right",
      width: 120,
      render: (v: string) => formatMoney(v),
    },
    {
      title: "ส่วนลด",
      dataIndex: "discountAmount",
      align: "right",
      width: 100,
      render: (v: string) => formatMoney(v),
    },
    {
      title: "จำนวนเงิน",
      dataIndex: "amount",
      align: "right",
      width: 120,
      render: (v: string) => formatMoney(v),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales Invoices · AR</p>
          <h1 className={styles.pageTitle}>{data.invoiceNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.customer?.nameTh ?? "—"} · {formatDate(data.invoiceDate)} ·{" "}
            {formatMoney(data.totalAmount)} บาท
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/sales-invoices")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            พิมพ์ PDF
          </Button>
          {canWrite && data.status === "DRAFT" ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/sales-invoices/${data.id}/edit`)}
              >
                แก้ไข
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => {
                  modal.confirm({
                    title: "ยืนยันใบแจ้งหนี้?",
                    content: "สถานะจะเป็น POSTED / UNPAID",
                    okText: "ยืนยัน",
                    cancelText: "ยกเลิก",
                    onOk: () => confirmMutation.mutateAsync(data.id),
                  });
                }}
              >
                Confirm
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                loading={busy}
                onClick={() => {
                  modal.confirm({
                    title: "ยกเลิกใบแจ้งหนี้?",
                    content: "ยกเลิกได้เฉพาะสถานะ DRAFT",
                    okText: "ยกเลิกเอกสาร",
                    okButtonProps: { danger: true },
                    cancelText: "ปิด",
                    onOk: async () => {
                      await cancelMutation.mutateAsync(data.id);
                      router.push("/sales-invoices");
                    },
                  });
                }}
              >
                Cancel
              </Button>
            </>
          ) : null}
          {canWrite &&
          data.status === "POSTED" &&
          data.paymentStatus === "UNPAID" ? (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={busy}
              onClick={() => {
                payForm.setFieldsValue({
                  paymentMethod: "TRANSFER",
                  paidAt: dayjs(),
                });
                setPayOpen(true);
              }}
            >
              รับชำระ
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบแจ้งหนี้</h2>
              <span
                className={`${styles.statusPill} ${statusClass(data.status)}`}
              >
                {SALES_INVOICE_STATUS_LABEL[data.status] ?? data.status}
                {data.paymentStatus
                  ? ` · ${SALES_INVOICE_PAYMENT_STATUS_LABEL[data.paymentStatus] ?? data.paymentStatus}`
                  : ""}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.invoiceNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(data.invoiceDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ครบกำหนด</span>
                <div className={styles.metaValue}>
                  {formatDate(data.dueDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {data.customer?.nameTh ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบส่งสินค้า</span>
                <div className={styles.metaValue}>
                  {data.deliveryOrderId ? (
                    <Link href={`/delivery-orders/${data.deliveryOrderId}`}>
                      {data.deliveryOrder?.deliveryOrderNo ?? data.deliveryOrderId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบสั่งขาย</span>
                <div className={styles.metaValue}>
                  {data.salesOrderId ? (
                    <Link href={`/sales-orders/${data.salesOrderId}`}>
                      {data.salesOrder?.soNo ?? data.salesOrderId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>หมายเหตุ</span>
                <div className={styles.metaValue}>{data.remark || "—"}</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            </div>
            <Table
              rowKey="id"
              columns={itemColumns}
              dataSource={data.items ?? []}
              pagination={false}
              size="small"
            />
            <div className={styles.metaGrid} style={{ marginTop: 16 }}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ยอดรวม</span>
                <div className={styles.metaValue}>
                  {formatMoney(data.subtotalAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ส่วนลด</span>
                <div className={styles.metaValue}>
                  {formatMoney(data.discountAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>VAT</span>
                <div className={styles.metaValue}>
                  {formatMoney(data.vatAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ยอดสุทธิ</span>
                <div className={styles.metaValue}>
                  <strong>{formatMoney(data.totalAmount)}</strong>
                </div>
              </div>
            </div>
          </div>

          {(data.payments?.length ?? 0) > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>การรับชำระ</h2>
              </div>
              {data.payments.map((p) => (
                <div key={p.id} className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>วิธีรับชำระ</span>
                    <div className={styles.metaValue}>
                      {SALES_INVOICE_PAYMENT_METHOD_LABEL[p.paymentMethod] ??
                        p.paymentMethod}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>จำนวนเงิน</span>
                    <div className={styles.metaValue}>
                      {formatMoney(p.amount)}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>วันที่รับชำระ</span>
                    <div className={styles.metaValue}>
                      {formatDate(p.paidAt)}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>อ้างอิง</span>
                    <div className={styles.metaValue}>
                      {p.transactionRef || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <Modal
        title="รับชำระเต็มจำนวน"
        open={payOpen}
        onCancel={() => setPayOpen(false)}
        okText="บันทึกรับชำระ"
        confirmLoading={receiveMutation.isPending}
        onOk={async () => {
          const values = await payForm.validateFields();
          await receiveMutation.mutateAsync({
            id: data.id,
            body: {
              paymentMethod: values.paymentMethod,
              paidAt: values.paidAt.format("YYYY-MM-DD"),
              transactionRef: values.transactionRef?.trim() || undefined,
              remark: values.remark?.trim() || undefined,
            },
          });
          setPayOpen(false);
        }}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item
            name="paymentMethod"
            label="วิธีรับชำระ"
            rules={[{ required: true, message: "เลือกวิธีรับชำระ" }]}
          >
            <Select
              options={[
                { value: "CASH", label: "เงินสด" },
                { value: "TRANSFER", label: "โอนเงิน" },
                { value: "CHEQUE", label: "เช็ค" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="paidAt"
            label="วันที่รับชำระ"
            rules={[{ required: true, message: "ระบุวันที่" }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="transactionRef" label="เลขอ้างอิง">
            <Input placeholder="เช่น เลขโอน" />
          </Form.Item>
          <Form.Item name="remark" label="หมายเหตุ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <p>
            ยอดรับชำระ: <strong>{formatMoney(data.totalAmount)}</strong> บาท
          </p>
        </Form>
      </Modal>
    </div>
  );
}
