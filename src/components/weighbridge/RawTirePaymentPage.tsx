"use client";

import { formatErpDate } from "@/lib/datetime/erp-timezone";
import { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { UploadProps } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  usePayReceiptMutation,
  useUploadPaymentSlipMutation,
} from "@/hooks/raw-tire-payment/usePaymentMutations";
import { useRawTirePaymentQuery } from "@/hooks/raw-tire-payment/useRawTirePaymentQuery";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { downloadRawTirePurchasePaymentSlip } from "@/lib/api/raw-tire-purchase-receipts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  PaymentBankAccount,
  PaymentSlipAttachment,
} from "@/types/raw-tire-payment";
import { PAYMENT_METHOD_OPTIONS } from "@/types/raw-tire-payment";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import { optimizePaymentSlipFile } from "@/utils/optimizePaymentSlipFile";

import { appLocale, tLabel } from "./receiving-i18n";
import styles from "./WeighbridgeDashboardPage.module.css";
import { useT } from "@/lib/i18n/useT";

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
  return n.toLocaleString(appLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return formatErpDate(value, "-");
}

function formatFileSize(value?: string) {
  const size = Number(value);
  if (!size || Number.isNaN(size)) {
    return "-";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mimeType?: string) {
  return Boolean(mimeType?.startsWith("image/"));
}

type Props = {
  receiptId: string;
};

export default function RawTirePaymentPage({ receiptId }: Props) {
  const t = useT();
  const router = useRouter();
  const [form] = Form.useForm<PayFormValues>();
  const paymentMethod = Form.useWatch("paymentMethod", form);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<PaymentSlipAttachment | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const paymentQuery = useRawTirePaymentQuery(receiptId);
  const context = paymentQuery.data?.data;
  /*
    endpoint /payment คืน receipt มาเป็นยอดสรุป ไม่มีรายการรับซื้อ
    ใบสำคัญจ่ายต้องพิมพ์ตารางรายการด้วย จึงดึงรายละเอียดใบรับซื้อมาอีกชุด
    ยังไม่โหลดเสร็จก็พิมพ์ได้ ตารางจะถอยไปเป็นแถวสรุปแถวเดียว
  */
  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const receipt = receiptQuery.data?.data ?? null;
  const payMutation = usePayReceiptMutation(receiptId);
  const uploadSlipMutation = useUploadPaymentSlipMutation(receiptId);

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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const bankColumns: ColumnsType<PaymentBankAccount> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("ธนาคาร"),
      dataIndex: "bankName",
      key: "bankName",
    },
    {
      title: t("เลขที่บัญชี"),
      dataIndex: "accountNo",
      key: "accountNo",
      width: 160,
    },
    {
      title: t("ชื่อบัญชี"),
      dataIndex: "accountName",
      key: "accountName",
    },
    {
      title: t("บัญชีหลัก"),
      dataIndex: "isDefault",
      key: "isDefault",
      width: 100,
      render: (value: boolean) => (value ? t("ใช่") : "-"),
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
      const { generateRawTirePaymentVoucherPdf, mapPaymentContextToPdfData } =
        await import("@/utils/generateRawTirePaymentVoucherPdf");
      await generateRawTirePaymentVoucherPdf(
        mapPaymentContextToPdfData(context, receipt),
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const openSlipPreview = async (slip: PaymentSlipAttachment) => {
    setPreviewLoading(true);
    setPreviewSlip(slip);
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      const { blob } = await downloadRawTirePurchasePaymentSlip(
        getAccessToken(),
        receiptId,
        slip.id,
      );
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setPreviewSlip(null);
      Modal.error({
        title: t("เปิดสลิปไม่สำเร็จ"),
        content:
          error instanceof ApiError ? error.message : t("ไม่สามารถโหลดไฟล์ได้"),
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadSlip = async (slip: PaymentSlipAttachment) => {
    try {
      const { blob, filename } = await downloadRawTirePurchasePaymentSlip(
        getAccessToken(),
        receiptId,
        slip.id,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filename || slip.originalFileName || `payment-slip-${slip.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      Modal.error({
        title: t("ดาวน์โหลดไม่สำเร็จ"),
        content:
          error instanceof ApiError ? error.message : t("ไม่สามารถดาวน์โหลดได้"),
      });
    }
  };

  const uploadProps: UploadProps = {
    accept:
      ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      if (!context?.canUploadSlip) {
        Modal.warning({
          title: context?.receipt.paymentStatus === "PAID"
            ? t("จ่ายเงินแล้ว")
            : t("ยังอัปโหลดไม่ได้"),
          content:
            context?.receipt.paymentStatus === "PAID"
              ? t("จ่ายเงินแล้ว ไม่สามารถอัปโหลดหรือแก้ไขสลิปได้อีก")
              : t("อัปโหลดสลิปได้เฉพาะช่วงบันทึกจ่ายเงินเท่านั้น"),
        });
        return Upload.LIST_IGNORE;
      }
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowed.includes(file.type)) {
        Modal.error({
          title: t("ชนิดไฟล์ไม่รองรับ"),
          content: t("รองรับเฉพาะ JPG, PNG, WEBP หรือ PDF"),
        });
        return Upload.LIST_IGNORE;
      }
      if (file.size > 10 * 1024 * 1024) {
        Modal.error({
          title: t("ไฟล์ใหญ่เกินไป"),
          content: t("ขนาดไฟล์ต้องไม่เกิน 10 MB"),
        });
        return Upload.LIST_IGNORE;
      }

      void (async () => {
        const optimized = await optimizePaymentSlipFile(file);
        await uploadSlipMutation.mutateAsync({ file: optimized });
      })();

      return false;
    },
  };

  const isBusy =
    payMutation.isPending || isPrinting || uploadSlipMutation.isPending;
  const canEditForm = context?.canPay ?? false;
  const canUploadSlip = context?.canUploadSlip === true;
  const isPaid = context?.receipt.paymentStatus === "PAID";
  const slips = context?.slips ?? [];

  return (
    <MasterPageGate isLoading={paymentQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/receiving/receipts/${receiptId}`)}
          >
            {t("กลับใบรับซื้อ")}
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={paymentQuery.isFetching}
              onClick={() => paymentQuery.refetch()}
            >
              {t("รีเฟรช")}
            </Button>
            <Button
              icon={<PrinterOutlined />}
              disabled={!context?.canPrint || isBusy}
              loading={isPrinting}
              onClick={() => void handlePrint()}
            >
              {t("พิมพ์ใบสำคัญจ่าย")}
            </Button>
          </div>
        </div>

        {paymentQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {paymentQuery.error instanceof Error
                  ? paymentQuery.error.message
                  : t("โหลดข้อมูลจ่ายเงินไม่สำเร็จ")}
              </Typography.Text>
            </div>
          </div>
        ) : context ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>{t("ใบสำคัญจ่าย / จ่ายเงินผู้ขาย")}</h3>
                    <p>
                      {t("ใบรับซื้อ {no} · {seller} · ยอด {amount} บาท", { no: context.receipt.receiptNo, seller: context.seller.sellerName, amount: formatMoney(context.receipt.totalAmount) })}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag className={styles.flowTag}>
                      {tLabel(RECEIPT_STATUS_LABELS[context.receipt.status] ??
                        context.receipt.status)}
                    </Tag>
                    <Tag
                      color={
                        context.receipt.paymentStatus === "PAID"
                          ? "success"
                          : "warning"
                      }
                      className={styles.flowTag}
                    >
                      {tLabel(PAYMENT_STATUS_LABELS[context.receipt.paymentStatus] ??
                        context.receipt.paymentStatus)}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.classificationLayout}>
              <div className={styles.classificationMain}>
                {context.canPay || paymentMethod === "TRANSFER" ? (
                  <div className={styles.card}>
                    <div className={styles.listHeader}>
                      <div>
                        <h3>{t("บัญชีธนาคารผู้ขาย")}</h3>
                        <p>{t("เลือกบัญชีเมื่อจ่ายแบบโอนเงิน")}</p>
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      columns={bankColumns}
                      dataSource={context.bankAccounts}
                      pagination={false}
                      size="middle"
                      locale={{ emptyText: t("ไม่มีบัญชีธนาคารที่ใช้งาน") }}
                    />
                  </div>
                ) : null}

                {context.voucher || context.payment ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3>{t("ใบสำคัญจ่ายที่บันทึกแล้ว")}</h3>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.detailGrid}>
                        <DetailItem
                          label={t("เลขที่ใบสำคัญจ่าย")}
                          value={context.voucher?.voucherNo || "-"}
                        />
                        <DetailItem
                          label={t("วันที่จ่าย")}
                          value={formatDate(
                            context.payment?.paymentDate ??
                              context.voucher?.voucherDate,
                          )}
                        />
                        <DetailItem
                          label={t("วิธีจ่าย")}
                          value={tLabel(
                            PAYMENT_METHOD_LABELS[
                              context.payment?.paymentMethod ??
                                context.voucher?.paymentMethod ??
                                ""
                            ] ??
                            context.payment?.paymentMethod ??
                            context.voucher?.paymentMethod ??
                            "-")
                          }
                        />
                        <DetailItem
                          label={t("จำนวนเงิน")}
                          value={formatMoney(
                            context.payment?.amount ??
                              context.voucher?.totalAmount,
                          )}
                        />
                        <DetailItem
                          label={t("เลขอ้างอิง")}
                          value={context.payment?.transactionRef || "-"}
                        />
                        <DetailItem
                          label={t("บัญชีรับโอน")}
                          value={
                            context.payment?.bankName
                              ? `${context.payment.bankName} · ${context.payment.accountNo ?? ""}`
                              : "-"
                          }
                        />
                        <DetailItem
                          label={t("หมายเหตุ")}
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
                    <h3>{t("บันทึกจ่ายเงิน")}</h3>
                    <p>
                      {t("จ่ายเต็มจำนวนเท่านั้น · ยอดอ้างอิง {amount} บาท", { amount: formatMoney(context.receipt.totalAmount) })}
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
                        label={t("วิธีจ่าย")}
                        name="paymentMethod"
                        rules={[
                          { required: true, message: t("กรุณาเลือกวิธีจ่าย") },
                        ]}
                      >
                        <Radio.Group
                          options={PAYMENT_METHOD_OPTIONS.map((item) => ({
                            value: item.value,
                            label: t(item.label),
                          }))}
                        />
                      </Form.Item>

                      {paymentMethod === "TRANSFER" ? (
                        <Form.Item
                          label={t("บัญชีธนาคารผู้ขาย")}
                          name="sellerBankAccountId"
                          rules={[
                            {
                              required: true,
                              message: t("กรุณาเลือกบัญชีธนาคารผู้ขาย"),
                            },
                          ]}
                        >
                          <Select
                            placeholder={t("เลือกบัญชี")}
                            options={context.bankAccounts.map((account) => ({
                              value: account.id,
                              label: `${account.bankName} · ${account.accountNo} · ${account.accountName}${account.isDefault ? t(" (หลัก)") : ""}`,
                            }))}
                          />
                        </Form.Item>
                      ) : null}

                      <div className={styles.detailGrid}>
                        <Form.Item
                          label={t("วันที่จ่าย")}
                          name="paymentDate"
                          rules={[
                            {
                              required: true,
                              message: t("กรุณาเลือกวันที่จ่าย"),
                            },
                          ]}
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            format="DD/MM/BBBB"
                          />
                        </Form.Item>

                        <Form.Item
                          label={t("จำนวนเงิน (บาท)")}
                          name="paymentAmount"
                          rules={[
                            { required: true, message: t("กรุณากรอกจำนวนเงิน") },
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
                        label={t("เลขอ้างอิง / เลขที่โอน")}
                        name="transactionRef"
                        rules={
                          paymentMethod === "TRANSFER"
                            ? [
                                {
                                  required: true,
                                  message: t("กรณีโอนเงินต้องระบุเลขอ้างอิง"),
                                },
                              ]
                            : undefined
                        }
                      >
                        <Input placeholder={t("เช่น TRX-20260717-001")} />
                      </Form.Item>

                      <Form.Item label={t("หมายเหตุ")} name="remark">
                        <Input.TextArea
                          rows={2}
                          placeholder={t("หมายเหตุเพิ่มเติม")}
                        />
                      </Form.Item>
                    </Form>

                    <div className={styles.classificationActions}>
                      {canEditForm ? (
                        <>
                          <Popconfirm
                            title={t("ยืนยันบันทึกจ่ายเงิน")}
                            description={t("จ่ายเต็มจำนวน {amount} บาท และเปลี่ยนสถานะเป็น PAID", { amount: formatMoney(context.receipt.totalAmount) })}
                            okText={t("ยืนยันจ่าย")}
                            cancelText={t("ยกเลิก")}
                            disabled={isBusy}
                            onConfirm={() => void handlePay()}
                          >
                            <Button
                              type="primary"
                              className={styles.submitButton}
                              disabled={isBusy}
                              loading={payMutation.isPending}
                            >
                              {t("บันทึกจ่ายเงิน")}
                            </Button>
                          </Popconfirm>
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              router.push(`/receiving/receipts/${receiptId}`)
                            }
                          >
                            {t("ยกเลิก")}
                          </Button>
                        </>
                      ) : null}

                      {context.receipt.paymentStatus === "PAID" ? (
                        <>
                          <Typography.Text type="success">
                            {t("จ่ายเงินแล้ว")}
                            {context.voucher
                              ? ` · ${t("ใบสำคัญจ่าย")} ${context.voucher.voucherNo}`
                              : ""}
                          </Typography.Text>
                          <Button
                            icon={<PrinterOutlined />}
                            disabled={!context.canPrint || isBusy}
                            loading={isPrinting}
                            onClick={() => void handlePrint()}
                          >
                            {t("พิมพ์ใบสำคัญจ่าย")}
                          </Button>
                        </>
                      ) : null}

                      {context.receipt.status === "CANCELLED" ? (
                        <Typography.Text type="secondary">
                          {t("ใบรับซื้อถูกยกเลิกแล้ว ไม่สามารถจ่ายเงินได้")}
                        </Typography.Text>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <aside className={styles.classificationSummarySticky}>
                <div>
                  <p className={styles.classificationSummaryEyebrow}>
                    {t("หลักฐานการจ่าย")}
                  </p>
                  <h3 style={{ margin: "4px 0 8px", fontSize: 18 }}>
                    {t("สลิปจ่ายเงิน")}
                  </h3>
                  <Typography.Text type="secondary">
                    {isPaid
                      ? t("จ่ายแล้ว — ดูสลิปอย่างเดียว ไม่สามารถแก้ไขได้อีก")
                      : canUploadSlip
                        ? t("แนบสลิปก่อนกดบันทึกจ่ายเงิน · จ่ายแล้วจะล็อก")
                        : t("อัปโหลดได้เฉพาะช่วงรอจ่ายเงิน")}
                  </Typography.Text>
                </div>

                {canUploadSlip ? (
                  <Upload.Dragger {...uploadProps} disabled={isBusy}>
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">{t("คลิกหรือลากไฟล์มาวาง")}</p>
                    <p className="ant-upload-hint">
                      {t("JPG / PNG / WEBP / PDF · ไม่เกิน 10 MB · รูปจะย่ออัตโนมัติก่อนบันทึก")}
                    </p>
                  </Upload.Dragger>
                ) : (
                  <div className={styles.slipLocked}>
                    <Typography.Text type="secondary">
                      {isPaid
                        ? t("จ่ายเงินแล้ว — ไม่สามารถอัปโหลดหรือแก้ไขได้อีก")
                        : t("ยังอัปโหลดไม่ได้ในสถานะนี้")}
                    </Typography.Text>
                  </div>
                )}

                <div className={styles.slipList}>
                  {slips.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t("ยังไม่มีสลิป")}
                    />
                  ) : (
                    slips.map((slip) => (
                      <div key={slip.id} className={styles.slipItem}>
                        <div className={styles.slipItemIcon}>
                          {isImageMime(slip.mimeType) ? (
                            <EyeOutlined />
                          ) : (
                            <FilePdfOutlined />
                          )}
                        </div>
                        <div className={styles.slipItemMeta}>
                          <strong>
                            {slip.originalFileName || t("สลิปจ่ายเงิน")}
                          </strong>
                          <span>
                            {formatFileSize(slip.fileSize)} ·{" "}
                            {formatDate(slip.createdAt)}
                            {slip.uploadedByName
                              ? ` · ${slip.uploadedByName}`
                              : ""}
                          </span>
                        </div>
                        <div className={styles.slipItemActions}>
                          <Button
                            size="small"
                            type="text"
                            icon={<EyeOutlined />}
                            loading={
                              previewLoading && previewSlip?.id === slip.id
                            }
                            onClick={() => void openSlipPreview(slip)}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={() => void downloadSlip(slip)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </section>

      <Modal
        open={Boolean(previewSlip)}
        title={previewSlip?.originalFileName || t("ดูสลิปจ่ายเงิน")}
        onCancel={() => {
          setPreviewSlip(null);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            disabled={!previewSlip}
            onClick={() => {
              if (previewSlip) {
                void downloadSlip(previewSlip);
              }
            }}
          >
            {t("ดาวน์โหลด")}
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setPreviewSlip(null);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
          >
            {t("ปิด")}
          </Button>,
        ]}
        width={720}
        destroyOnHidden
      >
        {previewLoading || !previewUrl ? (
          <Typography.Text type="secondary">{t("กำลังโหลด...")}</Typography.Text>
        ) : isImageMime(previewSlip?.mimeType) ? (
          <Image
            src={previewUrl}
            alt={previewSlip?.originalFileName || t("สลิป")}
            style={{ width: "100%" }}
          />
        ) : (
          <iframe
            title="payment-slip-preview"
            src={previewUrl}
            style={{ width: "100%", height: 480, border: "none" }}
          />
        )}
      </Modal>
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
