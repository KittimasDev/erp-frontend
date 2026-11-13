"use client";
import { Tag } from "antd";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  EditOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";

import {
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
import {
  useApproveStockTransferMutation,
  useCancelStockTransferMutation,
} from "@/hooks/stock-transfers/useStockTransferMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStockTransferQuery } from "@/hooks/stock-transfers/useStockTransfersQuery";
import { STOCK_TRANSFER_STATUS_LABEL, STOCK_TRANSFER_STATUS_COLOR } from "@/types/stock-transfers";
import { tStockLabel } from "@/types/stock-adjustments";
import styles from "./StockTransferDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}


export default function StockTransferDetailPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
  const { modal } = App.useApp();
  const query = useStockTransferQuery(id);
  const approveMutation = useApproveStockTransferMutation();
  const cancelMutation = useCancelStockTransferMutation();

  const data = query.data?.data;

  /** ส่งเอกสาร = สิทธิ์แก้ไข · อนุมัติ = สิทธิ์อนุมัติ ตาม Permission Matrix ของหน้านี้ */
  const screenActions = useScreenActionPermissions("STOCK_TRANSFERS");
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
        {t("ไม่พบใบโอนย้ายสินค้า")}
        <div style={{ marginTop: 12 }}>
          <Link href={scopePath("/inventory/stock-transfers")}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const busy = approveMutation.isPending || cancelMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Stock Transfer"
        icon={<SwapOutlined />}
        title={data.transferNo}
        subtitle={<>{formatDate(data.transferDate)} · {data.items?.length ?? 0} {t("รายการ")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(scopePath("/inventory/stock-transfers"))}
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
                <div className={styles.metaValue}>{data.transferNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่โอนย้าย")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.transferDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ขอโอนย้าย")}</span>
                <div className={styles.metaValue}>
                  {data.requestedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้อนุมัติ")}</span>
                <div className={styles.metaValue}>
                  {data.approvedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ตัด/เพิ่มสต๊อกเมื่อ")}</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/BBBB HH:mm")
                    : t("ยังไม่โอนย้าย")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการโอนย้าย")}</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>{item.itemNameTh ?? "—"}</p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"}
                      {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                    </p>
                    <div className={styles.routeLine}>
                      <span className={styles.routeTag}>
                        {item.fromWarehouse
                          ? `${item.fromWarehouse.warehouseCode}/${item.fromLocation?.locationCode ?? "—"}`
                          : "—"}
                      </span>
                      <ArrowRightOutlined className={styles.routeArrow} />
                      <span className={styles.routeTag}>
                        {item.toWarehouse
                          ? `${item.toWarehouse.warehouseCode}/${item.toLocation?.locationCode ?? "—"}`
                          : "—"}
                      </span>
                    </div>
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
            <h2 className={styles.sideTitle}>{data.transferNo}</h2>
          </div>
          <div>
            <Tag color={STOCK_TRANSFER_STATUS_COLOR[data.status] ?? "default"}>
            {STOCK_TRANSFER_STATUS_LABEL[data.status]
              ? tStockLabel(STOCK_TRANSFER_STATUS_LABEL[data.status])
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
                    title: t("อนุมัติใบโอนย้ายสินค้าและตัด+เพิ่มสต๊อก?"),
                    content: t(
                      "ยืนยันแล้วจะลดสต๊อกต้นทางและเพิ่มสต๊อกปลายทางตาม Lot ที่เลือก และแก้เอกสารไม่ได้",
                    ),
                    onOk: () => approveMutation.mutateAsync(data.id),
                  })
                }
              >
                {t("อนุมัติและโอนย้ายสต๊อก")}
              </Button>
            ) : null}
            {canRequest && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(scopePath(`/inventory/stock-transfers/${data.id}/edit`))
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
                      title: t("ยืนยันยกเลิกใบโอนย้ายสินค้า?"),
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
