"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Descriptions, Input, Modal, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useAdvanceRequestQuery,
  useCancelAdvanceRequestMutation,
} from "@/hooks/advance-payment-requests/useAdvanceRequests";
import {
  ADVANCE_DOCUMENT_TYPE,
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  WHT_TYPE_LABEL,
} from "@/types/advance-payment-requests";
import { ADVANCE_BASE_PATH, ADVANCE_SCREEN } from "./AdvanceRequestsListPage";
import { tFin } from "@/components/payment-vouchers/paymentVoucherUtils";
import { useT } from "@/lib/i18n/useT";
import PageHeader from "@/components/common/PageHeader";

/** หน้าใบสำคัญจ่าย (2 ตาราง) — ปุ่ม "ดูใบสำคัญจ่าย" ไปรายละเอียด PV ที่สร้างจากรายการนี้ ถ้ายังไม่มี id ไปหน้ารายการ */
const PV_PATH = "/finance/payables/payment-vouchers";

/** รายละเอียดรายการขอจ่ายล่วงหน้า / มัดจำ (อ่านอย่างเดียว) */
export default function AdvanceRequestDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions(ADVANCE_SCREEN);
  const query = useAdvanceRequestQuery(id);
  const cancel = useCancelAdvanceRequestMutation();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const r = query.data?.data;

  if (query.isLoading) return <Spin />;
  if (!r) return <Alert type="error" showIcon title={t("ไม่พบรายการขอจ่าย")} />;
  const poCancelled = r.purchaseOrderStatus === "CANCELLED";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{r.requestNo}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(ADVANCE_BASE_PATH)}>{t("กลับ")}</Button>
          </>
        }
        meta={
          <>
<Tag color={ADVANCE_STATUS_COLOR[r.status]}>{ADVANCE_STATUS_LABEL[r.status] ? tFin(ADVANCE_STATUS_LABEL[r.status]) : r.status}</Tag>
          </>
        }
        actions={
          <>
            {r.status === "DRAFT" && (perms.canEdit || perms.canApprove) ? (
              <Button type="primary" onClick={() => router.push(`${ADVANCE_BASE_PATH}/${r.id}/edit`)}>{t("แก้ไข / ตรวจ WHT / ยืนยัน")}</Button>
            ) : null}
            {r.status === "PV_CREATED" ? (
              <Button type="primary" onClick={() => router.push(r.paymentVoucherId ? `${PV_PATH}/${r.paymentVoucherId}` : PV_PATH)}>{t("ดูใบสำคัญจ่าย")}</Button>
            ) : null}
            {/* ยกเลิกได้เฉพาะสถานะร่าง — ยืนยันแล้วหรือสร้าง PV แล้วดูรายละเอียดได้อย่างเดียว */}
            {(r.status === "DRAFT" || (r.status === "PENDING_PV" && poCancelled)) && perms.canDelete ? (
              <Button danger onClick={() => setCancelling(true)}>{t("ยกเลิกรายการ")}</Button>
            ) : null}
          
          </>
        }
      />

      {poCancelled && (r.status === "DRAFT" || r.status === "PENDING_PV") ? (
        <Alert
          type="error"
          showIcon
          title={t("PO {no} ยกเลิกแล้ว — ยืนยันรายการ/สร้างใบสำคัญจ่ายไม่ได้ กรุณายกเลิกรายการนี้", { no: r.poNo })}
        />
      ) : null}
      {r.status === "PENDING_PV" && !poCancelled ? (
        <Alert type="success" showIcon title={t("ยืนยันรายการแล้ว — พร้อมนำไปสร้างใบสำคัญจ่าย (PV) ขั้นตอนถัดไป")} description={r.confirmedAt ? t("ยืนยันเมื่อ {at}", { at: dayjs(r.confirmedAt).format("DD/MM/BBBB HH:mm") }) : undefined} />
      ) : null}
      {r.status === "PV_CREATED" ? (
        <Alert
          type="success"
          showIcon
          title={`${t("สร้างใบสำคัญจ่ายแล้ว")}${r.paymentVoucherNo ? ` — ${r.paymentVoucherNo}` : ""}`}
          description={r.pvCreatedAt ? t("สร้างเมื่อ {at} · รายการนี้แก้ไขหรือยกเลิกไม่ได้ (ถ้าต้องยกเลิกให้ทำที่ใบสำคัญจ่าย)", { at: dayjs(r.pvCreatedAt).format("DD/MM/BBBB HH:mm") }) : undefined}
        />
      ) : null}
      {r.status === "CANCELLED" ? (
        <Alert type="error" showIcon title={t("ยกเลิกเมื่อ {at}", { at: r.cancelledAt ? dayjs(r.cancelledAt).format("DD/MM/BBBB HH:mm") : "-" })} description={r.cancelReason} />
      ) : null}

      <Card title={t("ข้อมูลรายการ")}>
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("วันที่เอกสาร")}>{formatThaiDate(r.requestDate)}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ PO")}>{r.poNo}</Descriptions.Item>
          <Descriptions.Item label={t("ผู้ขาย")}>{r.creditorCode} {r.creditorName}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทการจ่าย")}>{r.advanceType}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดรวม PO")}>{money.format(r.poTotalAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("วงเงินมัดจำ")}>{money.format(r.advanceLimitAmount)} ({r.advancePercent}%)</Descriptions.Item>
          <Descriptions.Item label={t("รูปแบบการคำนวณ")}>{r.calcMode === "PERCENT" ? t("เปอร์เซ็นต์ {p}%", { p: r.percent ?? "-" }) : t("จำนวนเงิน")}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดขอจ่าย")}><Typography.Text strong>{money.format(r.requestedAmount)}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label={t("วันที่ต้องการจ่าย")}>{formatThaiDate(r.desiredPayDate)}</Descriptions.Item>
          <Descriptions.Item label={t("ผู้ขอจ่าย")}>{r.requestedByName ?? "-"}</Descriptions.Item>
          <Descriptions.Item label={t("รายละเอียด / เหตุผล")} span={2}>{r.reason || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("ภาษีหัก ณ ที่จ่าย (WHT)")}>
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("มีภาษีหัก ณ ที่จ่าย")}>{r.whtApplicable ? tFin("มี") : t("ไม่มี")}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทการหักภาษี")}>{r.whtApplicable ? (WHT_TYPE_LABEL[r.whtType] ? tFin(WHT_TYPE_LABEL[r.whtType]) : r.whtType) : "—"}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทเงินได้")}>{r.whtIncomeType ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("ฐานภาษี")}>{money.format(r.whtBaseAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("อัตราภาษี")}>{r.whtApplicable ? `${r.whtRate}%` : "—"}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดภาษีหัก ณ ที่จ่าย")}>{money.format(r.whtAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดโอนจริง")}><Typography.Text strong>{money.format(r.netTransferAmount)}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label={t("ตรวจสอบภาษี")} span={2}>
            {r.whtVerified ? (
              <Tag color="green">{t("ตรวจแล้ว โดย {name} · {at}", { name: r.whtVerifiedByName ?? "-", at: r.whtVerifiedAt ? dayjs(r.whtVerifiedAt).format("DD/MM/BBBB HH:mm") : "-" })}</Tag>
            ) : (
              <Tag color="orange">{t("ยังไม่ได้ตรวจสอบ")}</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("เอกสารแนบจาก Supplier")}>
        <DocumentAttachmentsPanel documentType={ADVANCE_DOCUMENT_TYPE} documentId={r.id} canEdit={false} emptyText={t("ไม่มีเอกสารแนบ")} />
      </Card>

      <Modal
        open={cancelling}
        title={t("ยกเลิกรายการ {no}", { no: r.requestNo })}
        okText={t("ยกเลิกรายการ")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText={t("ไม่")}
        confirmLoading={cancel.isPending}
        onCancel={() => setCancelling(false)}
        onOk={() => cancel.mutate({ id: r.id, reason: reason.trim() }, { onSuccess: () => { setCancelling(false); setReason(""); } })}
      >
        <Input.TextArea rows={3} maxLength={2000} placeholder={t("เหตุผล (อย่างน้อย 5 ตัวอักษร) — เก็บประวัติรายการไว้")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Space>
  );
}
