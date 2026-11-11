"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Table, Tag, Typography } from "antd";
import {
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQueries } from "@tanstack/react-query";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatDate as formatLocaleDate } from "@/lib/i18n/format";
import { useStockPostingApprovalsQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { getStockPostingApprovals } from "@/lib/api/stock-posting-requests";
import { getAccessToken } from "@/lib/auth/token";
import { useCanApproveStockPostingApprovals } from "@/lib/auth/stock-posting-access";
import type { StockPostingRequest } from "@/types/stock-posting-request";
import {
  stockPostingStatusLabel,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const STATUS_FILTERS: {
  key: string;
  label: string;
  description: string;
}[] = [
  {
    key: StockPostingRequestStatus.PENDING_APPROVAL,
    label: "รออนุมัติ",
    description: "รอหัวหน้าคลังตรวจสอบ",
  },
  {
    key: StockPostingRequestStatus.APPROVED,
    label: "อนุมัติแล้ว",
    description: "รับเข้าสต๊อกแล้ว",
  },
  {
    key: StockPostingRequestStatus.REJECTED,
    label: "ไม่อนุมัติ",
    description: "ส่งกลับให้แก้ไข/ส่งใหม่",
  },
  {
    key: StockPostingRequestStatus.CANCELLED,
    label: "ยกเลิก",
    description: "คำขอถูกยกเลิก",
  },
];

const PAGE_SIZE = 10;

function statusTagColor(status: string) {
  switch (status) {
    case StockPostingRequestStatus.PENDING_APPROVAL:
      return "processing";
    case StockPostingRequestStatus.APPROVED:
      return "success";
    case StockPostingRequestStatus.REJECTED:
      return "warning";
    case StockPostingRequestStatus.CANCELLED:
      return "default";
    default:
      return "default";
  }
}

export default function StockPostingApprovalsPage() {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const [draftStatus, setDraftStatus] = useState<string>(
    StockPostingRequestStatus.PENDING_APPROVAL,
  );
  const [status, setStatus] = useState<string>(
    StockPostingRequestStatus.PENDING_APPROVAL,
  );
  const [page, setPage] = useState(1);
  const applyFilters = () => {
    setStatus(draftStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftStatus(StockPostingRequestStatus.PENDING_APPROVAL);
    setStatus(StockPostingRequestStatus.PENDING_APPROVAL);
    setPage(1);
  };
  /** การ์ดสรุปที่กดได้ = ทางลัดเลือกสถานะ (กดแล้วค้นหาทันที) */
  const jumpToStatus = (next: string) => {
    setDraftStatus(next);
    setStatus(next);
    setPage(1);
  };
  const canApprove = useCanApproveStockPostingApprovals();
  const approvalsQuery = useStockPostingApprovalsQuery(status);
  const rows = useMemo(() => {
    const list = approvalsQuery.data?.data ?? [];
    return [...list].sort((a, b) => {
      const aTime = new Date(a.requestedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.requestedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [approvalsQuery.data?.data]);

  const countQueries = useQueries({
    queries: STATUS_FILTERS.map((filter) => ({
      queryKey: [
        "warehouse",
        "stock-posting-requests",
        "approvals",
        "count",
        filter.key,
      ],
      queryFn: () => getStockPostingApprovals(getAccessToken(), filter.key),
      staleTime: 30_000,
    })),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FILTERS.forEach((filter, index) => {
      counts[filter.key] = countQueries[index]?.data?.data?.length ?? 0;
    });
    return counts;
  }, [countQueries]);

  const pendingCount =
    statusCounts[StockPostingRequestStatus.PENDING_APPROVAL] ?? 0;

  const columns: ColumnsType<StockPostingRequest> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "index",
        width: 72,
        align: "center",
        render: (_value, _row, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      {
        title: t("เลขที่คำขอ"),
        dataIndex: "requestNo",
        key: "requestNo",
        width: 160,
        render: (value: string) => <strong>{value}</strong>,
      },
      {
        title: t("ใบรับซื้อ"),
        key: "receipt",
        width: 150,
        render: (_, row) => row.receipt?.receiptNo ?? row.receiptId,
      },
      {
        title: t("คลัง / ตำแหน่ง"),
        key: "warehouse",
        render: (_, row) => {
          const warehouse = [row.warehouseCode, row.warehouseName]
            .filter(Boolean)
            .join(" · ");
          const location = [row.locationCode, row.locationName]
            .filter(Boolean)
            .join(" · ");
          return (
            <div>
              <div>{warehouse || "-"}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {location || "-"}
              </Typography.Text>
            </div>
          );
        },
      },
      {
        title: t("วันที่รับเข้า"),
        dataIndex: "postingDate",
        key: "postingDate",
        width: 120,
        render: (value: string) => formatLocaleDate(value, lang),
      },
      {
        title: t("ผู้ขอ"),
        key: "requestedBy",
        width: 140,
        render: (_, row) =>
          row.requestedBy?.displayName ??
          row.requestedBy?.username ??
          row.requestedById,
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={statusTagColor(value)} className={styles.flowTag}>
            {stockPostingStatusLabel(value, lang)}
          </Tag>
        ),
      },
      {
        title: t("ดำเนินการ"),
        key: "actions",
        width: 130,
        fixed: "right",
        render: (_, row) => (
          <Button
            size="small"
            type={
              row.status === StockPostingRequestStatus.PENDING_APPROVAL
                ? "primary"
                : "default"
            }
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/warehouse/stock-posting-approvals/${row.id}`);
            }}
          >
            {row.status === StockPostingRequestStatus.PENDING_APPROVAL
              ? t("ตรวจสอบ")
              : t("ดูรายละเอียด")}
          </Button>
        ),
      },
    ],
    [page, router, t, lang],
  );

  return (
    <MasterPageGate isLoading={approvalsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="Warehouse"
          icon={<InboxOutlined />}
          title={t("อนุมัติรับเข้าคลัง")}
          subtitle={t("หัวหน้าคลังตรวจสอบคำขอรับยางดิบ — อนุมัติแล้วระบบจึง POST สต๊อกจริง")}
          actions={
            <>
<Button
              className={styles.dashboardButton}
              icon={<ReloadOutlined />}
              loading={approvalsQuery.isFetching}
              onClick={() => void approvalsQuery.refetch()}
            >
              {t("รีเฟรช")}
            </Button>
            </>
          }
        />

        <div className={styles.statsStrip}>
          <div
            className={[styles.statHighlight, styles.statHighlightAccent].join(
              " ",
            )}
          >
            <span>{t("รออนุมัติ")}</span>
            <strong>{pendingCount.toLocaleString("th-TH")}</strong>
          </div>
          <div className={styles.statHighlight}>
            <span>{t("รายการที่แสดง")}</span>
            <strong>{rows.length.toLocaleString("th-TH")}</strong>
          </div>
        </div>

        <div
          className={styles.summaryGrid}
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          <button
            type="button"
            className={[
              styles.summaryCard,
              styles.summaryCardButton,
              status === StockPostingRequestStatus.APPROVED
                ? styles.summaryCardActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => jumpToStatus(StockPostingRequestStatus.APPROVED)}
          >
            <span>{t("อนุมัติแล้ว")}</span>
            <strong>
              {(
                statusCounts[StockPostingRequestStatus.APPROVED] ?? 0
              ).toLocaleString("th-TH")}
            </strong>
          </button>
          <button
            type="button"
            className={[
              styles.summaryCard,
              styles.summaryCardButton,
              status === StockPostingRequestStatus.REJECTED
                ? styles.summaryCardActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => jumpToStatus(StockPostingRequestStatus.REJECTED)}
          >
            <span>{stockPostingStatusLabel(StockPostingRequestStatus.REJECTED, lang)}</span>
            <strong>
              {(
                statusCounts[StockPostingRequestStatus.REJECTED] ?? 0
              ).toLocaleString("th-TH")}
            </strong>
          </button>
          <div className={styles.summaryCard} style={{ cursor: "default" }}>
            <span>{t("สิทธิ์")}</span>
            <strong style={{ fontSize: 16 }}>
              {canApprove ? t("อนุมัติได้") : t("ดูอย่างเดียว")}
            </strong>
          </div>
        </div>

        {!canApprove ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="secondary">
                {t("ดูรายการได้ — การอนุมัติ/ไม่อนุมัติต้องเปิดสิทธิ์ STOCK_POSTING_APPROVALS · APPROVE ที่หน้าผู้ใช้งาน → การอนุญาต")}
              </Typography.Text>
            </div>
          </div>
        ) : null}

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={approvalsQuery.isFetching}>
          <FilterField label={t("สถานะ")}>
            <Select
              style={{ width: "100%" }}
              value={draftStatus}
              onChange={setDraftStatus}
              options={STATUS_FILTERS.map((option) => ({
                value: option.key,
                label: `${stockPostingStatusLabel(option.key, lang)} (${statusCounts[option.key] ?? 0})`,
              }))}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>
                {STATUS_FILTERS.some((item) => item.key === status)
                  ? stockPostingStatusLabel(status, lang)
                  : t("รายการคำขอ")}
              </h3>
              <p>
                {t("กดแถวหรือปุ่มเพื่อเปิดรายละเอียด")}
                {canApprove &&
                status === StockPostingRequestStatus.PENDING_APPROVAL
                  ? ` · ${t("อนุมัติได้จากหน้ารายละเอียด")}`
                  : ""}
              </p>
            </div>
          </div>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={approvalsQuery.isFetching}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
              onChange: setPage,
            }}
            scroll={{ x: 980 }}
            locale={{ emptyText: t("ไม่พบคำขอตามเงื่อนไขที่เลือก") }}
            onRow={(record) => ({
              onClick: () =>
                router.push(`/warehouse/stock-posting-approvals/${record.id}`),
              className: styles.clickableRow,
            })}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
