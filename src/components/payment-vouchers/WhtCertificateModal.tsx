"use client";

import { AutoComplete, Descriptions, Form, Modal, Select, Typography } from "antd";

import { useIssueWhtMutation } from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  WHT_INCOME_TYPE_OPTIONS,
  WHT_TAX_FORM_LABEL,
  type PaymentRecordDetail,
  type WhtCertificate,
} from "@/types/payment-vouchers";
import type { WhtCertificatePdfData } from "@/utils/generateWhtCertificatePdf";
import { fmtMoney } from "./paymentVoucherUtils";

type FormValues = { taxForm: string; incomeType: string };

/** แปลงหนังสือรับรองที่เก็บใน DB เป็นข้อมูลสำหรับสร้าง PDF */
export function certToPdfData(cert: WhtCertificate, referenceText?: string): WhtCertificatePdfData {
  return {
    certNo: cert.certNo,
    taxForm: cert.taxForm,
    incomeType: cert.incomeType,
    paymentDate: cert.paymentDate,
    baseAmount: Number(cert.baseAmount),
    rate: Number(cert.rate),
    whtAmount: Number(cert.whtAmount),
    issuedAt: cert.issuedAt,
    issuedByName: cert.issuedByName,
    payer: cert.payer,
    payee: cert.payee,
    referenceText,
  };
}

/**
 * ตรวจสอบข้อมูลภาษีก่อนออกหนังสือรับรองหัก ณ ที่จ่าย (ในหน้ารายละเอียดเดิม)
 * ยอด/ฐาน/อัตราอ้างอิง PV และวันที่จ่ายจริง แก้ไม่ได้ — ผู้ใช้เลือกแบบ ภ.ง.ด. และประเภทเงินได้
 */
export default function WhtCertificateModal({
  open,
  detail,
  onClose,
  onIssued,
}: {
  open: boolean;
  detail: PaymentRecordDetail;
  onClose: () => void;
  onIssued: (cert: WhtCertificate) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const issue = useIssueWhtMutation();
  const v = detail.voucherDetail.voucher;
  // ฐาน WHT ต้องเป็นก่อน VAT — ห้าม fallback เป็นยอด PV รวม (เคยทำให้หนังสือรับรองเพี้ยน)
  const storedBase = Number(detail.voucherDetail.whtBaseAmount);
  const rate = Number(detail.voucherDetail.whtRate);
  const whtAmt = Number(v.whtAmount);
  const derivedBase = whtAmt > 0 && rate > 0 ? Math.round((whtAmt / rate) * 10000) / 100 : 0;
  const base = storedBase > 0 ? detail.voucherDetail.whtBaseAmount : derivedBase;

  const submit = async () => {
    const vals = await form.validateFields();
    try {
      const res = await issue.mutateAsync({
        paymentId: detail.id,
        body: { taxForm: vals.taxForm, incomeType: vals.incomeType.trim() },
      });
      onIssued(res.data);
    } catch {
      // error แสดงโดย mutation แล้ว
    }
  };

  return (
    <Modal
      open={open}
      title="ออกหนังสือรับรองหัก ณ ที่จ่าย"
      okText="ยืนยันและสร้างเอกสาร"
      cancelText="ปิด"
      width={680}
      confirmLoading={issue.isPending}
      onOk={() => void submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="เลขที่รายการจ่าย">{detail.paymentNo ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="เลขที่ PV">{v.voucherNo}</Descriptions.Item>
        <Descriptions.Item label="ผู้ถูกหักภาษี (ผู้ขาย)" span={2}>
          {detail.voucherDetail.supplier.nameTh}
          {detail.voucherDetail.supplier.taxId ? ` · เลขผู้เสียภาษี ${detail.voucherDetail.supplier.taxId}` : " · ยังไม่มีเลขผู้เสียภาษีในข้อมูลผู้ขาย"}
        </Descriptions.Item>
        <Descriptions.Item label="ผู้จ่าย / ผู้หักภาษี" span={2}>
          ข้อมูลบริษัทในระบบ (บันทึกเป็นข้อมูลถาวรในเอกสาร ณ วันที่ออก)
        </Descriptions.Item>
        <Descriptions.Item label="วันที่จ่ายเงิน">{detail.paymentDate}</Descriptions.Item>
        <Descriptions.Item label="ฐานภาษี">{fmtMoney(base)}</Descriptions.Item>
        <Descriptions.Item label="อัตราภาษี">{Number(detail.voucherDetail.whtRate)}%</Descriptions.Item>
        <Descriptions.Item label="ภาษีที่หัก ณ ที่จ่าย">
          <Typography.Text strong>{fmtMoney(v.whtAmount)}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical" initialValues={{ taxForm: "PND53" }}>
        <Form.Item name="taxForm" label="แบบยื่นภาษี" rules={[{ required: true, message: "เลือกแบบยื่น" }]}>
          <Select options={Object.entries(WHT_TAX_FORM_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="incomeType" label="ประเภทเงินได้ที่จ่าย" rules={[{ required: true, min: 2, message: "ระบุประเภทเงินได้" }]}>
          <AutoComplete
            options={WHT_INCOME_TYPE_OPTIONS.map((value) => ({ value }))}
            placeholder="เลือกหรือพิมพ์ประเภทเงินได้"
            maxLength={255}
          />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        1 รายการจ่ายออกหนังสือรับรองได้ 1 ฉบับ — ออกแล้วไม่สามารถออกซ้ำ และยกเลิกรายการจ่ายไม่ได้
      </Typography.Text>
    </Modal>
  );
}
