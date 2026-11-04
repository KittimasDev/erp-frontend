"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from "antd";
import { ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  usePaymentVoucherDetailQuery,
  useRecordPaymentMutation,
} from "@/hooks/payment-vouchers/usePaymentVouchers";
import { bankLabel, PAYMENT_METHOD_OPTIONS } from "./PaymentMethodFields";
import { validatePvFile } from "./PvAttachmentsPanel";
import { ReferenceCard, SummaryCard, SupplierCard, TaxCard } from "./VoucherSections";
import { PAYMENT_RECORDS_PATH, fmtMoney, kindLabel, referenceLine } from "./paymentVoucherUtils";
import PageHeader from "@/components/common/PageHeader";

type FormValues = {
  documentDate: Dayjs;
  paymentDate: Dayjs;
  paymentMethod: string;
  companyBankAccountId?: string;
  transactionRef?: string;
  chequeBankName?: string;
  chequeNo?: string;
  chequeDate?: Dayjs;
  otherMethodDetail?: string;
  remark?: string;
};

const SCREEN = "FINANCE_PAYMENT_RECORDS";

/**
 * สร้างบันทึกจ่ายเงิน — ใช้ฟอร์มเดียวกันทุกประเภทการจ่าย ข้อมูลทั้งหมดดึงจาก PV ที่อนุมัติแล้ว
 * Phase นี้จ่ายเต็มยอดสุทธิของ PV เท่านั้น (ยอดจ่ายจริงล็อก) และต้องแนบหลักฐานอย่างน้อย 1 ไฟล์
 */
export default function PaymentRecordCreatePage({ voucherId }: { voucherId: string }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN);
  const query = usePaymentVoucherDetailQuery(voucherId);
  const record = useRecordPaymentMutation();
  const [form] = Form.useForm<FormValues>();
  const [files, setFiles] = useState<File[]>([]);
  const method = Form.useWatch("paymentMethod", form) as string | undefined;
  const d = query.data?.data;
  const v = d?.voucher;

  if (query.isLoading) return <Spin />;
  if (!d || !v) return <Alert type="error" showIcon title="ไม่พบใบสำคัญจ่าย" />;
  if (v.status !== "APPROVED") {
    return (
      <Alert
        type="warning"
        showIcon
        title={`บันทึกจ่ายได้เฉพาะใบสำคัญจ่ายที่อนุมัติแล้วและยังไม่จ่าย (สถานะปัจจุบัน: ${v.status})`}
        action={<Button onClick={() => router.push(PAYMENT_RECORDS_PATH)}>กลับ</Button>}
      />
    );
  }

  const net = Number(v.netAmount ?? v.totalAmount);
  const activeMethod = method ?? v.paymentMethod;

  const submit = async () => {
    const vals = await form.validateFields();
    if (files.length === 0) {
      message.error("ต้องแนบหลักฐานการจ่ายเงินอย่างน้อย 1 ไฟล์");
      return;
    }
    modal.confirm({
      title: "ยืนยันการจ่ายเงิน?",
      content: `จ่ายเงิน ${fmtMoney(net)} บาท ให้ ${d.supplier.nameTh} · PV ${v.voucherNo} จะเปลี่ยนเป็น "จ่ายแล้ว" และแก้ไขรายการจ่ายโดยตรงไม่ได้`,
      okText: "ยืนยันการจ่ายเงิน",
      cancelText: "ตรวจสอบอีกครั้ง",
      onOk: async () => {
        try {
          const res = await record.mutateAsync({
            voucherId,
            files,
            form: {
              documentDate: vals.documentDate.format("YYYY-MM-DD"),
              paymentDate: vals.paymentDate.format("YYYY-MM-DD"),
              amount: net,
              paymentMethod: vals.paymentMethod,
              companyBankAccountId: vals.companyBankAccountId,
              transactionRef: vals.transactionRef,
              chequeBankName: vals.chequeBankName,
              chequeNo: vals.chequeNo,
              chequeDate: vals.chequeDate?.format("YYYY-MM-DD"),
              otherMethodDetail: vals.otherMethodDetail,
              remark: vals.remark,
            },
          });
          router.replace(`${PAYMENT_RECORDS_PATH}/${res.data.id}`);
        } catch {
          // error แสดงโดย mutation แล้ว
        }
      },
    });
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>บันทึกจ่ายเงิน</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PAYMENT_RECORDS_PATH)}>
              กลับ
            </Button>
          </>
        }
        meta={
          <>
<Tag color="blue">อนุมัติแล้ว (รอจ่ายเงิน)</Tag>
          </>
        }
        actions={
          <>
<Typography.Text type="secondary">
            PV {v.voucherNo} · อ้างอิง {referenceLine(d) || "—"}
          </Typography.Text>
          </>
        }
      />

      <Card title="ข้อมูลจากใบสำคัญจ่าย (อ่านอย่างเดียว)" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label="เลขที่รายการจ่าย">สร้างอัตโนมัติเมื่อบันทึก</Descriptions.Item>
          <Descriptions.Item label="เลขที่ใบสำคัญจ่าย">{v.voucherNo}</Descriptions.Item>
          <Descriptions.Item label="ประเภทการจ่าย">{kindLabel(v.paymentKind)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <ReferenceCard info={d} sourceType={v.sourceType ?? "PURCHASE_ORDER"} purchaseOrderId={v.purchaseOrderId} />
      <SupplierCard supplier={d.supplier} />
      <TaxCard vat={d.vatAmount} whtBase={d.whtBaseAmount} whtRate={d.whtRate} whtAmount={v.whtAmount} net={v.netAmount} whtLines={d.whtLines} />
      <SummaryCard info={d} amount={v.totalAmount} wht={v.whtAmount} net={v.netAmount} />

      <Card title="รายละเอียดการจ่ายเงินจริง" size="small">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            documentDate: dayjs(),
            paymentDate: dayjs(),
            paymentMethod: v.paymentMethod,
            companyBankAccountId: d.bankAccount?.id ?? d.defaultBankAccount?.id,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
            <Form.Item name="documentDate" label="วันที่เอกสาร" rules={[{ required: true, message: "ระบุวันที่เอกสาร" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="paymentDate" label="วันที่จ่ายเงินจริง" rules={[{ required: true, message: "ระบุวันที่จ่ายจริง" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="จำนวนเงินที่จ่ายจริง (บาท)" extra="Phase นี้จ่ายเต็มยอดสุทธิของ PV เท่านั้น">
              <InputNumber value={net} precision={2} disabled style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="paymentMethod" label="วิธีชำระเงินจริง" rules={[{ required: true, message: "เลือกวิธีชำระ" }]}>
              <Select options={PAYMENT_METHOD_OPTIONS} />
            </Form.Item>
          </div>

          {activeMethod === "TRANSFER" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 16px" }}>
              <Form.Item name="companyBankAccountId" label="ธนาคาร / บัญชีต้นทางที่ใช้จ่าย" rules={[{ required: true, message: "เลือกบัญชีต้นทาง" }]}>
                <Select
                  placeholder={d.bankAccounts.length === 0 ? "ยังไม่มีบัญชีธนาคารบริษัท (ตั้งค่าที่ข้อมูลบริษัท)" : "เลือกบัญชี"}
                  options={d.bankAccounts.map((b) => ({ value: b.id, label: bankLabel(b) }))}
                />
              </Form.Item>
              <Form.Item name="transactionRef" label="เลขอ้างอิงการโอน" rules={[{ required: true, message: "ระบุเลขอ้างอิงการโอน" }]}>
                <Input maxLength={255} />
              </Form.Item>
            </div>
          ) : null}

          {activeMethod === "CHEQUE" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
              <Form.Item name="chequeBankName" label="ธนาคาร" rules={[{ required: true, message: "ระบุธนาคารของเช็ค" }]}>
                <Input maxLength={150} />
              </Form.Item>
              <Form.Item name="chequeNo" label="เลขที่เช็ค" rules={[{ required: true, message: "ระบุเลขที่เช็ค" }]}>
                <Input maxLength={50} />
              </Form.Item>
              <Form.Item name="chequeDate" label="วันที่เช็ค" rules={[{ required: true, message: "ระบุวันที่เช็ค" }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="companyBankAccountId" label="บัญชีที่สั่งจ่าย (ถ้ามี)">
                <Select
                  allowClear
                  options={d.bankAccounts.map((b) => ({ value: b.id, label: bankLabel(b) }))}
                />
              </Form.Item>
            </div>
          ) : null}

          {activeMethod === "CASH" ? (
            <Form.Item name="otherMethodDetail" label="ระบุวิธีชำระและรายละเอียดเพิ่มเติม" rules={[{ required: true, message: "ระบุวิธีชำระและรายละเอียด" }]}>
              <Input.TextArea rows={2} maxLength={2000} placeholder="เช่น เงินสดย่อย / ชำระผ่านตัวแทน" />
            </Form.Item>
          ) : null}

          <Form.Item label="หลักฐานการจ่ายเงิน (บังคับ อย่างน้อย 1 ไฟล์)" required>
            {files.length > 0 ? (
              <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.name}{" "}
                    <Button size="small" type="link" danger onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      เอาออก
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Upload
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              showUploadList={false}
              beforeUpload={(file) => {
                const err = validatePvFile(file);
                if (err) {
                  message.error(`${file.name}: ${err}`);
                  return Upload.LIST_IGNORE;
                }
                setFiles((cur) => [...cur, file]);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>แนบไฟล์หลักฐาน (PDF, JPG, JPEG, PNG ไม่เกิน 20MB)</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="remark" label="หมายเหตุ">
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
          <Descriptions size="small" column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="ผู้บันทึก">ผู้ใช้ที่เข้าสู่ระบบ</Descriptions.Item>
            <Descriptions.Item label="วันที่บันทึก">ระบบบันทึกวัน-เวลาอัตโนมัติ</Descriptions.Item>
          </Descriptions>
        </Form>
      </Card>

      <Card size="small">
        <Space wrap>
          <Button onClick={() => router.push(PAYMENT_RECORDS_PATH)}>ยกเลิก</Button>
          {perms.canAdd ? (
            <Button type="primary" loading={record.isPending} onClick={() => void submit()}>
              ยืนยันการจ่ายเงิน
            </Button>
          ) : (
            <Typography.Text type="secondary">คุณไม่มีสิทธิ์บันทึกจ่ายเงิน</Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}
