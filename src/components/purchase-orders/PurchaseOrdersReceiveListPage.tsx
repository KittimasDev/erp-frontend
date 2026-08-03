"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  InboxOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePurchaseOrdersQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { PurchaseOrder } from "@/types/purchase-orders";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import styles from "./PurchaseOrdersListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function remainingLines(po: PurchaseOrder) {
  return (po.items ?? []).length;
}

export default function PurchaseOrdersReceiveListPage() {
  const router = useRouter();
  const [poNo, setPoNo] = useState("");
  const [appliedPoNo, setAppliedPoNo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const limit = 20;

  const canReceive =
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    isAdministrator();

  const confirmedQuery = usePurchaseOrdersQuery({
    status: "CONFIRMED",
    poNo: appliedPoNo,
    page: 1,
    limit: 100,
  });
  const partialQuery = usePurchaseOrdersQuery({
    status: "PARTIALLY_RECEIVED",
    poNo: appliedPoNo,
    page: 1,
    limit: 100,
  });

  const rows = useMemo(() => {
    const merged = [
      ...(confirmedQuery.data?.data.items ?? []),
      ...(partialQuery.data?.data.items ?? []),
    ];
    merged.sort((a, b) => b.poDate.localeCompare(a.poDate));
    return merged;
  }, [confirmedQuery.data?.data.items, partialQuery.data?.data.items]);

  const paged = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page]);

  const loading = confirmedQuery.isLoading || partialQuery.isLoading;

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (value: string, record) => (
        <Link href={`/purchase-orders/${record.id}`}>{value}</Link>
      ),
    },
    {
      title: "วันที่",
      dataIndex: "poDate",
      width: 120,
      render: formatDate,
    },
    {
      title: "ผู้ขาย",
      render: (_, record) => record.creditor?.nameTh ?? "—",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 140,
      render: (status: string) => (
        <Tag color={status === "CONFIRMED" ? "success" : "processing"}>
          {PURCHASE_ORDER_STATUS_LABEL[status] ?? status}
        </Tag>
      ),
    },
    {
      title: "รายการ",
      width: 90,
      align: "right",
      render: (_, record) => remainingLines(record),
    },
    {
      title: "ยอดรวม",
      dataIndex: "totalAmount",
      width: 130,
      align: "right",
      render: formatMoney,
    },
    {
      title: "",
      width: 120,
      render: (_, record) =>
        canReceive ? (
          <Button
            type="primary"
            size="small"
            icon={<InboxOutlined />}
            onClick={() =>
              router.push(`/purchase-orders/${record.id}/receive`)
            }
          >
            รับของ
          </Button>
        ) : null,
    },
  ];

  if (!canReceive) {
    return (
      <div className={styles.page}>
        <section className={styles.tableCard} style={{ padding: 24 }}>
          หน้านี้สำหรับเจ้าหน้าที่คลังเท่านั้น
          <div style={{ marginTop: 12 }}>
            <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Warehouse Receiving</p>
          <h1 className={styles.pageTitle}>รับของจากใบสั่งซื้อ</h1>
          <p className={styles.pageSubtitle}>
            เลือก PO ที่ยืนยันแล้วหรือรับบางส่วน เพื่อบันทึกรับเข้าคลัง
          </p>
        </div>
      </header>

      <section className={styles.filterCard}>
        <Space wrap>
          <Input
            allowClear
            placeholder="ค้นเลขที่ PO"
            value={poNo}
            onChange={(e) => setPoNo(e.target.value)}
            onPressEnter={() => {
              setAppliedPoNo(poNo.trim() || undefined);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() => {
              setAppliedPoNo(poNo.trim() || undefined);
              setPage(1);
            }}
          >
            ค้นหา
          </Button>
        </Space>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={paged}
          className={styles.table}
          pagination={{
            current: page,
            pageSize: limit,
            total: rows.length,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </section>
    </div>
  );
}
