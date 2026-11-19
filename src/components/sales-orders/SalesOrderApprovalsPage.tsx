"use client";

import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DocumentApprovalsListPage from "@/components/common/DocumentApprovalsListPage";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useSalesOrderApprovalDecisionMutation } from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  canAccessSalesOrderApprovals,
  usePendingSalesOrderApprovalsQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { formatMoney } from "@/lib/i18n/format";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  salesOrderStatusColor,
  salesOrderStatusLabel,
  type SalesOrder,
} from "@/types/sales-orders";

const formatDate = (value?: string) =>
  value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/BBBB") : "—";

/** สถานะที่ผู้อนุมัติกรองดูได้ — ค่าเริ่มต้น "รออนุมัติ" */
const STATUS_FILTER_VALUES = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "REJECTED",
  "DRAFT",
] as const;

/** /sales-orders/approvals — รายการใบสั่งขายรออนุมัติ (แนวเดียวกับ /purchase-requests/approvals) */
export default function SalesOrderApprovalsPage() {
  const t = useT();
  const lang = getStoredLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_APPROVAL");
  const perms = useScreenActionPermissions("SALES_ORDER_APPROVALS");
  const canAccess = canAccessSalesOrderApprovals();
  const canApprove = perms.canApprove;

  const query = usePendingSalesOrderApprovalsQuery({ status: statusFilter });
  const decision = useSalesOrderApprovalDecisionMutation();
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<SalesOrder> = useMemo(
    () => [
      {
        title: t("เลขที่ใบสั่งขาย"),
        dataIndex: "soNo",
        key: "soNo",
        align: "center",
      },
      {
        title: t("วันที่เอกสาร"),
        dataIndex: "soDate",
        key: "soDate",
        align: "center",
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ลูกค้า"),
        key: "customer",
        render: (_v, row) => row.customer?.nameTh ?? "—",
      },
      {
        title: t("ยอดรวม"),
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        render: (value: string) => formatMoney(Number(value ?? 0), lang),
      },
      {
        title: t("ผู้สร้าง"),
        key: "createdBy",
        align: "center",
        render: (_v, row) => row.createdBy?.displayName ?? "—",
      },
    ],
    [lang, t],
  );

  return (
    <DocumentApprovalsListPage<SalesOrder>
      title={t("รายการใบสั่งขายรออนุมัติ")}
      root={{ label: t("ใบสั่งขาย"), href: "/sales-orders" }}
      columns={columns}
      rows={rows}
      loading={query.isLoading}
      docNoOf={(row) => row.soNo}
      statusOf={(row) => String(row.status)}
      statusLabel={(status) => salesOrderStatusLabel(status, lang)}
      statusColor={salesOrderStatusColor}
      detailHref={(row) => `/sales-orders/${row.id}`}
      statusOptions={STATUS_FILTER_VALUES.map((value) => ({
        value,
        label: salesOrderStatusLabel(value, lang),
      }))}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      canAccess={canAccess}
      canApprove={canApprove}
      noAccessText={t(
        "คุณไม่มีสิทธิ์เข้าถึงหน้าอนุมัติใบสั่งขาย — ต้องเปิด SALES_ORDER_APPROVALS · VIEW หรือ APPROVE ที่หน้าผู้ใช้งาน → การอนุญาต",
      )}
      viewOnlyHint={t(
        "ดูรายการได้ — การอนุมัติ/ไม่อนุมัติ/ส่งกลับต้องเปิดสิทธิ์ SALES_ORDER_APPROVALS · APPROVE",
      )}
      onApprove={(row) =>
        decision.mutateAsync({
          id: row.id,
          expectedVersion: row.editVersion,
          action: "approve",
        })
      }
      onDecline={(row, kind, reason) =>
        decision.mutateAsync({
          id: row.id,
          expectedVersion: row.editVersion,
          action: kind,
          reason,
        })
      }
      pending={decision.isPending}
      approveConfirm={{
        title: (no) => t("อนุมัติใบสั่งขาย {no}?", { no }),
        content: t(
          "อนุมัติ = ยืนยันใบสั่งขายส่งคลัง ระบบตรวจวงเงินเครดิต หลักฐานแนบ และงวดจัดส่งอีกครั้ง",
        ),
      }}
      reasonTitles={{
        reject: t("ไม่อนุมัติใบสั่งขาย"),
        return: t("ส่งกลับให้ฝ่ายขายแก้ไข"),
      }}
    />
  );
}
