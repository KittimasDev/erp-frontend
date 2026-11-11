"use client";
import { Tag } from "antd";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  EditOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";

import {
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
import {
  useApproveStockCountMutation,
  useCancelStockCountMutation,
} from "@/hooks/stock-counts/useStockCountMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStockCountQuery } from "@/hooks/stock-counts/useStockCountsQuery";
import { STOCK_COUNT_STATUS_LABEL, STOCK_COUNT_TYPE_LABEL, STOCK_COUNT_STATUS_COLOR } from "@/types/stock-counts";
import { tStockLabel } from "@/types/stock-adjustments";
import styles from "./StockCountDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}


function varianceClass(variance: number) {
  if (Math.abs(variance) < 1e-9) return styles.varianceZero;
  return variance > 0 ? styles.variancePositive : styles.varianceNegative;
}

export default function StockCountDetailPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
  const { modal } = App.useApp();
  const query = useStockCountQuery(id);
  const approveMutation = useApproveStockCountMutation();
  const cancelMutation = useCancelStockCountMutation();

  const data = query.data?.data;

  /** ส่งเอกสาร = สิทธิ์แก้ไข · อนุมัติ = สิทธิ์อนุมัติ ตาม Permission Matrix ของหน้านี้ */
  const screenActions = useScreenActionPermissions("STOCK_COUNTS");
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
        {t("ไม่พบใบนับสต๊อก")}
        <div style={{ marginTop: 12 }}>
          <Link href={scopePath("/inventory/stock-counts")}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const busy = approveMutation.isPending || cancelMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Stock Count"
        icon={<FileSearchOutlined />}
        title={data.countNo}
        subtitle={<>{formatDate(data.countDate)} · {data.items?.length ?? 0} {t("รายการ")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(scopePath("/inventory/stock-counts"))}
          >
            {t("กลับ")}
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
                <div className={styles.metaValue}>{data.countNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่นับ")}</span>
                <div className={styles.metaValue}>{formatDate(data.countDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ประเภทการนับ")}</span>
                <div className={styles.metaValue}>
                  {STOCK_COUNT_TYPE_LABEL[data.countType]
                    ? tStockLabel(STOCK_COUNT_TYPE_LABEL[data.countType])
                    : data.countType}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("คลัง/ตำแหน่ง")}</span>
                <div className={styles.metaValue}>
                  {data.warehouse
                    ? `${data.warehouse.warehouseCode} / ${data.location?.locationCode ?? "—"}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้เปิดนับ")}</span>
                <div className={styles.metaValue}>
                  {data.startedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้อนุมัติ")}</span>
                <div className={styles.metaValue}>
                  {data.completedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ปรับปรุงสต๊อกเมื่อ")}</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/BBBB HH:mm")
                    : t("ยังไม่อนุมัติ")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการนับสต๊อก")}</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => {
                const variance = Number(item.varianceQuantity);
                return (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>{item.itemNameTh ?? "—"}</p>
                      <p className={styles.itemCode}>
                        {item.itemCode ?? "—"}
                        {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                      </p>
                      <div className={styles.qtyLine}>
                        <span className={styles.qtyTag}>
                          {t("ระบบ (ตอนเปิดนับ)")} {item.systemQuantity}
                        </span>
                        <span>·</span>
                        <span>
                          {t("ส่วนต่าง:")}{" "}
                          <strong className={varianceClass(variance)}>
                            {variance > 0
                              ? `+${variance.toFixed(3)}`
                              : variance.toFixed(3)}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className={styles.itemQty}>
                      <strong>
                        {Number(item.countedQuantity).toLocaleString("th-TH")}{" "}
                        {item.unitNameTh ?? item.unitCode ?? ""}
                      </strong>
                    </div>
                  </div>
                );
              })}
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
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.countNo}</h2>
          </div>
          <div>
            <Tag color={STOCK_COUNT_STATUS_COLOR[data.status] ?? "default"}>
            {STOCK_COUNT_STATUS_LABEL[data.status] ?? data.status}
          </Tag>
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("รายการ")}</span>
              <strong>{data.items?.length ?? 0}</strong>
            </div>
          </div>

          {data.status === "DRAFT" ? (
            <p className={styles.sideNote}>
              {t("ส่วนต่างที่แสดงคำนวณจากยอดระบบตอนเปิดใบนับเท่านั้น — ตอนอนุมัติ ระบบจะคำนวณส่วนต่างใหม่จากยอดปัจจุบันจริงอีกครั้ง")}
            </p>
          ) : null}

          <div className={styles.actionStack}>
            {canApprove && data.status === "DRAFT" ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() =>
                  modal.confirm({
                    title: t("อนุมัติใบนับสต๊อกและปรับปรุงสต๊อก?"),
                    content: t(
                      "ยืนยันแล้วระบบจะคำนวณส่วนต่างจากยอดปัจจุบันจริง แล้วปรับปรุงสต๊อกตามนั้น และแก้เอกสารไม่ได้",
                    ),
                    onOk: () => approveMutation.mutateAsync(data.id),
                  })
                }
              >
                {t("อนุมัติและปรับปรุงสต๊อก")}
              </Button>
            ) : null}
            {canRequest && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(scopePath(`/inventory/stock-counts/${data.id}/edit`))
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
                      title: t("ยืนยันยกเลิกใบนับสต๊อก?"),
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
