"use client";

import { useState } from "react";
import { App, Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { useCreatedApsQuery, usePendingGrnsQuery } from "@/hooks/ap-documents/useApDocuments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { getCreatedApsExport } from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_PAYMENT_STATUS_COLOR,
  AP_PAYMENT_STATUS_LABEL,
  AP_TERM_TYPE_LABEL,
  type CreatedAp,
  type CreatedApQuery,
  type PendingGrn,
} from "@/types/ap-documents";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money, termText } from "./apDocumentConfig";

const PENDING_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 10;

type DateRange = [Dayjs | null, Dayjs | null] | null;

const TERM_OPTIONS = Object.entries(AP_TERM_TYPE_LABEL).map(([value, label]) => ({ value, label }));
const DOC_STATUS_OPTIONS = Object.entries(AP_DOCUMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));
const PAY_STATUS_OPTIONS = Object.entries(AP_PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const ymd = (d?: Dayjs | null) => d?.format("YYYY-MM-DD");

/**
 * ใบตั้งหนี้เจ้าหนี้ — ส่วนบน: รอสร้างใบตั้งหนี้ (GRN ที่ยืนยันแล้วขึ้นอัตโนมัติ)
 * ส่วนล่าง: ใบตั้งหนี้ที่สร้างแล้ว + Export · ค้นหา/กรอง/แบ่งหน้าแยกกัน
 */
export default function ApInvoicesPage() {
  const config = AP_DOCUMENT_CONFIG.invoice;
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);

  // ── ส่วนที่ 1: รอสร้างใบตั้งหนี้ ──
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pRange, setPRange] = useState<DateRange>(null);
  const [pTerm, setPTerm] = useState<string | undefined>();
  const pending = usePendingGrnsQuery({
    page: pPage,
    limit: PENDING_PAGE_SIZE,
    search: pKeyword,
    receivedFrom: ymd(pRange?.[0]),
    receivedTo: ymd(pRange?.[1]),
    termType: pTerm,
  });

  // ── ส่วนที่ 2: ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cDocRange, setCDocRange] = useState<DateRange>(null);
  const [cDueRange, setCDueRange] = useState<DateRange>(null);
  const [cStatus, setCStatus] = useState<string | undefined>();
  const [cPayStatus, setCPayStatus] = useState<string | undefined>();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const filters: Omit<CreatedApQuery, "page" | "limit"> = {
    search: cKeyword,
    docDateFrom: ymd(cDocRange?.[0]),
    docDateTo: ymd(cDocRange?.[1]),
    status: cStatus,
    paymentStatus: cPayStatus,
    dueFrom: ymd(cDueRange?.[0]),
    dueTo: ymd(cDueRange?.[1]),
  };
  const created = useCreatedApsQuery({ ...filters, page: cPage, limit: CREATED_PAGE_SIZE });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const rows = (await getCreatedApsExport(getAccessToken(), filters)).data;
      const range = (a?: string, b?: string) => (a || b ? `${formatThaiDate(a)} - ${formatThaiDate(b)}` : null);
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        range(filters.docDateFrom, filters.docDateTo) ? `วันที่ตั้งหนี้: ${range(filters.docDateFrom, filters.docDateTo)}` : null,
        filters.status ? `สถานะเอกสาร: ${AP_DOCUMENT_STATUS_LABEL[filters.status] ?? filters.status}` : null,
        filters.paymentStatus ? `สถานะชำระ: ${AP_PAYMENT_STATUS_LABEL[filters.paymentStatus] ?? filters.paymentStatus}` : null,
        range(filters.dueFrom, filters.dueTo) ? `วันครบกำหนด: ${range(filters.dueFrom, filters.dueTo)}` : null,
        `ทั้งหมด ${rows.length} รายการ · ยอดตั้งหนี้รวม ${money.format(rows.reduce((s, r) => s + r.totalAmount, 0))} บาท`,
      ].filter((v): v is string => Boolean(v));
      await downloadTabularReport(format, {
        title: "รายการใบตั้งหนี้เจ้าหนี้",
        filename: `ap-invoices-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "เลขที่ AP",
          "วันที่ตั้งหนี้",
          "ผู้ขาย",
          "เลขที่ PO",
          "เลขที่รายการจ่ายเงิน",
          "ยอดตั้งหนี้รวม VAT",
          "ยอดหักมัดจำ",
          "ยอดคงเหลือ",
          "วันครบกำหนด",
          "สถานะเอกสาร",
          "สถานะชำระเงิน",
        ],
        rows: rows.map((r) => [
          r.docNo,
          formatThaiDate(r.docDate),
          `${r.creditorCode} ${r.creditorName}`,
          r.poNo ?? "",
          r.paymentListNo ?? "",
          money.format(r.totalAmount),
          money.format(r.depositDeductAmount),
          money.format(r.remainingAmount),
          formatThaiDate(r.dueDate),
          AP_DOCUMENT_STATUS_LABEL[r.status] ?? r.status,
          AP_PAYMENT_STATUS_LABEL[r.paymentStatus] ?? r.paymentStatus,
        ]),
        pdfColumns: [
          { header: "เลขที่ AP", cells: [0], width: 90 },
          { header: "วันที่", cells: [1], width: 62 },
          { header: "ผู้ขาย", cells: [2], width: 120 },
          { header: "PO / รายการจ่าย", cells: [3], width: 78 },
          { header: "ยอดตั้งหนี้", cells: [5], width: 70, align: "right", numeric: true },
          { header: "หักมัดจำ", cells: [6], width: 62, align: "right", numeric: true },
          { header: "คงเหลือ", cells: [7], width: 66, align: "right", numeric: true },
          { header: "ครบกำหนด", cells: [8], width: 62 },
          { header: "สถานะ", cells: [9], width: 62 },
          { header: "ชำระ", cells: [10], width: 74 },
        ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : "ส่งออกรายการใบตั้งหนี้ไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const pendingColumns: ColumnsType<PendingGrn> = [
    {
      title: "วันที่รับสินค้า",
      key: "date",
      width: 150,
      render: (_v, r) => (
        <span>
          {formatThaiDate(r.grnDate)}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ยืนยัน {r.confirmedAt ? dayjs(r.confirmedAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Typography.Text>
        </span>
      ),
    },
    { title: "เลขที่ GRN", dataIndex: "grnNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (v: string, r) => <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link>,
    },
    { title: "เลขที่รายการจ่ายเงิน", dataIndex: "poNo", key: "paymentList", render: (v: string) => v },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    {
      title: "มูลค่ารอสร้าง AP",
      dataIndex: "pendingAmount",
      align: "right",
      width: 150,
      render: (v: number) => money.format(v),
    },
    { title: "เงื่อนไขการชำระ", key: "term", width: 160, render: (_v, r) => termText(r.paymentTerm) },
    {
      title: "สถานะ",
      key: "status",
      width: 170,
      render: () => <Tag color="gold">รอสร้างใบตั้งหนี้</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => {
        if (r.action === "CONTINUE_DRAFT" && r.draftApId) {
          return perms.canEdit ? (
            <Button size="small" onClick={() => router.push(`${config.basePath}/${r.draftApId}/edit`)}>
              ดำเนินการต่อ
            </Button>
          ) : null;
        }
        return perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${config.basePath}/create?grnId=${r.grnId}`)}>
            สร้างใบตั้งหนี้
          </Button>
        ) : null;
      },
    },
  ];

  const createdColumns: ColumnsType<CreatedAp> = [
    { title: "เลขที่ AP", dataIndex: "docNo", width: 170, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "วันที่ตั้งหนี้", dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: "เลขที่ PO", dataIndex: "poNo", width: 130, render: (v?: string) => v ?? "—" },
    { title: "เลขที่รายการจ่ายเงิน", dataIndex: "paymentListNo", width: 150, render: (v?: string) => v ?? "—" },
    { title: "ยอดตั้งหนี้รวม VAT", dataIndex: "totalAmount", align: "right", width: 150, render: (v: number) => money.format(v) },
    { title: "ยอดหักมัดจำ", dataIndex: "depositDeductAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: "ยอดคงเหลือ", dataIndex: "remainingAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    { title: "วันครบกำหนด", dataIndex: "dueDate", width: 120, render: (v?: string) => formatThaiDate(v) },
    {
      title: "สถานะเอกสาร",
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={AP_DOCUMENT_STATUS_COLOR[v] ?? "default"}>{AP_DOCUMENT_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "สถานะชำระเงิน",
      dataIndex: "paymentStatus",
      width: 130,
      render: (v: string) => <Tag color={AP_PAYMENT_STATUS_COLOR[v] ?? "default"}>{AP_PAYMENT_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_v, r) => (
        <Space>
          <Link href={`${config.basePath}/${r.id}`}>
            <Button size="small">ดูรายละเอียด</Button>
          </Link>
          {r.status === "DRAFT" && perms.canEdit ? (
            <Link href={`${config.basePath}/${r.id}/edit`}>
              <Button size="small">แก้ไข</Button>
            </Link>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="รายการรอสร้างใบตั้งหนี้"
        extra={<Typography.Text type="secondary">GRN ที่ยืนยันรับสินค้าแล้วและยังไม่ได้ตั้งหนี้</Typography.Text>}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            style={{ width: 320 }}
            placeholder="ค้นเลขที่ GRN / PO / รายการจ่ายเงิน / ผู้ขาย"
            value={pSearch}
            onChange={(e) => setPSearch(e.target.value)}
            onSearch={(v) => {
              setPKeyword(v);
              setPPage(1);
            }}
          />
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={["วันที่รับสินค้า (จาก)", "วันที่รับสินค้า (ถึง)"]}
            value={pRange}
            onChange={(v) => {
              setPRange(v);
              setPPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="เงื่อนไขการชำระ"
            style={{ width: 190 }}
            value={pTerm}
            onChange={(v) => {
              setPTerm(v);
              setPPage(1);
            }}
            options={TERM_OPTIONS}
          />
        </Space>
        <Table
          rowKey="grnId"
          loading={pending.isLoading}
          columns={pendingColumns}
          dataSource={pending.data?.items ?? []}
          pagination={{
            current: pPage,
            pageSize: PENDING_PAGE_SIZE,
            total: pending.data?.total ?? 0,
            onChange: setPPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: "ไม่มีรายการรอสร้างใบตั้งหนี้" }}
        />
      </Card>

      <Card
        title="รายการใบตั้งหนี้ที่สร้างแล้ว"
        extra={<ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            style={{ width: 320 }}
            placeholder="ค้นเลขที่ AP / PO / รายการจ่ายเงิน / ผู้ขาย"
            value={cSearch}
            onChange={(e) => setCSearch(e.target.value)}
            onSearch={(v) => {
              setCKeyword(v);
              setCPage(1);
            }}
          />
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={["วันที่ตั้งหนี้ (จาก)", "วันที่ตั้งหนี้ (ถึง)"]}
            value={cDocRange}
            onChange={(v) => {
              setCDocRange(v);
              setCPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="สถานะเอกสาร"
            style={{ width: 150 }}
            value={cStatus}
            onChange={(v) => {
              setCStatus(v);
              setCPage(1);
            }}
            options={DOC_STATUS_OPTIONS}
          />
          <Select
            allowClear
            placeholder="สถานะชำระเงิน"
            style={{ width: 150 }}
            value={cPayStatus}
            onChange={(v) => {
              setCPayStatus(v);
              setCPage(1);
            }}
            options={PAY_STATUS_OPTIONS}
          />
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={["วันครบกำหนด (จาก)", "วันครบกำหนด (ถึง)"]}
            value={cDueRange}
            onChange={(v) => {
              setCDueRange(v);
              setCPage(1);
            }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={created.isLoading}
          columns={createdColumns}
          dataSource={created.data?.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1700 }}
          locale={{ emptyText: "ยังไม่มีใบตั้งหนี้" }}
        />
      </Card>
    </Space>
  );
}
