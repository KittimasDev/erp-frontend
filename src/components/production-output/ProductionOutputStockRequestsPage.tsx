"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  AlertOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Input,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCancelProductionOutputStockRequestMutation } from "@/hooks/production-output/useProductionOutputMutations";
import { useProductionOutputStockRequestsQuery } from "@/hooks/production-output/useProductionOutputQueries";
import { getProductionOutputStockRequests } from "@/lib/api/production-output-stock-requests";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { getAccessToken } from "@/lib/auth/token";
import type { ProductionOutputStockRequest } from "@/types/production-output-stock-request";
import {
  productionOutputStatusLabel,
  ProductionOutputRequestStatus,
} from "@/types/production-output-stock-request";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import styles from "./ProductionOutputStockRequestsPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { appLocale } from "@/components/weighbridge/receiving-i18n";

const STATUS_FILTERS: {
  key: string | undefined;
  label: string;
  hint: string;
  pendingTone?: boolean;
}[] = [
  { key: undefined, label: "ทั้งหมด", hint: "รายการทุกสถานะ" },
  {
    key: ProductionOutputRequestStatus.PENDING_APPROVAL,
    label: "รออนุมัติ",
    hint: "รอหัวหน้าคลัง",
    pendingTone: true,
  },
  {
    key: ProductionOutputRequestStatus.APPROVED,
    label: "อนุมัติแล้ว",
    hint: "POST สต๊อกแล้ว",
  },
  {
    key: ProductionOutputRequestStatus.REJECTED,
    label: "ไม่อนุมัติ",
    hint: "ส่งใหม่ได้",
  },
  {
    key: ProductionOutputRequestStatus.CANCELLED,
    label: "ยกเลิก",
    hint: "ถูกยกเลิกแล้ว",
  },
];

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function statusPillClass(status: string) {
  switch (status) {
    case ProductionOutputRequestStatus.PENDING_APPROVAL:
      return styles.statusPending;
    case ProductionOutputRequestStatus.APPROVED:
      return styles.statusApproved;
    case ProductionOutputRequestStatus.REJECTED:
      return styles.statusRejected;
    case ProductionOutputRequestStatus.CANCELLED:
      return styles.statusCancelled;
    default:
      return styles.statusDefault;
  }
}

function StatusPill({ status }: { status: string }) {
  useLanguage();
  const isPending = status === ProductionOutputRequestStatus.PENDING_APPROVAL;
  return (
    <span className={`${styles.statusPill} ${statusPillClass(status)}`}>
      <span className={styles.statusDot} aria-hidden />
      {isPending ? <ClockCircleOutlined aria-hidden /> : null}
      {productionOutputStatusLabel(status)}
    </span>
  );
}

export default function ProductionOutputStockRequestsPage() {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  /** เปิด/ยกเลิกใบขอรับผลผลิตเข้าคลัง = งานของหน้านี้ ตัดสินจาก Permission Matrix */
  const canRequest = useScreenActionPermissions(
    "PRODUCTION_OUTPUT_STOCK_REQUESTS",
  ).canAdd;
  const canViewProductionOrders = useScreenActionPermissions(
    "PRODUCTION_ORDERS",
  ).canView;

  const listQuery = useProductionOutputStockRequestsQuery({
    status,
    q: q.trim() || undefined,
  });
  const cancelMutation = useCancelProductionOutputStockRequestMutation();

  const countQueries = useQueries({
    queries: STATUS_FILTERS.map((filter) => ({
      queryKey: [
        "production-output",
        "stock-requests",
        "list",
        "status-count",
        filter.key ?? "all",
        q.trim() || "",
      ],
      queryFn: () =>
        getProductionOutputStockRequests(getAccessToken(), {
          status: filter.key,
          q: q.trim() || undefined,
        }),
      staleTime: 30_000,
    })),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FILTERS.forEach((filter, index) => {
      const countKey = filter.key ?? "all";
      counts[countKey] = countQueries[index]?.data?.data?.length ?? 0;
    });
    return counts;
  }, [countQueries]);

  const pendingCount =
    statusCounts[ProductionOutputRequestStatus.PENDING_APPROVAL] ?? 0;

  const rows = useMemo(() => {
    const data = listQuery.data?.data ?? [];
    if (status) {
      return data;
    }
    return [...data].sort((a, b) => {
      const aPending =
        a.status === ProductionOutputRequestStatus.PENDING_APPROVAL ? 0 : 1;
      const bPending =
        b.status === ProductionOutputRequestStatus.PENDING_APPROVAL ? 0 : 1;
      if (aPending !== bPending) {
        return aPending - bPending;
      }
      return (
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    });
  }, [listQuery.data?.data, status]);

  const activeFilter = STATUS_FILTERS.find((item) => item.key === status);

  const columns: ColumnsType<ProductionOutputStockRequest> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "index",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: t("เลขที่คำขอ"),
        dataIndex: "requestNo",
        key: "requestNo",
        width: 170,
        render: (value: string, row) => {
          const isPending =
            row.status === ProductionOutputRequestStatus.PENDING_APPROVAL;
          return (
            <span className={styles.requestNoCell}>
              {isPending ? (
                <span
                  className={styles.pendingDot}
                  title={t("รอหัวหน้าคลังอนุมัติ")}
                  aria-hidden
                />
              ) : null}
              <span
                className={`${styles.requestNoBadge} ${
                  isPending ? styles.requestNoBadgePending : ""
                }`}
              >
                {value}
              </span>
            </span>
          );
        },
      },
      {
        title: t("สินค้า"),
        key: "item",
        render: (_, row) => (
          <div>
            <div>
              {row.itemCode
                ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                : row.itemId}
            </div>
            {row.productionOrderNo ? (
              <span className={styles.metaSecondary}>
                {t("ใบสั่งผลิต")} {row.productionOrderNo}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        title: t("จำนวน"),
        key: "qty",
        align: "right",
        width: 120,
        render: (_, row) =>
          `${row.quantity} ${row.unitCode ?? row.unitNameTh ?? ""}`,
      },
      {
        title: t("คลัง / ตำแหน่ง"),
        key: "warehouse",
        render: (_, row) => (
          <div>
            <div>{row.warehouseCode ?? row.warehouseName ?? "-"}</div>
            <span className={styles.metaSecondary}>
              {row.locationCode ?? row.locationName ?? "-"}
            </span>
          </div>
        ),
      },
      {
        title: t("วันที่รับเข้า"),
        dataIndex: "postingDate",
        key: "postingDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ผู้ขอ / วันที่ส่ง"),
        key: "requested",
        width: 150,
        render: (_, row) => (
          <div>
            <div>{row.requestedByName ?? "—"}</div>
            <span className={styles.metaSecondary}>
              {formatDateTime(row.requestedAt)}
            </span>
          </div>
        ),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 150,
        render: (value: string, row) => (
          <div>
            <StatusPill status={value} />
            {row.status === ProductionOutputRequestStatus.PENDING_APPROVAL ? (
              <span className={styles.metaSecondary}>
                {t("รอหัวหน้าคลังอนุมัติ")}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        title: t("จัดการ"),
        key: "actions",
        width: 170,
        align: "center",
        fixed: "right",
        render: (_, row) => {
          const isPending =
            row.status === ProductionOutputRequestStatus.PENDING_APPROVAL;
          return (
            <RowActionsMenu
              ariaLabel={t("เมนูจัดการ {no}", { no: row.requestNo })}
              primary={
                <Button
                  size="small"
                  type={isPending ? "primary" : "default"}
                  onClick={() =>
                    router.push(`/production/output-stock-requests/${row.id}`)
                  }
                >
                  {isPending ? t("ติดตามสถานะ") : t("ดูรายละเอียด")}
                </Button>
              }
              actions={[
                canRequest &&
                  isPending && {
                    key: "cancel",
                    icon: <CloseCircleOutlined />,
                    label: t("ยกเลิกคำขอ"),
                    danger: true,
                    onClick: () => cancelMutation.mutate(row.id),
                    confirm: {
                      title: t("ยกเลิกคำขอ?"),
                      okText: t("ยกเลิกคำขอ"),
                      cancelText: t("ปิด"),
                    },
                  },
              ]}
            />
          );
        },
      },
    ],
    [canRequest, cancelMutation, page, pageSize, router, t],
  );

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="PRODUCTION · OUTPUT"
          title={t("คำขอรับผลผลิตเข้าคลัง")}
          subtitle={t("ส่งคำขอจากใบสั่งผลิตที่เริ่มผลิตแล้ว ทยอยรับเป็นงวดได้ — รายการที่รออนุมัติจะถูกเน้นไว้ สต๊อกยังไม่เพิ่มจนกว่าหัวหน้าคลังจะอนุมัติที่เมนู คลัง FG")}
          actions={
            <>
{canViewProductionOrders ? (
            <Button
              icon={<ArrowLeftOutlined />}
              className={styles.backBtn}
              onClick={() => router.push("/production/production-orders")}
            >
              {t("กลับใบสั่งผลิต")}
            </Button>
          ) : null}
<div>
            {canRequest ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={styles.createBtn}
                onClick={() =>
                  router.push(
                    "/production/output-stock-requests/create",
                  )
                }
              >
                {t("สร้างคำขอ")}
              </Button>
            ) : null}
          </div>
            </>
          }
        />

        {pendingCount > 0 ? (
          <div className={styles.pendingAlert} role="status">
            <AlertOutlined className={styles.pendingAlertIcon} aria-hidden />
            <div>
              <p className={styles.pendingAlertTitle}>
                {t("มี {n} คำขอรออนุมัติ", { n: pendingCount.toLocaleString(appLocale()) })}
              </p>
              <p className={styles.pendingAlertText}>
                {t("รายการเหล่านี้ยังไม่ POST เข้าสต๊อก — หัวหน้าคลังต้องอนุมัติที่เมนู \"อนุมัติรับผลผลิตเข้าคลัง\" ก่อน")}
              </p>
            </div>
          </div>
        ) : null}

        <div className={styles.statRow}>
          {STATUS_FILTERS.map((filter) => {
            const countKey = filter.key ?? "all";
            const count = statusCounts[countKey] ?? 0;
            const active = status === filter.key;
            const isPendingFilter = filter.pendingTone === true;
            return (
              <button
                key={countKey}
                type="button"
                className={[
                  styles.statChip,
                  active ? styles.statChipActive : "",
                  isPendingFilter && !active && count > 0
                    ? styles.statChipPending
                    : "",
                  isPendingFilter && active ? styles.statChipPendingActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setStatus(filter.key);
                  setPage(1);
                }}
              >
                <span className={styles.statLabel}>{filter.key ? productionOutputStatusLabel(filter.key) : t("ทั้งหมด")}</span>
                <strong
                  className={`${styles.statValue} ${
                    isPendingFilter && count > 0 ? styles.statValuePending : ""
                  }`}
                >
                  {count.toLocaleString(appLocale())}
                </strong>
                <span className={styles.statHint}>{t(filter.hint)}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.filterCard}>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหาเลขคำขอ / สินค้า / Lot")}
              style={{ width: 300 }}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onPressEnter={() => {
                setQ(searchInput.trim());
                setPage(1);
              }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                setQ(searchInput.trim());
                setPage(1);
              }}
            >
              {t("ค้นหา")}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={listQuery.isFetching}
              onClick={() => void listQuery.refetch()}
            >
              {t("รีเฟรช")}
            </Button>
          </Space>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.listHeader}>
            <div>
              <h3>{activeFilter?.key ? productionOutputStatusLabel(activeFilter.key) : activeFilter ? t("ทั้งหมด") : t("รายการคำขอ")}</h3>
              <p>
                {status === ProductionOutputRequestStatus.PENDING_APPROVAL
                  ? t("รายการที่ต้องรอหัวหน้าคลังอนุมัติ — กดแถวเพื่อดูรายละเอียด")
                  : status
                    ? t(activeFilter?.hint ?? "")
                    : t("แสดงทุกสถานะ — รายการรออนุมัติจะอยู่ด้านบนและถูกเน้นสี")}
              </p>
            </div>
          </div>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              onChange: setPage,
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
            }}
            scroll={{ x: 1100 }}
            locale={{
              emptyText:
                status === ProductionOutputRequestStatus.PENDING_APPROVAL
                  ? t("ไม่มีคำขอรออนุมัติ")
                  : t("ยังไม่มีคำขอรับผลผลิต"),
            }}
            rowClassName={(record) =>
              record.status === ProductionOutputRequestStatus.PENDING_APPROVAL
                ? `${styles.pendingRow} ${styles.clickableRow}`
                : styles.clickableRow
            }
            onRow={(record) => ({
              onClick: () =>
                router.push(
                  `/production/output-stock-requests/${record.id}`,
                ),
            })}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
