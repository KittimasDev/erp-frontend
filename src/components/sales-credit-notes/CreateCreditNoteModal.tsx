"use client";

import { useEffect, useState } from "react";
import { Alert, App, Checkbox, Input, InputNumber, Modal, Select, Table, Typography } from "antd";

import {
  getCreditNoteInvoiceCandidates,
  getCreditNoteInvoiceSource,
} from "@/lib/api/sales-credit-notes";
import { getAccessToken } from "@/lib/auth/token";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  SALES_CREDIT_NOTE_REASON_LABEL,
  type CreditNoteInvoiceCandidate,
  type CreditNoteInvoiceSource,
  type SalesCreditNotePendingRow,
  type SaveSalesCreditNoteBody,
} from "@/types/sales-credit-notes";

type PendingGroup = {
  deliveryOrderNo: string;
  customerName: string;
  lines: SalesCreditNotePendingRow[];
};

type LineDraft = {
  salesInvoiceItemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  adjustmentAmount: number;
  remainingQuantity: number;
  remainingAmount: number;
  selected: boolean;
  unitName: string;
  billedQuantity: number;
  acceptedQuantity: number;
  returnedQuantity: number;
  /** ฐานจำนวนที่ใบแจ้งหนี้คิดเงิน (SHIPPED = ออกก่อนส่งของ ของตีกลับอยู่ในบิล) */
  quantityBasis?: string;
  /** SI บิลตามจำนวนส่ง: เพดานคืนสินค้า = ตีกลับไม่ส่งใหม่ − ที่ลดแล้ว */
  returnableQuantity?: number | null;
};

/** จำนวนสูงสุดที่ลดได้ของบรรทัด: เหตุผลคืนสินค้าบน SI ฐานจำนวนส่งใช้เพดานตีกลับ · อื่น ๆ ใช้จำนวนคงเหลือของบิล */
const maxQuantity = (line: LineDraft, isReturn: boolean) =>
  isReturn && line.returnableQuantity != null
    ? Math.min(line.remainingQuantity, line.returnableQuantity)
    : line.remainingQuantity;

/** ใบแจ้งหนี้คิดเฉพาะของที่ลูกค้ารับ (บิล = ของที่รับ) และใบส่งมีของตีกลับ → ของตีกลับไม่เคยออกบิล */
// ใบแจ้งหนี้ที่คิดจากจำนวนส่ง (SHIPPED — ออกก่อนส่งของ) ของตีกลับอยู่ในบิลแล้ว จึงไม่เตือน/ไม่บล็อก
const billedAcceptedOnly = (line: LineDraft) =>
  line.quantityBasis !== "SHIPPED" &&
  line.returnedQuantity > 0.0005 &&
  Math.abs(line.billedQuantity - line.acceptedQuantity) <= 0.0005;

export default function CreateCreditNoteModal({
  open,
  pending,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending?: PendingGroup | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (body: SaveSalesCreditNoteBody) => Promise<void>;
}) {
  const t = useT();
  const lang = useLanguage();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState("");
  const [candidates, setCandidates] = useState<CreditNoteInvoiceCandidate[]>([]);
  const [invoiceId, setInvoiceId] = useState<string>();
  const [source, setSource] = useState<CreditNoteInvoiceSource | null>(null);
  const [taxId, setTaxId] = useState<string>();
  // ไม่ตั้งเหตุผลเริ่มต้น (ยกเว้นลดหนี้จากคิวตีกลับ) — ผู้ใช้ต้องเลือกเองก่อนบันทึก
  const [reasonCode, setReasonCode] = useState<string | undefined>(pending ? "GOODS_RETURN" : undefined);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setKeyword(pending?.deliveryOrderNo ?? "");
    setInvoiceId(undefined);
    setSource(null);
    setLines([]);
    setReasonCode(pending ? "GOODS_RETURN" : undefined);
    setReason("");
  }, [open, pending]);

  // เปลี่ยนเหตุผล: คืนสินค้า = กรอกจำนวน · เหตุผลอื่น = ลดเฉพาะมูลค่า (จำนวน 0)
  useEffect(() => {
    if (pending) return;
    const isReturn = reasonCode === "GOODS_RETURN";
    setLines((current) =>
      current.map((row) => {
        const usable =
          row.remainingAmount > 0.005 &&
          !(isReturn && billedAcceptedOnly(row)) &&
          !(isReturn && maxQuantity(row, true) <= 0.0005);
        return {
          ...row,
          quantity: isReturn && usable ? maxQuantity(row, true) : 0,
          adjustmentAmount: 0,
          selected: isReturn && usable,
        };
      }),
    );
  }, [reasonCode, pending, source]);

  const patchLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((current) =>
      current.map((row) => (row.salesInvoiceItemId === id ? { ...row, ...patch } : row)),
    );
  // แสดงเฉพาะบรรทัดที่ยังลดหนี้ได้
  const creditableLines = lines.filter((line) => line.remainingAmount > 0.005);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void getCreditNoteInvoiceCandidates(getAccessToken(), keyword)
        .then((res) => setCandidates(res.data ?? []))
        .catch(() => setCandidates([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, keyword]);

  useEffect(() => {
    if (!invoiceId) {
      setSource(null);
      setLines([]);
      return;
    }
    void getCreditNoteInvoiceSource(getAccessToken(), invoiceId)
      .then((res) => {
        setSource(res.data);
        const issued = res.data.taxInvoices.find((tax) => tax.status === "ISSUED");
        setTaxId(issued?.id ?? res.data.taxInvoices[0]?.id);
        setLines(
          res.data.lines.map((line) => ({
            salesInvoiceItemId: line.id,
            itemCode: line.itemCode,
            itemName: line.itemName,
            quantity: 0,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount,
            adjustmentAmount: 0,
            remainingQuantity: line.remainingQuantity,
            remainingAmount: line.remainingAmount,
            selected: false,
            unitName: line.unitName,
            billedQuantity: line.quantity,
            acceptedQuantity: line.acceptedQuantity ?? 0,
            returnedQuantity: line.returnedQuantity ?? 0,
            quantityBasis: res.data.quantityBasis,
            returnableQuantity: line.returnableQuantity ?? null,
          })),
        );
      })
      .catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : t("โหลดใบแจ้งหนี้ไม่สำเร็จ"));
      });
  }, [invoiceId, message, pending, t]);

  async function submit() {
    if (!invoiceId || !source) {
      message.error(t("เลือกใบแจ้งหนี้ต้นทาง"));
      return;
    }
    if (!reasonCode || reason.trim().length < 5) {
      message.error(t("ระบุรหัสเหตุผลและข้อความเหตุผลอย่างน้อย 5 ตัวอักษร"));
      return;
    }
    if (
      !pending &&
      reasonCode === "GOODS_RETURN" &&
      lines.some((line) => line.selected && billedAcceptedOnly(line))
    ) {
      message.error(
        t("ใบแจ้งหนี้นี้คิดเฉพาะจำนวนที่ลูกค้ารับ — ลดหนี้ด้วยเหตุผลคืนสินค้าไม่ได้ (ของตีกลับไม่ได้ออกบิล) เลือกเหตุผลอื่นถ้าเป็นความเสียหาย/ลดราคาของที่ลูกค้ารับไปแล้ว"),
      );
      return;
    }
    if (!pending) {
      const picked = lines.filter((line) => line.selected);
      const bad = picked.find((line) =>
        reasonCode === "GOODS_RETURN" ? !(line.quantity > 0) : !(line.adjustmentAmount > 0),
      );
      if (bad) {
        message.error(
          reasonCode === "GOODS_RETURN"
            ? t("ระบุจำนวนที่คืนของบรรทัดที่เลือก")
            : t("ระบุยอดที่ลดของบรรทัดที่เลือก"),
        );
        return;
      }
    }
    const body: SaveSalesCreditNoteBody = pending
      ? {
          salesInvoiceId: invoiceId,
          salesTaxInvoiceId: taxId,
          reasonCode,
          reason: reason.trim(),
          isReturn: reasonCode === "GOODS_RETURN",
          items: pending.lines.map((line) => ({
            pendingId: line.id,
            quantity: line.remainingQuantity,
            unitPrice: line.unitPrice,
            discountAmount: 0,
          })),
        }
      : {
          salesInvoiceId: invoiceId,
          salesTaxInvoiceId: taxId,
          reasonCode,
          reason: reason.trim(),
          isReturn: reasonCode === "GOODS_RETURN",
          items: lines
            .filter((line) => line.selected)
            .map((line) => ({
              salesInvoiceItemId: line.salesInvoiceItemId,
              quantity: reasonCode === "GOODS_RETURN" ? line.quantity : 0,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              adjustmentAmount: reasonCode === "GOODS_RETURN" ? undefined : line.adjustmentAmount,
            })),
        };
    if (!body.items.length) {
      message.error(t("เลือกอย่างน้อย 1 รายการ"));
      return;
    }
    await onSubmit(body);
  }

  const selected = candidates.find((row) => row.id === invoiceId);

  return (
    <Modal
      open={open}
      title={pending ? t("สร้างใบลดหนี้จากคิวตีกลับ") : t("สร้างใบลดหนี้จากใบแจ้งหนี้")}
      width={920}
      okText={t("สร้างใบลดหนี้")}
      cancelText={t("ปิด")}
      confirmLoading={saving}
      destroyOnHidden
      onCancel={onClose}
      onOk={() => void submit()}
      okButtonProps={{ disabled: Boolean(source) && !pending && creditableLines.length === 0 }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        {pending ? (
          <Typography.Text>
            {pending.deliveryOrderNo} · {pending.customerName}
          </Typography.Text>
        ) : null}
        <Input
          allowClear
          placeholder={t("ค้นหาเลขใบแจ้งหนี้ เลขใบส่ง หรือลูกค้า")}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={t("เลือกใบแจ้งหนี้ที่ยืนยันแล้ว")}
          value={invoiceId}
          onChange={setInvoiceId}
          options={candidates.map((row) => ({
            value: row.id,
            label: `${row.invoiceNo} · ${row.customerName}${row.taxInvoiceNo ? ` · ${row.taxInvoiceNo}` : ""}`,
          }))}
        />
        {selected ? (
          <Typography.Text type="secondary">
            {t("ฐานก่อน VAT")} {formatMoney(Number(selected.subtotalAmount), lang)} · VAT{" "}
            {formatMoney(Number(selected.vatAmount), lang)} · {t("ยอดรวม")}{" "}
            {formatMoney(Number(selected.totalAmount), lang)}
            {selected.taxInvoiceNo ? ` · ${t("ใบกำกับ")} ${selected.taxInvoiceNo}` : ""}
          </Typography.Text>
        ) : null}
        {source && source.taxInvoices.length > 1 ? (
          <Select
            value={taxId}
            onChange={setTaxId}
            options={source.taxInvoices.map((tax) => ({
              value: tax.id,
              label: `${tax.taxInvoiceNo} · ${tax.status}`,
            }))}
          />
        ) : null}
        <Select
          value={reasonCode}
          placeholder={t("เลือกเหตุผล")}
          onChange={setReasonCode}
          options={Object.entries(SALES_CREDIT_NOTE_REASON_LABEL).map(([value, label]) => ({
            value,
            label: t(label),
          }))}
        />
        <Input.TextArea
          rows={2}
          placeholder={t("ข้อความเหตุผล")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {pending ? (
          <Typography.Text type="secondary">
            {t("ราคาและส่วนลดจะถูกดึงจากรายการใบแจ้งหนี้ที่ตรงกับสินค้าที่ตีกลับ")}
          </Typography.Text>
        ) : (
          <>
          {source && creditableLines.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              title={t("ใบแจ้งหนี้นี้ไม่มีบรรทัดที่ลดหนี้ได้แล้ว — ลดครบยอดที่ออกบิลแล้ว หรือมีใบลดหนี้ที่ยังไม่ยกเลิกใช้ยอดไปหมด")}
            />
          ) : null}
          <Table
            rowKey="salesInvoiceItemId"
            size="small"
            pagination={false}
            dataSource={creditableLines}
            expandable={{
              // แถบเตือนต่อบรรทัด: ใบส่งมีของตีกลับและบิลคิดเฉพาะของที่ลูกค้ารับ
              expandedRowKeys: lines.filter(billedAcceptedOnly).map((line) => line.salesInvoiceItemId),
              rowExpandable: billedAcceptedOnly,
              showExpandColumn: false,
              expandedRowRender: (line) => (
                <Alert
                  type={reasonCode === "GOODS_RETURN" ? "error" : "warning"}
                  showIcon
                  title={t(
                    "ใบแจ้งหนี้นี้คิดเฉพาะจำนวนที่ลูกค้ารับ {accepted} {unit} (ตีกลับ {returned} {unit} ไม่ได้ออกบิล) — ลดหนี้ได้เฉพาะของที่ลูกค้ารับไป",
                    {
                      accepted: line.acceptedQuantity,
                      returned: line.returnedQuantity,
                      unit: line.unitName,
                    },
                  )}
                  description={
                    reasonCode === "GOODS_RETURN"
                      ? t("เหตุผล «คืนสินค้า» ใช้ไม่ได้กับบรรทัดนี้ — เลือกเหตุผลอื่น เช่น สินค้าชำรุด หรือลดราคา")
                      : undefined
                  }
                />
              ),
            }}
            columns={[
              {
                title: "",
                width: 48,
                render: (_, line) => (
                  <Checkbox
                    checked={line.selected}
                    disabled={
                      !reasonCode ||
                      (reasonCode === "GOODS_RETURN" &&
                        (billedAcceptedOnly(line) || maxQuantity(line, true) <= 0.0005))
                    }
                    onChange={(event) => patchLine(line.salesInvoiceItemId, { selected: event.target.checked })}
                  />
                ),
              },
              { title: t("รหัส"), dataIndex: "itemCode", width: 110 },
              { title: t("สินค้า"), dataIndex: "itemName" },
              {
                title: t("ลดได้สูงสุด"),
                width: 150,
                align: "right" as const,
                render: (_, line) => {
                  const isReturn = reasonCode === "GOODS_RETURN";
                  const qty = maxQuantity(line, isReturn);
                  // คืนสินค้าบน SI ฐานจำนวนส่ง: มูลค่าสูงสุด = จำนวนที่ลดได้ × ราคา (ไม่เกินมูลค่าคงเหลือ)
                  const amount =
                    isReturn && line.returnableQuantity != null
                      ? Math.min(line.remainingAmount, qty * line.unitPrice)
                      : line.remainingAmount;
                  return `${qty} ${line.unitName} / ${formatMoney(amount, lang)}`;
                },
              },
              {
                title: t("จำนวนที่ลด"),
                width: 120,
                render: (_, line) => (
                  <InputNumber
                    min={0}
                    max={maxQuantity(line, reasonCode === "GOODS_RETURN")}
                    disabled={reasonCode !== "GOODS_RETURN" || billedAcceptedOnly(line)}
                    value={line.quantity}
                    style={{ width: "100%" }}
                    onChange={(value) => patchLine(line.salesInvoiceItemId, { quantity: Number(value ?? 0) })}
                  />
                ),
              },
              {
                title: t("ลดเฉพาะมูลค่า"),
                width: 140,
                render: (_, line) => (
                  <InputNumber
                    min={0}
                    max={line.remainingAmount}
                    disabled={!reasonCode || reasonCode === "GOODS_RETURN"}
                    value={line.adjustmentAmount}
                    style={{ width: "100%" }}
                    onChange={(value) => {
                      const amount = Number(value ?? 0);
                      patchLine(line.salesInvoiceItemId, { adjustmentAmount: amount, selected: amount > 0 });
                    }}
                  />
                ),
              },
            ]}
          />
          </>
        )}
      </div>
    </Modal>
  );
}
