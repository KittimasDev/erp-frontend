"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import PageHeader from "@/components/common/PageHeader";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useSalesTaxInvoicesQuery } from "@/hooks/sales-tax-invoices/useSalesTaxInvoices";
import { useT } from "@/lib/i18n/useT";
import { taxInvoiceRoutes } from "@/lib/sales/ar-routes";
import type { SalesTaxInvoice } from "@/types/sales-tax-invoices";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesTaxInvoicesPage() {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions("FINANCE_TAX_INVOICES");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [appliedStatus, setAppliedStatus] = useState<string | undefined>();

  const query = useSalesTaxInvoicesQuery({
    page,
    limit,
    keyword: appliedKeyword || undefined,
    status: appliedStatus,
  });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const columns: ColumnsType<SalesTaxInvoice> = [
    {
      title: t("เลขที่ใบกำกับภาษี"),
      dataIndex: "taxInvoiceNo",
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t("วันที่"),
      dataIndex: "taxInvoiceDate",
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: t("เอกสารอ้างอิง"),
      dataIndex: "invoiceNo",
    },
    {
      title: t("ลูกค้า"),
      dataIndex: "buyerName",
    },
    {
      title: t("ยอดก่อน VAT"),
      dataIndex: "subtotalAmount",
      align: "right",
      render: (value: string, row) =>
        formatMoney(String(Math.max(0, Number(value) - Number(row.discountAmount || 0)))),
    },
    {
      title: t("VAT"),
      dataIndex: "vatAmount",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 110,
      render: (value: string) => (
        <Tag color={value === "ISSUED" ? "green" : "default"}>
          {value === "ISSUED" ? t("ใช้งาน") : t("ยกเลิก")}
        </Tag>
      ),
    },
  ];

  if (!perms.canView) {
    return <AccessDenied screenCodes={["FINANCE_TAX_INVOICES"]} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Tax invoices"
        icon={<FileTextOutlined />}
        title={t("ใบกำกับภาษี")}
        subtitle={t("ออกจากใบแจ้งหนี้ที่ยืนยันแล้ว หนึ่งใบแจ้งหนี้มีใบกำกับภาษีที่ใช้งานอยู่ได้ใบเดียว")}
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
            placeholder={t("เลขที่ใบกำกับภาษี / ใบแจ้งหนี้ / ลูกค้า")}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label={t("ค้นหาใบกำกับภาษี")}
          />
        </FilterField>
        <FilterField label={t("สถานะ")}>
          <Select
            allowClear
            value={status}
            placeholder={t("ทั้งหมด")}
            style={{ width: "100%" }}
            aria-label={t("สถานะใบกำกับภาษี")}
            options={[
              { value: "ISSUED", label: t("ใช้งาน") },
              { value: "CANCELLED", label: t("ยกเลิก") },
            ]}
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
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
        onRow={(row) => ({
          onClick: () => router.push(taxInvoiceRoutes.detail(row.id)),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}
