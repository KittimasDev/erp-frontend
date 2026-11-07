"use client";

import { useState } from "react";
import { Alert, App, Descriptions, InputNumber, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
  useAdjustmentCandidatesQuery,
  useApInvoiceActionMutation,
  useApplySupplierCreditsMutation,
  useSupplierCreditCandidatesQuery,
} from "@/hooks/ap-documents/useApDocuments";
import { useT } from "@/lib/i18n/useT";
import type { ApAdjustmentCandidate, ApInvoiceDetail, ApSupplierCreditCandidate } from "@/types/ap-documents";

import { formatThaiDate, money } from "./apDocumentConfig";

const TYPE_LABEL: Record<string, string> = { DEBIT_NOTE: "ใบเพิ่มหนี้", CREDIT_NOTE: "ใบลดหนี้" };
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * ปรับหนี้ — เลือกใบเพิ่มหนี้ / ใบลดหนี้ที่อนุมัติแล้วซึ่งอ้างอิง AP ใบนี้ (สร้างจากเมนูอื่นไว้แล้ว) เลือกได้หลายใบ
 * ใบลดหนี้แบบรับเงินคืน/เครดิตผู้ขายแสดงเป็นเอกสารที่เกี่ยวข้อง เลือกไม่ได้ (ไม่หัก AP ซ้ำ)
 * ยอด AP เปลี่ยนเมื่อกด "ยืนยันการปรับหนี้" เท่านั้น · เอกสารแต่ละใบใช้ปรับได้ครั้งเดียว · สถานะ AP ไม่เปลี่ยน
 */
export default function AdjustDebtModal({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail: ApInvoiceDetail;
  onClose: () => void;
}) {
  const t = useT();
  const { message } = App.useApp();
  const candidates = useAdjustmentCandidatesQuery(detail.id, open);
  const action = useApInvoiceActionMutation(detail.id);
  const creditCandidates = useSupplierCreditCandidatesQuery(detail.id, open);
  const creditAction = useApplySupplierCreditsMutation(detail.id);
  const [selected, setSelected] = useState<string[]>([]);
  /** ยอดเครดิตผู้ขายที่จะใช้ต่อใบลดหนี้ (ไม่ใส่/0 = ไม่ใช้) */
  const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>({});

  const rows = candidates.data ?? [];
  const creditRows = creditCandidates.data ?? [];
  const chosen = rows.filter((r) => selected.includes(r.id) && r.selectable);
  const creditChosen = creditRows
    .map((r) => ({ note: r, amount: round2(Math.min(creditAmounts[r.id] ?? 0, r.remainingAmount)) }))
    .filter((c) => c.amount > 0);
  const creditOver = creditRows.some((r) => (creditAmounts[r.id] ?? 0) > r.remainingAmount + 0.004);
  const delta = chosen.reduce((s, r) => s + r.signedAmount, 0) - creditChosen.reduce((s, c) => s + c.amount, 0);
  const before = detail.remainingAmount;
  const after = round2(before + delta);
  const hasSelection = chosen.length > 0 || creditChosen.length > 0;
  const belowOpen = hasSelection && after < detail.pvOpenAmount - 0.004;

  const close = () => {
    setSelected([]);
    setCreditAmounts({});
    onClose();
  };

  const submit = async () => {
    try {
      // ปรับหนี้ (ใบเพิ่ม/ลดหนี้) ก่อน แล้วจึงใช้เครดิตผู้ขาย — backend ตรวจยอดต่ำสุดซ้ำทุกขั้น
      if (chosen.length > 0) {
        await action.mutateAsync({ action: "adjust", documentIds: selected });
      }
      if (creditChosen.length > 0) {
        await creditAction.mutateAsync(creditChosen.map((c) => ({ noteId: c.note.id, amount: c.amount })));
      }
      message.success(t("ปรับหนี้แล้ว"));
      close();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("ปรับหนี้ไม่สำเร็จ"));
    }
  };

  const creditColumns: ColumnsType<ApSupplierCreditCandidate> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ใบลดหนี้ (เครดิตผู้ขาย)"),
      dataIndex: "docNo",
      width: 190,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: t("วันที่เอกสาร"), dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: t("เหตุผล"), dataIndex: "reason", render: (v: string | null) => v ?? "—" },
    {
      title: t("ยอดใบลดหนี้"),
      dataIndex: "totalAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: t("ใช้ไปแล้ว"),
      dataIndex: "usedAmount",
      align: "right",
      width: 110,
      render: (v: number) => money.format(v),
    },
    {
      title: t("เครดิตคงเหลือ"),
      dataIndex: "remainingAmount",
      align: "right",
      width: 130,
      render: (v: number) => money.format(v),
    },
    {
      title: t("ยอดที่ใช้กับ AP นี้"),
      key: "use",
      width: 170,
      render: (_v, r) => (
        <InputNumber
          min={0}
          max={r.remainingAmount}
          precision={2}
          style={{ width: "100%" }}
          value={creditAmounts[r.id]}
          placeholder="0.00"
          onChange={(value) => setCreditAmounts((prev) => ({ ...prev, [r.id]: value ?? 0 }))}
          addonAfter={
            <a onClick={() => setCreditAmounts((prev) => ({ ...prev, [r.id]: r.remainingAmount }))}>{t("ทั้งหมด")}</a>
          }
        />
      ),
    },
  ];

  const columns: ColumnsType<ApAdjustmentCandidate> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขที่เอกสาร"),
      dataIndex: "docNo",
      width: 150,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: t("ประเภท"),
      dataIndex: "docType",
      width: 100,
      render: (v: string) => <Tag color={v === "CREDIT_NOTE" ? "green" : "orange"}>{t(TYPE_LABEL[v] ?? v)}</Tag>,
    },
    { title: t("วันที่เอกสาร"), dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (r.creditorName ? `${r.creditorCode ?? ""} ${r.creditorName}` : "—"),
    },
    { title: t("AP อ้างอิง"), dataIndex: "referenceDocumentNo", width: 160, render: (v?: string) => v ?? "—" },
    { title: t("เหตุผล"), dataIndex: "reason", render: (v?: string) => v ?? "—" },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "signedAmount",
      align: "right",
      width: 130,
      render: (v: number) => (
        <Typography.Text type={v < 0 ? "success" : "warning"}>
          {v >= 0 ? "+" : "−"}
          {money.format(Math.abs(v))}
        </Typography.Text>
      ),
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 170,
      render: (_v, r) =>
        r.selectable ? (
          <Tag color="green">{t("อนุมัติแล้ว")}</Tag>
        ) : (
          <Tooltip title={r.unselectableReason}>
            <Tag>{t("เอกสารที่เกี่ยวข้อง (ไม่หัก AP)")}</Tag>
          </Tooltip>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      title={t("เลือกเอกสารปรับหนี้")}
      width={1100}
      okText={t("ยืนยันการปรับหนี้")}
      okButtonProps={{ disabled: !hasSelection || after < -0.004 || creditOver }}
      cancelText={t("ปิด")}
      confirmLoading={action.isPending || creditAction.isPending}
      onOk={() => void submit()}
      onCancel={close}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title={t(
          "ใบตั้งหนี้ {docNo} — แสดงเฉพาะใบเพิ่มหนี้/ใบลดหนี้ที่อนุมัติแล้ว อ้างอิง AP ใบนี้ ผู้ขายเดียวกัน และยังไม่ถูกนำไปใช้ปรับหนี้ · ยอด AP เปลี่ยนเมื่อยืนยันที่นี่เท่านั้น สถานะ AP ยังเป็นอนุมัติแล้ว",
          { docNo: detail.docNo },
        )}
      />
      <Table
        size="small"
        rowKey="id"
        loading={candidates.isLoading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1000 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as string[]),
          getCheckboxProps: (r) => ({ disabled: !r.selectable }),
        }}
        locale={{ emptyText: t("ไม่มีเอกสารปรับหนี้ที่นำมาใช้กับ AP ใบนี้ได้") }}
      />
      {creditRows.length > 0 ? (
        <>
          <Typography.Title level={5} style={{ marginTop: 16 }}>
            {t("ใช้เครดิตผู้ขาย (จากใบลดหนี้ที่เก็บเป็นเครดิต)")}
          </Typography.Title>
          <Table
            size="small"
            rowKey="id"
            loading={creditCandidates.isLoading}
            columns={creditColumns}
            dataSource={creditRows}
            pagination={false}
            scroll={{ x: 900 }}
          />
          {creditOver ? (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 8 }}
              title={t("ยอดที่ใช้เกินเครดิตคงเหลือของใบลดหนี้บางใบ")}
            />
          ) : null}
        </>
      ) : null}
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }} style={{ marginTop: 12 }}>
        <Descriptions.Item label={t("ยอดเจ้าหนี้คงเหลือก่อนปรับ")}>{money.format(before)}</Descriptions.Item>
        <Descriptions.Item label={t("ปรับหนี้ / ใช้เครดิตที่เลือก")}>
          {delta >= 0 ? "+" : "−"}
          {money.format(Math.abs(delta))}
        </Descriptions.Item>
        <Descriptions.Item label={t("ยอดเจ้าหนี้คงเหลือหลังปรับ")}>
          <Typography.Text strong type={after < 0 ? "danger" : undefined}>
            {money.format(after)}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      {belowOpen ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          title={t(
            "ยอดหลังปรับ ({after}) ต่ำกว่ายอดที่มี PV ค้างดำเนินการ ({open}) — ต้องจัดการส่วนต่างที่ใบสำคัญจ่าย/รายการรอสร้าง PV ก่อน ระบบจะตรวจซ้ำตอนยืนยัน",
            { after: money.format(after), open: money.format(detail.pvOpenAmount) },
          )}
        />
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("ยอดเจ้าหนี้คงเหลือ = ยอดตั้งหนี้ + เพิ่มหนี้ − ลดหนี้ − มัดจำ − ยอดจ่ายจริง · ใบลดหนี้ที่รับเงินคืน/เก็บเป็นเครดิตผู้ขายไม่นำมาหักซ้ำ")}
      </Typography.Text>
    </Modal>
  );
}
