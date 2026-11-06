"use client";

import { useState } from "react";
import { App, Button, Space, Table, Tag, Typography } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";

import { useT2900LiveUpdates } from "@/hooks/weighbridge-tickets/useT2900LiveUpdates";
import { useT2900OutboundTicketsQuery } from "@/hooks/weighbridge-tickets/useT2900OutboundTicketsQuery";
import { getT2900DailyReport } from "@/lib/api/t2900";
import { getAccessToken } from "@/lib/auth/token";
import type { T2900ErpOutboundTicket, T2900RecordStatus } from "@/types/t2900";

import styles from "./WeighbridgeDashboardPage.module.css";
import { useT } from "@/lib/i18n/useT";

import { appLocale, tLabel } from "./receiving-i18n";

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
  return value.toLocaleString(appLocale(), {
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
  return parsed.toLocaleString(appLocale());
}

export default function T2900OutboundTicketsPanel({ dateFrom, dateTo }: Props) {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const [exportingReport, setExportingReport] = useState(false);
  // มีบัตรเข้ามาใหม่/สถานะเปลี่ยน หลังบ้านส่งสัญญาณมา → ดึงตารางใหม่ทันที ไม่ต้องรีเฟรชเอง
  useT2900LiveUpdates();

  const ticketsQuery = useT2900OutboundTicketsQuery({
    dateFrom,
    dateTo,
    status: "ALL",
    page: 1,
    limit: 200,
  });

  const rows = ticketsQuery.data?.data.items ?? [];

  /** Export รายงานรายวัน (บัตรชั่งครั้งสอง แยกตามสินค้า → ลูกค้า) ตามช่วงวันที่ที่เลือกอยู่ */
  const handleExportDailyReport = async () => {
    setExportingReport(true);
    try {
      const response = await getT2900DailyReport(getAccessToken(), {
        dateFrom,
        dateTo,
      });
      const { generateT2900DailyReportPdf } =
        await import("@/utils/generateT2900DailyReportPdf");
      await generateT2900DailyReportPdf(response.data);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("Export รายงานรายวันไม่สำเร็จ"),
      );
    } finally {
      setExportingReport(false);
    }
  };

  // เปิดหน้ารายละเอียดบัตร — ตั๋ว ERP ถูกสร้างตอนกดยืนยันในหน้านั้นเท่านั้น ไม่ใช่ตอนเปิดดู
  const handleOpen = (ticket: T2900ErpOutboundTicket) => {
    router.push(`/receiving/t2900/${encodeURIComponent(ticket.TckNo)}`);
  };

  const columns: ColumnsType<T2900ErpOutboundTicket> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขบัตรชั่ง"),
      dataIndex: "TckNo",
      key: "TckNo",
      width: 140,
    },
    {
      title: t("ทะเบียน"),
      dataIndex: "TruckNo",
      key: "TruckNo",
      width: 120,
    },
    {
      title: t("ผู้ขาย"),
      key: "seller",
      width: 200,
      render: (_value, record) =>
        `${record.CustID} ${record.CustomerName ?? ""}`.trim(),
    },
    {
      title: t("สินค้า"),
      key: "product",
      width: 180,
      render: (_value, record) => record.ProdName || record.ProdID || "-",
    },
    {
      title: t("น้ำหนักสุทธิ"),
      dataIndex: "NetWt",
      key: "NetWt",
      width: 120,
      align: "right",
      render: (value: number) => `${formatWeight(value)} ${t("กก.")}`,
    },
    {
      title: t("สถานะ"),
      dataIndex: "recordStatus",
      key: "recordStatus",
      width: 120,
      render: (value: string, record) => {
        const label = tLabel(RECORD_STATUS_LABEL[value as T2900RecordStatus] ?? value);
        if (record.alreadyImported) {
          if (record.erpStockPostingStatus === "POSTED") {
            return <Tag color="green">{t("เข้าคลังแล้ว")}</Tag>;
          }
          if (record.erpReceiptId) {
            return <Tag color="gold">{t("เปิดตั๋วแล้ว")}</Tag>;
          }
          return <Tag color="blue">{t("รอคัดแยก")}</Tag>;
        }
        if (record.recordStatus === "CANCELLED") {
          return <Tag color="error">{label}</Tag>;
        }
        if (!record.canImport) {
          return <Tag>{t("รอชั่งออก")}</Tag>;
        }
        return <Tag color="blue">{t("พร้อมยืนยัน")}</Tag>;
      },
    },
    {
      title: t("เวลาอัปเดต"),
      dataIndex: "lastUpdatedAt",
      key: "lastUpdatedAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t("ดำเนินการ"),
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
            onClick={() => {
              handleOpen(record);
            }}
          >
            {record.alreadyImported
              ? record.erpActionLabel || t("ดูรายละเอียด")
              : record.canImport
                ? t("ดูและยืนยัน")
                : t("ดูรายละเอียด")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className={styles.t2900Toolbar}>
        <Button
          icon={<FilePdfOutlined />}
          loading={exportingReport}
          onClick={() => void handleExportDailyReport()}
        >
          {t("Export รายงานรายวัน")}
        </Button>
      </div>
      <div className={styles.cardBody}>
        {ticketsQuery.isError ? (
          <Typography.Text type="danger">
            {ticketsQuery.error instanceof Error
              ? ticketsQuery.error.message
              : t("โหลดบัตรชั่ง T2900 ไม่สำเร็จ")}
          </Typography.Text>
        ) : (
          <Table
            rowKey="TckNo"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={ticketsQuery.isLoading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 1090 }}
            locale={{ emptyText: t("ไม่พบบัตรชั่งในช่วงวันที่เลือก") }}
            onRow={(record) => ({
              onClick: () => {
                handleOpen(record);
              },
              className: styles.clickableRow,
            })}
          />
        )}
      </div>
    </>
  );
}
