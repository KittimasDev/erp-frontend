"use client";

import { useEffect, useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  usePaymentVoucherDetailQuery,
  useRecalculateWhtMutation,
  useUpdateVoucherMutation,
  useVoucherActionMutation,
} from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  EXPRESS_STATUS_COLOR,
  EXPRESS_STATUS_LABEL,
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
} from "@/types/payment-vouchers";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";
import { useT } from "@/lib/i18n/useT";
import PaymentMethodFields, { bankLabel, paymentMethodLabel } from "./PaymentMethodFields";
import PvAttachmentsPanel from "./PvAttachmentsPanel";
import {
  ApAllocationTable,
  EventsTimeline,
  PeopleCard,
  ReferenceCard,
  SummaryCard,
  SupplierCard,
  TaxCard,
} from "./VoucherSections";
import { tFin, PV_BASE_PATH,
  PV_PAYMENT_RECORDS_PATH,
  fmtMoney,
  kindLabel,
  referenceLine, } from "./paymentVoucherUtils";
import PageHeader from "@/components/common/PageHeader";

type EditValues = {
  voucherDate: Dayjs;
  paymentMethod: string;
  desiredPayDate?: Dayjs;
  companyBankAccountId?: string;
  remark?: string;
};

const EDITABLE = ["DRAFT", "REJECTED"];

/** รายละเอียด/แก้ไขใบสำคัญจ่าย — Layout เดียวกับหน้าสร้าง เปลี่ยนเป็น read-only ตามสถานะ */
export default function PaymentVoucherDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_VOUCHERS");
  const query = usePaymentVoucherDetailQuery(id);
  const update = useUpdateVoucherMutation();
  const action = useVoucherActionMutation();
  const recalcWht = useRecalculateWhtMutation();
  const [form] = Form.useForm<EditValues>();
  const [reasonFor, setReasonFor] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const d = query.data?.data;
  const v = d?.voucher;
  const editable = Boolean(v && EDITABLE.includes(v.status) && perms.canEdit);

  useEffect(() => {
    if (!d || !v || !editable) return;
    form.setFieldsValue({
      voucherDate: dayjs(v.voucherDate),
      paymentMethod: v.paymentMethod,
      desiredPayDate: d.desiredPayDate ? dayjs(d.desiredPayDate) : undefined,
      companyBankAccountId: d.bankAccount?.id,
      remark: v.remark,
    });
  }, [d, v, form, editable]);

  if (query.isLoading) return <Spin />;
  if (!d || !v) return <Alert type="error" showIcon title={t("ไม่พบใบสำคัญจ่าย")} />;

  const status = v.status;
  const run = (a: "submit" | "review" | "approve") => action.mutate({ id, action: a });
  const handlePrintPdf = async () => {
    setPdfLoading(true);
    try {
      const { generatePaymentVoucherPdf } = await import("@/utils/generatePaymentVoucherPdf");
      await generatePaymentVoucherPdf(d);
    } finally {
      setPdfLoading(false);
    }
  };

  const saveEdit = async (thenSubmit: boolean) => {
    const vals = await form.validateFields();
    try {
      await update.mutateAsync({
        id,
        body: {
          voucherDate: vals.voucherDate.format("YYYY-MM-DD"),
          paymentMethod: vals.paymentMethod,
          desiredPayDate: vals.desiredPayDate?.format("YYYY-MM-DD"),
          companyBankAccountId: vals.companyBankAccountId,
          remark: vals.remark?.trim() ?? "",
        },
      });
      if (thenSubmit) run("submit");
    } catch {
      // error แสดงโดย mutation แล้ว
    }
  };

  const submitReason = () => {
    if (!reasonFor) return;
    action.mutate(
      { id, action: reasonFor, reason: reason.trim() },
      {
        onSuccess: () => {
          setReasonFor(null);
          setReason("");
        },
      },
    );
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{v.voucherNo}</>}
        subtitle={<><Typography.Text type="secondary">{t("อ้างอิง")} {referenceLine(d) || "—"}</Typography.Text></>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PV_BASE_PATH)}>
                {t("กลับ")}
              </Button>
          </>
        }
        meta={
          <>
<Tag color={VOUCHER_STATUS_COLOR[status]}>{VOUCHER_STATUS_LABEL[status] ? tFin(VOUCHER_STATUS_LABEL[status]) : status}</Tag>
          </>
        }
        actions={
          <>
            <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={() => void handlePrintPdf()}>
              {t("พิมพ์ PDF")}
            </Button>
            {editable && perms.canEdit && d.whtCheck && d.whtCheck.status !== "NOT_APPLICABLE" ? (
              <Button
                loading={recalcWht.isPending}
                onClick={() =>
                  Modal.confirm({
                    title: t("คำนวณ WHT ใหม่จากใบตั้งหนี้?"),
                    content: t("WHT ปัจจุบัน {current} บาท → ที่คำนวณได้ {expected} บาท · ระบบจะปรับยอด WHT ยอดโอนสุทธิ และรายการแยกให้สอดคล้องกัน", { current: fmtMoney(d.whtCheck!.currentWht), expected: fmtMoney(d.whtCheck!.expectedWht) }),
                    okText: t("คำนวณใหม่"),
                    cancelText: t("ยกเลิก"),
                    onOk: () => recalcWht.mutateAsync(id),
                  })
                }
              >
                {t("คำนวณ WHT ใหม่")}
              </Button>
            ) : null}
            {editable && perms.canEdit ? (
              <>
                <Button loading={update.isPending} onClick={() => void saveEdit(false)}>
                  {status === "REJECTED" ? t("บันทึกการแก้ไข") : t("แก้ไข (บันทึกร่าง)")}
                </Button>
                <Button type="primary" loading={action.isPending || update.isPending} onClick={() => void saveEdit(true)}>
                  {status === "REJECTED" ? t("ส่งอนุมัติใหม่") : t("ส่งอนุมัติ")}
                </Button>
              </>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canEdit ? (
              <Button loading={action.isPending} onClick={() => run("review")}>
                {t("บันทึกการตรวจสอบ")}
              </Button>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canApprove ? (
              <>
                <Button type="primary" loading={action.isPending} onClick={() => run("approve")}>
                  {t("อนุมัติ")}
                </Button>
                <Button danger onClick={() => setReasonFor("reject")}>
                  {t("ไม่อนุมัติ")}
                </Button>
              </>
            ) : null}
            {status === "APPROVED" ? (
              <Link href={PV_PAYMENT_RECORDS_PATH}>
                <Button type="primary">{t("ไปบันทึกจ่ายเงิน")}</Button>
              </Link>
            ) : null}
            {["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED"].includes(status) && perms.canEdit ? (
              <Button danger onClick={() => setReasonFor("cancel")}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          
          </>
        }
      />

      {status === "REJECTED" && d.rejectReason ? (
        <Alert type="error" showIcon title={t("ไม่อนุมัติ — แก้ไขแล้วส่งอนุมัติใหม่ได้")} description={d.rejectReason} />
      ) : null}
      {d.whtCheck?.status === "MISMATCH" ? (
        <Alert
          type="warning"
          showIcon
          title={
            editable
              ? t("WHT ของ PV ไม่ตรงกับที่คำนวณจากใบตั้งหนี้ — กด \"คำนวณ WHT ใหม่\" ก่อนส่งอนุมัติ")
              : t("แผน WHT จากใบตั้งหนี้เปลี่ยนไปจากที่บันทึกใน PV — โปรดตรวจสอบ")
          }
          description={
            <>
              <div>
                {t("WHT ปัจจุบัน {current} บาท · ที่คำนวณได้ {expected} บาท", { current: fmtMoney(d.whtCheck.currentWht), expected: fmtMoney(d.whtCheck.expectedWht) })}
              </div>
              {d.whtCheck.items
                .filter((i) => i.mismatch)
                .map((i) => (
                  <div key={i.apDocumentId}>
                    {i.apDocumentNo ?? i.apDocumentId}: {fmtMoney(i.currentWht)} → {fmtMoney(i.expectedWht)}
                  </div>
                ))}
            </>
          }
        />
      ) : null}
      {status === "CANCELLED" ? (
        <Alert type="warning" showIcon title={t("ยกเลิกใบสำคัญจ่ายแล้ว")} description={d.cancelReason} />
      ) : null}
      {status === "APPROVED" ? (
        <Alert
          type="info"
          showIcon
          title={t("อนุมัติแล้ว — ปรากฏในเมนูบันทึกจ่ายเงินแล้ว ไม่ต้องอนุมัติซ้ำและไม่ต้องรอ Export Express")}
        />
      ) : null}

      <Card title={t("1. ข้อมูลเอกสารและสถานะ")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("เลขที่ PV")}>{v.voucherNo}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่เอกสาร")}>{dayjs(v.voucherDate).format("DD/MM/BBBB")}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทการจ่าย")}>{kindLabel(v.paymentKind)}</Descriptions.Item>
          <Descriptions.Item label={t("สถานะ PV")}>
            <Tag color={VOUCHER_STATUS_COLOR[status]}>{VOUCHER_STATUS_LABEL[status] ? tFin(VOUCHER_STATUS_LABEL[status]) : status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("สถานะ Express")} span="filled">
            <Tag color={EXPRESS_STATUS_COLOR[d.expressStatus]}>{EXPRESS_STATUS_LABEL[d.expressStatus] ? tFin(EXPRESS_STATUS_LABEL[d.expressStatus]) : d.expressStatus}</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("แสดงข้อมูลอย่างเดียว ไม่เป็นเงื่อนไขการอนุมัติหรือจ่ายเงิน")}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <ReferenceCard info={d} sourceType={v.sourceType ?? "PURCHASE_ORDER"} purchaseOrderId={v.purchaseOrderId} />
      <SupplierCard supplier={d.supplier} />

      <Card title={t("4. รายละเอียดการจ่ายและรายการ AP ที่เกี่ยวข้อง")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("ยอดเอกสารต้นทาง")}>{fmtMoney(d.sourceDocumentAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ออก PV ไปแล้ว")}>{fmtMoney(d.issuedPvAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดคงเหลือที่ออก PV ได้")}>{fmtMoney(d.remainingIssuable)}</Descriptions.Item>
          <Descriptions.Item label={t("จำนวนเงินที่ต้องการจ่าย")} span="filled">
            <Typography.Text strong>{fmtMoney(v.totalAmount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
        <ApAllocationTable rows={d.apDocuments} />
      </Card>

      <TaxCard vat={d.vatAmount} whtBase={d.whtBaseAmount} whtRate={d.whtRate} whtAmount={v.whtAmount} net={v.netAmount} whtLines={d.whtLines} />
      <SummaryCard info={d} amount={v.totalAmount} wht={v.whtAmount} net={v.netAmount} />

      <Card title={t("7. วิธีชำระเงินและบัญชีที่ใช้จ่าย")} size="small">
        {editable ? (
          <Form form={form} layout="vertical">
            <PaymentMethodFields bankAccounts={d.bankAccounts} />
          </Form>
        ) : (
          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label={t("วิธีชำระ")}>{paymentMethodLabel(v.paymentMethod)}</Descriptions.Item>
            <Descriptions.Item label={t("วันที่ต้องการจ่าย")}>
              {d.desiredPayDate ? dayjs(d.desiredPayDate).format("DD/MM/BBBB") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("ธนาคาร / บัญชีที่ใช้จ่าย")} span="filled">
              {bankLabel(d.bankAccount)}
            </Descriptions.Item>
            <Descriptions.Item label={t("หมายเหตุ")} span="filled">
              {v.remark || "—"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title={t("8. เอกสารแนบ / หลักฐานประกอบ")} size="small">
        <PvAttachmentsPanel voucherId={id} canEdit={editable} />
        {!editable ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("แนบ/ลบไฟล์ได้เฉพาะสถานะร่างหรือไม่อนุมัติ · หลักฐานการโอนจริงบันทึกที่เมนูบันทึกจ่ายเงิน")}
          </Typography.Text>
        ) : null}
      </Card>

      <Card title={t("9. ผู้ดำเนินการและประวัติการอนุมัติ")} size="small">
        <PeopleCard
          createdBy={d.createdByAction}
          submittedBy={d.submittedByAction}
          reviewedBy={d.reviewedByAction}
          approvedBy={d.approvedByAction}
          rejectedBy={d.rejectedByAction}
          cancelledBy={d.cancelledByAction}
        />
        <EventsTimeline events={d.events} />
      </Card>

      <ESignatureHistoryCard documentId={id} />
      {status === "PAID" ? (
        <Card title={t("10. ข้อมูลการจ่ายเงินจริง")} size="small">
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={v.payments}
            columns={[
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("วันที่จ่าย"), dataIndex: "paymentDate", render: (x: string) => dayjs(x).format("DD/MM/BBBB") },
              { title: t("วิธีจ่าย"), dataIndex: "paymentMethod", render: (x: string) => SUPPLIER_PAYMENT_METHOD_LABEL[x] ? tFin(SUPPLIER_PAYMENT_METHOD_LABEL[x]) : x },
              { title: t("ยอดจ่ายจริง"), dataIndex: "amount", align: "right" as const, render: (x: string) => fmtMoney(x) },
              { title: t("เลขอ้างอิงการโอน"), dataIndex: "transactionRef", render: (x?: string) => x ?? "—" },
              { title: t("ผู้บันทึก"), key: "by", render: (_x: unknown, r: { paidBy?: { displayName: string } }) => r.paidBy?.displayName ?? "—" },
            ]}
          />
        </Card>
      ) : null}

      <Modal
        open={reasonFor !== null}
        title={reasonFor === "reject" ? t("ไม่อนุมัติใบสำคัญจ่าย") : t("ยกเลิกใบสำคัญจ่าย")}
        okText={reasonFor === "reject" ? t("ไม่อนุมัติ") : t("ยกเลิกใบสำคัญจ่าย")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText={t("ปิด")}
        confirmLoading={action.isPending}
        onOk={submitReason}
        onCancel={() => {
          setReasonFor(null);
          setReason("");
        }}
        destroyOnHidden
      >
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={t("เหตุผล (อย่างน้อย 5 ตัวอักษร)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {reasonFor === "cancel" ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("ยกเลิกก่อนจ่ายเงินจริง — คืนรายการกลับเข้าคิวรอสร้างใบสำคัญจ่าย และคืนยอดที่จองไว้ให้เอกสารต้นทาง")}
          </Typography.Text>
        ) : null}
      </Modal>
    </Space>
  );
}
