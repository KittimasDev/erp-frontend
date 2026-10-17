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

/** หน้าใบสำคัญจ่าย (2 ตาราง) — ปุ่ม "ดูใบสำคัญจ่าย" ไปรายละเอียด PV ที่สร้างจากรายการนี้ ถ้ายังไม่มี id ไปหน้ารายการ */
const PV_PATH = "/finance/payables/payment-vouchers";

/** รายละเอียดรายการขอจ่ายล่วงหน้า / มัดจำ (อ่านอย่างเดียว) */
export default function AdvanceRequestDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const perms = useScreenActionPermissions(ADVANCE_SCREEN);
  const query = useAdvanceRequestQuery(id);
  const cancel = useCancelAdvanceRequestMutation();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const r = query.data?.data;

  if (query.isLoading) return <Spin />;
  if (!r) return <Alert type="error" showIcon title="ไม่พบรายการขอจ่าย" />;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(ADVANCE_BASE_PATH)}>กลับ</Button>
            <Typography.Title level={3} style={{ margin: 0 }}>{r.requestNo}</Typography.Title>
            <Tag color={ADVANCE_STATUS_COLOR[r.status]}>{ADVANCE_STATUS_LABEL[r.status] ?? r.status}</Tag>
          </Space>
          <Space>
            {r.status === "DRAFT" && (perms.canEdit || perms.canApprove) ? (
              <Button type="primary" onClick={() => router.push(`${ADVANCE_BASE_PATH}/${r.id}/edit`)}>แก้ไข / ตรวจ WHT / ยืนยัน</Button>
            ) : null}
            {r.status === "PV_CREATED" ? (
              <Button type="primary" onClick={() => router.push(r.paymentVoucherId ? `${PV_PATH}/${r.paymentVoucherId}` : PV_PATH)}>ดูใบสำคัญจ่าย</Button>
            ) : null}
            {/* ยกเลิกได้เฉพาะสถานะร่าง — ยืนยันแล้วหรือสร้าง PV แล้วดูรายละเอียดได้อย่างเดียว */}
            {r.status === "DRAFT" && perms.canDelete ? (
              <Button danger onClick={() => setCancelling(true)}>ยกเลิกรายการ</Button>
            ) : null}
          </Space>
        </div>
      </Card>

      {r.status === "PENDING_PV" ? (
        <Alert type="success" showIcon title="ยืนยันรายการแล้ว — พร้อมนำไปสร้างใบสำคัญจ่าย (PV) ขั้นตอนถัดไป" description={r.confirmedAt ? `ยืนยันเมื่อ ${dayjs(r.confirmedAt).format("DD/MM/YYYY HH:mm")}` : undefined} />
      ) : null}
      {r.status === "PV_CREATED" ? (
        <Alert
          type="success"
          showIcon
          title={`สร้างใบสำคัญจ่ายแล้ว${r.paymentVoucherNo ? ` — ${r.paymentVoucherNo}` : ""}`}
          description={r.pvCreatedAt ? `สร้างเมื่อ ${dayjs(r.pvCreatedAt).format("DD/MM/YYYY HH:mm")} · รายการนี้แก้ไขหรือยกเลิกไม่ได้ (ถ้าต้องยกเลิกให้ทำที่ใบสำคัญจ่าย)` : undefined}
        />
      ) : null}
      {r.status === "CANCELLED" ? (
        <Alert type="error" showIcon title={`ยกเลิกเมื่อ ${r.cancelledAt ? dayjs(r.cancelledAt).format("DD/MM/YYYY HH:mm") : "-"}`} description={r.cancelReason} />
      ) : null}

      <Card title="ข้อมูลรายการ">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="วันที่เอกสาร">{formatThaiDate(r.requestDate)}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ PO">{r.poNo}</Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">{r.creditorCode} {r.creditorName}</Descriptions.Item>
          <Descriptions.Item label="ประเภทการจ่าย">{r.advanceType}</Descriptions.Item>
          <Descriptions.Item label="ยอดรวม PO">{money.format(r.poTotalAmount)}</Descriptions.Item>
          <Descriptions.Item label="วงเงินมัดจำ">{money.format(r.advanceLimitAmount)} ({r.advancePercent}%)</Descriptions.Item>
          <Descriptions.Item label="รูปแบบการคำนวณ">{r.calcMode === "PERCENT" ? `เปอร์เซ็นต์ ${r.percent ?? "-"}%` : "จำนวนเงิน"}</Descriptions.Item>
          <Descriptions.Item label="ยอดขอจ่าย"><Typography.Text strong>{money.format(r.requestedAmount)}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label="วันที่ต้องการจ่าย">{formatThaiDate(r.desiredPayDate)}</Descriptions.Item>
          <Descriptions.Item label="ผู้ขอจ่าย">{r.requestedByName ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="รายละเอียด / เหตุผล" span={2}>{r.reason || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="ภาษีหัก ณ ที่จ่าย (WHT)">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="มีภาษีหัก ณ ที่จ่าย">{r.whtApplicable ? "มี" : "ไม่มี"}</Descriptions.Item>
          <Descriptions.Item label="ประเภทการหักภาษี">{r.whtApplicable ? (WHT_TYPE_LABEL[r.whtType] ?? r.whtType) : "—"}</Descriptions.Item>
          <Descriptions.Item label="ประเภทเงินได้">{r.whtIncomeType ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="ฐานภาษี">{money.format(r.whtBaseAmount)}</Descriptions.Item>
          <Descriptions.Item label="อัตราภาษี">{r.whtApplicable ? `${r.whtRate}%` : "—"}</Descriptions.Item>
          <Descriptions.Item label="ยอดภาษีหัก ณ ที่จ่าย">{money.format(r.whtAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดโอนจริง"><Typography.Text strong>{money.format(r.netTransferAmount)}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label="ตรวจสอบภาษี" span={2}>
            {r.whtVerified ? (
              <Tag color="green">ตรวจแล้ว โดย {r.whtVerifiedByName ?? "-"} · {r.whtVerifiedAt ? dayjs(r.whtVerifiedAt).format("DD/MM/YYYY HH:mm") : "-"}</Tag>
            ) : (
              <Tag color="orange">ยังไม่ได้ตรวจสอบ</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="เอกสารแนบจาก Supplier">
        <DocumentAttachmentsPanel documentType={ADVANCE_DOCUMENT_TYPE} documentId={r.id} canEdit={false} emptyText="ไม่มีเอกสารแนบ" />
      </Card>

      <Modal
        open={cancelling}
        title={`ยกเลิกรายการ ${r.requestNo}`}
        okText="ยกเลิกรายการ"
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText="ไม่"
        confirmLoading={cancel.isPending}
        onCancel={() => setCancelling(false)}
        onOk={() => cancel.mutate({ id: r.id, reason: reason.trim() }, { onSuccess: () => { setCancelling(false); setReason(""); } })}
      >
        <Input.TextArea rows={3} maxLength={2000} placeholder="เหตุผล (อย่างน้อย 5 ตัวอักษร) — เก็บประวัติรายการไว้" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Space>
  );
}
