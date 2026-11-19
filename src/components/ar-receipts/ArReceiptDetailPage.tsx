"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Breadcrumb, Button, Descriptions, Input, Modal, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useArReceiptQuery, useCancelArReceiptMutation } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { arReceiptRoutes, arRoutes } from "@/lib/sales/ar-routes";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_COLOR,
  AR_RECEIPT_STATUS_LABEL,
  type ArReceiptAllocation,
} from "@/types/ar-receipts";

export default function ArReceiptDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const pay = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const rec = useScreenActionPermissions("FINANCE_RECEIPTS");
  const query = useArReceiptQuery(id);
  const cancelMutation = useCancelArReceiptMutation();
  const { message } = App.useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!pay.canView && !rec.canView) {
    return <AccessDenied screenCodes={["FINANCE_PAYMENT_RECEIPTS", "FINANCE_RECEIPTS"]} />;
  }
  if (query.isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }
  const r = query.data;
  if (!r) {
    return (
      <div style={{ padding: 24 }}>
        {t("ไม่พบใบรับชำระ")}
        <div style={{ marginTop: 12 }}>
          <Link href={arReceiptRoutes.list}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const printPdf = async () => {
    const { generateArReceiptPdf } = await import("@/utils/generateArDocumentsPdf");
    await generateArReceiptPdf(r);
  };

  const columns: ColumnsType<ArReceiptAllocation> = [
    { title: t("ลำดับ"), key: "seq", width: 64, align: "center", render: (_v, _r, i) => i + 1 },
    { title: t("เลขที่ AR"), dataIndex: "invoiceNo", render: (v: string, a) => <Link href={arRoutes.detail(a.salesInvoiceId)}>{v}</Link> },
    { title: t("ใบสั่งขาย"), dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
    { title: t("เงินสดที่ตัด"), dataIndex: "amount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("ภาษีที่ลูกค้าหัก (WHT)"), dataIndex: "whtAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    {
      title: t("รวมตัดยอด AR"),
      key: "sum",
      align: "right",
      render: (_v, a) => <strong>{money.format(Number(a.amount) + Number(a.whtAmount))}</strong>,
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Breadcrumb
        items={[{ title: <Link href={arReceiptRoutes.list}>{t("รับชำระเงิน")}</Link> }, { title: r.receiptNo }]}
      />
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={r.receiptNo}
        subtitle={`${r.customerCode ?? ""} ${r.customerName ?? ""}`.trim()}
        actions={
          <>
            <Button onClick={() => router.push(arReceiptRoutes.list)}>{t("กลับรายการ")}</Button>
            <Button
              onClick={() =>
                void printPdf().catch((e: unknown) =>
                  message.error(e instanceof Error ? e.message : t("พิมพ์ไม่สำเร็จ")),
                )
              }
            >
              {t("พิมพ์ใบเสร็จ (PDF)")}
            </Button>
            {r.status === "POSTED" && pay.canDelete ? (
              <Button danger onClick={() => setCancelOpen(true)}>
                {t("ยกเลิกใบรับชำระ")}
              </Button>
            ) : null}
          </>
        }
      />
      <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12 }}>
        <Descriptions
          column={{ xs: 1, md: 2, xl: 3 }}
          size="small"
          items={[
            { key: "st", label: t("สถานะ"), children: <Tag color={AR_RECEIPT_STATUS_COLOR[r.status] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[r.status] ?? r.status)}</Tag> },
            { key: "d", label: t("วันที่รับชำระ"), children: formatThaiDate(r.receiptDate) },
            { key: "m", label: t("วิธีรับชำระ"), children: t(AR_PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) },
            { key: "ref", label: t("เลขอ้างอิง"), children: r.transactionRef || "—" },
            { key: "rv", label: t("เงินที่รับจริง"), children: <strong>{money.format(Number(r.receivedAmount))}</strong> },
            { key: "al", label: t("ตัด AR (เงินสด)"), children: money.format(Number(r.allocatedAmount)) },
            { key: "w", label: t("ภาษีที่ลูกค้าหัก"), children: money.format(Number(r.whtAmount)) },
            { key: "o", label: t("รับเกิน (เป็นเครดิตลูกค้า)"), children: money.format(Number(r.overpayAmount)) },
            { key: "by", label: t("ผู้บันทึก"), children: r.createdByName ?? "—" },
            ...(r.status === "CANCELLED"
              ? [
                  { key: "cx", label: t("ยกเลิกโดย"), children: `${r.cancelledByName ?? "—"}${r.cancelledAt ? ` · ${dayjs(r.cancelledAt).format("DD/MM/BBBB HH:mm")}` : ""}` },
                  { key: "cr", label: t("เหตุผลที่ยกเลิก"), children: r.cancelReason || "—" },
                ]
              : []),
            { key: "rm", label: t("หมายเหตุ"), children: r.remark || "—" },
          ]}
        />
      </div>
      <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t("ใบตั้งลูกหนี้ที่ตัดยอด ({n})", { n: r.allocations.length })}</h3>
        <Table rowKey="id" size="middle" columns={columns} dataSource={r.allocations} pagination={false} scroll={{ x: 800 }} />
      </div>

      <Modal
        open={cancelOpen}
        title={t("ยกเลิกใบรับชำระ {no}", { no: r.receiptNo })}
        okText={t("ยกเลิกใบรับชำระ")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        confirmLoading={cancelMutation.isPending}
        maskClosable={false}
        destroyOnHidden
        afterOpenChange={(v) => {
          if (!v) setReason("");
        }}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          try {
            await cancelMutation.mutateAsync({ id: r.id, reason: reason.trim() });
            setCancelOpen(false);
          } catch {
            // hook แจ้ง error แล้ว
          }
        }}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>
          {t("ยกเลิกแล้วยอดค้างชำระของ AR ที่ตัดไว้จะกลับมา และเครดิตรับเกินของใบนี้จะถูกถอน")}
        </p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          placeholder={t("เหตุผลที่ยกเลิก (บังคับ อย่างน้อย 5 ตัวอักษร)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </section>
  );
}
