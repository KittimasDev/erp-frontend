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
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useSubmitPurchaseOrderMutation } from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrdersQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { usePurchaseOrdersPendingFromPrQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import {
  getScreenActionPermissions,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { PurchaseOrder } from "@/types/purchase-orders";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import type { PurchaseRequest } from "@/types/purchase-requests";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import styles from "./PurchaseOrdersListPage.module.css";

/** ร่าง กับ ที่ถูกส่งกลับแก้ไข ทำอย่างเดียวกันได้ทั้งคู่ — ให้ตรงกับ guard ฝั่ง backend */
const PO_EDITABLE_STATUSES: string[] = ["DRAFT", "REVISING"];

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      return "success";
    case "PENDING_APPROVAL":
      return "gold";
    // ส่งกลับแก้ไข = มีงานค้างต้องทำ ใช้สีส้มให้ต่างจากร่าง (processing)
    case "REVISING":
      return "orange";
    case "DRAFT":
    case "PARTIALLY_RECEIVED":
      return "processing";
    case "REJECTED":
      return "error";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}

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

export default function PurchaseOrdersListPage() {
  const router = useRouter();
  const [poNo, setPoNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [poDate, setPoDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    poNo?: string;
    status?: string;
    poDateFrom?: string;
    poDateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pendingPage, setPendingPage] = useState(1);
  const pendingLimit = 10;

  const poActions = getScreenActionPermissions("PURCHASE_ORDERS");
  const legacyWrite =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const matrixMode = isMatrixPermissionMode();
  const canCreatePo = matrixMode ? poActions.canAdd : legacyWrite;
  const canEditPo = matrixMode ? poActions.canEdit : legacyWrite;

  const submitMutation = useSubmitPurchaseOrderMutation();

  const query = usePurchaseOrdersQuery({ ...applied, page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const pendingQuery = usePurchaseOrdersPendingFromPrQuery({
    page: pendingPage,
    limit: pendingLimit,
  });
  const pendingPrs = pendingQuery.data?.data.items ?? [];
  const pendingTotal = pendingQuery.data?.data.total ?? 0;

  const pendingColumns: ColumnsType<PurchaseRequest> = useMemo(
    () => [
      {
        title: "#",
        key: "no",
        width: 56,
        align: "center",
        render: (_v, _r, index) =>
          (pendingPage - 1) * pendingLimit + index + 1,
      },
      {
        title: "เลขที่ใบขอซื้อ",
        dataIndex: "prNo",
        key: "prNo",
        render: (value: string) => (
          <DocNoWithFlowBadge
            no={<span className={styles.prNo}>{value}</span>}
            source={{ kind: "pr", status: "APPROVED" }}
          />
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
        key: "status",
        width: 120,
        render: () => <Tag color="success">อนุมัติแล้ว</Tag>,
      },
      {
        title: "จัดการ",
        key: "action",
        width: canCreatePo ? 190 : 72,
        align: "center",
        fixed: "right",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={`เมนูจัดการ ${row.prNo}`}
            primary={
              canCreatePo ? (
                <Button
                  type="primary"
                  size="small"
                  className={styles.createPoBtn}
                  icon={<ShoppingCartOutlined />}
                  onClick={() =>
                    router.push(`/purchase-orders/create-from-pr/${row.id}`)
                  }
                >
                  สร้างใบสั่งซื้อ
                </Button>
              ) : null
            }
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "ดูใบขอซื้อ",
                onClick: () => router.push(`/purchase-requests/${row.id}`),
              },
            ]}
          />
        ),
      },
    ],
    [canCreatePo, pendingPage, router],
  );

  const columns: ColumnsType<PurchaseOrder> = useMemo(
    () => [
      {
        title: "#",
        key: "no",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบสั่งซื้อ",
        dataIndex: "poNo",
        key: "poNo",
        render: (value: string, row) => (
          <DocNoWithFlowBadge
            no={<span className={styles.prNo}>{value}</span>}
            source={{
              kind: "po",
              status: row.status,
              paymentStatus: row.paymentStatus,
            }}
          />
        ),
      },
      {
        title: "วันที่",
        dataIndex: "poDate",
        key: "poDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ผู้ขาย",
        key: "creditor",
        ellipsis: true,
        render: (_v, row) => row.creditor?.nameTh ?? "—",
      },
      {
        title: "อ้างอิง PR",
        key: "pr",
        width: 150,
        render: (_v, row) => row.purchaseRequest?.prNo ?? "—",
      },
      {
        title: "ยอดรวม",
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {PURCHASE_ORDER_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "จัดการ",
        key: "action",
        width: 100,
        align: "center",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={`เมนูจัดการ ${row.poNo}`}
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "ดูรายละเอียด",
                onClick: () => router.push(`/purchase-orders/${row.id}`),
              },
              canEditPo &&
                PO_EDITABLE_STATUSES.includes(row.status) && {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "แก้ไข",
                  onClick: () =>
                    router.push(`/purchase-orders/${row.id}/edit`),
                },
              canEditPo &&
                PO_EDITABLE_STATUSES.includes(row.status) && {
                  key: "submit",
                  icon: <SendOutlined />,
                  label: "ส่งอนุมัติ",
                  onClick: () => submitMutation.mutate(row.id),
                  confirm: {
                    title: `ส่งใบสั่งซื้อ ${row.poNo} ให้หัวหน้าอนุมัติ?`,
                    content:
                      "ส่งแล้วจะแก้ไขไม่ได้จนกว่าหัวหน้าจะส่งกลับให้แก้ไข",
                    okText: "ส่งอนุมัติ",
                  },
                },
            ]}
          />
        ),
      },
    ],
    [canEditPo, limit, page, router, submitMutation],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Order</p>
          <h1 className={styles.pageTitle}>รายการใบสั่งซื้อ</h1>
          <p className={styles.pageSubtitle}>
            หลังอนุมัติใบขอซื้อ รายการจะขึ้นด้านบนเพื่อสร้างใบสั่งซื้อ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/purchase-requests">
            <Button className={styles.secondaryBtn}>ไปที่ใบขอซื้อ</Button>
          </Link>
        </div>
      </header>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <ShoppingCartOutlined className={styles.pendingIcon} />
            ใบขอซื้อรอสร้างใบสั่งซื้อ <strong>{pendingTotal}</strong> รายการ
          </div>
        </div>

        <Table
          rowKey="id"
          columns={pendingColumns}
          dataSource={pendingPrs}
          loading={pendingQuery.isLoading}
          pagination={false}
          className={`${styles.table} ${styles.pendingTable}`}
          scroll={{ x: 950 }}
          locale={{
            emptyText: "ยังไม่มีใบขอซื้อที่อนุมัติแล้วรอสร้างใบสั่งซื้อ",
          }}
          onRow={(row) =>
            canCreatePo
              ? {
                  onDoubleClick: () =>
                    router.push(`/purchase-orders/create-from-pr/${row.id}`),
                  style: { cursor: "pointer" },
                  title: "ดับเบิลคลิกเพื่อสร้างใบสั่งซื้อ",
                }
              : {}
          }
        />

        {pendingTotal > pendingLimit ? (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              แสดง{" "}
              {pendingTotal === 0
                ? 0
                : (pendingPage - 1) * pendingLimit + 1}
              –{Math.min(pendingPage * pendingLimit, pendingTotal)} จาก{" "}
              {pendingTotal}
            </div>
            <Pagination
              size="small"
              current={pendingPage}
              total={pendingTotal}
              pageSize={pendingLimit}
              showSizeChanger={false}
              onChange={setPendingPage}
            />
          </div>
        ) : null}
      </section>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ใบสั่งซื้อ</label>
            <Input
              allowClear
              placeholder="เช่น PO-20260718-001"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่</label>
            <DatePicker
              style={{ width: "100%" }}
              value={poDate}
              onChange={setPoDate}
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              options={[
                { value: "DRAFT", label: "ร่าง" },
                { value: "REVISING", label: "แก้ไข" },
                { value: "PENDING_APPROVAL", label: "รออนุมัติ" },
                { value: "CONFIRMED", label: "อนุมัติแล้ว · รอส่งสินค้า" },
                { value: "PARTIALLY_RECEIVED", label: "รับของบางส่วน" },
                { value: "COMPLETED", label: "รับครบแล้ว" },
                { value: "REJECTED", label: "ไม่อนุมัติ" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setPoNo("");
              setStatus(undefined);
              setPoDate(null);
              setApplied({});
              setPage(1);
            }}
          >
            เคลียร์
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              setApplied({
                poNo: poNo.trim() || undefined,
                status,
                poDateFrom: poDate ? poDate.format("YYYY-MM-DD") : undefined,
                poDateTo: poDate ? poDate.format("YYYY-MM-DD") : undefined,
              });
            }}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            ใบสั่งซื้อทั้งหมด <strong>{total}</strong> รายการ
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
          locale={{ emptyText: "ยังไม่มีใบสั่งซื้อ" }}
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
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
