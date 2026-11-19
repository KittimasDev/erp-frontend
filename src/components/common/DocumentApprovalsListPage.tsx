"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Breadcrumb, Button, Pagination, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseCircleOutlined,
  EyeOutlined,
  RollbackOutlined,
} from "@ant-design/icons";

import ApprovalReasonModal, {
  type ApprovalReasonKind,
} from "@/components/common/ApprovalReasonModal";
import PageHeader from "@/components/common/PageHeader";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import styles from "@/components/purchase-requests/purchase-request.module.css";
import { useT } from "@/lib/i18n/useT";

const PENDING = "PENDING_APPROVAL";
const PAGE_SIZE = 10;

type Props<T extends { id: string }> = {
  title: string;
  /** breadcrumb ราก เช่น ใบเสนอราคา → /quotations */
  root: { label: string; href: string };
  /** คอลัมน์เฉพาะเอกสาร (เลขที่ วันที่ ลูกค้า ยอดรวม ผู้สร้าง ...) — ลำดับ/สถานะ/จัดการ เพิ่มให้เอง */
  columns: ColumnsType<T>;
  rows: T[];
  loading: boolean;
  docNoOf: (row: T) => string;
  statusOf: (row: T) => string;
  statusLabel: (status: string) => string;
  statusColor: (status: string) => string;
  detailHref: (row: T) => string;
  /** ตัวเลือกกรองสถานะ — ค่าแรก "ทั้งหมดที่เกี่ยวกับการอนุมัติ" ไม่ต้องใส่ ใช้ PENDING_APPROVAL เป็นค่าเริ่มต้น */
  statusOptions: Array<{ value: string; label: string }>;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  canAccess: boolean;
  canApprove: boolean;
  noAccessText: string;
  viewOnlyHint: string;
  /** อนุมัติ — คืน Promise (reject = error ที่ hook แจ้งแล้ว) */
  onApprove: (row: T) => Promise<unknown>;
  onDecline: (row: T, kind: ApprovalReasonKind, reason: string) => Promise<unknown>;
  pending: boolean;
  approveConfirm: { title: (docNo: string) => string; content?: string };
  reasonTitles: { reject: string; return: string };
};

/**
 * หน้ารายการอนุมัติเอกสารขาย (QT / SO) — UI/UX ตามหน้า /purchase-requests/approvals
 * (breadcrumb · ตาราง · แถวละปุ่ม "อนุมัติ" + เมนู ดูรายละเอียด/ส่งกลับ/ไม่อนุมัติ · footer แบ่งหน้า)
 * ต่างจาก PR/PO: เหตุผลบังคับ · มีตัวกรองสถานะ · ยืนยันก่อนอนุมัติ · กดแถวแล้วเปิดหน้ารายละเอียดเดิม
 */
export default function DocumentApprovalsListPage<T extends { id: string }>({
  title,
  root,
  columns,
  rows,
  loading,
  docNoOf,
  statusOf,
  statusLabel,
  statusColor,
  detailHref,
  statusOptions,
  statusFilter,
  onStatusFilterChange,
  canAccess,
  canApprove,
  noAccessText,
  viewOnlyHint,
  onApprove,
  onDecline,
  pending,
  approveConfirm,
  reasonTitles,
}: Props<T>) {
  const router = useRouter();
  const t = useT();
  const { modal } = App.useApp();
  // เก็บเลขหน้าพร้อมตัวกรองที่ใช้ตอนเลือกหน้านั้น — ตัวกรองเปลี่ยน = หน้าเดิมหมดอายุ กลับหน้า 1 โดยไม่ต้อง setState ใน effect
  const [pageState, setPageState] = useState({ page: 1, filter: statusFilter });
  const page = pageState.filter === statusFilter ? pageState.page : 1;
  const setPage = (next: number) =>
    setPageState({ page: next, filter: statusFilter });
  const [review, setReview] = useState<{ row: T; kind: ApprovalReasonKind } | null>(
    null,
  );

  const total = rows.length;
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const confirmApprove = (row: T) =>
    modal.confirm({
      title: approveConfirm.title(docNoOf(row)),
      content: approveConfirm.content,
      okText: t("อนุมัติ"),
      cancelText: t("ยกเลิก"),
      onOk: async () => {
        try {
          await onApprove(row);
        } catch {
          // hook แจ้ง error แล้ว (ยกเลิกยืนยันตัวตนไม่แจ้ง)
        }
      },
    });

  const allColumns: ColumnsType<T> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 70,
        align: "center",
        render: (_v, _r, index) => (currentPage - 1) * PAGE_SIZE + index + 1,
      },
      ...columns,
      {
        title: t("สถานะ"),
        key: "status",
        align: "center",
        render: (_v, row) => (
          <Tag color={statusColor(statusOf(row))}>{statusLabel(statusOf(row))}</Tag>
        ),
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 170,
        align: "center",
        render: (_v, row) => {
          const actionable = canApprove && statusOf(row) === PENDING;
          return (
            <RowActionsMenu
              ariaLabel={t("เมนูจัดการ {no}", { no: docNoOf(row) })}
              primary={
                actionable ? (
                  <Button
                    size="small"
                    type="primary"
                    loading={pending}
                    onClick={() => confirmApprove(row)}
                  >
                    {t("อนุมัติ")}
                  </Button>
                ) : null
              }
              actions={[
                {
                  key: "view",
                  icon: <EyeOutlined />,
                  label: t("ดูรายละเอียด"),
                  onClick: () => router.push(detailHref(row)),
                },
                actionable && "divider",
                actionable && {
                  key: "return",
                  icon: <RollbackOutlined />,
                  label: t("ส่งกลับแก้ไข"),
                  onClick: () => setReview({ row, kind: "return" }),
                },
                actionable && {
                  key: "reject",
                  icon: <CloseCircleOutlined />,
                  label: t("ไม่อนุมัติ"),
                  danger: true,
                  onClick: () => setReview({ row, kind: "reject" }),
                },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, canApprove, currentPage, pending, router, t],
  );

  if (!canAccess) {
    return (
      <div className={styles.pageWrap}>
        {noAccessText}
        <div style={{ marginTop: 12 }}>
          <Link href={root.href}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <Link href={root.href}>{root.label}</Link> },
          {
            title: (
              <span className={styles.breadcrumbActive}>{t("รายการรออนุมัติ")}</span>
            ),
          },
        ]}
      />

      <PageHeader title={title} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: "#8a9199" }}>{t("สถานะ")}</span>
        <Select
          style={{ minWidth: 200 }}
          value={statusFilter}
          options={statusOptions}
          onChange={onStatusFilterChange}
          aria-label={t("กรองสถานะ")}
        />
      </div>

      {!canApprove ? (
        <p style={{ marginBottom: 12, color: "#8a9199" }}>{viewOnlyHint}</p>
      ) : null}

      <div className={styles.tableWrap}>
        <Table<T>
          rowKey="id"
          columns={allColumns}
          dataSource={pageRows}
          loading={loading}
          pagination={false}
          className={styles.customTable}
          locale={{ emptyText: t("ไม่มีรายการ") }}
          scroll={{ x: "max-content" }}
        />
      </div>

      <div className={styles.tableFooter}>
        <div className={styles.footerText}>
          {t("Showing {from} to {to} of {total} entries", {
            from: total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
            to: Math.min(currentPage * PAGE_SIZE, total),
            total,
          })}
        </div>
        <Pagination
          size="small"
          current={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
          showSizeChanger={false}
          className={styles.pagination}
          onChange={(next) => setPage(next)}
        />
      </div>

      <ApprovalReasonModal
        open={Boolean(review)}
        kind={review?.kind ?? "reject"}
        docNo={review ? docNoOf(review.row) : undefined}
        titles={reasonTitles}
        loading={pending}
        onCancel={() => setReview(null)}
        onConfirm={async (reason) => {
          if (!review) return;
          await onDecline(review.row, review.kind, reason);
          setReview(null);
        }}
      />
    </div>
  );
}
