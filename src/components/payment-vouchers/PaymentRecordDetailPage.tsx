"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Descriptions, Input, Modal, Space, Spin, Table, Tag, Timeline, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCancelPaymentMutation, usePaymentRecordDetailQuery } from "@/hooks/payment-vouchers/usePaymentVouchers";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import {
  PAYMENT_RECORD_STATUS_COLOR,
  PAYMENT_RECORD_STATUS_LABEL,
  VOUCHER_EVENT_LABEL,
  WHT_TAX_FORM_LABEL,
  type PaymentRecordAttachment,
  type PaymentRecordDetail,
  type WhtCertificate,
} from "@/types/payment-vouchers";
import { openWhtCertificatePdf } from "@/utils/generateWhtCertificatePdf";
import { bankLabel, paymentMethodLabel } from "./PaymentMethodFields";
import WhtCertificateModal, { certToPdfData } from "./WhtCertificateModal";
import { PV_BASE_PATH, PAYMENT_RECORDS_PATH, fmtMoney, kindLabel, referenceLine, sourceLabel } from "./paymentVoucherUtils";

const dt = (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—");
const HISTORY_ACTIONS = ["PAY", "WHT_ISSUE", "PAYMENT_CANCEL"];

const fileTypeLabel = (mime?: string) =>
  mime === "application/pdf" ? "PDF" : mime === "image/png" ? "PNG" : mime?.startsWith("image/") ? "JPG" : (mime ?? "—");

/** รายการไฟล์แบบอ่านอย่างเดียว — ดู/ดาวน์โหลดได้ ไม่มีปุ่มลบ (รายการจ่ายที่ยืนยันแล้วแก้ไม่ได้) */
function ReadOnlyFiles({ files, empty }: { files: PaymentRecordAttachment[]; empty: string }) {
  const { message } = App.useApp();
  const fetchBlob = async (f: PaymentRecordAttachment) => {
    try {
      return await downloadDocumentAttachment(getAccessToken(), f.id);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "เปิดไฟล์ไม่สำเร็จ");
      return null;
    }
  };
  const preview = async (f: PaymentRecordAttachment) => {
    const res = await fetchBlob(f);
    if (res) window.open(URL.createObjectURL(res.blob), "_blank", "noopener");
  };
  const download = async (f: PaymentRecordAttachment) => {
    const res = await fetchBlob(f);
    if (!res) return;
    const url = URL.createObjectURL(res.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = res.filename || f.originalFileName || "file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const columns: ColumnsType<PaymentRecordAttachment> = [
    { title: "ชื่อไฟล์", dataIndex: "originalFileName", render: (v?: string) => v || "ไฟล์" },
    { title: "ประเภท", dataIndex: "mimeType", width: 90, render: (v?: string) => <Tag>{fileTypeLabel(v)}</Tag> },
    { title: "วันที่แนบ", dataIndex: "createdAt", width: 150, render: (v: string) => dt(v) },
    { title: "ผู้แนบ", dataIndex: "uploadedByName", width: 140, render: (v?: string) => v ?? "—" },
    {
      title: "",
      key: "a",
      width: 140,
      render: (_v, f) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => void preview(f)}>
            ดู
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => void download(f)} aria-label="ดาวน์โหลด" />
        </Space>
      ),
    },
  ];
  return (
    <Table size="small" rowKey="id" columns={columns} dataSource={files} pagination={false} locale={{ emptyText: empty }} />
  );
}

function methodRows(d: PaymentRecordDetail) {
  if (d.paymentMethod === "TRANSFER") {
    return (
      <>
        <Descriptions.Item label="บัญชีต้นทางที่ใช้จ่าย" span={2}>{bankLabel(d.bankAccount)}</Descriptions.Item>
        <Descriptions.Item label="เลขอ้างอิงธุรกรรม">{d.transactionRef ?? "—"}</Descriptions.Item>
      </>
    );
  }
  if (d.paymentMethod === "CHEQUE") {
    return (
      <>
        <Descriptions.Item label="ธนาคาร">{d.chequeBankName ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="เลขที่เช็ค / เลขอ้างอิง">{d.chequeNo ?? d.transactionRef ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="วันที่เช็ค">{formatThaiDate(d.chequeDate)}</Descriptions.Item>
        <Descriptions.Item label="บัญชีที่สั่งจ่าย">{bankLabel(d.bankAccount)}</Descriptions.Item>
      </>
    );
  }
  return (
    <Descriptions.Item label="วิธีชำระและรายละเอียด" span={2}>{d.otherMethodDetail ?? "—"}</Descriptions.Item>
  );
}

/** รายละเอียดบันทึกจ่ายเงิน (read-only) — แก้ไขการจ่ายที่ยืนยันแล้วโดยตรงไม่ได้ */
export default function PaymentRecordDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_RECORDS");
  const query = usePaymentRecordDetailQuery(id);
  const cancel = useCancelPaymentMutation();
  const [whtOpen, setWhtOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const d = query.data?.data;

  if (query.isLoading) return <Spin />;
  if (!d) return <Alert type="error" showIcon title="ไม่พบรายการจ่าย (หรือเป็นรายการของใบสำคัญจ่ายแบบเดิม)" />;

  const pv = d.voucherDetail.voucher;
  const info = d.voucherDetail;
  const cert = d.whtCertificate;
  const reference = referenceLine(info);

  const viewCert = async (c: WhtCertificate) => {
    try {
      await openWhtCertificatePdf(certToPdfData(c, `${d.paymentNo ?? ""} · PV ${pv.voucherNo}`));
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : "สร้างเอกสารไม่สำเร็จ");
    }
  };

  const history = info.events.filter((e) => HISTORY_ACTIONS.includes(e.action));

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PAYMENT_RECORDS_PATH)}>
              กลับ
            </Button>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {d.paymentNo ?? "รายการจ่าย"}
            </Typography.Title>
            <Tag color={PAYMENT_RECORD_STATUS_COLOR[d.status]}>{PAYMENT_RECORD_STATUS_LABEL[d.status] ?? d.status}</Tag>
          </Space>
          <Space wrap>
            {d.status === "PAID" && d.hasWht && !cert && perms.canAdd ? (
              <Button type="primary" onClick={() => setWhtOpen(true)}>
                ออกหนังสือรับรองหัก ณ ที่จ่าย
              </Button>
            ) : null}
            {d.status === "PAID" && cert ? (
              <Button type="primary" onClick={() => void viewCert(cert)}>
                ดูหนังสือรับรองหัก ณ ที่จ่าย
              </Button>
            ) : null}
            {d.status === "PAID" && perms.canDelete ? (
              <Button danger onClick={() => setCancelling(true)}>
                ยกเลิกการจ่าย
              </Button>
            ) : null}
          </Space>
        </div>
      </Card>

      {d.status === "CANCELLED" ? (
        <Alert
          type="warning"
          showIcon
          title={`ยกเลิกรายการจ่ายแล้ว${d.cancelledByName ? ` โดย ${d.cancelledByName}` : ""} · ${dt(d.cancelledAt)}`}
          description={d.cancelReason}
        />
      ) : null}

      <Card title="1. ข้อมูลเอกสาร" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="เลขที่รายการจ่าย">{d.paymentNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="วันที่เอกสาร">{formatThaiDate(d.documentDate)}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ PV อ้างอิง">
            <Link href={`${PV_BASE_PATH}/${pv.id}`}>{pv.voucherNo}</Link>
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่เอกสารต้นทาง">
            {info.sources.length === 0
              ? "—"
              : `${sourceLabel(pv.sourceType)}: ${info.sources.map((s) => s.documentNo).join(", ")}`}
            {info.apDocuments.length > 0 ? ` · AP ${info.apDocuments.map((a) => a.docNo).join(", ")}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่ PO">
            {info.purchaseOrders.length === 0 ? "—" : info.purchaseOrders.map((p) => p.poNo).join(", ")}
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">
            {info.supplier.creditorCode ? `${info.supplier.creditorCode} ` : ""}
            {info.supplier.nameTh}
          </Descriptions.Item>
          <Descriptions.Item label="ประเภทการจ่าย">{kindLabel(pv.paymentKind)}</Descriptions.Item>
          <Descriptions.Item label="สถานะ">
            <Tag color={PAYMENT_RECORD_STATUS_COLOR[d.status]}>{PAYMENT_RECORD_STATUS_LABEL[d.status] ?? d.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="อ้างอิงทั้งหมด">{reference || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="2. สรุปยอดการจ่าย (บาท)" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 4 }}>
          <Descriptions.Item label="ยอดเงินตาม PV">{fmtMoney(pv.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="ภาษีหัก ณ ที่จ่าย">{fmtMoney(pv.whtAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดสุทธิที่ต้องจ่าย">{fmtMoney(pv.netAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดจ่ายจริง">
            <Typography.Text strong>{fmtMoney(d.amount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="3. รายละเอียดการจ่ายเงินจริง" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="วันที่จ่ายจริง">{formatThaiDate(d.paymentDate)}</Descriptions.Item>
          <Descriptions.Item label="วิธีชำระ">{paymentMethodLabel(d.paymentMethod)}</Descriptions.Item>
          {methodRows(d)}
          <Descriptions.Item label="หมายเหตุ" span={2}>{d.remark || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="4. เอกสารและหลักฐาน" size="small">
        <Typography.Text strong>หลักฐานการจ่ายเงินจริง</Typography.Text>
        <div style={{ margin: "6px 0 16px" }}>
          <ReadOnlyFiles files={d.evidence} empty="ไม่มีหลักฐานแนบ" />
        </div>
        <Typography.Text strong>เอกสารแนบที่เกี่ยวข้อง (จากใบสำคัญจ่าย)</Typography.Text>
        <div style={{ margin: "6px 0 16px" }}>
          <ReadOnlyFiles files={d.voucherAttachments} empty="ไม่มีเอกสารแนบ" />
        </div>
        <Typography.Text strong>หนังสือรับรองหัก ณ ที่จ่าย</Typography.Text>
        <div style={{ marginTop: 6 }}>
          {cert ? (
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="เลขที่">{cert.certNo}</Descriptions.Item>
              <Descriptions.Item label="แบบยื่น">{WHT_TAX_FORM_LABEL[cert.taxForm] ?? cert.taxForm}</Descriptions.Item>
              <Descriptions.Item label="ประเภทเงินได้">{cert.incomeType}</Descriptions.Item>
              <Descriptions.Item label="ภาษีที่หัก">{fmtMoney(cert.whtAmount)}</Descriptions.Item>
              <Descriptions.Item label="ออกโดย / วันที่ออก" span={2}>
                {cert.issuedByName ?? "—"} · {dt(cert.issuedAt)}{" "}
                <Button size="small" type="link" onClick={() => void viewCert(cert)}>
                  ดู / ดาวน์โหลด / พิมพ์
                </Button>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">{d.hasWht ? "ยังไม่ได้ออกหนังสือรับรอง" : "รายการนี้ไม่มีภาษีหัก ณ ที่จ่าย"}</Typography.Text>
          )}
        </div>
      </Card>

      <Card title="5. ประวัติการดำเนินการ" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="ผู้บันทึก">{d.paidByName ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="วัน-เวลาที่บันทึก">{dt(d.createdAt)}</Descriptions.Item>
        </Descriptions>
        {history.length === 0 ? (
          <Typography.Text type="secondary">ยังไม่มีประวัติ</Typography.Text>
        ) : (
          <Timeline
            items={history.map((e) => ({
              key: e.id,
              content: (
                <span>
                  <Tag>{VOUCHER_EVENT_LABEL[e.action] ?? e.action}</Tag>
                  {e.performedByName ?? "—"} · {dt(e.performedAt)}
                  {e.note ? <div style={{ color: "#8a94a6" }}>{e.note}</div> : null}
                </span>
              ),
            }))}
          />
        )}
      </Card>

      <WhtCertificateModal
        open={whtOpen}
        detail={d}
        onClose={() => setWhtOpen(false)}
        onIssued={(c) => {
          setWhtOpen(false);
          void viewCert(c);
        }}
      />

      <Modal
        open={cancelling}
        title={`ยกเลิกรายการจ่าย ${d.paymentNo ?? ""}`}
        okText="ยกเลิกการจ่าย"
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText="ปิด"
        confirmLoading={cancel.isPending}
        onOk={() =>
          cancel.mutate(
            { paymentId: d.id, reason: reason.trim() },
            {
              onSuccess: () => {
                setCancelling(false);
                setReason("");
              },
            },
          )
        }
        onCancel={() => {
          setCancelling(false);
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
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          PV จะกลับเป็น &quot;อนุมัติแล้ว&quot; รอบันทึกจ่ายเงินใหม่ได้ · ยกเลิกไม่ได้ถ้าออกหนังสือรับรองหัก ณ ที่จ่ายแล้ว · เก็บ Audit Log
        </Typography.Text>
      </Modal>
    </Space>
  );
}
