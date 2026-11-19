"use client";

import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DocumentApprovalsListPage from "@/components/common/DocumentApprovalsListPage";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useQuotationApprovalDecisionMutation } from "@/hooks/quotations/useQuotationMutations";
import {
  canAccessQuotationApprovals,
  usePendingQuotationApprovalsQuery,
} from "@/hooks/quotations/useQuotationsQuery";
import { formatMoney } from "@/lib/i18n/format";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { standardStatusColor } from "@/lib/status/standard-status";
import { quotationStatusLabel, type Quotation } from "@/types/quotations";

const formatDate = (value?: string) =>
  value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/BBBB") : "—";

/** สถานะที่ผู้อนุมัติกรองดูได้ — ค่าเริ่มต้น "รออนุมัติ" */
const STATUS_FILTER_VALUES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "NOT_APPROVED",
  "DRAFT",
] as const;

function statusColor(status: string): string {
  switch (status) {
    case "PENDING_APPROVAL":
      return standardStatusColor("PENDING_APPROVAL");
    case "APPROVED":
      return standardStatusColor("APPROVED");
    case "NOT_APPROVED":
      return standardStatusColor("REJECTED");
    default:
      return "default";
  }
}

/** /quotations/approvals — รายการใบเสนอราคารออนุมัติ (แนวเดียวกับ /purchase-requests/approvals) */
export default function QuotationApprovalsPage() {
  const t = useT();
  const lang = getStoredLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_APPROVAL");
  const perms = useScreenActionPermissions("QUOTATION_APPROVALS");
  const canAccess = canAccessQuotationApprovals();
  const canApprove = perms.canApprove;

  const query = usePendingQuotationApprovalsQuery({ status: statusFilter });
  const decision = useQuotationApprovalDecisionMutation();
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<Quotation> = useMemo(
    () => [
      {
        title: t("เลขที่ใบเสนอราคา"),
        dataIndex: "quotationNo",
        key: "quotationNo",
        align: "center",
      },
      {
        title: t("วันที่เอกสาร"),
        dataIndex: "quotationDate",
        key: "quotationDate",
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
    <DocumentApprovalsListPage<Quotation>
      title={t("รายการใบเสนอราคารออนุมัติ")}
      root={{ label: t("ใบเสนอราคา"), href: "/quotations" }}
      columns={columns}
      rows={rows}
      loading={query.isLoading}
      docNoOf={(row) => row.quotationNo}
      statusOf={(row) => String(row.status)}
      statusLabel={(status) => quotationStatusLabel(status, lang)}
      statusColor={statusColor}
      detailHref={(row) => `/quotations/${row.id}`}
      statusOptions={STATUS_FILTER_VALUES.map((value) => ({
        value,
        label: quotationStatusLabel(value, lang),
      }))}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      canAccess={canAccess}
      canApprove={canApprove}
      noAccessText={t(
        "คุณไม่มีสิทธิ์เข้าถึงหน้าอนุมัติใบเสนอราคา — ต้องเปิด QUOTATION_APPROVALS · VIEW หรือ APPROVE ที่หน้าผู้ใช้งาน → การอนุญาต",
      )}
      viewOnlyHint={t(
        "ดูรายการได้ — การอนุมัติ/ไม่อนุมัติ/ส่งกลับต้องเปิดสิทธิ์ QUOTATION_APPROVALS · APPROVE",
      )}
      onApprove={(row) => decision.mutateAsync({ id: row.id, action: "approve" })}
      onDecline={(row, kind, reason) =>
        decision.mutateAsync({ id: row.id, action: kind, reason })
      }
      pending={decision.isPending}
      approveConfirm={{
        title: (no) => t("อนุมัติใบเสนอราคา {no}?", { no }),
        content: t("อนุมัติแล้วฝ่ายขายส่งใบเสนอราคาให้ลูกค้าได้"),
      }}
      reasonTitles={{
        reject: t("ไม่อนุมัติใบเสนอราคา"),
        return: t("ส่งกลับให้ฝ่ายขายแก้ไข"),
      }}
    />
  );
}
