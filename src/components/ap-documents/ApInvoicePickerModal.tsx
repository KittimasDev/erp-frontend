"use client";

import { useState } from "react";
import { Button, Input, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { useApInvoiceOptionsQuery } from "@/hooks/ap-documents/useApDocuments";
import {
  AP_BILLING_STATUS_COLOR,
  AP_BILLING_STATUS_LABEL,
  AP_PAYMENT_STATUS_COLOR,
  AP_PAYMENT_STATUS_LABEL,
  type ApInvoiceBillingStatusFilter,
  type ApInvoiceOption,
} from "@/types/ap-documents";

type Props = {
  open: boolean;
  creditorId: string;
  kind: "debitNote" | "creditNote";
  selectedId?: string;
  onClose: () => void;
  onSelect: (row: ApInvoiceOption) => void;
};

/** Modal เลือกใบตั้งหนี้ 1 รายการ — ใช้บนฟอร์มใบเพิ่มหนี้ / ใบลดหนี้ */
export default function ApInvoicePickerModal({
  open,
  creditorId,
  kind,
  selectedId,
  onClose,
  onSelect,
}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [billingStatus, setBillingStatus] = useState<ApInvoiceBillingStatusFilter>("UNBILLED");
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PARTIAL" | "PAID" | undefined>();
  const [picked, setPicked] = useState<ApInvoiceOption | null>(null);

  const query = useApInvoiceOptionsQuery(
    open
      ? {
          creditorId,
          page,
          limit: 5,
          search: keyword || undefined,
          billingStatus,
          paymentStatus,
        }
      : undefined,
    kind,
  );

  const items = query.data?.items ?? [];

  const columns: ColumnsType<ApInvoiceOption> = [
    { title: "เลขที่ AP", dataIndex: "docNo", width: 150 },
    { title: "วันที่", dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: "เลขที่ PO", dataIndex: "poNo", width: 120, render: (v?: string | null) => v ?? "—" },
    {
      title: "ผู้ขาย",
      key: "creditor",
      ellipsis: true,
      render: (_v, r) => `${r.creditorCode} ${r.creditorName}`,
    },
    {
      title: "ยอด AP",
      dataIndex: "totalAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: "ยอดคงเหลือ",
      dataIndex: "remainingAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: "สถานะการชำระ",
      dataIndex: "paymentStatus",
      width: 120,
      render: (v: string) => (
        <Tag color={AP_PAYMENT_STATUS_COLOR[v] ?? "default"}>
          {AP_PAYMENT_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: "สถานะวางบิล",
      dataIndex: "billingStatus",
      width: 120,
      render: (v: string) => (
        <Tag color={AP_BILLING_STATUS_COLOR[v] ?? "default"}>
          {AP_BILLING_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="เลือกใบตั้งหนี้"
      width={1100}
      destroyOnHidden
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          ปิด
        </Button>,
        <Button
          key="ok"
          type="primary"
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            onSelect(picked);
            onClose();
          }}
        >
          เลือก
        </Button>,
      ]}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          style={{ width: 280 }}
          placeholder="ค้นเลขที่ AP / PO / ผู้ขาย"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
        />
        <Select
          style={{ width: 160 }}
          value={billingStatus}
          onChange={(v) => {
            setBillingStatus(v);
            setPage(1);
          }}
          options={[
            { value: "UNBILLED", label: "ยังไม่วางบิล" },
            { value: "BILLED", label: "วางบิลแล้ว" },
            { value: "ALL", label: "ทั้งหมด" },
          ]}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder="สถานะการชำระ"
          value={paymentStatus}
          onChange={(v) => {
            setPaymentStatus(v);
            setPage(1);
          }}
          options={[
            { value: "UNPAID", label: "ยังไม่จ่าย" },
            { value: "PARTIAL", label: "จ่ายบางส่วน" },
            { value: "PAID", label: "จ่ายครบแล้ว" },
          ]}
        />
      </Space>
      <Table<ApInvoiceOption>
        rowKey="id"
        size="small"
        loading={query.isFetching}
        dataSource={items}
        columns={columns}
        rowSelection={{
          type: "radio",
          selectedRowKeys: picked ? [picked.id] : selectedId ? [selectedId] : [],
          onChange: (_keys, rows) => setPicked(rows[0] ?? null),
        }}
        onRow={(r) => ({
          onClick: () => setPicked(r),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: 5,
          total: query.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `ทั้งหมด ${t} รายการ`,
        }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: "ไม่พบใบตั้งหนี้ตามเงื่อนไข" }}
      />
    </Modal>
  );
}
