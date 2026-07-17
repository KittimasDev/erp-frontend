"use client";

import { useEffect, useMemo } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Steps,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useRawTirePaymentQuery } from "@/hooks/raw-tire-payment/useRawTirePaymentQuery";
import { useWeighbridgeTicketQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import {
  useWeighInMutation,
  useWeighOutMutation,
} from "@/hooks/weighbridge-tickets/useWeighTicketMutations";

import styles from "./WeighbridgeDashboardPage.module.css";

const DISPLAY_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WEIGHED_OUT: "ชั่งออกแล้ว",
  CANCELLED: "ยกเลิก",
  CLOSED: "ปิดแล้ว",
};

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายเงินแล้ว",
};

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  STOCK_POSTED: "รับเข้าสต๊อกแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

type WeighFormValues = {
  weightKg: number;
  isManual: boolean;
  reason?: string;
  remark?: string;
};

type PaymentView = {
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  paymentStatus?: string;
  flowState?: string;
  displayStatus?: string;
  grossWeightKg?: string;
};

function formatWeight(value?: string) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("th-TH");
}

function isPaymentPaid(view: PaymentView) {
  return (
    view.paymentStatus === "PAID" || view.flowState === "PAYMENT_PAID"
  );
}

function isPaymentReady(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return false;
  }
  return (
    view.flowState === "WAITING_PAYMENT" ||
    (view.receiptStatus === "CONFIRMED" && view.paymentStatus !== "PAID")
  );
}

function hasActiveReceipt(view: PaymentView) {
  return Boolean(view.receiptId) && view.receiptStatus !== "CANCELLED";
}

function resolveStep(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return 4;
  }
  if (isPaymentReady(view)) {
    return 3;
  }
  if (view.receiptId || view.displayStatus === "WEIGHED_OUT") {
    return 2;
  }
  if (
    view.displayStatus === "WAITING_WEIGH_OUT" ||
    Number(view.grossWeightKg) > 0
  ) {
    return 1;
  }
  return 0;
}

function resolvePaymentStatusLabel(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return PAYMENT_STATUS_LABELS.PAID;
  }
  if (view.paymentStatus) {
    return PAYMENT_STATUS_LABELS[view.paymentStatus] ?? view.paymentStatus;
  }
  if (hasActiveReceipt(view)) {
    return PAYMENT_STATUS_LABELS.UNPAID;
  }
  return "ยังไม่มีใบรับซื้อ";
}

type Props = {
  ticketId: string;
};

export default function WeighbridgeTicketDetailPage({ ticketId }: Props) {
  const router = useRouter();
  const [weighInForm] = Form.useForm<WeighFormValues>();
  const [weighOutForm] = Form.useForm<WeighFormValues>();
  const weighInManual = Form.useWatch("isManual", weighInForm);
  const weighOutManual = Form.useWatch("isManual", weighOutForm);

  const ticketQuery = useWeighbridgeTicketQuery(ticketId);
  const weighInMutation = useWeighInMutation(ticketId);
  const weighOutMutation = useWeighOutMutation(ticketId);
  const ticket = ticketQuery.data?.data;

  const paymentQuery = useRawTirePaymentQuery(ticket?.receiptId ?? "");
  const paymentReceipt = paymentQuery.data?.data?.receipt;
  const paymentVoucher = paymentQuery.data?.data?.voucher;

  const paymentView = useMemo<PaymentView | null>(() => {
    if (!ticket) {
      return null;
    }
    const paymentStatus =
      paymentReceipt?.paymentStatus ?? ticket.receiptPaymentStatus;
    return {
      receiptId: ticket.receiptId,
      receiptNo: paymentReceipt?.receiptNo ?? ticket.receiptNo,
      receiptStatus: paymentReceipt?.status ?? ticket.receiptStatus,
      paymentStatus,
      flowState:
        paymentStatus === "PAID" ? "PAYMENT_PAID" : ticket.flowState,
      displayStatus: ticket.displayStatus,
      grossWeightKg: ticket.grossWeightKg,
    };
  }, [ticket, paymentReceipt]);

  const currentStep = useMemo(
    () => (paymentView ? resolveStep(paymentView) : 0),
    [paymentView],
  );

  const paid = paymentView ? isPaymentPaid(paymentView) : false;
  const readyToPay = paymentView ? isPaymentReady(paymentView) : false;
  const hasReceipt = paymentView ? hasActiveReceipt(paymentView) : false;

  const canSubmitWeighIn = Boolean(
    ticket?.canWeighIn || ticket?.canEditWeighIn,
  );
  const canSubmitWeighOut = Boolean(
    ticket?.canWeighOut || ticket?.canEditWeighOut,
  );
  const isEditingWeighIn = Boolean(ticket?.canEditWeighIn);
  const isEditingWeighOut = Boolean(ticket?.canEditWeighOut);
  const weightEditWillResetReceipt = Boolean(ticket?.receiptId);

  useEffect(() => {
    if (!ticket) {
      return;
    }
    if (ticket.canEditWeighIn || ticket.canWeighIn) {
      weighInForm.setFieldsValue({
        weightKg:
          Number(ticket.grossWeightKg) > 0
            ? Number(ticket.grossWeightKg)
            : undefined,
        isManual: true,
        reason: ticket.canEditWeighIn ? "แก้ไขน้ำหนักเข้า" : undefined,
        remark: ticket.weighInRemark || undefined,
      });
    }
    if (ticket.canEditWeighOut || ticket.canWeighOut) {
      weighOutForm.setFieldsValue({
        weightKg:
          ticket.weighOutAt && Number(ticket.tareWeightKg) > 0
            ? Number(ticket.tareWeightKg)
            : undefined,
        isManual: true,
        reason: ticket.canEditWeighOut ? "แก้ไขน้ำหนักออก" : undefined,
        remark: ticket.weighOutRemark || undefined,
      });
    }
  }, [ticket, weighInForm, weighOutForm]);

  const handleWeighIn = async (values: WeighFormValues) => {
    await weighInMutation.mutateAsync({
      weightKg: values.weightKg,
      isManual: Boolean(values.isManual),
      reason: values.isManual
        ? values.reason?.trim() ||
          (isEditingWeighIn ? "แก้ไขน้ำหนักเข้า" : undefined)
        : undefined,
      remark: values.remark?.trim() || undefined,
    });
  };

  const handleWeighOut = async (values: WeighFormValues) => {
    await weighOutMutation.mutateAsync({
      weightKg: values.weightKg,
      isManual: Boolean(values.isManual),
      reason: values.isManual
        ? values.reason?.trim() ||
          (isEditingWeighOut ? "แก้ไขน้ำหนักออก" : undefined)
        : undefined,
      remark: values.remark?.trim() || undefined,
    });
  };

  return (
    <MasterPageGate isLoading={ticketQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/receiving")}
          >
            กลับภาพรวม
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={ticketQuery.isFetching || paymentQuery.isFetching}
            onClick={() => {
              void ticketQuery.refetch();
              void paymentQuery.refetch();
            }}
          >
            รีเฟรช
          </Button>
        </div>

        {ticketQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {ticketQuery.error instanceof Error
                  ? ticketQuery.error.message
                  : "โหลดรายละเอียดไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : ticket ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>ชั่งน้ำหนักรับซื้อยาง</h3>
                    <p>
                      เลขที่ตั๋ว {ticket.ticketNo} · สถานะตั๋ว {ticket.status}
                    </p>
                  </div>
                  <Tag className={styles.flowTag}>
                    {paid
                      ? FLOW_LABELS.PAYMENT_PAID
                      : (FLOW_LABELS[ticket.flowState ?? ""] ??
                        DISPLAY_LABELS[ticket.displayStatus] ??
                        ticket.displayStatus)}
                  </Tag>
                </div>
              </div>
              <div className={styles.cardBody}>
                <Steps
                  current={Math.min(currentStep, 3)}
                  status={paid ? "finish" : "process"}
                  items={[
                    { title: "ชั่งเข้า" },
                    { title: "ชั่งออก" },
                    { title: "คัดแยก / ใบรับซื้อ" },
                    { title: "จ่ายเงิน" },
                  ]}
                />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>ข้อมูลตั๋วชั่ง</h3>
                <p>ผู้ขาย รถ คนขับ และเครื่องชั่ง</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.ticketInfoLayout}>
                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>ตั๋ว / ผู้ขาย</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>เลขที่ตั๋วชั่ง</span>
                        <strong>{ticket.ticketNo}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>วันที่เปิดตั๋ว</span>
                        <strong>{formatDateTime(ticket.createdAt)}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>ผู้ขาย</span>
                        <strong>{ticket.sellerName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>รหัสผู้ขาย</span>
                        <strong>{ticket.sellerCode || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>สถานะงาน</span>
                        <strong>
                          {DISPLAY_LABELS[ticket.displayStatus] ??
                            ticket.displayStatus}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>รถ / เครื่องชั่ง</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>ทะเบียนรถ</span>
                        <strong>{ticket.truckLicensePlate || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>จังหวัด</span>
                        <strong>{ticket.truckProvince || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>คนขับ</span>
                        <strong>{ticket.driverName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>เบอร์โทรคนขับ</span>
                        <strong>{ticket.driverPhone || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>เครื่องชั่ง</span>
                        <strong>
                          {ticket.scaleName
                            ? `${ticket.scaleCode ? `${ticket.scaleCode} · ` : ""}${ticket.scaleName}`
                            : "-"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {(Number(ticket.grossWeightKg) > 0 ||
                  Number(ticket.tareWeightKg) > 0 ||
                  Number(ticket.netWeightKg) > 0) && (
                  <div className={styles.ticketWeightCards}>
                    <div className={styles.ticketWeightCard}>
                      <span>น้ำหนักเข้า</span>
                      <strong>
                        {formatWeight(ticket.grossWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                    <div className={styles.ticketWeightCard}>
                      <span>น้ำหนักออก</span>
                      <strong>
                        {formatWeight(ticket.tareWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                    <div
                      className={`${styles.ticketWeightCard} ${styles.ticketWeightNet}`}
                    >
                      <span>น้ำหนักสุทธิ</span>
                      <strong>
                        {formatWeight(ticket.netWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.weighStepsStack}>
              <div className={styles.weighGrid}>
                <div
                  className={[
                    styles.stepCard,
                    currentStep === 0 ? styles.stepCardActive : "",
                    Number(ticket.grossWeightKg) > 0 ? styles.stepCardDone : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.stepCardHeader}>
                    <div className={styles.stepCardHeaderMain}>
                      <div
                        className={[
                          styles.stepBadge,
                          currentStep === 0 ? styles.stepBadgeActive : "",
                          Number(ticket.grossWeightKg) > 0
                            ? styles.stepBadgeDone
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        1
                      </div>
                      <div className={styles.stepCardTitle}>
                        <h3>Step 1 · น้ำหนักเข้า</h3>
                        <p>บันทึกน้ำหนักเมื่อรถเข้าชั่ง (Gross)</p>
                      </div>
                    </div>
                    <Tag
                      className={styles.stepStatusTag}
                      color={
                        Number(ticket.grossWeightKg) > 0
                          ? "success"
                          : currentStep === 0
                            ? "processing"
                            : "default"
                      }
                    >
                      {Number(ticket.grossWeightKg) > 0
                        ? "เสร็จแล้ว"
                        : currentStep === 0
                          ? "กำลังทำ"
                          : "รอทำ"}
                    </Tag>
                  </div>
                  <div className={styles.stepCardBody}>
                    {canSubmitWeighIn ? (
                      <Form
                        form={weighInForm}
                        layout="vertical"
                        className={styles.weighFormInline}
                        initialValues={{ isManual: true }}
                        onFinish={handleWeighIn}
                        requiredMark="optional"
                      >
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักเข้า (กก.)</span>
                            <Form.Item
                              name="weightKg"
                              rules={[
                                {
                                  required: true,
                                  message: "กรุณากรอกน้ำหนักเข้า",
                                },
                              ]}
                            >
                              <InputNumber
                                min={0.001}
                                step={0.001}
                                precision={3}
                                size="large"
                                className={styles.stepMetaInput}
                                placeholder="เช่น 18500.500"
                              />
                            </Form.Item>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งเข้า</span>
                            <strong>{formatDateTime(ticket.weighInAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>
                              {isEditingWeighIn
                                ? ticket.weighInReadSource || "กรอกเอง"
                                : "กรอกเอง"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <Form.Item name="remark">
                              <Input.TextArea
                                className={styles.stepMetaTextArea}
                                rows={2}
                                placeholder="หมายเหตุเพิ่มเติม"
                              />
                            </Form.Item>
                          </div>
                        </div>

                        <div className={styles.stepMetaControls}>
                          <div className={styles.stepMetaControlItem}>
                            <span>กรอกน้ำหนักเอง</span>
                            <Form.Item name="isManual" valuePropName="checked">
                              <Switch
                                checkedChildren="ใช่"
                                unCheckedChildren="ไม่"
                              />
                            </Form.Item>
                          </div>
                          {weighInManual ? (
                            <div
                              className={`${styles.stepMetaControlItem} ${styles.stepMetaControlFull}`}
                            >
                              <span>เหตุผลการกรอกเอง</span>
                              <Form.Item
                                name="reason"
                                rules={
                                  isEditingWeighIn
                                    ? undefined
                                    : [
                                        {
                                          required: true,
                                          message:
                                            "กรุณาระบุเหตุผลการกรอกเอง",
                                        },
                                      ]
                                }
                              >
                                <Input.TextArea
                                  rows={2}
                                  placeholder="เช่น เครื่องชั่งยังไม่เชื่อมต่อ"
                                />
                              </Form.Item>
                            </div>
                          ) : null}
                        </div>

                        {weightEditWillResetReceipt ? (
                          <div className={styles.stepEmptyHint}>
                            แก้ไขน้ำหนักแล้ว ระบบจะยกเลิกใบรับซื้อปัจจุบัน
                            และต้องคัดแยก / สร้างใบรับซื้อใหม่ที่ Step 3
                          </div>
                        ) : null}

                        <div className={styles.weighActions}>
                          <Button disabled>อ่านน้ำหนักจากเครื่องชั่ง</Button>
                          {weightEditWillResetReceipt ? (
                            <Popconfirm
                              title={
                                isEditingWeighIn
                                  ? "ยืนยันแก้ไขน้ำหนักเข้า"
                                  : "ยืนยันบันทึกชั่งเข้า"
                              }
                              description="ใบรับซื้อที่มีอยู่จะถูกยกเลิก และต้องทำ Step 3 คัดแยกใหม่"
                              okText="ยืนยัน"
                              cancelText="ยกเลิก"
                              onConfirm={() => void weighInForm.submit()}
                            >
                              <Button
                                type="primary"
                                className={styles.submitButton}
                                loading={weighInMutation.isPending}
                              >
                                {isEditingWeighIn
                                  ? "บันทึกการแก้ไขชั่งเข้า"
                                  : "บันทึกชั่งเข้า"}
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Button
                              type="primary"
                              htmlType="submit"
                              className={styles.submitButton}
                              loading={weighInMutation.isPending}
                            >
                              {isEditingWeighIn
                                ? "บันทึกการแก้ไขชั่งเข้า"
                                : "บันทึกชั่งเข้า"}
                            </Button>
                          )}
                        </div>
                      </Form>
                    ) : (
                      <>
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักเข้า</span>
                            <strong>
                              {formatWeight(ticket.grossWeightKg)} กก.
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งเข้า</span>
                            <strong>{formatDateTime(ticket.weighInAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>{ticket.weighInReadSource || "-"}</strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <strong>{ticket.weighInRemark || "-"}</strong>
                          </div>
                        </div>
                        {paid ? (
                          <div className={styles.stepEmptyHint}>
                            จ่ายเงินแล้ว ไม่สามารถแก้ไขน้ำหนักเข้าได้
                          </div>
                        ) : Number(ticket.grossWeightKg) <= 0 ? (
                          <div className={styles.stepEmptyHint}>
                            ไม่สามารถบันทึกชั่งเข้าได้ในสถานะนี้
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={[
                    styles.stepCard,
                    currentStep === 1 ? styles.stepCardActive : "",
                    ticket.weighOutAt ? styles.stepCardDone : "",
                    !ticket.canWeighOut && !ticket.weighOutAt
                      ? styles.stepCardLocked
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.stepCardHeader}>
                    <div className={styles.stepCardHeaderMain}>
                      <div
                        className={[
                          styles.stepBadge,
                          currentStep === 1 ? styles.stepBadgeActive : "",
                          ticket.weighOutAt ? styles.stepBadgeDone : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        2
                      </div>
                      <div className={styles.stepCardTitle}>
                        <h3>Step 2 · น้ำหนักออก</h3>
                        <p>บันทึกน้ำหนักหลังถ่ายยาง (Tare) แล้วคำนวณสุทธิ</p>
                      </div>
                    </div>
                    <Tag
                      className={styles.stepStatusTag}
                      color={
                        ticket.weighOutAt
                          ? "success"
                          : currentStep === 1
                            ? "processing"
                            : "default"
                      }
                    >
                      {ticket.weighOutAt
                        ? "เสร็จแล้ว"
                        : currentStep === 1
                          ? "กำลังทำ"
                          : "รอทำ"}
                    </Tag>
                  </div>
                  <div className={styles.stepCardBody}>
                    {canSubmitWeighOut ? (
                      <Form
                        form={weighOutForm}
                        layout="vertical"
                        className={styles.weighFormInline}
                        initialValues={{ isManual: true }}
                        onFinish={handleWeighOut}
                        requiredMark="optional"
                      >
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักออก (กก.)</span>
                            <Form.Item
                              name="weightKg"
                              rules={[
                                {
                                  required: true,
                                  message: "กรุณากรอกน้ำหนักออก",
                                },
                              ]}
                            >
                              <InputNumber
                                min={0.001}
                                step={0.001}
                                precision={3}
                                size="large"
                                className={styles.stepMetaInput}
                                placeholder="เช่น 8500.250"
                              />
                            </Form.Item>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักสุทธิ</span>
                            <strong>
                              {isEditingWeighOut
                                ? `จะคำนวณใหม่หลังบันทึก (เข้า ${formatWeight(ticket.grossWeightKg)} กก.)`
                                : `จะคำนวณหลังบันทึก (เข้า ${formatWeight(ticket.grossWeightKg)} กก.)`}
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งออก</span>
                            <strong>{formatDateTime(ticket.weighOutAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>
                              {isEditingWeighOut
                                ? ticket.weighOutReadSource || "กรอกเอง"
                                : "กรอกเอง"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <Form.Item name="remark">
                              <Input.TextArea
                                className={styles.stepMetaTextArea}
                                rows={2}
                                placeholder="หมายเหตุเพิ่มเติม"
                              />
                            </Form.Item>
                          </div>
                        </div>

                        <div className={styles.stepMetaControls}>
                          <div className={styles.stepMetaControlItem}>
                            <span>กรอกน้ำหนักเอง</span>
                            <Form.Item name="isManual" valuePropName="checked">
                              <Switch
                                checkedChildren="ใช่"
                                unCheckedChildren="ไม่"
                              />
                            </Form.Item>
                          </div>
                          {weighOutManual ? (
                            <div
                              className={`${styles.stepMetaControlItem} ${styles.stepMetaControlFull}`}
                            >
                              <span>เหตุผลการกรอกเอง</span>
                              <Form.Item
                                name="reason"
                                rules={
                                  isEditingWeighOut
                                    ? undefined
                                    : [
                                        {
                                          required: true,
                                          message:
                                            "กรุณาระบุเหตุผลการกรอกเอง",
                                        },
                                      ]
                                }
                              >
                                <Input.TextArea
                                  rows={2}
                                  placeholder="เช่น อ่านค่าจากหน้าจอเครื่องชั่ง"
                                />
                              </Form.Item>
                            </div>
                          ) : null}
                        </div>

                        {weightEditWillResetReceipt ? (
                          <div className={styles.stepEmptyHint}>
                            แก้ไขน้ำหนักแล้ว ระบบจะยกเลิกใบรับซื้อปัจจุบัน
                            และต้องคัดแยก / สร้างใบรับซื้อใหม่ที่ Step 3
                          </div>
                        ) : null}

                        <div className={styles.weighActions}>
                          <Button disabled>อ่านน้ำหนักจากเครื่องชั่ง</Button>
                          {weightEditWillResetReceipt ? (
                            <Popconfirm
                              title={
                                isEditingWeighOut
                                  ? "ยืนยันแก้ไขน้ำหนักออก"
                                  : "ยืนยันบันทึกชั่งออก"
                              }
                              description="ใบรับซื้อที่มีอยู่จะถูกยกเลิก และต้องทำ Step 3 คัดแยกใหม่"
                              okText="ยืนยัน"
                              cancelText="ยกเลิก"
                              onConfirm={() => void weighOutForm.submit()}
                            >
                              <Button
                                type="primary"
                                className={styles.submitButton}
                                loading={weighOutMutation.isPending}
                              >
                                {isEditingWeighOut
                                  ? "บันทึกการแก้ไขชั่งออก"
                                  : "บันทึกชั่งออก"}
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Button
                              type="primary"
                              htmlType="submit"
                              className={styles.submitButton}
                              loading={weighOutMutation.isPending}
                            >
                              {isEditingWeighOut
                                ? "บันทึกการแก้ไขชั่งออก"
                                : "บันทึกชั่งออก"}
                            </Button>
                          )}
                        </div>
                      </Form>
                    ) : (
                      <>
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักออก</span>
                            <strong>
                              {ticket.weighOutAt
                                ? `${formatWeight(ticket.tareWeightKg)} กก.`
                                : "-"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักสุทธิ</span>
                            <strong>
                              {ticket.weighOutAt
                                ? `${formatWeight(ticket.netWeightKg)} กก.`
                                : "-"}
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งออก</span>
                            <strong>{formatDateTime(ticket.weighOutAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>{ticket.weighOutReadSource || "-"}</strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <strong>{ticket.weighOutRemark || "-"}</strong>
                          </div>
                        </div>
                        {paid ? (
                          <div className={styles.stepEmptyHint}>
                            จ่ายเงินแล้ว ไม่สามารถแก้ไขน้ำหนักออกได้
                          </div>
                        ) : !ticket.weighOutAt ? (
                          <div className={styles.stepEmptyHint}>
                            ต้องบันทึกชั่งเข้าก่อน จึงจะชั่งออกได้
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 2 ? styles.stepCardActive : "",
                  ticket.receiptId ? styles.stepCardDone : "",
                  !(
                    ticket.displayStatus === "WEIGHED_OUT" || ticket.receiptId
                  )
                    ? styles.stepCardLocked
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepCardHeader}>
                  <div className={styles.stepCardHeaderMain}>
                    <div
                      className={[
                        styles.stepBadge,
                        currentStep === 2 ? styles.stepBadgeActive : "",
                        ticket.receiptId ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      3
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 3 · คัดแยกประเภทยาง / สร้างใบรับซื้อ</h3>
                      <p>
                        คัดแยกรายการยางและบันทึกก่อน จึงจะออกใบรับซื้อได้
                      </p>
                    </div>
                  </div>
                  <Tag
                    className={styles.stepStatusTag}
                    color={
                      ticket.receiptId
                        ? "success"
                        : currentStep === 2
                          ? "processing"
                          : "default"
                    }
                  >
                    {ticket.receiptId
                      ? "มีใบรับซื้อแล้ว"
                      : currentStep === 2
                        ? "พร้อมคัดแยก"
                        : "รอชั่งออก"}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>น้ำหนักสุทธิ</span>
                      <strong>
                        {ticket.weighOutAt
                          ? `${formatWeight(ticket.netWeightKg)} กก.`
                          : "-"}
                      </strong>
                    </div>
                    <div className={styles.stepMetaItem}>
                      <span>ใบรับซื้อ</span>
                      <strong>
                        {ticket.receiptNo
                          ? `${ticket.receiptNo} (${RECEIPT_STATUS_LABELS[ticket.receiptStatus ?? ""] ?? ticket.receiptStatus ?? "-"})`
                          : "ยังไม่มี — ต้องคัดแยกก่อน"}
                      </strong>
                    </div>
                  </div>

                  {ticket.displayStatus === "WEIGHED_OUT" ||
                  ticket.receiptId ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      {!ticket.receiptId ? (
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          onClick={() =>
                            router.push(
                              `/receiving/${ticketId}/classification`,
                            )
                          }
                        >
                          ไปคัดแยกประเภทยาง
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="primary"
                            className={styles.submitButton}
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${ticket.receiptId}`,
                              )
                            }
                          >
                            เปิดใบรับซื้อ {ticket.receiptNo}
                          </Button>
                          <Button
                            onClick={() =>
                              router.push(
                                `/receiving/${ticketId}/classification`,
                              )
                            }
                          >
                            แก้ไขการคัดแยก
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      บันทึกชั่งเข้าและชั่งออกให้ครบก่อน แล้วค่อยคัดแยกเพื่อสร้างใบรับซื้อ
                    </div>
                  )}
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 3 || (hasReceipt && !paid)
                    ? styles.stepCardActive
                    : "",
                  paid ? styles.stepCardDone : "",
                  !hasReceipt ? styles.stepCardLocked : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepCardHeader}>
                  <div className={styles.stepCardHeaderMain}>
                    <div
                      className={[
                        styles.stepBadge,
                        currentStep === 3 || readyToPay
                          ? styles.stepBadgeActive
                          : "",
                        paid ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      4
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 4 · จ่ายเงิน</h3>
                      <p>
                        บันทึกโอน/จ่ายเงินจริงให้ผู้ขาย — คนละขั้นตอนกับ
                        “ยืนยันยอดใบรับซื้อ”
                      </p>
                    </div>
                  </div>
                  <Tag
                    className={styles.stepStatusTag}
                    color={
                      paid
                        ? "success"
                        : readyToPay
                          ? "processing"
                          : hasReceipt
                            ? "warning"
                            : "default"
                    }
                  >
                    {paid
                      ? "จ่ายเงินแล้ว"
                      : readyToPay
                        ? "รอจ่ายเงิน"
                        : hasReceipt
                          ? "รอยืนยันยอดก่อน"
                          : "รอมีใบรับซื้อ"}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>ใบรับซื้อ</span>
                      <strong>
                        {paymentView?.receiptNo
                          ? `${paymentView.receiptNo} (${RECEIPT_STATUS_LABELS[paymentView.receiptStatus ?? ""] ?? paymentView.receiptStatus ?? "-"})`
                          : "ยังไม่มี"}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>สถานะจ่ายเงิน</span>
                      <strong>
                        {paymentView
                          ? resolvePaymentStatusLabel(paymentView)
                          : "-"}
                        {paid && paymentVoucher?.voucherNo
                          ? ` · ${paymentVoucher.voucherNo}`
                          : ""}
                      </strong>
                    </div>
                  </div>

                  {paid ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/payment`,
                          )
                        }
                      >
                        ดูใบสำคัญจ่าย
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}`,
                          )
                        }
                      >
                        เปิดใบรับซื้อ
                      </Button>
                    </div>
                  ) : readyToPay ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/payment`,
                          )
                        }
                      >
                        จ่ายเงิน
                      </Button>
                    </div>
                  ) : hasReceipt ? (
                    <>
                      <div className={styles.stepEmptyHint}>
                        ใบรับซื้อยังเป็นร่าง — กด “ยืนยันยอดใบรับซื้อ” ในหน้ารายละเอียดก่อน
                        (ล็อกยอดน้ำหนัก/เงิน) แล้วค่อยกลับมาจ่ายเงินที่ Step นี้
                      </div>
                      <div className={styles.weighActions} style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          onClick={() =>
                            router.push(
                              `/receiving/receipts/${ticket.receiptId}`,
                            )
                          }
                        >
                          เปิดใบรับซื้อเพื่อยืนยันยอด
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      สร้างใบรับซื้อจาก Step 3 ก่อน แล้วค่อยยืนยันยอดและจ่ายเงิน
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
