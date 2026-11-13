"use client";
import { Tag } from "antd";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  EditOutlined,
  FilePdfOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";

import {
  useApproveStockIssueMutation,
  useCancelStockIssueMutation,
} from "@/hooks/stock-issues/useStockIssueMutations";
import { useStockIssueQuery } from "@/hooks/stock-issues/useStockIssuesQuery";
import { STOCK_ISSUE_STATUS_LABEL, STOCK_ISSUE_STATUS_COLOR } from "@/types/stock-issues";
import { tStockLabel } from "@/types/stock-adjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./MaterialIssueDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}


export default function MaterialIssueDetailPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useStockIssueQuery(id);
  const approveMutation = useApproveStockIssueMutation();
  const cancelMutation = useCancelStockIssueMutation();

  const data = query.data?.data;

  /** ส่งเอกสาร = สิทธิ์แก้ไข · อนุมัติ = สิทธิ์อนุมัติ ตาม Permission Matrix ของหน้านี้ */
  const screenActions = useScreenActionPermissions("MATERIAL_ISSUES");
  const canRequest = screenActions.canEdit;
  const canApprove = screenActions.canApprove;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบเบิกของ")}
        <div style={{ marginTop: 12 }}>
          <Link href="/inventory/material-issues">{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const busy = approveMutation.isPending || cancelMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Material Issue"
        icon={<SwapOutlined />}
        title={data.issueNo}
        subtitle={<>{formatDate(data.issueDate)} · {data.items?.length ?? 0} {t("รายการ")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/inventory/material-issues")}
          >
            {t("กลับ")}
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generateMaterialIssuePdf } = await import(
                "@/utils/generateMaterialIssuePdf"
              );
              void generateMaterialIssuePdf({
                issueNo: data.issueNo,
                issueDate: formatDate(data.issueDate),
                statusLabel: STOCK_ISSUE_STATUS_LABEL[data.status] ?? data.status,
                draftBanner:
                  data.status === "POSTED"
                    ? undefined
                    : data.status === "CANCELLED"
                      ? "ยกเลิกแล้ว — ไม่มีผลกับสต๊อก"
                      : "แบบร่าง — ยังไม่ได้ตัดสต๊อก",
                requestedByName: data.requestedBy?.displayName ?? "—",
                issuedByName: data.issuedBy?.displayName ?? "—",
                postedAt: data.postedAt
                  ? dayjs(data.postedAt).format("DD/MM/BBBB HH:mm")
                  : "—",
                remark: data.remark?.trim() || "",
                items: (data.items ?? []).map((item, index) => ({
                  no: index + 1,
                  itemCode: item.itemCode ?? "—",
                  itemName: item.itemNameTh ?? "—",
                  unit: item.unitNameTh ?? item.unitCode ?? "—",
                  qty: Number(item.quantity) || 0,
                  warehouse: item.warehouse
                    ? `${item.warehouse.warehouseCode}/${item.location?.locationCode ?? "—"}`
                    : undefined,
                  lotNo: item.lotNo,
                })),
              });
            }}
          >
            {t("พิมพ์ PDF")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลเอกสาร")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.issueNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่เบิก")}</span>
                <div className={styles.metaValue}>{formatDate(data.issueDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ขอเบิก")}</span>
                <div className={styles.metaValue}>
                  {data.requestedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้อนุมัติ")}</span>
                <div className={styles.metaValue}>
                  {data.issuedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ตัดสต๊อกเมื่อ")}</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/BBBB HH:mm")
                    : t("ยังไม่ตัดสต๊อก")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการเบิก")}</h2>
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
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}
          <ESignatureHistoryCard documentId={data.id} style={{ marginTop: 16 }} />
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.issueNo}</h2>
          </div>
          <div>
            <Tag color={STOCK_ISSUE_STATUS_COLOR[data.status] ?? "default"}>
            {STOCK_ISSUE_STATUS_LABEL[data.status]
              ? tStockLabel(STOCK_ISSUE_STATUS_LABEL[data.status])
              : data.status}
          </Tag>
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("รายการ")}</span>
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
                    title: t("อนุมัติใบเบิกของและตัดสต๊อก?"),
                    content: t(
                      "ยืนยันแล้วจะลด quantity_on_hand / available ตาม Lot ที่เลือก และแก้เอกสารไม่ได้",
                    ),
                    onOk: () => approveMutation.mutateAsync(data.id),
                  })
                }
              >
                {t("อนุมัติและตัดสต๊อก")}
              </Button>
            ) : null}
            {canRequest && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/inventory/material-issues/${data.id}/edit`)
                  }
                >
                  {t("แก้ไข")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("ยืนยันยกเลิกใบเบิกของ?"),
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ยกเลิกเอกสาร")}
                </Button>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
