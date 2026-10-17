"use client";

import { useState } from "react";
import { Alert, App, Descriptions, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useAdjustmentCandidatesQuery, useApInvoiceActionMutation } from "@/hooks/ap-documents/useApDocuments";
import type { ApAdjustmentCandidate, ApInvoiceDetail } from "@/types/ap-documents";

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
  const { message } = App.useApp();
  const candidates = useAdjustmentCandidatesQuery(detail.id, open);
  const action = useApInvoiceActionMutation(detail.id);
  const [selected, setSelected] = useState<string[]>([]);

  const rows = candidates.data ?? [];
  const chosen = rows.filter((r) => selected.includes(r.id) && r.selectable);
  const delta = chosen.reduce((s, r) => s + r.signedAmount, 0);
  const before = detail.remainingAmount;
  const after = round2(before + delta);
  const belowOpen = chosen.length > 0 && after < detail.pvOpenAmount - 0.004;

  const close = () => {
    setSelected([]);
    onClose();
  };

  const submit = async () => {
    try {
      await action.mutateAsync({ action: "adjust", documentIds: selected });
      message.success("ปรับหนี้แล้ว");
      close();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "ปรับหนี้ไม่สำเร็จ");
    }
  };

  const columns: ColumnsType<ApAdjustmentCandidate> = [
    {
      title: "เลขที่เอกสาร",
      dataIndex: "docNo",
      width: 150,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: "ประเภท",
      dataIndex: "docType",
      width: 100,
      render: (v: string) => <Tag color={v === "CREDIT_NOTE" ? "green" : "orange"}>{TYPE_LABEL[v] ?? v}</Tag>,
    },
    { title: "วันที่เอกสาร", dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (r.creditorName ? `${r.creditorCode ?? ""} ${r.creditorName}` : "—"),
    },
    { title: "AP อ้างอิง", dataIndex: "referenceDocumentNo", width: 160, render: (v?: string) => v ?? "—" },
    { title: "เหตุผล", dataIndex: "reason", render: (v?: string) => v ?? "—" },
    {
      title: "จำนวนเงิน",
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
      title: "สถานะ",
      key: "status",
      width: 170,
      render: (_v, r) =>
        r.selectable ? (
          <Tag color="green">อนุมัติแล้ว</Tag>
        ) : (
          <Tooltip title={r.unselectableReason}>
            <Tag>เอกสารที่เกี่ยวข้อง (ไม่หัก AP)</Tag>
          </Tooltip>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      title="เลือกเอกสารปรับหนี้"
      width={1100}
      okText="ยืนยันการปรับหนี้"
      okButtonProps={{ disabled: chosen.length === 0 || after < -0.004 }}
      cancelText="ปิด"
      confirmLoading={action.isPending}
      onOk={() => void submit()}
      onCancel={close}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title={`ใบตั้งหนี้ ${detail.docNo} — แสดงเฉพาะใบเพิ่มหนี้/ใบลดหนี้ที่อนุมัติแล้ว อ้างอิง AP ใบนี้ ผู้ขายเดียวกัน และยังไม่ถูกนำไปใช้ปรับหนี้ · ยอด AP เปลี่ยนเมื่อยืนยันที่นี่เท่านั้น สถานะ AP ยังเป็นอนุมัติแล้ว`}
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
        locale={{ emptyText: "ไม่มีเอกสารปรับหนี้ที่นำมาใช้กับ AP ใบนี้ได้" }}
      />
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }} style={{ marginTop: 12 }}>
        <Descriptions.Item label="ยอดเจ้าหนี้คงเหลือก่อนปรับ">{money.format(before)}</Descriptions.Item>
        <Descriptions.Item label="ปรับหนี้ที่เลือก">
          {delta >= 0 ? "+" : "−"}
          {money.format(Math.abs(delta))}
        </Descriptions.Item>
        <Descriptions.Item label="ยอดเจ้าหนี้คงเหลือหลังปรับ">
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
          title={`ยอดหลังปรับ (${money.format(after)}) ต่ำกว่ายอดที่มี PV ค้างดำเนินการ (${money.format(detail.pvOpenAmount)}) — ต้องจัดการส่วนต่างที่ใบสำคัญจ่าย/รายการรอสร้าง PV ก่อน ระบบจะตรวจซ้ำตอนยืนยัน`}
        />
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        ยอดเจ้าหนี้คงเหลือ = ยอดตั้งหนี้ + เพิ่มหนี้ − ลดหนี้ − มัดจำ − ยอดจ่ายจริง · ใบลดหนี้ที่รับเงินคืน/เก็บเป็นเครดิตผู้ขายไม่นำมาหักซ้ำ
      </Typography.Text>
    </Modal>
  );
}
