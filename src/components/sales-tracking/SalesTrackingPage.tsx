"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Input,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowRightOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  ExportOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import {
  DELIVERY_SCHEDULE_RETURN_LABEL,
  deliveryScheduleStatusColor,
  deliveryScheduleStatusLabel,
  type DeliveryScheduleReturnResult,
} from "@/types/delivery-schedules";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  useSalesTrackingDetailQuery,
  useSalesTrackingListQuery,
  useSalesTrackingSummaryQuery,
} from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { ApiError } from "@/lib/api/client";
import { getSalesTrackingDeliveryOrder } from "@/lib/api/sales-tracking";
import { getAccessToken } from "@/lib/auth/token";
import { canNavigateSalesFulfillmentHref } from "@/lib/sales/sales-fulfillment-nav";
import {
  resolveSalesTimelineStepTone,
  salesTimelineStatusLabel,
  salesTimelineStatusTagColor,
  salesTrackingStepLabel,
  type SalesTimelineStepTone,
} from "@/lib/sales/sales-tracking-timeline";
import {
  SALES_ORDER_STATUS_LABEL,
  salesOrderStatusColor,
  salesOrderStatusLabel,
} from "@/types/sales-orders";
import { formatErpDateTime } from "@/lib/datetime/erp-timezone";
import type {
  SalesTrackingQueryParams,
  SalesTrackingRoundItem,
  SalesTrackingRoundTimeline,
  SalesTrackingRow,
  SalesTrackingTimelineStep,
} from "@/types/sales-tracking";
import styles from "./SalesTrackingPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { tNow, useT } from "@/lib/i18n/useT";

const PAGE_SIZE = 20;
const HEADER_TIMELINE_STEPS = new Set([
  "Quotation",
  "Sales Order",
  "Delivery Rounds",
]);

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function stepIcon(stepName: string) {
  switch (stepName) {
    case "Quotation":
      return <FileTextOutlined />;
    case "Sales Order":
      return <FileTextOutlined />;
    case "Stock Verification":
      return <SafetyCertificateOutlined />;
    case "Picking":
      return <ShoppingCartOutlined />;
    case "Packing":
      return <InboxOutlined />;
    case "Delivery":
      return <CarOutlined />;
    default:
      return <ClockCircleFilled />;
  }
}

function toneIcon(tone: SalesTimelineStepTone) {
  if (tone === "done") return <CheckCircleFilled />;
  if (tone === "cancelled") return <CloseCircleFilled />;
  if (tone === "active") return <ClockCircleFilled />;
  return null;
}

function canOpenTimelineHref(
  href: string | undefined,
  nav: Parameters<typeof canNavigateSalesFulfillmentHref>[1],
): boolean {
  if (!href) return false;
  return canNavigateSalesFulfillmentHref(href, nav);
}

function TimelineStepCard({
  step,
  isLast,
  canOpenDoc,
  onOpenDeliveryPdf,
  pdfLoading,
}: {
  step: SalesTrackingTimelineStep;
  isLast: boolean;
  canOpenDoc: boolean;
  onOpenDeliveryPdf?: (deliveryOrderId: string) => void;
  pdfLoading?: boolean;
}) {
  const t = useT();
  const tone = resolveSalesTimelineStepTone(step);
  const canOpenPdf =
    step.step === "Delivery" &&
    Boolean(step.documentId) &&
    Boolean(onOpenDeliveryPdf);

  return (
    <div className={`${styles.timelineItem} ${styles[`tone_${tone}`]}`}>
      <div className={styles.timelineRail}>
        <div className={styles.timelineDot}>
          {toneIcon(tone) ?? stepIcon(step.step)}
        </div>
        {!isLast ? <div className={styles.timelineLine} /> : null}
      </div>
      <div className={styles.timelineCard}>
        <div className={styles.timelineCardHead}>
          <div className={styles.timelineStepIcon}>{stepIcon(step.step)}</div>
          <div className={styles.timelineStepMeta}>
            <div className={styles.timelineStepName}>
              {salesTrackingStepLabel(step.step)}
            </div>
            <Tag
              color={salesTimelineStatusTagColor(step.status, tone)}
              className={styles.timelineTag}
            >
              {salesTimelineStatusLabel(step.status)}
            </Tag>
          </div>
        </div>
        <div className={styles.timelineDetails}>
          <div className={styles.timelineDetailRow}>
            <span>{t("เอกสาร")}</span>
            <strong>{step.documentNo ?? "—"}</strong>
          </div>
          <div className={styles.timelineDetailRow}>
            <span>{t("วันที่")}</span>
            <strong>{formatDate(step.date)}</strong>
          </div>
          {step.actorName ? (
            <div className={styles.timelineDetailRow}>
              <span>{t("โดย")}</span>
              <strong>{step.actorName}</strong>
            </div>
          ) : null}
        </div>
        {canOpenDoc || canOpenPdf ? (
          <div className={styles.timelineActions}>
            {canOpenDoc && step.href ? (
              <Link href={step.href} className={styles.timelineLink}>
                {t("เปิดเอกสาร")}
                <ExportOutlined />
              </Link>
            ) : null}
            {canOpenPdf && step.documentId ? (
              <Button
                type="link"
                size="small"
                className={styles.timelinePdfBtn}
                icon={<FilePdfOutlined />}
                loading={pdfLoading}
                onClick={() => onOpenDeliveryPdf?.(step.documentId as string)}
              >
                {t("เปิด PDF")}
              </Button>
            ) : null}
          </div>
        ) : (
          <span className={styles.timelineLinkDisabled}>{t("ยังไม่มีเอกสาร")}</span>
        )}
      </div>
    </div>
  );
}

const QTY_EPS = 0.0005;

function formatQty(value?: string) {
  return Number(value ?? 0).toLocaleString("th-TH", {
    maximumFractionDigits: 3,
  });
}

function formatWeightKg(value?: string) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function isReturnResult(result?: string): boolean {
  return result === "FULL_RETURN" || result === "PARTIAL_RETURN";
}

function redeliveryText(round: SalesTrackingRoundTimeline): string {
  if (round.redeliverRequired || round.redeliveryRoundNo) {
    const roundPart = round.redeliveryRoundNo
      ? tNow("ในรอบ {redeliveryRoundNo}", { redeliveryRoundNo: round.redeliveryRoundNo })
      : "";
    const datePart = round.redeliverDate
      ? tNow(" วันที่ {redeliverDate}", { redeliverDate: formatDate(round.redeliverDate) })
      : "";
    return `${tNow("ส่งใหม่")}${roundPart ? ` ${roundPart}` : ""}${datePart}`;
  }
  return round.returnToStock === false
    ? tNow("ไม่ส่งใหม่ (ปิดการส่ง)")
    : tNow("ไม่ส่งใหม่ (ลดจำนวนสั่ง)");
}

function RoundDetail({ round }: { round: SalesTrackingRoundTimeline }) {
  const t = useT();
  const items = round.items ?? [];
  const returned = isReturnResult(round.deliveryResult);
  const hasReturnedQty = items.some(
    (line) => Number(line.returnedQuantity) > QTY_EPS,
  );
  const hasClosedQty = items.some(
    (line) => Number(line.closedQuantity) > QTY_EPS,
  );
  const redQty = (value: string) =>
    Number(value) > QTY_EPS ? (
      <strong className={styles.roundReturnNote}>{formatQty(value)}</strong>
    ) : (
      "—"
    );

  const columns: ColumnsType<SalesTrackingRoundItem> = [
    {
      title: t("สินค้า"),
      key: "item",
      render: (_v, line) => (
        <div>
          <strong>{line.itemCode ?? "—"}</strong>
          {line.itemNameTh ? <div>{line.itemNameTh}</div> : null}
        </div>
      ),
    },
    {
      title: t("สั่งในรอบ"),
      dataIndex: "originalQuantity",
      align: "right",
      width: 84,
      render: (v: string, line) =>
        `${formatQty(v)}${line.unitCode ? ` ${line.unitCode}` : ""}`,
    },
    {
      title: t("ลูกค้ารับ"),
      dataIndex: "deliveredQuantity",
      align: "right",
      width: 76,
      render: (v: string) => formatQty(v),
    },
    {
      title: t("ตีกลับ"),
      dataIndex: "returnedQuantity",
      align: "right",
      width: 64,
      hidden: !hasReturnedQty,
      render: redQty,
    },
    {
      title: t("ปิดการส่ง"),
      dataIndex: "closedQuantity",
      align: "right",
      width: 72,
      hidden: !hasClosedQty,
      render: redQty,
    },
    {
      title: t("คงเหลือ"),
      dataIndex: "remainingQuantity",
      align: "right",
      width: 68,
      render: (v: string) =>
        Number(v) > QTY_EPS ? <strong>{formatQty(v)}</strong> : "—",
    },
  ];

  return (
    <div
      className={`${styles.roundDetail} ${returned ? styles.roundDetailReturned : ""}`}
    >
      <div className={styles.roundFacts}>
        <div>
          <span>{t("ผลการส่ง")}</span>
          <strong>
            {!round.deliveryResult ? (
              t("ยังไม่ส่ง")
            ) : returned ? (
              <Tag color="red" className={styles.timelineTag}>
                {t(DELIVERY_SCHEDULE_RETURN_LABEL[
                  round.deliveryResult as DeliveryScheduleReturnResult
                ] ?? round.deliveryResult)}
              </Tag>
            ) : (
              <Tag color="success" className={styles.timelineTag}>
                {t("ส่งสำเร็จ")}
              </Tag>
            )}
          </strong>
        </div>
        <div>
          <span>{t("กำหนดส่ง")}</span>
          <strong>{formatDate(round.deliveryDate)}</strong>
        </div>
        {round.deliveredAt ? (
          <div>
            <span>{t("ส่งจริง")}</span>
            <strong>{formatErpDateTime(round.deliveredAt)}</strong>
          </div>
        ) : null}
        {returned ? (
          <>
            {round.returnReason ? (
              <div>
                <span>{t("เหตุผลที่ตีกลับ")}</span>
                <strong className={styles.roundReturnNote}>
                  {round.returnReason}
                </strong>
              </div>
            ) : null}
            <div>
              <span>{t("ของที่ตีกลับ")}</span>
              <strong>
                {round.returnToStock ? t("คืนเข้าคลัง") : t("ไม่คืนเข้าคลัง")}
              </strong>
            </div>
            <div>
              <span>{t("ต่อจากนี้")}</span>
              <strong className={styles.roundReturnNote}>
                {redeliveryText(round)}
              </strong>
            </div>
          </>
        ) : null}
        {round.sourceDeliveryOrderNo ? (
          <div>
            <span>{t("ที่มา")}</span>
            <strong>
              {t("ส่งใหม่แทนของที่ตีกลับจาก")} {round.sourceDeliveryOrderNo}
              {round.sourceRoundNo ? t(" (รอบ {sourceRoundNo})", { sourceRoundNo: round.sourceRoundNo }) : ""}
            </strong>
          </div>
        ) : null}
      </div>
      {items.length ? (
        <Table<SalesTrackingRoundItem>
          rowKey="deliveryScheduleItemId"
          size="small"
          pagination={false}
          className={styles.roundItemsTable}
          columns={columns}
          dataSource={items}
        />
      ) : null}
    </div>
  );
}

type SummaryCard = {
  key: string;
  label: string;
  value?: number;
  filterStatus?: string;
  isAll?: boolean;
};

export default function SalesTrackingPage() {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const trackingActions = useScreenActionPermissions("SALES_TRACKING");
  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const stockVerificationActions = useScreenActionPermissions(
    "SALES_STOCK_VERIFICATION",
  );
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const packingActions = useScreenActionPermissions("PACKINGS");
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const fulfillmentNav = {
    stockVerification: stockVerificationActions,
    picking: pickingActions,
    packing: packingActions,
    delivery: deliveryActions,
    salesOrder: salesOrderActions,
    quotation: quotationActions,
  };
  const canOpenSalesOrder = salesOrderActions.canView;
  const [pdfLoadingId, setPdfLoadingId] = useState<string | undefined>();

  const [keyword, setKeyword] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<SalesTrackingQueryParams>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [selectedSoId, setSelectedSoId] = useState<string | undefined>();

  const summaryQuery = useSalesTrackingSummaryQuery();
  const listQuery = useSalesTrackingListQuery(applied);
  const allTotalQuery = useSalesTrackingListQuery({ page: 1, pageSize: 1 });
  const detailQuery = useSalesTrackingDetailQuery(selectedSoId);
  const customersQuery = useCustomersQuery();
  const itemsQuery = useItemsQuery({
    isActive: true,
    isFinishedGood: true,
    isSalesItem: true,
  });

  const summary = summaryQuery.data?.data;
  const list = listQuery.data?.data;
  const customers = customersQuery.data?.data ?? [];
  const catalogItems = itemsQuery.data?.data ?? [];
  const itemOptions = catalogItems.map((item) => ({
    value: item.id,
    label: `${item.itemCode} — ${item.itemNameTh}`,
  }));

  const applyFilters = (overrides?: Partial<SalesTrackingQueryParams>) => {
    const nextPage = overrides?.page ?? 1;
    setPage(nextPage);
    setApplied({
      keyword: keyword.trim() || undefined,
      customerId,
      salesOrderStatus: status,
      dateFrom: dateRange?.[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange?.[1]?.format("YYYY-MM-DD"),
      itemIds: itemIds.length ? itemIds : undefined,
      page: nextPage,
      pageSize: PAGE_SIZE,
      ...overrides,
    });
  };

  const cards: SummaryCard[] = [
    {
      key: "all",
      label: t("ทั้งหมด"),
      value: allTotalQuery.data?.data.total,
      isAll: true,
    },
    {
      key: "stock",
      label: t("รอตรวจสต๊อก"),
      value: summary?.soAwaitingStockCheck,
      filterStatus: "CONFIRMED",
    },
    {
      key: "picking",
      label: t("รอจ่ายสินค้า"),
      value: summary?.soAwaitingPicking,
      filterStatus: "STOCK_CHECKED",
    },
    {
      key: "packing",
      label: t("รอบรรจุสินค้า"),
      value: summary?.awaitingPacking,
      filterStatus: "PICKING",
    },
    {
      key: "delivery",
      label: t("รอส่งสินค้า"),
      value: summary?.awaitingDelivery,
      filterStatus: "PACKED",
    },
    {
      key: "delivered",
      label: t("ส่งสินค้าแล้ว"),
      value: summary?.delivered,
      filterStatus: "DELIVERED",
    },
    {
      key: "cancelled",
      label: t("ยกเลิกใบสั่งขาย"),
      value: summary?.cancelled,
      filterStatus: "CANCELLED",
    },
  ];

  const columns: ColumnsType<SalesTrackingRow> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      {
        title: "SO",
        dataIndex: "salesOrderNo",
        width: 160,
        onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        onCell: () => ({ style: { whiteSpace: "nowrap" } }),
        render: (v: string, row) => (
          <Link
            href={`/sales-orders/${row.salesOrderId}`}
            className={styles.prNo}
            onClick={(e) => e.stopPropagation()}
          >
            {v}
          </Link>
        ),
      },
      {
        title: "QT",
        dataIndex: "quotationNo",
        width: 130,
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("ลูกค้า"),
        dataIndex: "customerName",
        width: 220,
        ellipsis: true,
        render: (v?: string) => {
          const name = v?.trim() || "—";
          return (
            <Tooltip title={name === "—" ? undefined : name}>
              <span className={styles.customerName}>{name}</span>
            </Tooltip>
          );
        },
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 230,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: t("วันที่ SO"),
        dataIndex: "orderDate",
        width: 110,
        render: formatDate,
      },
      {
        title: t("สถานะ SO"),
        dataIndex: "salesOrderStatus",
        width: 140,
        render: (value: string) => (
          <Tag color={salesOrderStatusColor(value)}>
            {salesOrderStatusLabel(value)}
          </Tag>
        ),
      },
      {
        title: t("รอบจัดส่ง"),
        key: "rounds",
        width: 110,
        align: "center",
        render: (_v, row) =>
          row.roundCount > 1 ? (
            <Tag color="blue">{row.roundCount} {t("รอบ")}</Tag>
          ) : (
            <span>{t("รอบเดียว")}</span>
          ),
      },
      {
        title: t("เอกสารต่อเนื่อง"),
        key: "docs",
        width: 180,
        render: (_v, row) =>
          // ใบที่แบ่งหลายรอบ: backend ไม่ส่งคอลัมน์ระดับใบมาให้ (เจตนา)
          // เพราะเลขของรอบเดียวจะทำให้เข้าใจผิดว่าเป็นของทั้งใบ
          row.roundCount > 1 ? (
            <span className={styles.docStack}>{t("กางแถวเพื่อดูรายรอบ")}</span>
          ) : (
            <div className={styles.docStack}>
              <span>PK {row.pickingNo ?? "—"}</span>
              <span>PC {row.packingNo ?? "—"}</span>
              <span>DO {row.deliveryOrderNo ?? "—"}</span>
            </div>
          ),
      },
      {
        title: t("ขั้นตอน"),
        dataIndex: "currentStep",
        width: 150,
      },
      {
        title: t("ทำถัดไป"),
        dataIndex: "nextAction",
        width: 180,
        ellipsis: true,
      },
      {
        title: "",
        key: "actions",
        width: 70,
        fixed: "right",
        render: (_v, row) => (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSoId(row.salesOrderId);
            }}
          />
        ),
      },
    ],
    [page, t],
  );

  if (!trackingActions.canView) {
    return <AccessDenied screenCodes={["SALES_TRACKING"]} />;
  }

  const detail = detailQuery.data?.data;
  const headerSteps = (detail?.timeline ?? []).filter(
    (step) =>
      step.step !== "Invoice" && HEADER_TIMELINE_STEPS.has(step.step),
  );

  const openDeliveryPdf = async (deliveryOrderId: string) => {
    if (!selectedSoId) return;
    setPdfLoadingId(deliveryOrderId);
    try {
      const response = await getSalesTrackingDeliveryOrder(
        getAccessToken(),
        selectedSoId,
        deliveryOrderId,
      );
      const data = response.data;
      const { generateDeliveryOrderPdf } = await import(
        "@/utils/generateDeliveryOrderPdf"
      );
      await generateDeliveryOrderPdf({
        deliveryOrderNo: data.deliveryOrderNo,
        deliveryDate: dayjs(data.deliveryDate).format("DD/MM/BBBB"),
        salesOrderNo: data.salesOrderNo ?? "—",
        packingNo: data.packings?.length
          ? data.packings.map((ref) => ref.packingNo ?? ref.packingId).join(", ")
          : (data.packingNo ?? "—"),
        customerName: data.customerName ?? "—",
        shippingAddress: data.shippingAddress ?? "—",
        contactName: data.contactName ?? "—",
        contactPhone: data.contactPhone ?? "—",
        carrierName: data.carrierName ?? "—",
        vehiclePlate: data.vehiclePlate ?? "—",
        driverName: data.driverName ?? "—",
        vehicleWeightBeforeKg: formatWeightKg(data.vehicleWeightBeforeKg),
        vehicleWeightAfterKg: formatWeightKg(data.vehicleWeightAfterKg),
        cargoNetWeightKg: formatWeightKg(data.cargoNetWeightKg),
        remark: data.remark?.trim() || "",
        items: (data.items ?? []).map((item, index) => ({
          no: index + 1,
          itemCode: item.itemCode ?? "—",
          itemName: item.itemNameTh ?? "—",
          unit: item.unitCode ?? "—",
          qty: Number(item.deliveredQty) || 0,
        })),
      });
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("เปิด PDF ไม่สำเร็จ"),
      );
    } finally {
      setPdfLoadingId(undefined);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Tracking"
        icon={<LineChartOutlined />}
        title={t("ติดตามการขายและจัดส่ง")}
        subtitle={<>{t("ภาพรวม Quotation → SO → Stock Check → Picking → Packing → Delivery")}
            {trackingActions.canViewAll
              ? null
              : t(" · แสดงเฉพาะเอกสารที่คุณเป็นผู้สร้าง")}</>}
      />

      <Row gutter={[12, 12]}>
        {cards.map((card) => {
          const clickable = card.isAll || Boolean(card.filterStatus);
          const active = card.isAll
            ? !status
            : clickable && status === card.filterStatus;
          return (
            <Col xs={12} sm={8} md={6} lg={3} key={card.key}>
              <Card
                size="small"
                className={`${styles.summaryCard} ${active ? styles.summaryCardActive : ""} ${clickable ? styles.summaryCardClickable : ""}`}
                onClick={() => {
                  if (card.isAll) {
                    setStatus(undefined);
                    applyFilters({ salesOrderStatus: undefined, page: 1 });
                    return;
                  }
                  if (!card.filterStatus) return;
                  const next =
                    status === card.filterStatus
                      ? undefined
                      : card.filterStatus;
                  setStatus(next);
                  applyFilters({ salesOrderStatus: next, page: 1 });
                }}
              >
                <div className={styles.summaryLabel}>{card.label}</div>
                <div className={styles.summaryValue}>{card.value ?? "—"}</div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("เลข SO / QT / ลูกค้า")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => applyFilters({ page: 1 })}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สินค้า")}</label>
            <Select
              allowClear
              showSearch
              mode="multiple"
              maxTagCount="responsive"
              optionFilterProp="label"
              placeholder={t("เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก")}
              aria-label={t("สินค้าในใบสั่งขาย")}
              value={itemIds}
              onChange={(value) => setItemIds(value)}
              style={{ width: "100%" }}
              loading={itemsQuery.isLoading}
              options={itemOptions}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ลูกค้า")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              value={customerId}
              onChange={setCustomerId}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ SO")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.keys(SALES_ORDER_STATUS_LABEL).map(
                (value) => ({
                  value,
                  label: salesOrderStatusLabel(value),
                }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่ SO")}</label>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              format="DD/MM/BBBB"
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() => applyFilters({ page: 1 })}
          >
            {t("ค้นหา")}
          </Button>
          <Button
            onClick={() => {
              setKeyword("");
              setCustomerId(undefined);
              setItemIds([]);
              setStatus(undefined);
              setDateRange(null);
              setPage(1);
              setApplied({ page: 1, pageSize: PAGE_SIZE });
            }}
          >
            {t("ล้างตัวกรอง")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div>
            <p className={styles.toolbarTitle}>{t("รายการใบสั่งขาย")}</p>
            <p className={styles.toolbarHint}>
              {t("กดแถวเพื่อดูไทม์ไลน์ · กดเลข SO เพื่อเปิดรายละเอียด")}
            </p>
          </div>
          <span className={styles.tableCount}>
            {list?.total ?? 0} {t("รายการ")}
          </span>
        </div>
        <Table
          rowKey="salesOrderId"
          className={styles.table}
          loading={listQuery.isLoading || listQuery.isFetching}
          columns={columns}
          dataSource={list?.items ?? []}
          scroll={{ x: 1880 }}
          expandable={{
            rowExpandable: (row) => row.rounds.length > 0,
            expandedRowRender: (row) => (
              <Table
                rowKey="deliveryScheduleId"
                size="small"
                pagination={false}
                dataSource={row.rounds}
                columns={[
                  {
                    title: t("รอบ"),
                    dataIndex: "roundNo",
                    width: 70,
                    align: "center",
                    render: (v: number) => <Tag>{t("รอบ")} {v}</Tag>,
                  },
                  {
                    title: t("วันที่ต้องส่ง"),
                    dataIndex: "deliveryDate",
                    width: 120,
                    render: (v: string) => dayjs(v).format("DD/MM/BBBB"),
                  },
                  {
                    title: t("สถานะรอบ"),
                    dataIndex: "roundStatus",
                    width: 120,
                    render: (v: string) => (
                      <Tag color={deliveryScheduleStatusColor(v)}>
                        {deliveryScheduleStatusLabel(v)}
                      </Tag>
                    ),
                  },
                  {
                    title: t("ใบจ่าย"),
                    dataIndex: "pickingNo",
                    render: (v?: string) => v ?? "—",
                  },
                  {
                    title: t("ใบบรรจุ"),
                    dataIndex: "packingNo",
                    render: (v?: string) => v ?? "—",
                  },
                  {
                    title: t("ใบส่งของ"),
                    dataIndex: "deliveryOrderNo",
                    render: (v?: string) => v ?? "—",
                  },
                  { title: t("ขั้นตอน"), dataIndex: "currentStep", width: 150 },
                  { title: t("ต้องทำต่อ"), dataIndex: "nextAction", width: 200 },
                ]}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: list?.total ?? 0,
            showTotal: (total) => t("ทั้งหมด {total} รายการ", { total }),
            onChange: (p) => {
              setPage(p);
              setApplied((prev) => ({ ...prev, page: p }));
            },
          }}
          onRow={(row) => ({
            onClick: () => setSelectedSoId(row.salesOrderId),
          })}
        />
      </section>

      <Drawer
        open={Boolean(selectedSoId)}
        onClose={() => setSelectedSoId(undefined)}
        size={640}
        className={styles.timelineDrawer}
        title={null}
        styles={{
          body: { padding: 0 },
          header: { display: "none" },
        }}
      >
        {detailQuery.isLoading && !detail ? (
          <div className={styles.drawerLoading}>
            <Spin />
          </div>
        ) : detail ? (
          <div className={styles.drawerBody}>
            <div className={styles.drawerHero}>
              <p className={styles.drawerEyebrow}>Order Timeline</p>
              <h2 className={styles.drawerTitle}>{detail.salesOrderNo}</h2>
              <p className={styles.drawerSubtitle}>
                {t("ติดตามเส้นทางจากใบเสนอราคาจนถึงส่งมอบ")}
              </p>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSelectedSoId(undefined)}
                aria-label={t("ปิด")}
              >
                ×
              </button>
            </div>

            <div className={styles.nextCard}>
              <div className={styles.nextLabel}>{t("ขั้นตอนปัจจุบัน")}</div>
              <div className={styles.nextCurrent}>{detail.currentStep}</div>
              <div className={styles.nextAction}>
                <ArrowRightOutlined />
                <span>{detail.nextAction}</span>
              </div>
              {canOpenSalesOrder ? (
                <Button
                  type="link"
                  className={styles.openSoBtn}
                  onClick={() =>
                    router.push(`/sales-orders/${detail.salesOrderId}`)
                  }
                >
                  {t("เปิดใบสั่งขาย")}
                </Button>
              ) : null}
            </div>

            <div className={styles.timeline}>
              {headerSteps.map((step, index) => (
                <TimelineStepCard
                  key={`${step.step}-${step.documentId ?? index}`}
                  step={step}
                  isLast={
                    index === headerSteps.length - 1 &&
                    detail.rounds.length === 0
                  }
                  canOpenDoc={canOpenTimelineHref(step.href, fulfillmentNav)}
                />
              ))}
              {detail.rounds.map((round) => {
                const roundSteps = round.timeline.filter(
                  (step) => step.step !== "Invoice",
                );
                const roundStatusLabel = deliveryScheduleStatusLabel(
                  round.roundStatus,
                );
                return (
                  <div
                    key={round.deliveryScheduleId}
                    className={styles.roundBlock}
                  >
                    <div className={styles.roundHeading}>
                      <span>
                        {t("รอบที่")} {round.roundNo} {t("· ส่งวันที่")}{" "}
                        {formatDate(round.deliveryDate)}
                      </span>
                      <Tag
                        color={
                          isReturnResult(round.deliveryResult)
                            ? "red"
                            : deliveryScheduleStatusColor(round.roundStatus)
                        }
                      >
                        {roundStatusLabel}
                      </Tag>
                    </div>
                    <RoundDetail round={round} />
                    {roundSteps.map((step, index) => (
                      <TimelineStepCard
                        key={`${round.deliveryScheduleId}-${step.step}-${step.documentId ?? index}`}
                        step={step}
                        isLast={index === roundSteps.length - 1}
                        canOpenDoc={canOpenTimelineHref(
                          step.href,
                          fulfillmentNav,
                        )}
                        onOpenDeliveryPdf={openDeliveryPdf}
                        pdfLoading={pdfLoadingId === step.documentId}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
