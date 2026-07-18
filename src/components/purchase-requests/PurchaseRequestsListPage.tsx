"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AuditOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePurchaseRequestsQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { generatePurchaseRequestPdf } from "@/utils/generatePurchaseRequestPdf";
import type { PurchaseRequest } from "@/types/purchase-requests";
import {
  PURCHASE_REQUEST_STATUS_LABEL,
  type PurchaseRequestStatus,
} from "@/types/purchase-requests";
import styles from "./PurchaseRequestsListPage.module.css";

function statusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING_APPROVAL":
      return "warning";
    case "REJECTED":
      return "error";
    case "CANCELLED":
      return "default";
    default:
      return "processing";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function PurchaseRequestsListPage() {
  const router = useRouter();
  const [prNo, setPrNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [prDate, setPrDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    prNo?: string;
    status?: string;
    prDateFrom?: string;
    prDateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const canApprove =
    userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator();

  const query = usePurchaseRequestsQuery({
    ...applied,
    page,
    limit,
  });

  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const applyFilters = () => {
    setPage(1);
    setApplied({
      prNo: prNo.trim() || undefined,
      status,
      prDateFrom: prDate ? prDate.format("YYYY-MM-DD") : undefined,
      prDateTo: prDate ? prDate.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setPrNo("");
    setStatus(undefined);
    setPrDate(null);
    setApplied({});
    setPage(1);
  };

  const columns: ColumnsType<PurchaseRequest> = useMemo(
    () => [
      {
        title: "#",
        key: "no",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบขอซื้อ",
        dataIndex: "prNo",
        key: "prNo",
        render: (value: string) => (
          <span className={styles.prNo}>{value}</span>
        ),
      },
      {
        title: "วันที่ขอซื้อ",
        dataIndex: "prDate",
        key: "prDate",
        width: 120,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ประเภท",
        key: "type",
        ellipsis: true,
        render: (_v, row) => row.purchaseRequestType?.nameTh ?? "—",
      },
      {
        title: "ผู้ขอ",
        key: "requestedBy",
        width: 140,
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: "รายการ",
        key: "itemCount",
        width: 90,
        align: "center",
        render: (_v, row) => `${row.items?.length ?? 0} รายการ`,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {PURCHASE_REQUEST_STATUS_LABEL[value as PurchaseRequestStatus] ??
              value}
          </Tag>
        ),
      },
      {
        title: "จัดการ",
        key: "action",
        width: 140,
        align: "center",
        render: (_v, row) => (
          <Space size={6}>
            <button
              className={styles.actionBtn}
              type="button"
              title="ดูรายละเอียด"
              onClick={() => router.push(`/purchase-requests/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            <button
              className={styles.actionBtn}
              type="button"
              title="พิมพ์ PDF"
              onClick={() =>
                generatePurchaseRequestPdf({
                  prNo: row.prNo,
                  requestBy: row.requestedBy?.displayName ?? "—",
                  department: row.department?.nameTh ?? "—",
                  requestDate: formatDate(row.prDate),
                  requiredDate:
                    formatDate(row.items?.[0]?.requiredDate) || "—",
                  purchaseType: row.purchaseRequestType?.nameTh ?? "—",
                  items: (row.items ?? []).map((item, index) => ({
                    no: index + 1,
                    itemCode: item.itemCode ?? "—",
                    itemName: item.itemNameTh ?? item.description ?? "—",
                    unit: item.unitNameTh ?? item.unitCode ?? "—",
                    qty: Number(item.quantity),
                  })),
                })
              }
            >
              <FilePdfOutlined />
            </button>
            {row.status === "DRAFT" ? (
              <button
                className={styles.actionBtn}
                type="button"
                title="แก้ไข"
                onClick={() =>
                  router.push(`/purchase-requests/${row.id}/edit`)
                }
              >
                <EditOutlined />
              </button>
            ) : null}
          </Space>
        ),
      },
    ],
    [limit, page, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Request</p>
          <h1 className={styles.pageTitle}>รายการใบขอซื้อ</h1>
          <p className={styles.pageSubtitle}>
            ดู ค้นหา และจัดการใบขอซื้อทั่วไป · สร้างใหม่แล้วส่งอนุมัติได้จากหน้ารายละเอียด
          </p>
        </div>
        <div className={styles.headerActions}>
          {canApprove ? (
            <Link href="/purchase-requests/approvals">
              <Button className={styles.secondaryBtn} icon={<AuditOutlined />}>
                รออนุมัติ
              </Button>
            </Link>
          ) : null}
          <Link href="/purchase-requests/create">
            <Button
              className={styles.primaryBtn}
              type="primary"
              icon={<PlusOutlined />}
            >
              สร้างใบขอซื้อ
            </Button>
          </Link>
        </div>
      </header>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ใบขอซื้อ</label>
            <Input
              allowClear
              placeholder="เช่น PR-20260718-001"
              value={prNo}
              onChange={(e) => setPrNo(e.target.value)}
              onPressEnter={applyFilters}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่ขอซื้อ</label>
            <DatePicker
              style={{ width: "100%" }}
              value={prDate}
              onChange={(value) => setPrDate(value)}
              format="DD/MM/YYYY"
              placeholder="เลือกวันที่"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะเอกสาร</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="ทั้งหมด"
              value={status}
              onChange={(value) => setStatus(value)}
              options={Object.entries(PURCHASE_REQUEST_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={applyFilters}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{total}</strong> รายการ
          </div>
          <div className={styles.entriesBox}>
            <span>แสดง</span>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <span>รายการ/หน้า</span>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          locale={{ emptyText: "ยังไม่มีใบขอซื้อ" }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            แสดง {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} จาก {total}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={false}
            onChange={(next) => setPage(next)}
          />
        </div>
      </section>
    </div>
  );
}
