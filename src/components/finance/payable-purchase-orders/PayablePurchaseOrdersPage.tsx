"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { usePayablePurchaseOrdersQuery } from "@/hooks/payable-purchase-orders/usePayablePurchaseOrders";
import { getPayablePurchaseOrders } from "@/lib/api/payable-purchase-orders";
import { fetchAllReportRows } from "@/lib/api/sales-reports";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import {
  PAYABLE_ITEM_STATUS_COLOR,
  PAYABLE_ITEM_STATUS_LABEL,
  type PayableItemStatus,
  type PayablePurchaseOrder,
  type PayableTermTypeFilter,
} from "@/types/payable-purchase-orders";
import { PAYMENT_TERM_TYPE_COLOR, PAYMENT_TERM_TYPE_LABEL } from "@/types/payment-terms";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

import {
  describeTerm,
  formatThaiDate,
  money,
  SCREEN_CODE,
  TERM_TYPE_FILTER_LABEL,
  toPayableSheet,
} from "./payableFormat";

const PAGE_SIZE = 20;
const DETAIL_BASE_PATH = "/finance/payables/creditors";

export default function PayablePurchaseOrdersPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [termType, setTermType] = useState<PayableTermTypeFilter | undefined>();
  const [status, setStatus] = useState<PayableItemStatus | undefined>();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const canExport = !isMatrixPermissionMode() || hasPermission(`${SCREEN_CODE}.EXPORT`);

  const filterParams = useMemo(
    () => ({ search: keyword || undefined, termType, status }),
    [keyword, termType, status],
  );
  const listQuery = usePayablePurchaseOrdersQuery({
    ...filterParams,
    page,
    limit: PAGE_SIZE,
  });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const all = await fetchAllReportRows((exportPage, limit) =>
        getPayablePurchaseOrders(getAccessToken(), {
          ...filterParams,
          page: exportPage,
          limit,
        }),
      );
      if (all.truncated) {
        message.warning(
          `มี ${all.total.toLocaleString("th-TH")} รายการ — ไฟล์มีเฉพาะ ${all.rows.length.toLocaleString("th-TH")} รายการแรก`,
        );
      }
      const filters = [
        keyword ? `ค้นหา: ${keyword}` : null,
        termType ? `เงื่อนไข: ${TERM_TYPE_FILTER_LABEL[termType]}` : null,
        status ? `สถานะ: ${PAYABLE_ITEM_STATUS_LABEL[status]}` : null,
      ].filter((value): value is string => Boolean(value));
      await downloadTabularReport(
        format,
        toPayableSheet(all.rows, {
          filters,
          total: all.total,
          truncated: all.truncated,
        }),
      );
    } catch {
      message.error("ส่งออกรายการจ่ายเงินไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnsType<PayablePurchaseOrder> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      width: 140,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: "วันที่ PO", dataIndex: "poDate", width: 110, render: formatThaiDate },
    {
      title: "ผู้ขาย (Supplier)",
      key: "creditor",
      render: (_, row) =>
        row.creditor ? (
          <span>
            <Typography.Text type="secondary">{row.creditor.creditorCode}</Typography.Text>{" "}
            {row.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "เงื่อนไขการชำระเงิน",
      key: "paymentTerm",
      width: 200,
      render: (_, row) =>
        row.paymentTerm ? (
          <Space orientation="vertical" size={0}>
            <Tag color={PAYMENT_TERM_TYPE_COLOR[row.paymentTerm.termType]}>
              {PAYMENT_TERM_TYPE_LABEL[row.paymentTerm.termType] ?? row.paymentTerm.termType}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {describeTerm(row.paymentTerm)}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">ไม่ระบุเงื่อนไข</Typography.Text>
        ),
    },
    {
      title: "ยอดเงินตาม PO",
      dataIndex: "totalAmount",
      width: 140,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: "ยอดที่ต้องชำระตามเงื่อนไข",
      dataIndex: "amountDue",
      width: 170,
      align: "right",
      render: (value: number) => <Typography.Text strong>{money.format(value)}</Typography.Text>,
    },
    {
      title: "วันครบกำหนดชำระ",
      dataIndex: "dueDate",
      width: 130,
      align: "center",
      render: formatThaiDate,
    },
    {
      title: "สถานะรายการ",
      dataIndex: "payableStatus",
      width: 140,
      render: (value: PayableItemStatus) => (
        <Tag color={PAYABLE_ITEM_STATUS_COLOR[value] ?? "default"}>
          {PAYABLE_ITEM_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            router.push(`${DETAIL_BASE_PATH}/${row.id}`);
          }}
        >
          ดูรายละเอียด
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="รายการจ่ายเงิน"
      extra={
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={handleExport}
          csvRequiresExport
        />
      }
    >
      <Typography.Paragraph type="secondary">
        ใบสั่งซื้อที่อนุมัติแล้ว 1 ใบต่อ 1 รายการ — ยอดที่ต้องชำระและวันครบกำหนดเป็นงวดแรกตามเงื่อนไขใน PO
        สถานะเทียบยอดจ่ายจริงที่บันทึกแล้วกับยอดทั้งใบ และดูว่างวดที่ยังค้างเลยกำหนดหรือยัง
      </Typography.Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="เลขที่ PO / รหัส / ชื่อผู้ขาย"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => {
            setPage(1);
            setKeyword(value.trim());
          }}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="เงื่อนไขการชำระเงิน"
          value={termType}
          style={{ width: 200 }}
          onChange={(value) => {
            setPage(1);
            setTermType(value);
          }}
          options={(Object.keys(TERM_TYPE_FILTER_LABEL) as PayableTermTypeFilter[]).map(
            (value) => ({ value, label: TERM_TYPE_FILTER_LABEL[value] }),
          )}
        />
        <Select
          allowClear
          placeholder="สถานะรายการ"
          value={status}
          style={{ width: 200 }}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={(Object.keys(PAYABLE_ITEM_STATUS_LABEL) as PayableItemStatus[]).map(
            (value) => ({ value, label: PAYABLE_ITEM_STATUS_LABEL[value] }),
          )}
        />
      </Space>
      {listQuery.isError ? (
        <Typography.Text type="danger">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "โหลดรายการจ่ายเงินไม่สำเร็จ"}
        </Typography.Text>
      ) : (
        <Table
          rowKey="id"
          loading={listQuery.isFetching}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: listQuery.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `ทั้งหมด ${total.toLocaleString("th-TH")} รายการ`,
          }}
          locale={{ emptyText: "ไม่มีใบสั่งซื้อที่อนุมัติแล้วตามเงื่อนไขที่เลือก" }}
          onRow={(record) => ({
            onClick: () => router.push(`${DETAIL_BASE_PATH}/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      )}
    </Card>
  );
}
