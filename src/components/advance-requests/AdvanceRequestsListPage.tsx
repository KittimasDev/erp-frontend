"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useAdvanceRequestsQuery,
  useEligiblePayablesQuery,
} from "@/hooks/advance-payment-requests/useAdvanceRequests";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  type AdvanceRequest,
  type EligiblePayable,
} from "@/types/advance-payment-requests";

export const ADVANCE_BASE_PATH = "/finance/payables/advance-requests";
export const ADVANCE_SCREEN = "FINANCE_ADVANCE_REQUESTS";

/** รายการขอจ่ายล่วงหน้า / มัดจำ — ใต้เมนู การจ่ายเงิน */
export default function AdvanceRequestsListPage() {
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(ADVANCE_SCREEN);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const query = useAdvanceRequestsQuery({ page, limit: 20, status, search: keyword });
  const eligible = useEligiblePayablesQuery("", true);

  const eligibleColumns: ColumnsType<EligiblePayable> = [
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: "วันที่ PO", dataIndex: "poDate", width: 120, render: formatThaiDate },
    {
      title: "ผู้ขาย",
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    {
      title: "% มัดจำ",
      dataIndex: "advancePercent",
      width: 90,
      align: "right",
      render: (v: number) => `${v}%`,
    },
    {
      title: "วงเงินมัดจำ",
      dataIndex: "advanceLimitAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: "ขอไปแล้ว",
      dataIndex: "alreadyRequestedAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: "คงเหลือ",
      dataIndex: "remainingAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    ...(canAdd
      ? [
          {
            title: "",
            key: "action",
            width: 140,
            render: (_: unknown, r: EligiblePayable) => (
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`${ADVANCE_BASE_PATH}/create?poId=${r.purchaseOrderId}`);
                }}
              >
                สร้างคำขอจ่าย
              </Button>
            ),
          } satisfies ColumnsType<EligiblePayable>[number],
        ]
      : []),
  ];

  const columns: ColumnsType<AdvanceRequest> = [
    { title: "เลขที่รายการ", dataIndex: "requestNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "วันที่เอกสาร", dataIndex: "requestDate", width: 120, render: formatThaiDate },
    { title: "เลขที่ PO", dataIndex: "poNo" },
    {
      title: "ผู้ขาย",
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: "ยอดขอจ่าย", dataIndex: "requestedAmount", align: "right", render: (v: number) => money.format(v) },
    { title: "WHT", dataIndex: "whtAmount", align: "right", render: (v: number, r) => (r.whtApplicable ? money.format(v) : "—") },
    { title: "ยอดโอนจริง", dataIndex: "netTransferAmount", align: "right", render: (v: number) => money.format(v) },
    { title: "วันที่ต้องการจ่าย", dataIndex: "desiredPayDate", width: 130, render: (v?: string) => formatThaiDate(v) },
    { title: "ใบสำคัญจ่าย", dataIndex: "paymentVoucherNo", width: 150, render: (v?: string) => v ?? "—" },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 160,
      render: (v: string, r) => (
        <span>
          <Tag color={ADVANCE_STATUS_COLOR[v]}>{ADVANCE_STATUS_LABEL[v] ?? v}</Tag>
          {v === "DRAFT" && !r.whtVerified ? <Tag color="orange">รอตรวจ WHT</Tag> : null}
        </span>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>รายการขอจ่ายล่วงหน้า / มัดจำ</Typography.Title>
            <Typography.Text type="secondary">
              ขอจ่ายตามเงื่อนไขชำระล่วงหน้า/มัดจำของรายการจ่ายเงิน (PO) พร้อมตรวจภาษีหัก ณ ที่จ่ายก่อนยืนยันเพื่อสร้างใบสำคัญจ่าย
            </Typography.Text>
          </div>
          {canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push(`${ADVANCE_BASE_PATH}/create`)}>
              สร้างรายการขอจ่าย
            </Button>
          ) : null}
        </div>
      </Card>

      <Card title="รอจ่ายมัดจำ">
        <Table
          rowKey="purchaseOrderId"
          loading={eligible.isLoading}
          columns={eligibleColumns}
          dataSource={eligible.data?.data ?? []}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "ไม่มีรายการรอขอมัดจำ" }}
          onRow={
            canAdd
              ? (r) => ({
                  onClick: () => router.push(`${ADVANCE_BASE_PATH}/create?poId=${r.purchaseOrderId}`),
                  style: { cursor: "pointer" },
                })
              : undefined
          }
        />
      </Card>

      <Card title="รายการที่ดำเนินการแล้ว">
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            style={{ width: 300 }}
            placeholder="ค้นเลขที่รายการ / เลขที่ PO / ชื่อผู้ขาย"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => {
              setKeyword(v);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="สถานะ"
            style={{ width: 200 }}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={Object.entries(ADVANCE_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </Space>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={query.data?.data.items ?? []}
          pagination={{
            current: page,
            pageSize: 20,
            total: query.data?.data.total ?? 0,
            onChange: setPage,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          onRow={(r) => ({ onClick: () => router.push(`${ADVANCE_BASE_PATH}/${r.id}`), style: { cursor: "pointer" } })}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ยังไม่มีรายการขอจ่าย" }}
        />
      </Card>
    </Space>
  );
}
