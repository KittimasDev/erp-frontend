"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Popconfirm, Select, Table, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCancelProductionOrderMutation } from "@/hooks/production-orders/useProductionOrderMutations";
import { useProductionOrdersQuery } from "@/hooks/production-orders/useProductionOrderQueries";
import type { ProductionOrder } from "@/types/production-order";
import {
  PRODUCTION_ORDER_STATUS_COLOR,
  PRODUCTION_ORDER_STATUS_LABEL,
  ProductionOrderStatus,
  tPoLabel,
} from "@/types/production-order";
import { formatProductionDateRange } from "@/utils/formatProductionDateRange";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

export default function ProductionOrdersListPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const orderActions = useScreenActionPermissions("PRODUCTION_ORDERS");
  const canOperate =
    orderActions.canEdit || orderActions.canAdd || orderActions.canApprove;
  const cancelMutation = useCancelProductionOrderMutation();

  const [draftOrderNo, setDraftOrderNo] = useState("");
  const [draftStatus, setDraftStatus] = useState<string | undefined>();
  const [orderNo, setOrderNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const applyFilters = () => {
    setOrderNo(draftOrderNo);
    setStatus(draftStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftOrderNo("");
    setDraftStatus(undefined);
    setOrderNo("");
    setStatus(undefined);
    setPage(1);
  };

  const queryParams = useMemo(
    () => ({
      orderNo: orderNo.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [orderNo, status, page],
  );

  const listQuery = useProductionOrdersQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;

  const pageSize = 20;

  const columns: ColumnsType<ProductionOrder> = [
    {
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t("เลขที่ใบสั่งผลิต"),
      dataIndex: "orderNo",
      key: "orderNo",
      render: (value: string, row) => (
        <button
          type="button"
          className={masterStyles.codeBadge}
          style={{ border: 0, cursor: "pointer" }}
          onClick={() => router.push(`/production/production-orders/${row.id}`)}
        >
          {value}
        </button>
      ),
    },
    {
      title: "Batch",
      dataIndex: "batchNo",
      key: "batchNo",
      render: (value?: string) => value || "-",
    },
    {
      title: t("วันที่ผลิต"),
      key: "productionDate",
      render: (_: unknown, row: ProductionOrder) =>
        formatProductionDateRange(row.productionDate, row.productionDateEnd),
    },
    {
      title: t("Cycle เป้าหมาย (ชม.)"),
      dataIndex: "cycleTargetHours",
      key: "cycleTargetHours",
      align: "right",
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={PRODUCTION_ORDER_STATUS_COLOR[value] ?? "default"}>
          {PRODUCTION_ORDER_STATUS_LABEL[value]
            ? tPoLabel(PRODUCTION_ORDER_STATUS_LABEL[value], lang)
            : value}
        </Tag>
      ),
    },
    {
      title: t("เริ่มผลิต"),
      dataIndex: "startedAt",
      key: "startedAt",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/BBBB HH:mm") : "-",
    },
    {
      title: t("เสร็จสิ้น"),
      dataIndex: "completedAt",
      key: "completedAt",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/BBBB HH:mm") : "-",
    },
    {
      title: "",
      key: "actions",
      width: 120,
      align: "right",
      render: (_v, row) =>
        canOperate && row.status === ProductionOrderStatus.DRAFT ? (
          <Popconfirm
            title={t("ยกเลิกใบสั่งผลิต?")}
            description={t("ยกเลิกได้เฉพาะใบที่ยังไม่เริ่มผลิต")}
            okText={t("ยกเลิกใบ")}
            cancelText={t("ปิด")}
            okButtonProps={{ danger: true }}
            onConfirm={() => cancelMutation.mutate({ id: row.id })}
          >
            <Button
              danger
              size="small"
              loading={
                cancelMutation.isPending && cancelMutation.variables?.id === row.id
              }
            >
              {t("ยกเลิก")}
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="PRODUCTION · PYROLYSIS"
          title={t("ใบสั่งผลิต (Pyrolysis)")}
          subtitle={t("สร้าง / เริ่มผลิต / บันทึกผล / ขอรับผลผลิตเข้าคลัง")}
          actions={
            <>
<Button
            type="primary"
            className={masterStyles.createButton}
            icon={<PlusOutlined className={masterStyles.plusIcon} />}
            onClick={() => router.push("/production/production-orders/create")}
          >
            {t("สร้างใบสั่งผลิต")}
          </Button>
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
          <FilterField label={t("เลขที่ใบสั่งผลิต")}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหาเลขที่ใบสั่งผลิต")}
              value={draftOrderNo}
              onChange={(e) => setDraftOrderNo(e.target.value)}
            />
          </FilterField>
          <FilterField label={t("สถานะ")}>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("สถานะทั้งหมด")}
              value={draftStatus}
              onChange={setDraftStatus}
              options={Object.entries(PRODUCTION_ORDER_STATUS_LABEL).map(
                ([value, label]) => ({ value, label: tPoLabel(label, lang) }),
              )}
            />
          </FilterField>
        </FilterCard>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t("ใบสั่งผลิต")}</h3>
            </div>
            <span className={masterStyles.tableCount}>
              {lang === "en" ? `${total} orders` : `${total} ใบ`}
            </span>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showTotal: (n) => t("ทั้งหมด {n} รายการ", { n }),
            }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
