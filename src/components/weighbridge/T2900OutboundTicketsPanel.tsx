"use client";

import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";

import { useImportT2900TicketMutation } from "@/hooks/weighbridge-tickets/useImportT2900TicketMutation";
import { useT2900OutboundTicketsQuery } from "@/hooks/weighbridge-tickets/useT2900OutboundTicketsQuery";
import type { T2900ErpOutboundTicket, T2900RecordStatus } from "@/types/t2900";

import styles from "./WeighbridgeDashboardPage.module.css";

const RECORD_STATUS_LABEL: Record<T2900RecordStatus, string> = {
  ACTIVE: "ใช้งาน",
  UPDATED: "แก้ไข",
  CANCELLED: "ยกเลิก",
};

type Props = {
  dateFrom: string;
  dateTo: string;
};

function formatWeight(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("th-TH");
}

export default function T2900OutboundTicketsPanel({ dateFrom, dateTo }: Props) {
  const router = useRouter();

  const ticketsQuery = useT2900OutboundTicketsQuery({
    dateFrom,
    dateTo,
    status: "ALL",
    page: 1,
    limit: 200,
  });
  const importMutation = useImportT2900TicketMutation();

  const rows = ticketsQuery.data?.data.items ?? [];

  const goToImportedTicket = (ticket: {
    id: string;
    nextActionHref?: string;
  }) => {
    router.push(ticket.nextActionHref || `/receiving/${ticket.id}`);
  };

  const handleOpen = async (ticket: T2900ErpOutboundTicket) => {
    if (!ticket.canImport && !ticket.alreadyImported) {
      return;
    }
    try {
      const response = await importMutation.mutateAsync({
        tckNo: ticket.TckNo,
      });
      goToImportedTicket(response.data);
    } catch {
      if (ticket.erpActionHref) {
        router.push(ticket.erpActionHref);
      }
    }
  };

  const columns: ColumnsType<T2900ErpOutboundTicket> = [
    {
      title: "เลขบัตรชั่ง",
      dataIndex: "TckNo",
      key: "TckNo",
      width: 140,
    },
    {
      title: "ทะเบียน",
      dataIndex: "TruckNo",
      key: "TruckNo",
      width: 120,
    },
    {
      title: "ผู้ขาย",
      key: "seller",
      width: 200,
      render: (_value, record) =>
        `${record.CustID} ${record.CustomerName ?? ""}`.trim(),
    },
    {
      title: "สินค้า",
      key: "product",
      width: 180,
      render: (_value, record) => record.ProdName || record.ProdID || "-",
    },
    {
      title: "น้ำหนักสุทธิ",
      dataIndex: "NetWt",
      key: "NetWt",
      width: 120,
      align: "right",
      render: (value: number) => `${formatWeight(value)} กก.`,
    },
    {
      title: "สถานะ",
      dataIndex: "recordStatus",
      key: "recordStatus",
      width: 120,
      render: (value: string, record) => {
        const label =
          RECORD_STATUS_LABEL[value as T2900RecordStatus] ?? value;
        if (record.alreadyImported) {
          if (record.erpStockPostingStatus === "POSTED") {
            return <Tag color="green">เข้าคลังแล้ว</Tag>;
          }
          if (record.erpReceiptId) {
            return <Tag color="gold">เปิดตั๋วแล้ว</Tag>;
          }
          return <Tag color="blue">รอคัดแยก</Tag>;
        }
        if (!record.canImport) {
          return <Tag>{label}</Tag>;
        }
        return <Tag color="blue">{label}</Tag>;
      },
    },
    {
      title: "เวลาอัปเดต",
      dataIndex: "lastUpdatedAt",
      key: "lastUpdatedAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "ดำเนินการ",
      key: "action",
      width: 180,
      render: (_value, record) => (
        <Space
          size={8}
          className={styles.t2900RowActions}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="small"
            type="primary"
            disabled={!record.canImport && !record.alreadyImported}
            loading={
              importMutation.isPending &&
              importMutation.variables?.tckNo === record.TckNo
            }
            onClick={() => {
              void handleOpen(record);
            }}
          >
            {record.erpActionLabel ||
              (record.alreadyImported ? "ไปคัดแยก" : "เปิดตั๋วและคัดแยก")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className={styles.cardBody}>
        {ticketsQuery.isError ? (
          <Typography.Text type="danger">
            {ticketsQuery.error instanceof Error
              ? ticketsQuery.error.message
              : "โหลดบัตรชั่ง T2900 ไม่สำเร็จ"}
          </Typography.Text>
        ) : (
          <Table
            rowKey="TckNo"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={ticketsQuery.isFetching}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 1250 }}
            locale={{ emptyText: "ไม่พบบัตรชั่งในช่วงวันที่เลือก" }}
            onRow={(record) => ({
              onClick: () => {
                void handleOpen(record);
              },
              className:
                record.canImport || record.alreadyImported
                  ? styles.clickableRow
                  : undefined,
            })}
          />
        )}
      </div>
    </>
  );
}
