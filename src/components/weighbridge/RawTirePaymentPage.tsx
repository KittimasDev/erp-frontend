"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { usePayReceiptMutation } from "@/hooks/raw-tire-payment/usePaymentMutations";
import { useRawTirePaymentQuery } from "@/hooks/raw-tire-payment/useRawTirePaymentQuery";
import type { PaymentBankAccount } from "@/types/raw-tire-payment";
import { PAYMENT_METHOD_OPTIONS } from "@/types/raw-tire-payment";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import {
  generateRawTirePaymentVoucherPdf,
  mapPaymentContextToPdfData,
} from "@/utils/generateRawTirePaymentVoucherPdf";

import styles from "./WeighbridgeDashboardPage.module.css";

type PayFormValues = {
  paymentMethod: "CASH" | "TRANSFER" | "CHEQUE";
  sellerBankAccountId?: string;
  paymentDate: dayjs.Dayjs;
  paymentAmount: number;
  transactionRef?: string;
  remark?: string;
};

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

type Props = {
  receiptId: string;
};

export default function RawTirePaymentPage({ receiptId }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<PayFormValues>();
  const paymentMethod = Form.useWatch("paymentMethod", form);
  const [isPrinting, setIsPrinting] = useState(false);

  const paymentQuery = useRawTirePaymentQuery(receiptId);
  const context = paymentQuery.data?.data;
  const payMutation = usePayReceiptMutation(receiptId);

  useEffect(() => {
    if (!context) {
      return;
    }

    const defaultAccount =
      context.bankAccounts.find((account) => account.isDefault) ??
      context.bankAccounts[0];

    const recordedMethod =
      context.payment?.paymentMethod || context.voucher?.paymentMethod;
    const preferredMethod =
      (recordedMethod as PayFormValues["paymentMethod"]) ||
      (context.seller.paymentMethod as PayFormValues["paymentMethod"]) ||
      "CASH";

    form.setFieldsValue({
      paymentMethod: preferredMethod,
      sellerBankAccountId:
        context.payment?.bankAccountId ?? defaultAccount?.id,
      paymentDate: context.payment?.paymentDate
        ? dayjs(context.payment.paymentDate)
        : context.voucher?.voucherDate
          ? dayjs(context.voucher.voucherDate)
          : dayjs(),
      paymentAmount: Number(
        context.payment?.amount ?? context.receipt.totalAmount,
      ),
      transactionRef: context.payment?.transactionRef,
      remark: context.payment?.remark ?? context.voucher?.remark,
    });
  }, [context, form]);

  const bankColumns: ColumnsType<PaymentBankAccount> = [
    {
      title: "ธนาคาร",
      dataIndex: "bankName",
      key: "bankName",
    },
    {
      title: "เลขที่บัญชี",
      dataIndex: "accountNo",
      key: "accountNo",
      width: 160,
    },
    {
      title: "ชื่อบัญชี",
      dataIndex: "accountName",
      key: "accountName",
    },
    {
      title: "บัญชีหลัก",
      dataIndex: "isDefault",
      key: "isDefault",
      width: 100,
      render: (value: boolean) => (value ? "ใช่" : "-"),
    },
    {
      title: "ใช้งาน",
      dataIndex: "isActive",
      key: "isActive",
      width: 90,
      render: (value: boolean) => (value ? "ใช่" : "ไม่"),
    },
  ];

  const handlePay = async () => {
    const values = await form.validateFields();
    await payMutation.mutateAsync({
      paymentMethod: values.paymentMethod,
      sellerBankAccountId:
        values.paymentMethod === "TRANSFER"
          ? values.sellerBankAccountId
          : undefined,
      paymentDate: values.paymentDate.format("YYYY-MM-DD"),
      paymentAmount: Number(values.paymentAmount),
      transactionRef:
        values.paymentMethod === "TRANSFER"
          ? values.transactionRef?.trim()
          : values.transactionRef?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
    });
  };

  const handlePrint = async () => {
    if (!context?.voucher && !context?.payment) {
      return;
    }
    setIsPrinting(true);
    try {
      await generateRawTirePaymentVoucherPdf(
        mapPaymentContextToPdfData(context),
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const isBusy = payMutation.isPending || isPrinting;
  const canEditForm = context?.canPay ?? false;

  return (
    <MasterPageGate isLoading={paymentQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/receiving/receipts/${receiptId}`)}
          >
            กลับใบรับซื้อ
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={paymentQuery.isFetching}
              onClick={() => paymentQuery.refetch()}
            >
              รีเฟรช
            </Button>
            <Button
              icon={<PrinterOutlined />}
              disabled={!context?.canPrint || isBusy}
              loading={isPrinting}
              onClick={() => void handlePrint()}
            >
              พิมพ์ใบสำคัญจ่าย
            </Button>
          </div>
        </div>

        {paymentQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {paymentQuery.error instanceof Error
                  ? paymentQuery.error.message
                  : "โหลดข้อมูลจ่ายเงินไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : context ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>ใบสำคัญจ่าย / จ่ายเงินผู้ขาย</h3>
                    <p>
                      ใบรับซื้อ {context.receipt.receiptNo} ·{" "}
                      {context.seller.sellerName} · ยอด{" "}
                      {formatMoney(context.receipt.totalAmount)} บาท
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag className={styles.flowTag}>
                      {RECEIPT_STATUS_LABELS[context.receipt.status] ??
                        context.receipt.status}
                    </Tag>
                    <Tag
                      color={
                        context.receipt.paymentStatus === "PAID"
                          ? "success"
                          : "warning"
                      }
                      className={styles.flowTag}
                    >
                      {PAYMENT_STATUS_LABELS[context.receipt.paymentStatus] ??
                        context.receipt.paymentStatus}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>

            {context.canPay || paymentMethod === "TRANSFER" ? (
              <div className={styles.card}>
                <div className={styles.listHeader}>
                  <div>
                    <h3>บัญชีธนาคารผู้ขาย</h3>
                    <p>เลือกบัญชีเมื่อจ่ายแบบโอนเงิน</p>
                  </div>
                </div>
                <Table
                  rowKey="id"
                  columns={bankColumns}
                  dataSource={context.bankAccounts}
                  pagination={false}
                  size="middle"
                  locale={{ emptyText: "ไม่มีบัญชีธนาคารที่ใช้งาน" }}
                />
              </div>
            ) : null}

            {context.voucher || context.payment ? (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>ใบสำคัญจ่ายที่บันทึกแล้ว</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.detailGrid}>
                    <DetailItem
                      label="เลขที่ใบสำคัญจ่าย"
                      value={context.voucher?.voucherNo || "-"}
                    />
                    <DetailItem
                      label="วันที่จ่าย"
                      value={formatDate(
                        context.payment?.paymentDate ??
                          context.voucher?.voucherDate,
                      )}
                    />
                    <DetailItem
                      label="วิธีจ่าย"
                      value={
                        PAYMENT_METHOD_LABELS[
                          context.payment?.paymentMethod ??
                            context.voucher?.paymentMethod ??
                            ""
                        ] ??
                        context.payment?.paymentMethod ??
                        context.voucher?.paymentMethod ??
                        "-"
                      }
                    />
                    <DetailItem
                      label="จำนวนเงิน"
                      value={formatMoney(
                        context.payment?.amount ?? context.voucher?.totalAmount,
                      )}
                    />
                    <DetailItem
                      label="เลขอ้างอิง"
                      value={context.payment?.transactionRef || "-"}
                    />
                    <DetailItem
                      label="บัญชีรับโอน"
                      value={
                        context.payment?.bankName
                          ? `${context.payment.bankName} · ${context.payment.accountNo ?? ""}`
                          : "-"
                      }
                    />
                    <DetailItem
                      label="หมายเหตุ"
                      value={
                        context.payment?.remark ||
                        context.voucher?.remark ||
                        "-"
                      }
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>บันทึกจ่ายเงิน</h3>
                <p>
                  Phase นี้จ่ายเต็มจำนวนเท่านั้น · ยอดอ้างอิง{" "}
                  {formatMoney(context.receipt.totalAmount)} บาท
                </p>
              </div>
              <div className={styles.cardBody}>
                <Form
                  form={form}
                  layout="vertical"
                  disabled={!canEditForm}
                  requiredMark="optional"
                >
                  <Form.Item
                    label="วิธีจ่าย"
                    name="paymentMethod"
                    rules={[
                      { required: true, message: "กรุณาเลือกวิธีจ่าย" },
                    ]}
                  >
                    <Radio.Group
                      options={PAYMENT_METHOD_OPTIONS.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                    />
                  </Form.Item>

                  {paymentMethod === "TRANSFER" ? (
                    <Form.Item
                      label="บัญชีธนาคารผู้ขาย"
                      name="sellerBankAccountId"
                      rules={[
                        {
                          required: true,
                          message: "กรุณาเลือกบัญชีธนาคารผู้ขาย",
                        },
                      ]}
                    >
                      <Select
                        placeholder="เลือกบัญชี"
                        options={context.bankAccounts.map((account) => ({
                          value: account.id,
                          label: `${account.bankName} · ${account.accountNo} · ${account.accountName}${account.isDefault ? " (หลัก)" : ""}`,
                        }))}
                      />
                    </Form.Item>
                  ) : null}

                  <div className={styles.detailGrid}>
                    <Form.Item
                      label="วันที่จ่าย"
                      name="paymentDate"
                      rules={[
                        { required: true, message: "กรุณาเลือกวันที่จ่าย" },
                      ]}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item
                      label="จำนวนเงิน (บาท)"
                      name="paymentAmount"
                      rules={[
                        { required: true, message: "กรุณากรอกจำนวนเงิน" },
                      ]}
                    >
                      <InputNumber
                        min={0.01}
                        step={0.01}
                        precision={2}
                        style={{ width: "100%" }}
                        disabled
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    label="เลขอ้างอิง / เลขที่โอน"
                    name="transactionRef"
                    rules={
                      paymentMethod === "TRANSFER"
                        ? [
                            {
                              required: true,
                              message: "กรณีโอนเงินต้องระบุเลขอ้างอิง",
                            },
                          ]
                        : undefined
                    }
                  >
                    <Input placeholder="เช่น TRX-20260717-001" />
                  </Form.Item>

                  <Form.Item label="หมายเหตุ" name="remark">
                    <Input.TextArea rows={2} placeholder="หมายเหตุเพิ่มเติม" />
                  </Form.Item>
                </Form>

                <div className={styles.classificationActions}>
                  {canEditForm ? (
                    <>
                      <Popconfirm
                        title="ยืนยันบันทึกจ่ายเงิน"
                        description={`จ่ายเต็มจำนวน ${formatMoney(context.receipt.totalAmount)} บาท และเปลี่ยนสถานะเป็น PAID`}
                        okText="ยืนยันจ่าย"
                        cancelText="ยกเลิก"
                        disabled={isBusy}
                        onConfirm={() => void handlePay()}
                      >
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          disabled={isBusy}
                          loading={payMutation.isPending}
                        >
                          บันทึกจ่ายเงิน
                        </Button>
                      </Popconfirm>
                      <Button
                        disabled={isBusy}
                        onClick={() =>
                          router.push(`/receiving/receipts/${receiptId}`)
                        }
                      >
                        ยกเลิก
                      </Button>
                    </>
                  ) : null}

                  {context.receipt.paymentStatus === "PAID" ? (
                    <>
                      <Typography.Text type="success">
                        จ่ายเงินแล้ว
                        {context.voucher
                          ? ` · ใบสำคัญจ่าย ${context.voucher.voucherNo}`
                          : ""}
                      </Typography.Text>
                      <Button
                        icon={<PrinterOutlined />}
                        disabled={!context.canPrint || isBusy}
                        loading={isPrinting}
                        onClick={() => void handlePrint()}
                      >
                        พิมพ์ใบสำคัญจ่าย
                      </Button>
                    </>
                  ) : null}

                  {context.receipt.status === "CANCELLED" ? (
                    <Typography.Text type="secondary">
                      ใบรับซื้อถูกยกเลิกแล้ว ไม่สามารถจ่ายเงินได้
                    </Typography.Text>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}

function DetailItem({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        fullWidth
          ? `${styles.detailItem} ${styles.detailItemFull}`
          : styles.detailItem
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
