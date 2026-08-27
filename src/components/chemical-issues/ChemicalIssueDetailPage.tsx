"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  EditOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApproveChemicalIssueMutation,
  useCancelChemicalIssueMutation,
} from "@/hooks/chemical-issues/useChemicalIssueMutations";
import { useChemicalIssueQuery } from "@/hooks/chemical-issues/useChemicalIssuesQuery";
import {
  CHEMICAL_ISSUE_PURPOSE_LABEL,
  CHEMICAL_ISSUE_STATUS_LABEL,
} from "@/types/chemical-issues";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./ChemicalIssueDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function statusClass(status: string) {
  switch (status) {
    case "POSTED":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function ChemicalIssueDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useChemicalIssueQuery(id);
  const approveMutation = useApproveChemicalIssueMutation();
  const cancelMutation = useCancelChemicalIssueMutation();

  const data = query.data?.data;

  /** ส่งเอกสาร = สิทธิ์แก้ไข · อนุมัติ = สิทธิ์อนุมัติ ตาม Permission Matrix ของหน้านี้ */
  const screenActions = useScreenActionPermissions("CHEMICAL_ISSUES");
  const canRequest = screenActions.canEdit;
  const canApprove = screenActions.canApprove;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบเบิกจ่ายสารเคมี
        <div style={{ marginTop: 12 }}>
          <Link href="/inventory/chemical-issues">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy = approveMutation.isPending || cancelMutation.isPending;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ExperimentOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Chemical Issue</p>
          <h1 className={styles.pageTitle}>{data.issueNo}</h1>
          <p className={styles.pageSubtitle}>
            {formatDate(data.issueDate)} · {data.items?.length ?? 0} รายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/inventory/chemical-issues")}
          >
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.issueNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่เบิก</span>
                <div className={styles.metaValue}>{formatDate(data.issueDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วัตถุประสงค์</span>
                <div className={styles.metaValue}>
                  {CHEMICAL_ISSUE_PURPOSE_LABEL[data.purpose] ?? data.purpose}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขอเบิก</span>
                <div className={styles.metaValue}>
                  {data.requestedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้อนุมัติ</span>
                <div className={styles.metaValue}>
                  {data.issuedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ตัดสต๊อกเมื่อ</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/YYYY HH:mm")
                    : "ยังไม่ตัดสต๊อก"}
                </div>
              </div>
            </div>
            {data.purposeDetail ? (
              <p className={styles.textBlock}>{data.purposeDetail}</p>
            ) : null}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการเบิกจ่ายสารเคมี</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>{item.itemNameTh ?? "—"}</p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"} ·{" "}
                      {item.warehouse
                        ? `${item.warehouse.warehouseCode}/${item.location?.locationCode ?? "—"}`
                        : "—"}
                      {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                    </p>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>
                      {Number(item.quantity).toLocaleString("th-TH")}{" "}
                      {item.unitNameTh ?? item.unitCode ?? ""}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.issueNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {CHEMICAL_ISSUE_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>รายการ</span>
              <strong>{data.items?.length ?? 0}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {canApprove && data.status === "DRAFT" ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() =>
                  modal.confirm({
                    title: "อนุมัติใบเบิกจ่ายสารเคมีและตัดสต๊อก?",
                    content:
                      "ยืนยันแล้วจะลด quantity_on_hand / available ตาม Lot ที่เลือก และแก้เอกสารไม่ได้",
                    onOk: () => approveMutation.mutateAsync(data.id),
                  })
                }
              >
                อนุมัติและตัดสต๊อก
              </Button>
            ) : null}
            {canRequest && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/inventory/chemical-issues/${data.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันยกเลิกใบเบิกจ่ายสารเคมี?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
