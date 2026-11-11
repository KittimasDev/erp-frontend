"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Descriptions, Input, Modal, Space, Spin, Table, Tag, Timeline, Tooltip, Typography } from "antd";
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
import { useT, tNow } from "@/lib/i18n/useT";
import { bankLabel, paymentMethodLabel } from "./PaymentMethodFields";
import WhtCertificateModal, { certToPdfData } from "./WhtCertificateModal";
import { WhtLinesTable } from "./VoucherSections";
import { tFin, PV_BASE_PATH, PAYMENT_RECORDS_PATH, fmtMoney, kindLabel, referenceLine, sourceLabel } from "./paymentVoucherUtils";
import PageHeader from "@/components/common/PageHeader";

const dt = (v?: string) => (v ? dayjs(v).format("DD/MM/BBBB HH:mm") : "—");
const HISTORY_ACTIONS = ["PAY", "WHT_ISSUE", "PAYMENT_CANCEL"];

const fileTypeLabel = (mime?: string) =>
  mime === "application/pdf" ? "PDF" : mime === "image/png" ? "PNG" : mime?.startsWith("image/") ? "JPG" : (mime ?? "—");

/** รายการไฟล์แบบอ่านอย่างเดียว — ดู/ดาวน์โหลดได้ ไม่มีปุ่มลบ (รายการจ่ายที่ยืนยันแล้วแก้ไม่ได้) */
function ReadOnlyFiles({ files, empty }: { files: PaymentRecordAttachment[]; empty: string }) {
  const { message } = App.useApp();
  const t = useT();
  const fetchBlob = async (f: PaymentRecordAttachment) => {
    try {
      return await downloadDocumentAttachment(getAccessToken(), f.id);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t("เปิดไฟล์ไม่สำเร็จ"));
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
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("ชื่อไฟล์"), dataIndex: "originalFileName", render: (v?: string) => v || t("ไฟล์") },
    { title: t("ประเภท"), dataIndex: "mimeType", width: 90, render: (v?: string) => <Tag>{fileTypeLabel(v)}</Tag> },
    { title: t("วันที่แนบ"), dataIndex: "createdAt", width: 150, render: (v: string) => dt(v) },
    { title: t("ผู้แนบ"), dataIndex: "uploadedByName", width: 140, render: (v?: string) => v ?? "—" },
    {
      title: "",
      key: "a",
      width: 140,
      render: (_v, f) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => void preview(f)}>
            {t("ดู")}
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => void download(f)} aria-label={t("ดาวน์โหลด")} />
        </Space>
      ),
    },
  ];
  return (
    <Table size="small" rowKey="id" columns={columns} dataSource={files} pagination={false} locale={{ emptyText: empty }} />
  );
}

function methodRows(d: PaymentRecordDetail) {
  const t = tNow;
  if (d.paymentMethod === "TRANSFER") {
    return (
      <>
        <Descriptions.Item label={t("บัญชีต้นทางที่ใช้จ่าย")}>{bankLabel(d.bankAccount)}</Descriptions.Item>
        <Descriptions.Item label={t("เลขอ้างอิงธุรกรรม")}>{d.transactionRef ?? "—"}</Descriptions.Item>
      </>
    );
  }
  if (d.paymentMethod === "CHEQUE") {
    return (
      <>
        <Descriptions.Item label={t("ธนาคาร")}>{d.chequeBankName ?? "—"}</Descriptions.Item>
        <Descriptions.Item label={t("เลขที่เช็ค / เลขอ้างอิง")}>{d.chequeNo ?? d.transactionRef ?? "—"}</Descriptions.Item>
        <Descriptions.Item label={t("วันที่เช็ค")}>{formatThaiDate(d.chequeDate)}</Descriptions.Item>
        <Descriptions.Item label={t("บัญชีที่สั่งจ่าย")}>{bankLabel(d.bankAccount)}</Descriptions.Item>
      </>
    );
  }
  return (
    <Descriptions.Item label={t("วิธีชำระและรายละเอียด")} span="filled">{d.otherMethodDetail ?? "—"}</Descriptions.Item>
  );
}

/** รายละเอียดบันทึกจ่ายเงิน (read-only) — แก้ไขการจ่ายที่ยืนยันแล้วโดยตรงไม่ได้ */
export default function PaymentRecordDetailPage({ id }: { id: string }) {
  const t = useT();
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
  if (!d) return <Alert type="error" showIcon title={t("ไม่พบรายการจ่าย (หรือเป็นรายการของใบสำคัญจ่ายแบบเดิม)")} />;

  const pv = d.voucherDetail.voucher;
  const info = d.voucherDetail;
  const cert = d.whtCertificate;
  const reference = referenceLine(info);

  const viewCert = async (c: WhtCertificate) => {
    try {
      await openWhtCertificatePdf(certToPdfData(c, `${d.paymentNo ?? ""} · PV ${pv.voucherNo}`));
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : t("สร้างเอกสารไม่สำเร็จ"));
    }
  };

  const history = info.events.filter((e) => HISTORY_ACTIONS.includes(e.action));

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{d.paymentNo ?? t("รายการจ่าย")}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PAYMENT_RECORDS_PATH)}>
              {t("กลับ")}
            </Button>
          </>
        }
        meta={
          <>
<Tag color={PAYMENT_RECORD_STATUS_COLOR[d.status]}>{PAYMENT_RECORD_STATUS_LABEL[d.status] ? tFin(PAYMENT_RECORD_STATUS_LABEL[d.status]) : d.status}</Tag>
          </>
        }
        actions={
          <>
            {d.status === "PAID" && d.hasWht && !cert && perms.canAdd ? (
              <Button type="primary" onClick={() => setWhtOpen(true)}>
                {t("ออกหนังสือรับรองหัก ณ ที่จ่าย")}
              </Button>
            ) : null}
            {d.status === "PAID" && cert ? (
              <Button type="primary" onClick={() => void viewCert(cert)}>
                {t("ดูหนังสือรับรองหัก ณ ที่จ่าย")}
              </Button>
            ) : null}
            {d.status === "PAID" && perms.canDelete ? (
              <Tooltip
                title={
                  d.isExportedToExpress
                    ? t("ส่งสมุดรายวันจ่ายไป Express แล้ว ยกเลิกไม่ได้ — แก้ใน Express ก่อน แล้วให้ผู้ดูแลระบบปลดสถานะการส่ง")
                    : undefined
                }
              >
                <span>
                  <Button danger disabled={d.isExportedToExpress} onClick={() => setCancelling(true)}>
                    {t("ยกเลิกการจ่าย")}
                  </Button>
                </span>
              </Tooltip>
            ) : null}
          
          </>
        }
      />

      {d.status === "CANCELLED" ? (
        <Alert
          type="warning"
          showIcon
          title={`${t("ยกเลิกรายการจ่ายแล้ว")}${d.cancelledByName ? ` ${t("โดย")} ${d.cancelledByName}` : ""} · ${dt(d.cancelledAt)}`}
          description={d.cancelReason}
        />
      ) : null}

      <Card title={t("1. ข้อมูลเอกสาร")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("เลขที่รายการจ่าย")}>{d.paymentNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่เอกสาร")}>{formatThaiDate(d.documentDate)}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ PV อ้างอิง")}>
            <Link href={`${PV_BASE_PATH}/${pv.id}`}>{pv.voucherNo}</Link>
          </Descriptions.Item>
          <Descriptions.Item label={t("เลขที่เอกสารต้นทาง")}>
            {info.sources.length === 0
              ? "—"
              : `${sourceLabel(pv.sourceType)}: ${info.sources.map((s) => s.documentNo).join(", ")}`}
            {info.apDocuments.length > 0 ? ` · AP ${info.apDocuments.map((a) => a.docNo).join(", ")}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ PO")}>
            {info.purchaseOrders.length === 0 ? "—" : info.purchaseOrders.map((p) => p.poNo).join(", ")}
          </Descriptions.Item>
          <Descriptions.Item label={t("ผู้ขาย")}>
            {info.supplier.creditorCode ? `${info.supplier.creditorCode} ` : ""}
            {info.supplier.nameTh}
          </Descriptions.Item>
          <Descriptions.Item label={t("ประเภทการจ่าย")}>{kindLabel(pv.paymentKind)}</Descriptions.Item>
          <Descriptions.Item label={t("สถานะ")}>
            <Tag color={PAYMENT_RECORD_STATUS_COLOR[d.status]}>{PAYMENT_RECORD_STATUS_LABEL[d.status] ? tFin(PAYMENT_RECORD_STATUS_LABEL[d.status]) : d.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("อ้างอิงทั้งหมด")}>{reference || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("2. สรุปยอดการจ่าย (บาท)")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("ยอดเงินตาม PV")}>{fmtMoney(pv.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="VAT">{fmtMoney(info.vatAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ฐานภาษีหัก ณ ที่จ่าย")}>
            {Number(pv.whtAmount) > 0 ? fmtMoney(info.whtBaseAmount) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("อัตรา WHT")}>
            {Number(pv.whtAmount) <= 0
              ? "—"
              : new Set((info.whtLines ?? []).map((l) => Number(l.rate))).size > 1
                ? t("หลายอัตรา")
                : `${Number(info.whtRate)}%`}
          </Descriptions.Item>
          <Descriptions.Item label={t("ภาษีหัก ณ ที่จ่าย")}>{fmtMoney(pv.whtAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดโอนสุทธิ (ตาม PV)")}>
            <Typography.Text strong>{fmtMoney(pv.netAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอดจ่ายจริง")} span="filled">
            <Typography.Text strong>{fmtMoney(d.amount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("3. รายละเอียดการจ่ายเงินจริง")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label={t("วันที่จ่ายจริง")}>{formatThaiDate(d.paymentDate)}</Descriptions.Item>
          <Descriptions.Item label={t("วิธีชำระ")}>{paymentMethodLabel(d.paymentMethod)}</Descriptions.Item>
          {methodRows(d)}
          <Descriptions.Item label={t("หมายเหตุ")} span="filled">{d.remark || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("4. เอกสารและหลักฐาน")} size="small">
        <Typography.Text strong>{t("หลักฐานการจ่ายเงินจริง")}</Typography.Text>
        <div style={{ margin: "6px 0 16px" }}>
          <ReadOnlyFiles files={d.evidence} empty={t("ไม่มีหลักฐานแนบ")} />
        </div>
        <Typography.Text strong>{t("เอกสารแนบที่เกี่ยวข้อง (จากใบสำคัญจ่าย)")}</Typography.Text>
        <div style={{ margin: "6px 0 16px" }}>
          <ReadOnlyFiles files={d.voucherAttachments} empty={t("ไม่มีเอกสารแนบ")} />
        </div>
        <Typography.Text strong>{t("หนังสือรับรองหัก ณ ที่จ่าย")}</Typography.Text>
        <div style={{ marginTop: 6 }}>
          {cert ? (
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label={t("เลขที่")}>{cert.certNo}</Descriptions.Item>
              <Descriptions.Item label={t("แบบยื่น")}>{WHT_TAX_FORM_LABEL[cert.taxForm] ? t(WHT_TAX_FORM_LABEL[cert.taxForm]) : cert.taxForm}</Descriptions.Item>
              {(cert.lines?.length ?? 0) > 1 ? (
                <Descriptions.Item label={t("รายการภาษีที่หัก")} span="filled">
                  <WhtLinesTable lines={cert.lines ?? []} total={cert.whtAmount} />
                </Descriptions.Item>
              ) : (
                <>
                  <Descriptions.Item label={t("ประเภทเงินได้")}>{cert.incomeType}</Descriptions.Item>
                  <Descriptions.Item label={t("ฐานภาษี")}>{fmtMoney(cert.baseAmount)}</Descriptions.Item>
                  <Descriptions.Item label={t("อัตรา")}>{Number(cert.lines?.[0]?.rate ?? cert.rate)}%</Descriptions.Item>
                  <Descriptions.Item label={t("ภาษีที่หัก")}>{fmtMoney(cert.whtAmount)}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label={t("ออกโดย / วันที่ออก")} span="filled">
                {cert.issuedByName ?? "—"} · {dt(cert.issuedAt)}{" "}
                <Button size="small" type="link" onClick={() => void viewCert(cert)}>
                  {t("ดู / ดาวน์โหลด / พิมพ์")}
                </Button>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">{d.hasWht ? t("ยังไม่ได้ออกหนังสือรับรอง") : t("รายการนี้ไม่มีภาษีหัก ณ ที่จ่าย")}</Typography.Text>
          )}
        </div>
      </Card>

      <Card title={t("5. ประวัติการดำเนินการ")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label={t("ผู้บันทึก")}>{d.paidByName ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("วัน-เวลาที่บันทึก")}>{dt(d.createdAt)}</Descriptions.Item>
        </Descriptions>
        {history.length === 0 ? (
          <Typography.Text type="secondary">{t("ยังไม่มีประวัติ")}</Typography.Text>
        ) : (
          <Timeline
            items={history.map((e) => ({
              key: e.id,
              content: (
                <span>
                  <Tag>{VOUCHER_EVENT_LABEL[e.action] ? tFin(VOUCHER_EVENT_LABEL[e.action]) : e.action}</Tag>
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
        title={t("ยกเลิกรายการจ่าย {no}", { no: d.paymentNo ?? "" })}
        okText={t("ยกเลิกการจ่าย")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText={t("ปิด")}
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
          placeholder={t("เหตุผล (อย่างน้อย 5 ตัวอักษร)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("PV จะกลับเป็น \"อนุมัติแล้ว\" รอบันทึกจ่ายเงินใหม่ได้ · ยกเลิกไม่ได้ถ้าออกหนังสือรับรองหัก ณ ที่จ่ายแล้ว · เก็บ Audit Log")}
        </Typography.Text>
      </Modal>
    </Space>
  );
}
