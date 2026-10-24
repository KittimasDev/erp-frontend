"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import {
  useApproveSalesCreditNoteMutation,
  useCancelSalesCreditNoteMutation,
  useConfirmSalesCreditNoteMutation,
  useUpdateSalesCreditNoteMutation,
  useUploadSalesCreditNoteAttachmentMutation,
} from "@/hooks/sales-credit-notes/useSalesCreditNoteMutations";
import {
  useSalesCreditNoteAttachmentsQuery,
  useSalesCreditNoteQuery,
} from "@/hooks/sales-credit-notes/useSalesCreditNotesQuery";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import {
  SALES_CREDIT_NOTE_STATUS_LABEL,
  type SalesCreditNote,
} from "@/types/sales-credit-notes";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DraftLine = {
  pendingId: string;
  itemCode: string;
  itemName: string;
  unitName: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  discountAmount: number;
};

function canEdit() {
  if (isAdministrator()) return true;
  if (isMatrixPermissionMode())
    return hasPermission("FINANCE_RECEIVABLE_CREDIT_NOTES.EDIT");
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER)
  );
}

function canApprove() {
  if (isAdministrator()) return true;
  if (isMatrixPermissionMode()) {
    return hasPermission("FINANCE_RECEIVABLE_CREDIT_NOTES.APPROVE");
  }
  return userHasRole(RoleCode.SALES_MANAGER);
}

function lineAmount(line: DraftLine, vatMode: string, vatRate: number) {
  const gross = line.quantity * line.unitPrice;
  const discount = Math.min(Math.max(0, line.discountAmount), Math.max(0, gross));
  const net = Math.max(0, gross - discount);
  if (vatMode === "NONE" || vatRate <= 0) {
    return { gross, discount, net, vat: 0, total: net };
  }
  if (vatMode === "INCLUSIVE") {
    const vat = (net * vatRate) / (100 + vatRate);
    return { gross, discount, net: net - vat, vat, total: net };
  }
  const vat = (net * vatRate) / 100;
  return { gross, discount, net, vat, total: net + vat };
}

export default function SalesCreditNoteDetailPage({ id }: { id: string }) {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const query = useSalesCreditNoteQuery(id);
  const attachments = useSalesCreditNoteAttachmentsQuery(id);
  const note = query.data;

  if (query.isLoading) {
    return <Typography.Text>กำลังโหลดใบลดหนี้</Typography.Text>;
  }
  if (!note) {
    return <Typography.Text>ไม่พบใบลดหนี้</Typography.Text>;
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space>
        <Link href="/finance/receivables/credit-notes">กลับหน้ารายการ</Link>
      </Space>
      {note.status === "DRAFT" && canEdit() ? (
        <DraftEditor
          note={note}
          onSaved={() => message.success("บันทึกใบลดหนี้แล้ว")}
        />
      ) : (
        <ReadOnlyNote note={note} />
      )}
      <AttachmentCard
        id={id}
        files={attachments.data ?? []}
        canUpload={note.status !== "COMPLETED" && note.status !== "CANCELLED"}
      />
      <ActionBar
        note={note}
        onDone={(text) => {
          message.success(text);
          if (text.startsWith("ยกเลิก"))
            router.push("/finance/receivables/credit-notes");
        }}
        confirm={(title, onOk) =>
          modal.confirm({
            title,
            okText: "ยืนยัน",
            cancelText: "ปิด",
            onOk,
          })
        }
      />
    </Space>
  );
}

function DraftEditor({
  note,
  onSaved,
}: {
  note: SalesCreditNote;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const update = useUpdateSalesCreditNoteMutation(note.id);
  const [date, setDate] = useState<Dayjs>(dayjs(note.creditNoteDate));
  const [reason, setReason] = useState(note.reason ?? "");
  const [remark, setRemark] = useState(note.remark ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    note.items.map((item) => ({
      pendingId: item.pendingId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitName: item.unitName,
      quantity: item.quantity,
      remainingQuantity: item.remainingQuantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
    })),
  );

  const preview = lines.map((line) => lineAmount(line, note.vatMode, note.vatRate));
  const gross = preview.reduce((sum, row) => sum + row.gross, 0);
  const discount = preview.reduce((sum, row) => sum + row.discount, 0);
  const subtotal = preview.reduce((sum, row) => sum + row.net, 0);
  const vat = preview.reduce((sum, row) => sum + row.vat, 0);
  const total = preview.reduce((sum, row) => sum + row.total, 0);

  const columns: ColumnsType<DraftLine> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: "รหัส", dataIndex: "itemCode", width: 110 },
    { title: "สินค้า", dataIndex: "itemName" },
    { title: "หน่วย", dataIndex: "unitName", width: 80 },
    {
      title: "จำนวน",
      width: 140,
      render: (_, line, index) => (
        <InputNumber
          min={0.001}
          max={line.remainingQuantity}
          value={line.quantity}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, quantity: Number(value ?? 0) } : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: "ราคาต่อหน่วย",
      width: 150,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          value={line.unitPrice}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, unitPrice: Number(value ?? 0) } : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: "ส่วนลด",
      width: 140,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          value={line.discountAmount}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index
                  ? { ...row, discountAmount: Number(value ?? 0) }
                  : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: "มูลค่าก่อน VAT",
      width: 140,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.net ?? 0),
    },
    {
      title: "VAT",
      width: 110,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.vat ?? 0),
    },
    {
      title: "ยอดรวม",
      width: 130,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.total ?? 0),
    },
  ];

  async function save() {
    try {
      await update.mutateAsync({
        creditNoteDate: date.format("YYYY-MM-DD"),
        reason,
        remark,
        items: lines.map((line) => ({
          pendingId: line.pendingId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
        })),
      });
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <Card
      title={`${note.creditNoteNo} · ${SALES_CREDIT_NOTE_STATUS_LABEL.DRAFT}`}
      extra={
        <Button type="primary" loading={update.isPending} onClick={save}>
          บันทึก
        </Button>
      }
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          <DatePicker value={date} format="DD/MM/YYYY" onChange={(value) => value && setDate(value)} />
          <Typography.Text>ลูกค้า {note.customerName}</Typography.Text>
          <Typography.Text>SO {note.salesOrderNo}</Typography.Text>
          <Typography.Text>ใบส่ง {note.deliveryOrderNo}</Typography.Text>
        </Space>
        <Input
          placeholder="เหตุผล"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Input.TextArea
          placeholder="หมายเหตุ"
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          rows={2}
        />
        <Table
          rowKey="pendingId"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={lines}
        />
        <Descriptions column={1} size="small" style={{ maxWidth: 360, marginLeft: "auto" }}>
          <Descriptions.Item label="ยอดก่อนลด">{money.format(gross)}</Descriptions.Item>
          <Descriptions.Item label="ส่วนลด">{money.format(discount)}</Descriptions.Item>
          <Descriptions.Item label="มูลค่าก่อน VAT">{money.format(subtotal)}</Descriptions.Item>
          <Descriptions.Item label="VAT">{money.format(vat)}</Descriptions.Item>
          <Descriptions.Item label="ยอดรวมที่ลด">{money.format(total)}</Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

function ReadOnlyNote({ note }: { note: SalesCreditNote }) {
  return (
    <Card
      title={`${note.creditNoteNo} · ${SALES_CREDIT_NOTE_STATUS_LABEL[note.status] ?? note.status}`}
    >
      <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="วันที่">{note.creditNoteDate}</Descriptions.Item>
        <Descriptions.Item label="ลูกค้า">{note.customerName}</Descriptions.Item>
        <Descriptions.Item label="ใบสั่งขาย">{note.salesOrderNo}</Descriptions.Item>
        <Descriptions.Item label="ใบส่งสินค้า">{note.deliveryOrderNo}</Descriptions.Item>
        <Descriptions.Item label="เหตุผล">{note.reason || "—"}</Descriptions.Item>
        <Descriptions.Item label="หมายเหตุ">{note.remark || "—"}</Descriptions.Item>
        <Descriptions.Item label="ผู้สร้าง">{note.createdByName || "—"}</Descriptions.Item>
        <Descriptions.Item label="ผู้อนุมัติ">
          {note.approvedByName || "—"}
          {note.approvedAt
            ? ` · ${dayjs(note.approvedAt).format("DD/MM/YYYY HH:mm")}`
            : ""}
        </Descriptions.Item>
      </Descriptions>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={note.items}
        columns={[
          { title: "รหัส", dataIndex: "itemCode" },
          { title: "สินค้า", dataIndex: "itemName" },
          { title: "จำนวน", dataIndex: "quantity", align: "right" },
          { title: "หน่วย", dataIndex: "unitName" },
          {
            title: "ราคาต่อหน่วย",
            dataIndex: "unitPrice",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: "ส่วนลด",
            dataIndex: "discountAmount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: "มูลค่าก่อน VAT",
            dataIndex: "amount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: "VAT",
            dataIndex: "vatAmount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: "ยอดรวม",
            dataIndex: "lineTotal",
            align: "right",
            render: (value: number) => money.format(value),
          },
        ]}
      />
      <Descriptions column={1} size="small" style={{ maxWidth: 360, marginLeft: "auto", marginTop: 12 }}>
        <Descriptions.Item label="ยอดก่อนลด">{money.format(note.grossAmount)}</Descriptions.Item>
        <Descriptions.Item label="ส่วนลด">{money.format(note.discountAmount)}</Descriptions.Item>
        <Descriptions.Item label="มูลค่าก่อน VAT">{money.format(note.subtotalAmount)}</Descriptions.Item>
        <Descriptions.Item label="VAT">{money.format(note.vatAmount)}</Descriptions.Item>
        <Descriptions.Item label="ยอดรวมที่ลด">{money.format(note.totalAmount)}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function AttachmentCard({
  id,
  files,
  canUpload,
}: {
  id: string;
  files: Array<{ id: string; originalFileName?: string }>;
  canUpload: boolean;
}) {
  const { message } = App.useApp();
  const upload = useUploadSalesCreditNoteAttachmentMutation(id);
  return (
    <Card title="เอกสารแนบ">
      <Space orientation="vertical">
        {files.map((file) => (
          <Typography.Text key={file.id}>
            {file.originalFileName || file.id}
          </Typography.Text>
        ))}
        {files.length === 0 ? (
          <Typography.Text type="secondary">ยังไม่มีเอกสารแนบ</Typography.Text>
        ) : null}
        {canUpload ? (
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              upload.mutate(file, {
                onSuccess: () => message.success("แนบเอกสารแล้ว"),
                onError: (error) =>
                  message.error(
                    error instanceof Error ? error.message : "แนบเอกสารไม่สำเร็จ",
                  ),
              });
              return false;
            }}
          >
            <Button loading={upload.isPending}>แนบเอกสาร</Button>
          </Upload>
        ) : null}
      </Space>
    </Card>
  );
}

function ActionBar({
  note,
  onDone,
  confirm,
}: {
  note: SalesCreditNote;
  onDone: (text: string) => void;
  confirm: (title: string, onOk: () => Promise<void>) => void;
}) {
  const { message } = App.useApp();
  const confirmNote = useConfirmSalesCreditNoteMutation(note.id);
  const approveNote = useApproveSalesCreditNoteMutation(note.id);
  const cancelNote = useCancelSalesCreditNoteMutation(note.id);

  async function run(
    action: () => Promise<unknown>,
    success: string,
  ) {
    try {
      await action();
      onDone(success);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ");
    }
  }

  async function printPdf() {
    const { generateSalesCreditNotePdf } = await import(
      "@/utils/generateSalesCreditNotePdf"
    );
    await generateSalesCreditNotePdf({
      creditNoteNo: note.creditNoteNo,
      creditNoteDate: note.creditNoteDate,
      customerName: note.customerName,
      salesOrderNo: note.salesOrderNo,
      deliveryOrderNo: note.deliveryOrderNo,
      reason: note.reason ?? "",
      remark: note.remark ?? "",
      grossAmount: note.grossAmount,
      discountAmount: note.discountAmount,
      subtotalAmount: note.subtotalAmount,
      vatAmount: note.vatAmount,
      vatRate: note.vatRate,
      totalAmount: note.totalAmount,
      createdByName: note.createdByName,
      approvedByName: note.approvedByName,
      items: note.items.map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unitName,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        amount: item.amount,
      })),
    });
  }

  return (
    <Space>
      {note.status === "DRAFT" && canEdit() ? (
        <>
          <Button
            type="primary"
            loading={confirmNote.isPending}
            onClick={() =>
              confirm("ยืนยันใบลดหนี้และส่งรออนุมัติ", () =>
                run(() => confirmNote.mutateAsync(), "ส่งรออนุมัติแล้ว"),
              )
            }
          >
            ยืนยัน
          </Button>
          <Button
            danger
            loading={cancelNote.isPending}
            onClick={() =>
              confirm("ยกเลิกใบลดหนี้ร่าง จำนวนจะกลับเข้าคิว", () =>
                run(() => cancelNote.mutateAsync(), "ยกเลิกใบลดหนี้แล้ว"),
              )
            }
          >
            ยกเลิก
          </Button>
        </>
      ) : null}
      {note.status === "PENDING_APPROVAL" && canApprove() ? (
        <Button
          type="primary"
          loading={approveNote.isPending}
          onClick={() =>
            confirm("อนุมัติใบลดหนี้เป็นฉบับเสร็จสิ้น", () =>
              run(() => approveNote.mutateAsync(), "อนุมัติใบลดหนี้แล้ว"),
            )
          }
        >
          อนุมัติ
        </Button>
      ) : null}
      {note.status === "COMPLETED" ? (
        <Button onClick={() => printPdf().catch((error: unknown) =>
          message.error(error instanceof Error ? error.message : "พิมพ์ไม่สำเร็จ"),
        )}>
          พิมพ์ PDF
        </Button>
      ) : null}
    </Space>
  );
}
