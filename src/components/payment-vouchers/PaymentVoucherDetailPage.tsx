"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  usePaymentVoucherDetailQuery,
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
import {
  PV_BASE_PATH,
  PV_PAYMENT_RECORDS_PATH,
  fmtMoney,
  kindLabel,
  referenceLine,
} from "./paymentVoucherUtils";
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
  const router = useRouter();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_VOUCHERS");
  const query = usePaymentVoucherDetailQuery(id);
  const update = useUpdateVoucherMutation();
  const action = useVoucherActionMutation();
  const [form] = Form.useForm<EditValues>();
  const [reasonFor, setReasonFor] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const d = query.data?.data;
  const v = d?.voucher;
  const editable = Boolean(v && EDITABLE.includes(v.status) && perms.canEdit);

  useEffect(() => {
    if (!d || !v) return;
    form.setFieldsValue({
      voucherDate: dayjs(v.voucherDate),
      paymentMethod: v.paymentMethod,
      desiredPayDate: d.desiredPayDate ? dayjs(d.desiredPayDate) : undefined,
      companyBankAccountId: d.bankAccount?.id,
      remark: v.remark,
    });
  }, [d, v, form]);

  if (query.isLoading) return <Spin />;
  if (!d || !v) return <Alert type="error" showIcon title="ไม่พบใบสำคัญจ่าย" />;

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
        subtitle={<><Typography.Text type="secondary">อ้างอิง {referenceLine(d) || "—"}</Typography.Text></>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PV_BASE_PATH)}>
                กลับ
              </Button>
          </>
        }
        meta={
          <>
<Tag color={VOUCHER_STATUS_COLOR[status]}>{VOUCHER_STATUS_LABEL[status] ?? status}</Tag>
          </>
        }
        actions={
          <>
            <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={() => void handlePrintPdf()}>
              พิมพ์ PDF
            </Button>
            {editable && perms.canEdit ? (
              <>
                <Button loading={update.isPending} onClick={() => void saveEdit(false)}>
                  {status === "REJECTED" ? "บันทึกการแก้ไข" : "แก้ไข (บันทึกร่าง)"}
                </Button>
                <Button type="primary" loading={action.isPending || update.isPending} onClick={() => void saveEdit(true)}>
                  {status === "REJECTED" ? "ส่งอนุมัติใหม่" : "ส่งอนุมัติ"}
                </Button>
              </>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canEdit ? (
              <Button loading={action.isPending} onClick={() => run("review")}>
                บันทึกการตรวจสอบ
              </Button>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canApprove ? (
              <>
                <Button type="primary" loading={action.isPending} onClick={() => run("approve")}>
                  อนุมัติ
                </Button>
                <Button danger onClick={() => setReasonFor("reject")}>
                  ไม่อนุมัติ
                </Button>
              </>
            ) : null}
            {status === "APPROVED" ? (
              <Link href={PV_PAYMENT_RECORDS_PATH}>
                <Button type="primary">ไปบันทึกจ่ายเงิน</Button>
              </Link>
            ) : null}
            {["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED"].includes(status) && perms.canEdit ? (
              <Button danger onClick={() => setReasonFor("cancel")}>
                ยกเลิก
              </Button>
            ) : null}
          
          </>
        }
      />

      {status === "REJECTED" && d.rejectReason ? (
        <Alert type="error" showIcon title="ไม่อนุมัติ — แก้ไขแล้วส่งอนุมัติใหม่ได้" description={d.rejectReason} />
      ) : null}
      {status === "CANCELLED" ? (
        <Alert type="warning" showIcon title="ยกเลิกใบสำคัญจ่ายแล้ว" description={d.cancelReason} />
      ) : null}
      {status === "APPROVED" ? (
        <Alert
          type="info"
          showIcon
          title="อนุมัติแล้ว — ปรากฏในเมนูบันทึกจ่ายเงินแล้ว ไม่ต้องอนุมัติซ้ำและไม่ต้องรอ Export Express"
        />
      ) : null}

      <Card title="1. ข้อมูลเอกสารและสถานะ" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label="เลขที่ PV">{v.voucherNo}</Descriptions.Item>
          <Descriptions.Item label="วันที่เอกสาร">{dayjs(v.voucherDate).format("DD/MM/YYYY")}</Descriptions.Item>
          <Descriptions.Item label="ประเภทการจ่าย">{kindLabel(v.paymentKind)}</Descriptions.Item>
          <Descriptions.Item label="สถานะ PV">
            <Tag color={VOUCHER_STATUS_COLOR[status]}>{VOUCHER_STATUS_LABEL[status] ?? status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="สถานะ Express" span="filled">
            <Tag color={EXPRESS_STATUS_COLOR[d.expressStatus]}>{EXPRESS_STATUS_LABEL[d.expressStatus] ?? d.expressStatus}</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              แสดงข้อมูลอย่างเดียว ไม่เป็นเงื่อนไขการอนุมัติหรือจ่ายเงิน
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <ReferenceCard info={d} sourceType={v.sourceType ?? "PURCHASE_ORDER"} purchaseOrderId={v.purchaseOrderId} />
      <SupplierCard supplier={d.supplier} />

      <Card title="4. รายละเอียดการจ่ายและรายการ AP ที่เกี่ยวข้อง" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label="ยอดเอกสารต้นทาง">{fmtMoney(d.sourceDocumentAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ออก PV ไปแล้ว">{fmtMoney(d.issuedPvAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดคงเหลือที่ออก PV ได้">{fmtMoney(d.remainingIssuable)}</Descriptions.Item>
          <Descriptions.Item label="จำนวนเงินที่ต้องการจ่าย" span="filled">
            <Typography.Text strong>{fmtMoney(v.totalAmount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
        <ApAllocationTable rows={d.apDocuments} />
      </Card>

      <TaxCard vat={d.vatAmount} whtBase={d.whtBaseAmount} whtRate={d.whtRate} whtAmount={v.whtAmount} net={v.netAmount} whtLines={d.whtLines} />
      <SummaryCard info={d} amount={v.totalAmount} wht={v.whtAmount} net={v.netAmount} />

      <Card title="7. วิธีชำระเงินและบัญชีที่ใช้จ่าย" size="small">
        {editable ? (
          <Form form={form} layout="vertical">
            <PaymentMethodFields bankAccounts={d.bankAccounts} />
          </Form>
        ) : (
          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="วิธีชำระ">{paymentMethodLabel(v.paymentMethod)}</Descriptions.Item>
            <Descriptions.Item label="วันที่ต้องการจ่าย">
              {d.desiredPayDate ? dayjs(d.desiredPayDate).format("DD/MM/YYYY") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="ธนาคาร / บัญชีที่ใช้จ่าย" span="filled">
              {bankLabel(d.bankAccount)}
            </Descriptions.Item>
            <Descriptions.Item label="หมายเหตุ" span="filled">
              {v.remark || "—"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="8. เอกสารแนบ / หลักฐานประกอบ" size="small">
        <PvAttachmentsPanel voucherId={id} canEdit={editable} />
        {!editable ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            แนบ/ลบไฟล์ได้เฉพาะสถานะร่างหรือไม่อนุมัติ · หลักฐานการโอนจริงบันทึกที่เมนูบันทึกจ่ายเงิน
          </Typography.Text>
        ) : null}
      </Card>

      <Card title="9. ผู้ดำเนินการและประวัติการอนุมัติ" size="small">
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

      {status === "PAID" ? (
        <Card title="10. ข้อมูลการจ่ายเงินจริง" size="small">
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={v.payments}
            columns={[
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: "วันที่จ่าย", dataIndex: "paymentDate", render: (x: string) => dayjs(x).format("DD/MM/YYYY") },
              { title: "วิธีจ่าย", dataIndex: "paymentMethod", render: (x: string) => SUPPLIER_PAYMENT_METHOD_LABEL[x] ?? x },
              { title: "ยอดจ่ายจริง", dataIndex: "amount", align: "right" as const, render: (x: string) => fmtMoney(x) },
              { title: "เลขอ้างอิงการโอน", dataIndex: "transactionRef", render: (x?: string) => x ?? "—" },
              { title: "ผู้บันทึก", key: "by", render: (_x: unknown, r: { paidBy?: { displayName: string } }) => r.paidBy?.displayName ?? "—" },
            ]}
          />
        </Card>
      ) : null}

      <Modal
        open={reasonFor !== null}
        title={reasonFor === "reject" ? "ไม่อนุมัติใบสำคัญจ่าย" : "ยกเลิกใบสำคัญจ่าย"}
        okText={reasonFor === "reject" ? "ไม่อนุมัติ" : "ยกเลิกใบสำคัญจ่าย"}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText="ปิด"
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
          placeholder="เหตุผล (อย่างน้อย 5 ตัวอักษร)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {reasonFor === "cancel" ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ยกเลิกก่อนจ่ายเงินจริง — คืนรายการกลับเข้าคิวรอสร้างใบสำคัญจ่าย และคืนยอดที่จองไว้ให้เอกสารต้นทาง
          </Typography.Text>
        ) : null}
      </Modal>
    </Space>
  );
}
