"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useApDocumentsQuery } from "@/hooks/ap-documents/useApDocuments";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { getApDocuments } from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_SETTLEMENT_METHOD_LABEL,
  AP_USAGE_STATUS_COLOR,
  AP_USAGE_STATUS_LABEL,
  type ApDocument,
  type ApDocumentKind,
  type ApDocumentQueryParams,
} from "@/types/ap-documents";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money } from "./apDocumentConfig";

type Props = { kind: ApDocumentKind };

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 100;

/** สถานะการนำไปใช้ที่กรองได้ ตามชนิดเอกสาร (ใบเพิ่มหนี้มีแค่ ยังไม่ใช้/ใช้แล้ว) */
const USAGE_OPTIONS: Record<"debitNote" | "creditNote", string[]> = {
  debitNote: ["UNUSED", "USED"],
  creditNote: ["UNUSED", "USED", "WAITING_REFUND", "REFUNDED", "CREDIT_REMAINING", "CREDIT_USED"],
};

export default function ApDocumentsListPage({ kind }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const router = useRouter();
  const { message } = App.useApp();
  const { canAdd, canEdit, canApprove } = useScreenActionPermissions(config.screenCode);
  const isCredit = kind === "creditNote";
  const isNote = kind !== "invoice";
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [usageStatus, setUsageStatus] = useState<string | undefined>();
  const [settlementMethod, setSettlementMethod] = useState<string | undefined>();
  const [creditorId, setCreditorId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);

  const filters: ApDocumentQueryParams = {
    status,
    creditorId,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
    search: keyword,
    usageStatus: isNote ? usageStatus : undefined,
    settlementMethod: isCredit ? settlementMethod : undefined,
  };
  const vendorsQuery = useVendorsQuery();
  const listQuery = useApDocumentsQuery(kind, { ...filters, page, limit: PAGE_SIZE });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const rows: ApDocument[] = [];
      for (let p = 1; ; p += 1) {
        const res = (await getApDocuments(getAccessToken(), kind, { ...filters, page: p, limit: EXPORT_PAGE_SIZE })).data;
        rows.push(...res.items);
        if (rows.length >= res.total || res.items.length === 0) break;
      }
      const dateRange =
        filters.dateFrom || filters.dateTo
          ? `${formatThaiDate(filters.dateFrom)} - ${formatThaiDate(filters.dateTo)}`
          : null;
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        dateRange ? `วันที่เอกสาร: ${dateRange}` : null,
        filters.status ? `สถานะเอกสาร: ${AP_DOCUMENT_STATUS_LABEL[filters.status] ?? filters.status}` : null,
        filters.usageStatus ? `สถานะการนำไปใช้: ${AP_USAGE_STATUS_LABEL[filters.usageStatus] ?? filters.usageStatus}` : null,
        filters.settlementMethod
          ? `วิธีจัดการยอด: ${AP_SETTLEMENT_METHOD_LABEL[filters.settlementMethod] ?? filters.settlementMethod}`
          : null,
        `ทั้งหมด ${rows.length} รายการ · ยอดรวม ${money.format(rows.reduce((s, r) => s + r.totalAmount, 0))} บาท`,
      ].filter((v): v is string => Boolean(v));
      const usageText = (r: ApDocument) => (r.usageStatus ? (AP_USAGE_STATUS_LABEL[r.usageStatus] ?? r.usageStatus) : "—");
      await downloadTabularReport(format, {
        title: `รายการ${config.shortLabel}เจ้าหนี้`,
        filename: `${kind === "creditNote" ? "ap-credit-notes" : "ap-debit-notes"}-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          `เลขที่${config.shortLabel}`,
          "วันที่",
          "ผู้ขาย",
          "เอกสารอ้างอิง",
          "เหตุผล",
          "ยอดเงินรวม VAT",
          ...(isCredit ? ["วิธีจัดการยอด", "ยอดคงเหลือที่ยังไม่ได้ดำเนินการ"] : []),
          "สถานะเอกสาร",
          "สถานะการนำไปใช้",
        ],
        rows: rows.map((r) => [
          r.docNo,
          formatThaiDate(r.docDate),
          `${r.creditorCode} ${r.creditorName}`,
          r.referenceDocumentNo ?? "",
          r.reason ?? "",
          money.format(r.totalAmount),
          ...(isCredit
            ? [
                AP_SETTLEMENT_METHOD_LABEL[r.settlementMethod ?? ""] ?? "",
                r.usageStatus ? money.format(r.outstandingAmount ?? 0) : "—",
              ]
            : []),
          AP_DOCUMENT_STATUS_LABEL[r.status] ?? r.status,
          usageText(r),
        ]),
        pdfColumns: isCredit
          ? [
              { header: "เลขที่", cells: [0], width: 84 },
              { header: "วันที่", cells: [1], width: 58 },
              { header: "ผู้ขาย", cells: [2], width: 100 },
              { header: "อ้างอิง", cells: [3], width: 78 },
              { header: "ยอดเงิน", cells: [5], width: 60, align: "right", numeric: true },
              { header: "วิธีจัดการยอด", cells: [6], width: 80 },
              { header: "คงเหลือ", cells: [7], width: 60, align: "right", numeric: true },
              { header: "สถานะ", cells: [8], width: 56 },
              { header: "การนำไปใช้", cells: [9], width: 70 },
            ]
          : [
              { header: "เลขที่", cells: [0], width: 90 },
              { header: "วันที่", cells: [1], width: 62 },
              { header: "ผู้ขาย", cells: [2], width: 120 },
              { header: "อ้างอิง", cells: [3], width: 90 },
              { header: "ยอดเงิน", cells: [5], width: 70, align: "right", numeric: true },
              { header: "สถานะ", cells: [6], width: 64 },
              { header: "การนำไปใช้", cells: [7], width: 76 },
            ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : `ส่งออกรายการ${config.shortLabel}ไม่สำเร็จ`);
    } finally {
      setDownloading(null);
    }
  };

  const actionLabel = (row: ApDocument) => {
    if (row.status === "PENDING_APPROVAL" && canApprove) return "พิจารณาอนุมัติ";
    if (row.status === "APPROVED" && row.usageStatus && !["USED", "REFUNDED", "CREDIT_USED"].includes(row.usageStatus)) {
      return "ดำเนินการ";
    }
    return null;
  };

  const columns: ColumnsType<ApDocument> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
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
    kind === "invoice"
      ? {
          title: "ใบสั่งซื้อ",
          dataIndex: "purchaseOrderNo",
          render: (value: string | null) => value || "—",
        }
      : {
          title: "เอกสารอ้างอิง",
          key: "reference",
          render: (_, row) => (
            <span>
              {row.referenceDocumentNo || "—"}
              {row.supplierDocNo ? (
                <>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    เอกสารผู้ขาย {row.supplierDocNo}
                  </Typography.Text>
                </>
              ) : null}
            </span>
          ),
        },
    ...(isNote
      ? [
          {
            title: "เหตุผล",
            dataIndex: "reason",
            ellipsis: true,
            width: 200,
            render: (value: string | null) => value || "—",
          } as ColumnsType<ApDocument>[number],
        ]
      : []),
    {
      title: kind === "invoice" ? "ยอดตั้งหนี้" : kind === "debitNote" ? "ยอดเพิ่มหนี้" : "ยอดลดหนี้",
      dataIndex: "totalAmount",
      align: "right",
      render: (value: number) => money.format(value),
    },
    ...(isCredit
      ? [
          {
            title: "วิธีจัดการยอด",
            dataIndex: "settlementMethod",
            width: 170,
            render: (value: string) => AP_SETTLEMENT_METHOD_LABEL[value] ?? value,
          } as ColumnsType<ApDocument>[number],
          {
            title: "ยอดคงเหลือที่ยังไม่ได้ดำเนินการ",
            dataIndex: "outstandingAmount",
            align: "right",
            width: 170,
            render: (value: number | undefined, row: ApDocument) =>
              row.usageStatus ? money.format(value ?? 0) : "—",
          } as ColumnsType<ApDocument>[number],
        ]
      : []),
    {
      title: "สถานะเอกสาร",
      dataIndex: "status",
      width: 120,
      render: (value: string) => (
        <Tag color={AP_DOCUMENT_STATUS_COLOR[value] ?? "default"}>
          {AP_DOCUMENT_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
    },
    ...(isNote
      ? [
          {
            title: "สถานะการนำไปใช้",
            dataIndex: "usageStatus",
            width: 140,
            render: (value: string | null | undefined) =>
              value ? (
                <Tag color={AP_USAGE_STATUS_COLOR[value] ?? "default"}>{AP_USAGE_STATUS_LABEL[value] ?? value}</Tag>
              ) : (
                "—"
              ),
          } as ColumnsType<ApDocument>[number],
          {
            title: "จัดการ",
            key: "actions",
            width: 190,
            fixed: "right",
            render: (_: unknown, row: ApDocument) => {
              const next = actionLabel(row);
              const editable = (row.status === "DRAFT" || row.status === "REJECTED") && canEdit;
              return (
                <Space size={4} onClick={(event) => event.stopPropagation()}>
                  <Button size="small" onClick={() => router.push(`${config.basePath}/${row.id}`)}>
                    ดูรายละเอียด
                  </Button>
                  {editable ? (
                    <Button size="small" onClick={() => router.push(`${config.basePath}/${row.id}/edit`)}>
                      แก้ไข
                    </Button>
                  ) : null}
                  {next ? (
                    <Button size="small" type="primary" onClick={() => router.push(`${config.basePath}/${row.id}`)}>
                      {next}
                    </Button>
                  ) : null}
                </Space>
              );
            },
          } as ColumnsType<ApDocument>[number],
        ]
      : []),
  ];

  return (
    <Card
      title={config.title}
      extra={
        <Space>
          {isNote ? (
            <ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />
          ) : null}
          {canAdd ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(`${config.basePath}/create`)}
            >
              สร้าง{config.shortLabel}
            </Button>
          ) : null}
        </Space>
      }
    >
      {kind === "debitNote" ? (
        <Typography.Paragraph type="secondary">
          ใบเพิ่มหนี้ออกได้จากใบตั้งหนี้ที่อนุมัติแล้วเท่านั้น · อนุมัติแล้วยังไม่กระทบยอด AP จนกว่าจะกด “ปรับหนี้” ที่ใบตั้งหนี้
        </Typography.Paragraph>
      ) : null}
      {isCredit ? (
        <Typography.Paragraph type="secondary">
          สร้างและอนุมัติใบลดหนี้ไว้ล่วงหน้าได้ ยอด AP จะเปลี่ยนเมื่อยืนยันนำไปใช้เท่านั้น (หักยอดเจ้าหนี้ / รับเงินคืน / เก็บเป็นเครดิตผู้ขาย)
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
          placeholder="สถานะเอกสาร"
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
        {isNote ? (
          <Select
            allowClear
            placeholder="สถานะการนำไปใช้"
            value={usageStatus}
            style={{ width: 170 }}
            onChange={(value) => {
              setPage(1);
              setUsageStatus(value);
            }}
            options={USAGE_OPTIONS[kind as "debitNote" | "creditNote"].map((value) => ({
              value,
              label: AP_USAGE_STATUS_LABEL[value],
            }))}
          />
        ) : null}
        {isCredit ? (
          <Select
            allowClear
            placeholder="วิธีจัดการยอด"
            value={settlementMethod}
            style={{ width: 200 }}
            onChange={(value) => {
              setPage(1);
              setSettlementMethod(value);
            }}
            options={Object.entries(AP_SETTLEMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))}
          />
        ) : null}
      </Space>
      <Table
        rowKey="id"
        loading={listQuery.isLoading}
        columns={columns}
        dataSource={listQuery.data?.items ?? []}
        scroll={{ x: isCredit ? 1560 : 1200 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
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
