"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import PageHeader from "@/components/common/PageHeader";
import { useAdvanceReceiptsQuery } from "@/hooks/advance-receipts/useAdvanceReceipts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";
import { advanceReceiptRoutes } from "@/lib/sales/ar-routes";
import { AR_PAYMENT_METHOD_LABEL } from "@/types/ar-receipts";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  ADVANCE_TYPE_LABEL,
  type AdvanceReceipt,
} from "@/types/advance-receipts";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdvanceReceiptsPage() {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions("FINANCE_ADVANCE_RECEIPTS");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [appliedStatus, setAppliedStatus] = useState<string | undefined>();
  const query = useAdvanceReceiptsQuery({
    page,
    limit,
    keyword: appliedKeyword || undefined,
    status: appliedStatus,
  });
  const rows = query.data?.data.items ?? [];

  const columns: ColumnsType<AdvanceReceipt> = [
    { title: t("ลำดับ"), key: "seq", width: 72, align: "center" as const, render: (_v: unknown, _r: unknown, index: number) => (page - 1) * limit + index + 1 },
    {
      title: t("เลขที่เอกสาร"),
      dataIndex: "docNo",
      width: 150,
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t("ประเภท"),
      dataIndex: "docType",
      width: 110,
      align: "center",
      render: (value: string) => t(ADVANCE_TYPE_LABEL[value] ?? value),
    },
    {
      title: t("ลูกค้า"),
      dataIndex: "customerName",
      width: 200,
      ellipsis: true,
      render: (value: string | undefined, row) =>
        value ? `${row.customerCode ? `${row.customerCode} ` : ""}${value}` : "—",
    },
    { title: t("ใบสั่งขาย"), dataIndex: "soNo", width: 140, render: (value?: string) => value || "—" },
    {
      title: t("วันรับเงิน"),
      dataIndex: "receiptDate",
      width: 120,
      align: "center",
      render: (value: string) => formatDate(value),
    },
    {
      title: t("วิธีรับเงิน"),
      dataIndex: "paymentMethod",
      width: 110,
      render: (value: string) => t(AR_PAYMENT_METHOD_LABEL[value] ?? value),
    },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      width: 130,
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("คงเหลือ"),
      dataIndex: "remainingAmount",
      width: 130,
      align: "right",
      render: (value: string, row) =>
        row.status === "CANCELLED" ? (
          <span style={{ color: "#8a9199" }}>{formatMoney("0")}</span>
        ) : (
          formatMoney(value)
        ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 120,
      align: "center",
      render: (value: string) => (
        <Tag style={{ marginInlineEnd: 0 }} color={ADVANCE_STATUS_COLOR[value] ?? "default"}>
          {t(ADVANCE_STATUS_LABEL[value] ?? value)}
        </Tag>
      ),
    },
  ];

  if (!perms.canView) {
    return <AccessDenied screenCodes={["FINANCE_ADVANCE_RECEIPTS"]} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Advance receipts"
        icon={<WalletOutlined />}
        title={t("รับเงินล่วงหน้า")}
        subtitle={t("รับเงินล่วงหน้าหรือมัดจำที่ผูกใบสั่งขาย พอยืนยันจะออกใบรับชำระเข้าเครดิตลูกค้า")}
        actions={
          perms.canAdd ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(advanceReceiptRoutes.create)}
            >
              {t("สร้าง")}
            </Button>
          ) : null
        }
      />
      <FilterCard
        loading={query.isFetching}
        onSearch={() => {
          setPage(1);
          setAppliedKeyword(keyword.trim());
          setAppliedStatus(status);
        }}
        onClear={() => {
          setPage(1);
          setKeyword("");
          setAppliedKeyword("");
          setStatus(undefined);
          setAppliedStatus(undefined);
        }}
      >
        <FilterField label={t("ค้นหา")} wide>
          <Input
            allowClear
            value={keyword}
            placeholder={t("ค้นหาเลขที่ / ลูกค้า / ใบสั่งขาย")}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </FilterField>
        <FilterField label={t("สถานะ")}>
          <Select
            allowClear
            value={status}
            placeholder={t("ทั้งหมด")}
            style={{ width: "100%" }}
            options={Object.entries(ADVANCE_STATUS_LABEL).map(([value, label]) => ({
              value,
              label: t(label),
            }))}
            onChange={(value) => setStatus(value)}
          />
        </FilterField>
      </FilterCard>
      <Table
        rowKey="id"
        style={{ marginTop: 16 }}
        loading={query.isLoading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1150 }}
        pagination={{
          current: page,
          pageSize: limit,
          total: query.data?.data.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
        onRow={(row) => ({
          onClick: () => router.push(advanceReceiptRoutes.detail(row.id)),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}
