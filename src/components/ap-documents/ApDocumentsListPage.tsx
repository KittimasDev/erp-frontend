"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useApDocumentsQuery } from "@/hooks/ap-documents/useApDocuments";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  type ApDocument,
  type ApDocumentKind,
} from "@/types/ap-documents";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money } from "./apDocumentConfig";

type Props = { kind: ApDocumentKind };

export default function ApDocumentsListPage({ kind }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(config.screenCode);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [creditorId, setCreditorId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  const vendorsQuery = useVendorsQuery();
  const listQuery = useApDocumentsQuery(kind, {
    page,
    limit: 20,
    status,
    creditorId,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
    search: keyword,
  });

  const columns: ColumnsType<ApDocument> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "เลขที่",
      dataIndex: "docNo",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: "วันที่", dataIndex: "docDate", width: 110, render: formatThaiDate },
    {
      title: "เจ้าหนี้",
      key: "creditor",
      render: (_, row) => (
        <span>
          <Typography.Text type="secondary">{row.creditorCode}</Typography.Text> {row.creditorName}
        </span>
      ),
    },
    {
      title: kind === "invoice" ? "เลขที่ใบแจ้งหนี้ผู้ขาย" : "เลขที่ใบเพิ่มหนี้ผู้ขาย",
      dataIndex: "supplierDocNo",
      render: (value: string | null) => value || "—",
    },
    kind === "invoice"
      ? {
          title: "ใบสั่งซื้อ",
          dataIndex: "purchaseOrderNo",
          render: (value: string | null) => value || "—",
        }
      : {
          title: "อ้างอิงใบตั้งหนี้",
          dataIndex: "referenceDocumentNo",
          render: (value: string | null) => value || "—",
        },
    {
      title: kind === "invoice" ? "ยอดตั้งหนี้" : "ยอดเพิ่มหนี้",
      dataIndex: "totalAmount",
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 120,
      render: (value: string) => (
        <Tag color={AP_DOCUMENT_STATUS_COLOR[value] ?? "default"}>
          {AP_DOCUMENT_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title={config.title}
      extra={
        canAdd ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push(`${config.basePath}/create`)}
          >
            สร้าง{config.shortLabel}
          </Button>
        ) : null
      }
    >
      {kind === "debitNote" ? (
        <Typography.Paragraph type="secondary">
          ใบเพิ่มหนี้ออกได้จากใบตั้งหนี้ที่อนุมัติแล้วเท่านั้น
        </Typography.Paragraph>
      ) : null}
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="เลขที่ / เลขที่ผู้ขาย / ชื่อเจ้าหนี้"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => {
            setPage(1);
            setKeyword(value);
          }}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="เจ้าหนี้ทั้งหมด"
          value={creditorId}
          style={{ width: 240 }}
          onChange={(value) => {
            setPage(1);
            setCreditorId(value);
          }}
          options={(vendorsQuery.data?.data ?? []).map((vendor) => ({
            value: vendor.id,
            label: `${vendor.creditorCode} — ${vendor.nameTh}`,
          }))}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={range}
          onChange={(values) => {
            setPage(1);
            setRange(values && values[0] && values[1] ? [values[0], values[1]] : null);
          }}
        />
        <Select
          allowClear
          placeholder="สถานะ"
          value={status}
          style={{ width: 150 }}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={Object.entries(AP_DOCUMENT_STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Space>
      <Table
        rowKey="id"
        loading={listQuery.isLoading}
        columns={columns}
        dataSource={listQuery.data?.items ?? []}
        scroll={{ x: 960 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: listQuery.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        onRow={(record) => ({
          onClick: () => router.push(`${config.basePath}/${record.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
}
