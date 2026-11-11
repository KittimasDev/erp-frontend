"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { App, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
  usePendingSalesCreditNotesQuery,
  useSalesCreditNotesQuery,
} from "@/hooks/sales-credit-notes/useSalesCreditNotesQuery";
import { useCreateSalesCreditNoteMutation } from "@/hooks/sales-credit-notes/useSalesCreditNoteMutations";
import {
  SALES_CREDIT_NOTE_STATUS_LABEL,
  salesCreditNoteStatusColor,
  salesCreditNoteStatusLabel,
  type SalesCreditNote,
  type SalesCreditNotePendingRow,
} from "@/types/sales-credit-notes";
import PageHeader from "@/components/common/PageHeader";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

export default function SalesCreditNotesPage() {
  const { message } = App.useApp();
  const t = useT();
  const lang = useLanguage();
  const money = { format: (value: number) => formatMoney(value, lang) };
  const router = useRouter();
  const pendingQuery = usePendingSalesCreditNotesQuery();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [draftStatus, setDraftStatus] = useState<string | undefined>();
  const listQuery = useSalesCreditNotesQuery({
    page,
    limit: 20,
    status,
    search: keyword,
  });
  const createNote = useCreateSalesCreditNoteMutation();

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        deliveryOrderId: string;
        deliveryOrderNo: string;
        salesOrderNo: string;
        customerName: string;
        lines: SalesCreditNotePendingRow[];
      }
    >();
    for (const row of pendingQuery.data?.items ?? []) {
      const current = map.get(row.deliveryOrderId) ?? {
        deliveryOrderId: row.deliveryOrderId,
        deliveryOrderNo: row.deliveryOrderNo,
        salesOrderNo: row.salesOrderNo,
        customerName: row.customerName,
        lines: [],
      };
      current.lines.push(row);
      map.set(row.deliveryOrderId, current);
    }
    return [...map.values()];
  }, [pendingQuery.data?.items]);

  const pendingColumns: ColumnsType<SalesCreditNotePendingRow> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: t("รหัส"), dataIndex: "itemCode", width: 120 },
    { title: t("สินค้า"), dataIndex: "itemName" },
    {
      title: t("จำนวนที่ไม่ส่งใหม่"),
      dataIndex: "quantity",
      align: "right",
      width: 150,
    },
    {
      title: t("คงเหลือ"),
      dataIndex: "remainingQuantity",
      align: "right",
      width: 110,
    },
    { title: t("หน่วย"), dataIndex: "unitName", width: 80 },
    {
      title: t("ราคาต่อหน่วย"),
      dataIndex: "unitPrice",
      align: "right",
      width: 130,
      render: (value: number) => money.format(value),
    },
  ];

  const noteColumns: ColumnsType<SalesCreditNote> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: t("เลขที่"), dataIndex: "creditNoteNo", width: 180 },
    {
      title: t("วันที่"),
      dataIndex: "creditNoteDate",
      width: 120,
      render: (v?: string) => (v ? dayjs(v).format("DD/MM/BBBB") : "—"),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 120,
      render: (value: string) => (
        <Tag color={salesCreditNoteStatusColor(value)}>
          {salesCreditNoteStatusLabel(value, lang)}
        </Tag>
      ),
    },
    { title: t("ลูกค้า"), dataIndex: "customerName" },
    { title: t("ใบสั่งขาย"), dataIndex: "salesOrderNo", width: 150 },
    { title: t("ใบส่งสินค้า"), dataIndex: "deliveryOrderNo", width: 160 },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      align: "right",
      width: 140,
      render: (value: number) => money.format(value),
    },
  ];

  const applyFilters = () => {
    setPage(1);
    setStatus(draftStatus);
    setKeyword(search.trim());
  };
  const clearFilters = () => {
    setPage(1);
    setStatus(undefined);
    setDraftStatus(undefined);
    setSearch("");
    setKeyword("");
  };

  async function createFromDelivery(deliveryOrderId: string) {
    const group = groups.find((row) => row.deliveryOrderId === deliveryOrderId);
    if (!group) return;
    try {
      const res = await createNote.mutateAsync({
        reason: group.lines.find((line) => line.reason)?.reason,
        items: group.lines.map((line) => ({
          pendingId: line.id,
          quantity: line.remainingQuantity,
          unitPrice: line.unitPrice,
          discountAmount: 0,
        })),
      });
      message.success(t("สร้างใบลดหนี้ร่างแล้ว"));
      router.push(`/finance/receivables/credit-notes/${res.data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("สร้างใบลดหนี้ไม่สำเร็จ"));
    }
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={t("ใบลดหนี้")}
        subtitle={t("รอดำเนินการลดหนี้จากใบรับคืนสินค้า")}
      />

      <Card title={t("รอดำเนินการลดหนี้")}>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {groups.length === 0 && !pendingQuery.isLoading ? (
            <Typography.Text type="secondary">
              {t("ยังไม่มีจำนวนที่ไม่ส่งใหม่รอเปิดใบลดหนี้")}
            </Typography.Text>
          ) : null}
          {groups.map((group) => (
            <Card
              key={group.deliveryOrderId}
              type="inner"
              title={`${group.deliveryOrderNo} · ${group.customerName}`}
              extra={
                <Button
                  type="primary"
                  loading={createNote.isPending}
                  onClick={() => createFromDelivery(group.deliveryOrderId)}
                >
                  {t("สร้างใบลดหนี้")}
                </Button>
              }
            >
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                {t("อ้างอิงใบสั่งขาย {no}", { no: group.salesOrderNo })}
              </Typography.Paragraph>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={pendingColumns}
                dataSource={group.lines}
              />
            </Card>
          ))}
        </Space>
      </Card>

      <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
        <FilterField label={t("ค้นหา")} wide>
          <Input
            allowClear
            placeholder={t("เลขที่ / ลูกค้า / SO / ใบส่ง")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </FilterField>
        <FilterField label={t("สถานะ")}>
          <Select
            allowClear
            placeholder={t("สถานะ")}
            value={draftStatus}
            style={{ width: "100%" }}
            onChange={(value) => setDraftStatus(value)}
            options={Object.entries(SALES_CREDIT_NOTE_STATUS_LABEL).map(
              ([value]) => ({
                value,
                label: salesCreditNoteStatusLabel(value, lang),
              }),
            )}
          />
        </FilterField>
      </FilterCard>

      <Card title={t("ใบลดหนี้ทั้งหมด")}>
        <Table
          rowKey="id"
          loading={listQuery.isLoading}
          columns={noteColumns}
          dataSource={listQuery.data?.items ?? []}
          pagination={{
            current: page,
            pageSize: 20,
            total: listQuery.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          onRow={(record) => ({
            onClick: () =>
              router.push(`/finance/receivables/credit-notes/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>
    </Space>
  );
}
