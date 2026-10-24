"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
  usePendingSalesCreditNotesQuery,
  useSalesCreditNotesQuery,
} from "@/hooks/sales-credit-notes/useSalesCreditNotesQuery";
import { useCreateSalesCreditNoteMutation } from "@/hooks/sales-credit-notes/useSalesCreditNoteMutations";
import {
  SALES_CREDIT_NOTE_STATUS_LABEL,
  type SalesCreditNote,
  type SalesCreditNotePendingRow,
} from "@/types/sales-credit-notes";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function SalesCreditNotesPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const pendingQuery = usePendingSalesCreditNotesQuery();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
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
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: "รหัส", dataIndex: "itemCode", width: 120 },
    { title: "สินค้า", dataIndex: "itemName" },
    {
      title: "จำนวนที่ไม่ส่งใหม่",
      dataIndex: "quantity",
      align: "right",
      width: 150,
    },
    {
      title: "คงเหลือ",
      dataIndex: "remainingQuantity",
      align: "right",
      width: 110,
    },
    { title: "หน่วย", dataIndex: "unitName", width: 80 },
    {
      title: "ราคาต่อหน่วย",
      dataIndex: "unitPrice",
      align: "right",
      width: 130,
      render: (value: number) => money.format(value),
    },
  ];

  const noteColumns: ColumnsType<SalesCreditNote> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: "เลขที่", dataIndex: "creditNoteNo", width: 180 },
    { title: "วันที่", dataIndex: "creditNoteDate", width: 120 },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 120,
      render: (value: string) =>
        SALES_CREDIT_NOTE_STATUS_LABEL[value] ?? value,
    },
    { title: "ลูกค้า", dataIndex: "customerName" },
    { title: "ใบสั่งขาย", dataIndex: "salesOrderNo", width: 150 },
    { title: "ใบส่งสินค้า", dataIndex: "deliveryOrderNo", width: 160 },
    {
      title: "ยอดรวม",
      dataIndex: "totalAmount",
      align: "right",
      width: 140,
      render: (value: number) => money.format(value),
    },
  ];

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
      message.success("สร้างใบลดหนี้ร่างแล้ว");
      router.push(`/finance/receivables/credit-notes/${res.data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "สร้างใบลดหนี้ไม่สำเร็จ");
    }
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card title="รอดำเนินการลดหนี้">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {groups.length === 0 && !pendingQuery.isLoading ? (
            <Typography.Text type="secondary">
              ยังไม่มีจำนวนที่ไม่ส่งใหม่รอเปิดใบลดหนี้
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
                  สร้างใบลดหนี้
                </Button>
              }
            >
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                อ้างอิงใบสั่งขาย {group.salesOrderNo}
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

      <Card title="ใบลดหนี้ทั้งหมด">
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            allowClear
            placeholder="เลขที่ / ลูกค้า / SO / ใบส่ง"
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
            placeholder="สถานะ"
            value={status}
            style={{ width: 160 }}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            options={Object.entries(SALES_CREDIT_NOTE_STATUS_LABEL).map(
              ([value, label]) => ({ value, label }),
            )}
          />
        </Space>
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
