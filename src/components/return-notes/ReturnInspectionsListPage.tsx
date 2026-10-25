"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Pagination, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileSearchOutlined, SearchOutlined } from "@ant-design/icons";

import { usePendingInspectionsQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import type { ReturnNote } from "@/types/return-notes";
import styles from "./ReturnNotesListPage.module.css";

function formatQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

export default function ReturnInspectionsListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const query = usePendingInspectionsQuery({
    keyword: applied || undefined,
    page,
    limit,
  });
  const rows = query.data?.data?.items ?? [];
  const total = query.data?.data?.total ?? 0;

  const columns: ColumnsType<ReturnNote> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "no",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบคืน",
        dataIndex: "returnNoteNo",
        key: "returnNoteNo",
        width: 180,
      },
      {
        title: "ลูกค้า",
        dataIndex: "customerName",
        key: "customerName",
        ellipsis: true,
        render: (value?: string) => value || "—",
      },
      {
        title: "อ้างอิง",
        key: "refs",
        width: 240,
        render: (_: unknown, row) => (
          <div style={{ lineHeight: 1.4 }}>
            <div>{row.salesOrderNo ?? "—"}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.pickingNo ?? "—"}
              {row.deliveryOrderNo ? ` · ${row.deliveryOrderNo}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "จำนวนคืน",
        key: "totalReturnQty",
        width: 110,
        align: "right",
        render: (_: unknown, row) => formatQty(row.totalReturnQty),
      },
      {
        title: "สถานะ",
        key: "inspectionStatus",
        width: 140,
        render: () => (
          <span className={`${styles.statusPill} ${styles.statusInspection}`}>
            <span className={styles.statusDot} aria-hidden />
            รอตรวจสอบ
          </span>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 130,
        align: "center",
        render: (_: unknown, row) => (
          <button
            type="button"
            className={styles.inspectBtn}
            title="ตรวจสอบและคัดแยก"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/return-notes/inspections/${row.id}`);
            }}
          >
            <FileSearchOutlined />
            ตรวจสอบ
          </button>
        ),
      },
    ],
    [router, page, limit],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <h1 className={styles.pageTitle}>รอตรวจสอบ</h1>
          <p className={styles.pageSubtitle}>
            สินค้าที่รับเข้าคลังตรวจสอบแล้ว รอคัดแยกของดีและของเสีย
          </p>
        </div>
      </header>

      <div className={styles.filterCard}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="ค้นหาเลขที่ใบคืน ลูกค้า หรือ SO"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => {
            setPage(1);
            setApplied(keyword.trim());
          }}
          style={{ maxWidth: 360 }}
          aria-label="ค้นหารายการรอตรวจสอบ"
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={query.isLoading}
        pagination={false}
        onRow={(row) => ({
          onClick: () => router.push(`/return-notes/inspections/${row.id}`),
          style: { cursor: "pointer" },
        })}
      />
      <div style={{ marginTop: 16 }}>
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          showSizeChanger
          onChange={(nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          }}
        />
      </div>
    </div>
  );
}
