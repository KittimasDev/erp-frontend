"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, DatePicker, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePackingsQuery, useReadyPickingsForPackingQuery } from "@/hooks/packings/usePackingsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { Packing } from "@/types/packings";
import { PACKING_STATUS_LABEL, packingStatusColor, packingStatusLabel } from "@/types/packings";
import styles from "./PackingsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

export default function PackingsListPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    keyword?: string;
    status?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const packingActions = useScreenActionPermissions("PACKINGS");
  const canAdd = packingActions.canAdd;
  const canEdit = packingActions.canEdit;

  const customersQuery = useCustomersQuery();
  const query = usePackingsQuery(applied);
  const readyPickingsQuery = useReadyPickingsForPackingQuery();
  const rows = query.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const readyCount = readyPickingsQuery.data?.data?.length ?? 0;

  const columns: ColumnsType<Packing> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 10 + index + 1,
      },
      {
        title: t("เลขที่"),
        dataIndex: "packingNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: t("ใบจ่ายสินค้า"),
        dataIndex: "pickingNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("ใบสั่งขาย"),
        dataIndex: "salesOrderNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("ลูกค้า"),
        dataIndex: "customerName",
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("วันที่"),
        dataIndex: "packingDate",
        width: 110,
        render: formatDate,
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag color={packingStatusColor(v)}>{packingStatusLabel(v)}</Tag>
        ),
      },
      {
        title: t("สร้างโดย"),
        dataIndex: "createdByName",
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("ยืนยันเมื่อ"),
        dataIndex: "confirmedAt",
        width: 140,
        render: (v?: string) =>
          v ? dayjs(v).format("DD/MM/BBBB HH:mm") : "—",
      },
      {
        title: "",
        key: "actions",
        width: 100,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/packings/${row.id}`)}
            />
            {canEdit && row.status === "DRAFT" ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => router.push(`/packings/${row.id}/edit`)}
              />
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Packing"
        icon={<InboxOutlined />}
        title={t("ใบบรรจุสินค้า")}
        subtitle={t("บรรจุสินค้าจากใบจ่ายสินค้าที่ยืนยันแล้ว — ไม่กระทบสต๊อก")}
        actions={
          <>
{canAdd ? (
            <Link href="/packings/create-from-picking">
              <Badge count={readyCount} overflowCount={99} offset={[-4, 4]}>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<PlusOutlined />}
                >
                  {t("สร้างจากใบจ่ายสินค้า")}
                </Button>
              </Badge>
            </Link>
          ) : null}
          </>
        }
      />

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("เลขที่ / ลูกค้า")}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(PACKING_STATUS_LABEL).map(([value]) => ({
                value,
                label: packingStatusLabel(value),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ลูกค้า")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              value={customerId}
              onChange={setCustomerId}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่")}</label>
            <DatePicker
              value={date}
              onChange={setDate}
              format="DD/MM/BBBB"
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setKeyword("");
              setStatus(undefined);
              setCustomerId(undefined);
              setDate(null);
              setApplied({});
            }}
          >
            {t("เคลียร์")}
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() =>
              setApplied({
                keyword: keyword.trim() || undefined,
                status,
                customerId,
                dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
                dateTo: date ? date.format("YYYY-MM-DD") : undefined,
              })
            }
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
          onRow={(row) => ({
            onClick: () => router.push(`/packings/${row.id}`),
          })}
          locale={{ emptyText: t("ยังไม่มีใบบรรจุสินค้า") }}
        />
      </section>
    </div>
  );
}
