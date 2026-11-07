"use client";

import { useState } from "react";
import { Button, Input, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { useApInvoiceOptionsQuery } from "@/hooks/ap-documents/useApDocuments";
import { useT } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";
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
  const t = useT();
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
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เลขที่ AP"), dataIndex: "docNo", width: 150 },
    { title: t("วันที่"), dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: t("เลขที่ PO"), dataIndex: "poNo", width: 120, render: (v?: string | null) => v ?? "—" },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      ellipsis: true,
      render: (_v, r) => `${r.creditorCode} ${r.creditorName}`,
    },
    {
      title: t("ยอด AP"),
      dataIndex: "totalAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: t("ยอดคงเหลือ"),
      dataIndex: "remainingAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: t("สถานะการชำระ"),
      dataIndex: "paymentStatus",
      width: 120,
      render: (v: string) => (
        <Tag color={AP_PAYMENT_STATUS_COLOR[v] ?? "default"}>
          {tStatus(AP_PAYMENT_STATUS_LABEL[v] ?? v)}
        </Tag>
      ),
    },
    {
      title: t("สถานะวางบิล"),
      dataIndex: "billingStatus",
      width: 120,
      render: (v: string) => (
        <Tag color={AP_BILLING_STATUS_COLOR[v] ?? "default"}>
          {tStatus(AP_BILLING_STATUS_LABEL[v] ?? v)}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={t("เลือกใบตั้งหนี้")}
      width={1100}
      destroyOnHidden
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t("ปิด")}
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
          {t("เลือก")}
        </Button>,
      ]}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          style={{ width: 280 }}
          placeholder={t("ค้นเลขที่ AP / PO / ผู้ขาย")}
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
            { value: "UNBILLED", label: t("ยังไม่วางบิล") },
            { value: "BILLED", label: t("วางบิลแล้ว") },
            { value: "ALL", label: t("ทั้งหมด") },
          ]}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={t("สถานะการชำระ")}
          value={paymentStatus}
          onChange={(v) => {
            setPaymentStatus(v);
            setPage(1);
          }}
          options={[
            { value: "UNPAID", label: t("ยังไม่จ่าย") },
            { value: "PARTIAL", label: t("จ่ายบางส่วน") },
            { value: "PAID", label: t("จ่ายครบแล้ว") },
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
          showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
        }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: t("ไม่พบใบตั้งหนี้ตามเงื่อนไข") }}
      />
    </Modal>
  );
}
