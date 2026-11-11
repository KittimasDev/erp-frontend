"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Pagination, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileSearchOutlined, SearchOutlined } from "@ant-design/icons";

import { usePendingInspectionsQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import type { ReturnNote } from "@/types/return-notes";
import styles from "./ReturnNotesListPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import { useT } from "@/lib/i18n/useT";

function formatQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

export default function ReturnInspectionsListPage() {
  const t = useT();
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
        title: t("ลำดับ"),
        key: "no",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบคืน"),
        dataIndex: "returnNoteNo",
        key: "returnNoteNo",
        width: 180,
      },
      {
        title: t("ลูกค้า"),
        dataIndex: "customerName",
        key: "customerName",
        ellipsis: true,
        render: (value?: string) => value || "—",
      },
      {
        title: t("อ้างอิง"),
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
        title: t("จำนวนคืน"),
        key: "totalReturnQty",
        width: 110,
        align: "right",
        render: (_: unknown, row) => formatQty(row.totalReturnQty),
      },
      {
        title: t("สถานะ"),
        key: "inspectionStatus",
        width: 140,
        render: () => (
          <span className={`${styles.statusPill} ${styles.statusInspection}`}>
            <span className={styles.statusDot} aria-hidden />
            {t("รอตรวจสอบ")}
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
            title={t("ตรวจสอบและคัดแยก")}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/return-notes/inspections/${row.id}`);
            }}
          >
            <FileSearchOutlined />
            {t("ตรวจสอบ")}
          </button>
        ),
      },
    ],
    [router, page, limit, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("รอตรวจสอบ")}
        subtitle={t("สินค้าที่รับเข้าคลังตรวจสอบแล้ว รอคัดแยกของดีและของเสีย")}
      />

      <FilterCard
        onSearch={() => {
          setPage(1);
          setApplied(keyword.trim());
        }}
        onClear={() => {
          setPage(1);
          setKeyword("");
          setApplied("");
        }}
        loading={query.isFetching}
      >
        <FilterField label={t("ค้นหา")} wide>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t("ค้นหาเลขที่ใบคืน ลูกค้า หรือ SO")}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label={t("ค้นหารายการรอตรวจสอบ")}
          />
        </FilterField>
      </FilterCard>

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
