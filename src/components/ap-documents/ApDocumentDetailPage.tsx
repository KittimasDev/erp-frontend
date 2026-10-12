"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useApDocumentQuery,
  useApproveApDocumentMutation,
  useCancelApDocumentMutation,
} from "@/hooks/ap-documents/useApDocuments";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_VAT_MODE_LABEL,
  type ApDocumentItem,
  type ApDocumentKind,
  type ApDocumentLink,
} from "@/types/ap-documents";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money } from "./apDocumentConfig";

type Props = { kind: ApDocumentKind; id: string };

/** 11/10/2569 10:30 — พ.ศ. เหมือนวันที่อื่นในหน้า */
const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = dayjs(value);
  return `${d.format("DD/MM/")}${d.year() + 543} ${d.format("HH:mm")}`;
};

export default function ApDocumentDetailPage({ kind, id }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const isInvoice = kind === "invoice";
  const router = useRouter();
  const { message, modal } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);
  const debitNotePerms = useScreenActionPermissions(AP_DOCUMENT_CONFIG.debitNote.screenCode);
  const query = useApDocumentQuery(kind, id);
  const approveMutation = useApproveApDocumentMutation(kind, id);
  const cancelMutation = useCancelApDocumentMutation(kind, id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const doc = query.data;
  if (query.isLoading) return <Spin />;
  if (!doc) {
    return (
      <Result
        status="404"
        title={`ไม่พบ${config.shortLabel}`}
        extra={<Button onClick={() => router.push(config.basePath)}>กลับรายการ</Button>}
      />
    );
  }

  const isDraft = doc.status === "DRAFT";
  const isApproved = doc.status === "APPROVED";
  const busy = approveMutation.isPending || cancelMutation.isPending;

  const handleApprove = () =>
    modal.confirm({
      title: `อนุมัติ${config.shortLabel} ${doc.docNo}?`,
      content: `ยอด ${money.format(doc.totalAmount)} บาท · อนุมัติแล้วแก้ไขไม่ได้ ต้องยกเลิกแล้วออกใบใหม่`,
      okText: "อนุมัติ",
      onOk: async () => {
        try {
          await approveMutation.mutateAsync();
          message.success("อนุมัติแล้ว");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "อนุมัติไม่สำเร็จ");
        }
      },
    });

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(cancelReason);
      message.success("ยกเลิกแล้ว");
      setCancelOpen(false);
      setCancelReason("");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "ยกเลิกไม่สำเร็จ");
    }
  };

  const handlePrint = async () => {
    const { generateApDocumentPdf } = await import("@/utils/generateApDocumentPdf");
    void generateApDocumentPdf(doc);
  };

  const lineColumns: ColumnsType<ApDocumentItem> = [
    { title: "#", key: "no", width: 48, align: "center", render: (_, __, i) => i + 1 },
    { title: "รายละเอียด", dataIndex: "description" },
    {
      title: "จำนวน",
      dataIndex: "quantity",
      align: "right",
      width: 110,
      render: (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 3 }),
    },
    { title: "หน่วย", dataIndex: "unitLabel", width: 90, render: (v: string | null) => v || "—" },
    {
      title: "ราคา/หน่วย",
      dataIndex: "unitPrice",
      align: "right",
      width: 130,
      render: (value: number) => money.format(value),
    },
    {
      title: "จำนวนเงิน",
      dataIndex: "amount",
      align: "right",
      width: 140,
      render: (value: number) => money.format(value),
    },
  ];

  const debitNoteColumns: ColumnsType<ApDocumentLink> = [
    {
      title: "ใบเพิ่มหนี้",
      dataIndex: "docNo",
      render: (value: string, row) => (
        <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${row.id}`}>{value}</Link>
      ),
    },
    { title: "วันที่", dataIndex: "docDate", render: formatThaiDate },
    {
      title: "สถานะ",
      dataIndex: "status",
      render: (value: string) => (
        <Tag color={AP_DOCUMENT_STATUS_COLOR[value]}>{AP_DOCUMENT_STATUS_LABEL[value] ?? value}</Tag>
      ),
    },
    {
      title: "ยอดเพิ่มหนี้",
      dataIndex: "totalAmount",
      align: "right",
      render: (value: number) => money.format(value),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={
          <Space wrap>
            <span>
              {config.shortLabel} {doc.docNo}
            </span>
            <Tag color={AP_DOCUMENT_STATUS_COLOR[doc.status]}>
              {AP_DOCUMENT_STATUS_LABEL[doc.status] ?? doc.status}
            </Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(config.basePath)}>
              กลับ
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={() => void handlePrint()}>
              พิมพ์ PDF
            </Button>
            {isDraft && perms.canEdit ? (
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`${config.basePath}/${doc.id}/edit`)}
              >
                แก้ไข
              </Button>
            ) : null}
            {isDraft && perms.canApprove ? (
              <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={handleApprove}>
                อนุมัติ
              </Button>
            ) : null}
            {isInvoice && isApproved && debitNotePerms.canAdd ? (
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(
                    `${AP_DOCUMENT_CONFIG.debitNote.basePath}/create?creditorId=${doc.creditorId}&invoiceId=${doc.id}`,
                  )
                }
              >
                ออกใบเพิ่มหนี้
              </Button>
            ) : null}
            {doc.status !== "CANCELLED" && perms.canEdit ? (
              <Button danger icon={<CloseOutlined />} loading={busy} onClick={() => setCancelOpen(true)}>
                ยกเลิก
              </Button>
            ) : null}
          </Space>
        }
      >
        {doc.status === "CANCELLED" ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title={`ยกเลิกโดย ${doc.cancelledByName ?? "—"} เมื่อ ${formatDateTime(doc.cancelledAt)}`}
            description={doc.cancelReason ? `เหตุผล: ${doc.cancelReason}` : undefined}
          />
        ) : null}
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="เจ้าหนี้">
            {doc.creditorCode} {doc.creditorName}
          </Descriptions.Item>
          <Descriptions.Item label="เลขประจำตัวผู้เสียภาษี">{doc.creditorTaxId || "—"}</Descriptions.Item>
          <Descriptions.Item label="วันที่เอกสาร">{formatThaiDate(doc.docDate)}</Descriptions.Item>
          <Descriptions.Item label={isInvoice ? "เลขที่ใบแจ้งหนี้ผู้ขาย" : "เลขที่ใบเพิ่มหนี้ผู้ขาย"}>
            {doc.supplierDocNo || "—"}
            {doc.supplierDocDate ? ` (${formatThaiDate(doc.supplierDocDate)})` : ""}
          </Descriptions.Item>
          {isInvoice ? (
            <>
              <Descriptions.Item label="อ้างอิงใบสั่งซื้อ">
                {doc.purchaseOrderId ? (
                  <Link href={`/purchase-orders/${doc.purchaseOrderId}`}>{doc.purchaseOrderNo}</Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="ครบกำหนดชำระ">{formatThaiDate(doc.dueDate)}</Descriptions.Item>
            </>
          ) : (
            <>
              <Descriptions.Item label="อ้างอิงใบตั้งหนี้">
                {doc.referenceDocumentId ? (
                  <Link href={`${AP_DOCUMENT_CONFIG.invoice.basePath}/${doc.referenceDocumentId}`}>
                    {doc.referenceDocumentNo}
                  </Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="เหตุผลที่เพิ่มหนี้">{doc.reason || "—"}</Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="การคิด VAT">
            {AP_VAT_MODE_LABEL[doc.vatMode] ?? doc.vatMode}
            {doc.vatMode !== "NONE" ? ` ${doc.vatRate}%` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="ผู้บันทึก">{doc.createdByName || "—"}</Descriptions.Item>
          <Descriptions.Item label="ผู้อนุมัติ">
            {doc.approvedByName ? `${doc.approvedByName} · ${formatDateTime(doc.approvedAt)}` : "—"}
          </Descriptions.Item>
          {doc.remark ? (
            <Descriptions.Item label="หมายเหตุ" span="filled">
              {doc.remark}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>

      <Card title="รายการ">
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={lineColumns}
          dataSource={doc.items}
          scroll={{ x: 640 }}
        />
        <Descriptions
          bordered
          size="small"
          column={1}
          style={{ maxWidth: 420, marginLeft: "auto", marginTop: 16 }}
        >
          <Descriptions.Item label="มูลค่าก่อน VAT">{money.format(doc.subtotalAmount)}</Descriptions.Item>
          <Descriptions.Item label={`VAT ${doc.vatRate}%`}>{money.format(doc.vatAmount)}</Descriptions.Item>
          <Descriptions.Item label={isInvoice ? "ยอดตั้งหนี้" : "ยอดเพิ่มหนี้"}>
            <Typography.Text strong>{money.format(doc.totalAmount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {isInvoice ? (
        <Card title="ใบเพิ่มหนี้ที่อ้างถึงใบนี้">
          {doc.debitNotes?.length ? (
            <>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={debitNoteColumns}
                dataSource={doc.debitNotes}
              />
              <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0, textAlign: "right" }}>
                ยอดหนี้หลังปรับ (เฉพาะใบที่อนุมัติแล้ว):{" "}
                <Typography.Text strong>{money.format(doc.adjustedTotalAmount ?? doc.totalAmount)}</Typography.Text>
              </Typography.Paragraph>
            </>
          ) : (
            <Typography.Text type="secondary">ยังไม่มีใบเพิ่มหนี้</Typography.Text>
          )}
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            หมายเหตุ: ยอดในใบสำคัญจ่ายยังคิดจากใบสั่งซื้อ ไม่ได้รวมใบตั้งหนี้/ใบเพิ่มหนี้
          </Typography.Paragraph>
        </Card>
      ) : null}

      <Modal
        open={cancelOpen}
        title={`ยกเลิก${config.shortLabel} ${doc.docNo}`}
        okText="ยืนยันยกเลิก"
        okButtonProps={{ danger: true, disabled: isApproved && !cancelReason.trim() }}
        confirmLoading={cancelMutation.isPending}
        onOk={() => void handleCancel()}
        onCancel={() => setCancelOpen(false)}
      >
        <Typography.Paragraph>
          {isApproved
            ? "ใบนี้อนุมัติแล้ว ต้องระบุเหตุผลในการยกเลิก"
            : "ยกเลิกแล้วแก้ไขหรืออนุมัติต่อไม่ได้"}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={isApproved ? "เหตุผล (บังคับ)" : "เหตุผล (ไม่บังคับ)"}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>
    </Space>
  );
}
