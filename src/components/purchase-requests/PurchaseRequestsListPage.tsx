"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
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
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { usePurchaseRequestsQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { userHasRole } from "@/lib/auth/session";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import {
  PURCHASE_REQUEST_STATUS_LABEL,
  purchaseRequestStatusLabel,
  type PurchaseRequest,
} from "@/types/purchase-requests";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import { formatErpDate } from "@/lib/datetime/erp-timezone";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import styles from "./PurchaseRequestsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

/** ร่าง กับ ที่ถูกส่งกลับแก้ไข แก้ไข/ส่งอนุมัติ ได้เหมือนกัน — ตรงกับ guard ฝั่ง backend */
const PR_EDITABLE_STATUSES: string[] = ["DRAFT", "REVISING"];

function statusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING_APPROVAL":
      return "warning";
    // ส่งกลับแก้ไข = ผู้ขอมีงานค้างต้องทำ ต้องต่างจากร่าง
    case "REVISING":
      return "orange";
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
  const t = useT();
  const lang = useLanguage();
  const [prNo, setPrNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [prDate, setPrDate] = useState<dayjs.Dayjs | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [applied, setApplied] = useState<{
    prNo?: string;
    status?: string;
    prDateFrom?: string;
    prDateTo?: string;
    itemIds?: string[];
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const itemsQuery = useItemsQuery({ isActive: true, isPurchaseItem: true });
  const catalogItems = itemsQuery.data?.data ?? [];

  const canAccessApprovals =
    hasPermission(
      "PURCHASE_REQUEST_APPROVALS.VIEW",
      "PURCHASE_REQUEST_APPROVALS.APPROVE",
    ) ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));

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
      itemIds: itemIds.length ? itemIds : undefined,
    });
  };

  const clearFilters = () => {
    setPrNo("");
    setStatus(undefined);
    setPrDate(null);
    setItemIds([]);
    setApplied({});
    setPage(1);
  };

  // โหลด generator แบบ dynamic — ไฟล์ pdf ใหญ่ ไม่ควรติดมากับ bundle ของหน้า list
  const handlePrintPdf = useCallback(async (row: PurchaseRequest) => {
    const { generatePurchaseRequestPdf } =
      await import("@/utils/generatePurchaseRequestPdf");
    generatePurchaseRequestPdf({
      prNo: row.prNo,
      requestBy: row.requestedBy?.displayName ?? "—",
      department: row.department?.nameTh ?? "—",
      requestDate: formatDate(row.prDate),
      requiredDate: formatDate(row.items?.[0]?.requiredDate) || "—",
      purchaseType: row.purchaseRequestType?.nameTh ?? "—",
      items: (row.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        unit: item.unitNameTh ?? item.unitCode ?? "—",
        qty: Number(item.quantity),
      })),
    });
  }, []);

  const columns: ColumnsType<PurchaseRequest> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบขอซื้อ"),
        dataIndex: "prNo",
        key: "prNo",
        render: (value: string, row) => {
          /*
            ใบขอซื้อใบเดียวแตกเป็นใบสั่งซื้อได้หลายใบตามเจ้าของสินค้า — สลับไปใช้
            สถานะฝั่งใบสั่งซื้อได้ต่อเมื่อสั่งครบทุกรายการแล้วเท่านั้น ไม่งั้นใบที่
            สั่งไป 2 จาก 5 จะดูเหมือนแปลงครบแล้วทั้งที่ยังค้างอยู่ในคิว
          */
          const items = row.items ?? [];
          const orderedCount = items.filter(
            (item) => item.orderedPurchaseOrder,
          ).length;
          const fullyOrdered =
            items.length > 0 && orderedCount === items.length;

          return (
            <div className={styles.prNoCell}>
              <DocNoWithFlowBadge
                no={<span className={styles.prNo}>{value}</span>}
                source={
                  fullyOrdered && row.linkedPurchaseOrder
                    ? {
                        kind: "po",
                        status: row.linkedPurchaseOrder.status,
                        paymentStatus: row.linkedPurchaseOrder.paymentStatus,
                      }
                    : { kind: "pr", status: row.status }
                }
              />
              {!fullyOrdered && orderedCount > 0 ? (
                <span className={styles.partialNote}>
                  {t("สั่งซื้อแล้ว {done} / {total} รายการ", {
                    done: orderedCount,
                    total: items.length,
                  })}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        title: t("วันออกเอกสาร"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 130,
        render: (value: string) => formatErpDate(value),
      },
      {
        title: t("วันที่ขอซื้อ"),
        dataIndex: "prDate",
        key: "prDate",
        width: 120,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ประเภทใบขอซื้อ"),
        key: "type",
        ellipsis: true,
        render: (_v, row) => row.purchaseRequestType?.nameTh ?? "—",
      },
      {
        title: t("ผู้ขอซื้อ"),
        key: "requestedBy",
        width: 140,
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: t("จำนวนรายการสั่งซื้อ"),
        key: "itemCount",
        width: 170,
        align: "center",
        render: (_v, row) => t("{n} รายการ", { n: row.items?.length ?? 0 }),
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 240,
        className: styles.itemColumn,
        render: (_v, row) => <CollapsibleItemList items={row.items ?? []} />,
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {purchaseRequestStatusLabel(value, lang)}
          </Tag>
        ),
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 100,
        align: "center",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={t("เมนูจัดการ {no}", { no: row.prNo })}
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: t("ดูรายละเอียด"),
                onClick: () => router.push(`/purchase-requests/${row.id}`),
              },
              {
                key: "pdf",
                icon: <FilePdfOutlined />,
                label: t("พิมพ์ PDF"),
                onClick: () => void handlePrintPdf(row),
              },
              PR_EDITABLE_STATUSES.includes(row.status) && {
                key: "edit",
                icon: <EditOutlined />,
                label: t("แก้ไข"),
                onClick: () => router.push(`/purchase-requests/${row.id}/edit`),
              },
            ]}
          />
        ),
      },
    ],
    [handlePrintPdf, lang, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Purchase Request"
        icon={<FileTextOutlined />}
        title={t("รายการใบขอซื้อ")}
        subtitle={t(
          "ดู ค้นหา และจัดการใบขอซื้อทั่วไป · สร้างใหม่แล้วส่งอนุมัติได้จากหน้ารายละเอียด",
        )}
        actions={
          <>
            {canAccessApprovals ? (
              <Link href="/purchase-requests/approvals">
                <Button
                  className={styles.secondaryBtn}
                  icon={<AuditOutlined />}
                >
                  {t("รออนุมัติ")}
                </Button>
              </Link>
            ) : null}
            <Link href="/purchase-requests/create">
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<PlusOutlined />}
              >
                {t("สร้างใบขอซื้อ")}
              </Button>
            </Link>
          </>
        }
      />

      <FilterCard
        onSearch={applyFilters}
        onClear={clearFilters}
        loading={query.isFetching}
      >
        <FilterField label={t("เลขที่ใบขอซื้อ")}>
          <Input
            allowClear
            placeholder={t("เช่น PR-20260718-001")}
            value={prNo}
            onChange={(e) => setPrNo(e.target.value)}
          />
        </FilterField>
        <FilterField label={t("วันที่ขอซื้อ")}>
          <DatePicker
            style={{ width: "100%" }}
            value={prDate}
            onChange={(value) => setPrDate(value)}
            format="DD/MM/YYYY"
            placeholder={t("เลือกวันที่")}
          />
        </FilterField>
        <FilterField label={t("สินค้า")}>
          <Select
            allowClear
            showSearch
            mode="multiple"
            maxTagCount="responsive"
            optionFilterProp="label"
            style={{ width: "100%" }}
            placeholder={t("เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก")}
            aria-label={t("สินค้า")}
            value={itemIds}
            onChange={(value) => setItemIds(value)}
            options={catalogItems.map((item) => ({
              value: item.id,
              label: `${item.itemCode} — ${item.itemNameTh}`,
            }))}
          />
        </FilterField>
        <FilterField label={t("สถานะเอกสาร")}>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder={t("ทั้งหมด")}
            value={status}
            onChange={(value) => setStatus(value)}
            options={Object.entries(PURCHASE_REQUEST_STATUS_LABEL).map(
              ([value]) => ({
                value,
                label: purchaseRequestStatusLabel(value, lang),
              }),
            )}
          />
        </FilterField>
      </FilterCard>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{total}</strong> {t("รายการ")}
          </div>
          <div className={styles.entriesBox}>
            <span>{t("แสดง")}</span>
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
            <span>{t("รายการ/หน้า")}</span>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          locale={{ emptyText: t("ยังไม่มีใบขอซื้อ") }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดง {from}–{to} จาก {total}", {
              from: total === 0 ? 0 : (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })}
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
