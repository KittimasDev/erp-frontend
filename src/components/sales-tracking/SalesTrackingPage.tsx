"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  FileTextOutlined,
  InboxOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import {
  DELIVERY_SCHEDULE_STATUS_LABEL,
  type DeliveryScheduleStatus,
} from "@/types/delivery-schedules";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  useSalesTrackingDetailQuery,
  useSalesTrackingListQuery,
  useSalesTrackingSummaryQuery,
} from "@/hooks/sales-tracking/useSalesTrackingQuery";
import {
  resolveSalesTimelineStepTone,
  salesTrackingStepLabel,
  type SalesTimelineStepTone,
} from "@/lib/sales/sales-tracking-timeline";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import type {
  SalesTrackingQueryParams,
  SalesTrackingRow,
} from "@/types/sales-tracking";
import styles from "./SalesTrackingPage.module.css";

const PAGE_SIZE = 20;

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function soStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
      return "success";
    case "CONFIRMED":
    case "STOCK_CHECKED":
    case "PICKING":
    case "PACKED":
    case "PARTIALLY_ISSUED":
    case "AWAITING_CONFIRM":
      return "processing";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
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

function statusLabel(status?: string) {
  if (!status) return "รอเริ่ม";
  const map: Record<string, string> = {
    DONE: "เสร็จแล้ว",
    PENDING: "รอดำเนินการ",
    DRAFT: "ร่าง",
    CONFIRMED: "ยืนยันแล้ว",
    DELIVERED: "ส่งแล้ว",
    ACCEPTED: "ลูกค้าตอบรับ",
    SENT: "ส่งให้ลูกค้าแล้ว",
    CANCELLED: "ยกเลิก",
    REJECTED: "ปฏิเสธ",
    STOCK_CHECKED: "ตรวจสต๊อกแล้ว",
    PICKING: "จ่ายสินค้าแล้ว",
    PACKED: "บรรจุแล้ว",
    COMPLETED: "เสร็จสิ้น",
    PARTIALLY_ISSUED: "จ่ายบางส่วน",
    AWAITING_CONFIRM: "รอยืนยัน",
  };
  return map[status.toUpperCase()] ?? status;
}

function toneTagColor(tone: SalesTimelineStepTone): string {
  if (tone === "done") return "success";
  if (tone === "active") return "processing";
  if (tone === "cancelled") return "error";
  return "default";
}

type SummaryCard = {
  key: string;
  label: string;
  value?: number;
  filterStatus?: string;
};

export default function SalesTrackingPage() {
  const router = useRouter();
  const trackingActions = useScreenActionPermissions("SALES_TRACKING");

  const [keyword, setKeyword] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
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
  const detailQuery = useSalesTrackingDetailQuery(selectedSoId);
  const customersQuery = useCustomersQuery();

  const summary = summaryQuery.data?.data;
  const list = listQuery.data?.data;
  const customers = customersQuery.data?.data ?? [];

  const applyFilters = (overrides?: Partial<SalesTrackingQueryParams>) => {
    const nextPage = overrides?.page ?? 1;
    setPage(nextPage);
    setApplied({
      keyword: keyword.trim() || undefined,
      customerId,
      salesOrderStatus: status,
      dateFrom: dateRange?.[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange?.[1]?.format("YYYY-MM-DD"),
      page: nextPage,
      pageSize: PAGE_SIZE,
      ...overrides,
    });
  };

  const cards: SummaryCard[] = [
    {
      key: "qt",
      label: "รอลูกค้ายืนยัน QT",
      value: summary?.quotationAwaiting,
    },
    {
      key: "stock",
      label: "รอตรวจสต๊อก",
      value: summary?.soAwaitingStockCheck,
      filterStatus: "CONFIRMED",
    },
    {
      key: "picking",
      label: "รอ Picking",
      value: summary?.soAwaitingPicking,
      filterStatus: "STOCK_CHECKED",
    },
    {
      key: "packing",
      label: "รอ Packing",
      value: summary?.awaitingPacking,
      filterStatus: "PICKING",
    },
    {
      key: "delivery",
      label: "รอ Delivery",
      value: summary?.awaitingDelivery,
      filterStatus: "PACKED",
    },
    {
      key: "delivered",
      label: "ส่งแล้ว",
      value: summary?.delivered,
      filterStatus: "DELIVERED",
    },
    {
      key: "cancelled",
      label: "ยกเลิก",
      value: summary?.cancelled,
      filterStatus: "CANCELLED",
    },
  ];

  const columns: ColumnsType<SalesTrackingRow> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      {
        title: "SO",
        dataIndex: "salesOrderNo",
        width: 140,
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
        title: "ลูกค้า",
        dataIndex: "customerName",
        ellipsis: true,
        render: (v?: string) => v ?? "—",
      },
      {
        title: "วันที่ SO",
        dataIndex: "orderDate",
        width: 110,
        render: formatDate,
      },
      {
        title: "สถานะ SO",
        dataIndex: "salesOrderStatus",
        width: 140,
        render: (value: string) => (
          <Tag color={soStatusColor(value)}>
            {SALES_ORDER_STATUS_LABEL[value as SalesOrderStatus] ?? value}
          </Tag>
        ),
      },
      {
        title: "รอบจัดส่ง",
        key: "rounds",
        width: 110,
        align: "center",
        render: (_v, row) =>
          row.roundCount > 1 ? (
            <Tag color="blue">{row.roundCount} รอบ</Tag>
          ) : (
            <span>รอบเดียว</span>
          ),
      },
      {
        title: "เอกสารต่อเนื่อง",
        key: "docs",
        width: 180,
        render: (_v, row) =>
          // ใบที่แบ่งหลายรอบ: backend ไม่ส่งคอลัมน์ระดับใบมาให้ (เจตนา)
          // เพราะเลขของรอบเดียวจะทำให้เข้าใจผิดว่าเป็นของทั้งใบ
          row.roundCount > 1 ? (
            <span className={styles.docStack}>กางแถวเพื่อดูรายรอบ</span>
          ) : (
            <div className={styles.docStack}>
              <span>PK {row.pickingNo ?? "—"}</span>
              <span>PC {row.packingNo ?? "—"}</span>
              <span>DO {row.deliveryOrderNo ?? "—"}</span>
            </div>
          ),
      },
      {
        title: "ขั้นตอน",
        dataIndex: "currentStep",
        width: 150,
      },
      {
        title: "ทำถัดไป",
        dataIndex: "nextAction",
        ellipsis: true,
      },
      {
        title: "",
        key: "actions",
        width: 70,
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
    [page],
  );

  if (!trackingActions.canView) {
    return <AccessDenied screenCodes={["SALES_TRACKING"]} />;
  }

  const detail = detailQuery.data?.data;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <LineChartOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Tracking</p>
          <h1 className={styles.pageTitle}>ติดตามการขายและจัดส่ง</h1>
          <p className={styles.pageSubtitle}>
            ภาพรวม Quotation → SO → Stock Check → Picking → Packing → Delivery
            {trackingActions.canViewAll
              ? null
              : " · แสดงเฉพาะเอกสารที่คุณเป็นผู้สร้าง"}
          </p>
        </div>
      </header>

      <Row gutter={[12, 12]}>
        {cards.map((card) => {
          const clickable = Boolean(card.filterStatus);
          const active = status === card.filterStatus;
          return (
            <Col xs={12} sm={8} md={6} lg={3} key={card.key}>
              <Card
                size="small"
                className={`${styles.summaryCard} ${active ? styles.summaryCardActive : ""} ${clickable ? styles.summaryCardClickable : ""}`}
                onClick={() => {
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
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="เลข SO / QT / ลูกค้า"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => applyFilters({ page: 1 })}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ลูกค้า</label>
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
            <label>สถานะ SO</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(SALES_ORDER_STATUS_LABEL).map(
                ([value, label]) => ({
                  value,
                  label,
                }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่ SO</label>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              format="DD/MM/YYYY"
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
            ค้นหา
          </Button>
          <Button
            onClick={() => {
              setKeyword("");
              setCustomerId(undefined);
              setStatus(undefined);
              setDateRange(null);
              setPage(1);
              setApplied({ page: 1, pageSize: PAGE_SIZE });
            }}
          >
            ล้างตัวกรอง
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div>
            <p className={styles.toolbarTitle}>รายการใบสั่งขาย</p>
            <p className={styles.toolbarHint}>
              กดแถวเพื่อดูไทม์ไลน์ · กดเลข SO เพื่อเปิดรายละเอียด
            </p>
          </div>
          <span className={styles.tableCount}>
            {list?.total ?? 0} รายการ
          </span>
        </div>
        <Table
          rowKey="salesOrderId"
          className={styles.table}
          loading={listQuery.isLoading || listQuery.isFetching}
          columns={columns}
          dataSource={list?.items ?? []}
          scroll={{ x: 1200 }}
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
                    title: "รอบ",
                    dataIndex: "roundNo",
                    width: 70,
                    align: "center",
                    render: (v: number) => <Tag>รอบ {v}</Tag>,
                  },
                  {
                    title: "วันที่ต้องส่ง",
                    dataIndex: "deliveryDate",
                    width: 120,
                    render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
                  },
                  {
                    title: "สถานะรอบ",
                    dataIndex: "roundStatus",
                    width: 120,
                    render: (v: string) => (
                      <Tag>
                        {DELIVERY_SCHEDULE_STATUS_LABEL[
                          v as DeliveryScheduleStatus
                        ] ?? v}
                      </Tag>
                    ),
                  },
                  {
                    title: "ใบจ่าย",
                    dataIndex: "pickingNo",
                    render: (v?: string) => v ?? "—",
                  },
                  {
                    title: "ใบบรรจุ",
                    dataIndex: "packingNo",
                    render: (v?: string) => v ?? "—",
                  },
                  {
                    title: "ใบส่งของ",
                    dataIndex: "deliveryOrderNo",
                    render: (v?: string) => v ?? "—",
                  },
                  { title: "ขั้นตอน", dataIndex: "currentStep", width: 150 },
                  { title: "ต้องทำต่อ", dataIndex: "nextAction", width: 200 },
                ]}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: list?.total ?? 0,
            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
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
        size={460}
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
                ติดตามเส้นทางจากใบเสนอราคาจนถึงส่งมอบ
              </p>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSelectedSoId(undefined)}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <div className={styles.nextCard}>
              <div className={styles.nextLabel}>ขั้นตอนปัจจุบัน</div>
              <div className={styles.nextCurrent}>{detail.currentStep}</div>
              <div className={styles.nextAction}>
                <ArrowRightOutlined />
                <span>{detail.nextAction}</span>
              </div>
              <Button
                type="link"
                className={styles.openSoBtn}
                onClick={() =>
                  router.push(`/sales-orders/${detail.salesOrderId}`)
                }
              >
                เปิดใบสั่งขาย
              </Button>
            </div>

            <div className={styles.timeline}>
              {detail.timeline
                .filter((step) => step.step !== "Invoice")
                .map((step, index, visible) => {
                  const tone = resolveSalesTimelineStepTone(step);
                  return (
                    <div
                      key={`${step.step}-${index}`}
                      className={`${styles.timelineItem} ${styles[`tone_${tone}`]}`}
                    >
                      <div className={styles.timelineRail}>
                        <div className={styles.timelineDot}>
                          {toneIcon(tone) ?? stepIcon(step.step)}
                        </div>
                        {index < visible.length - 1 ? (
                          <div className={styles.timelineLine} />
                        ) : null}
                      </div>
                      <div className={styles.timelineCard}>
                        <div className={styles.timelineCardHead}>
                          <div className={styles.timelineStepIcon}>
                            {stepIcon(step.step)}
                          </div>
                          <div className={styles.timelineStepMeta}>
                            <div className={styles.timelineStepName}>
                              {salesTrackingStepLabel(step.step)}
                            </div>
                            <Tag
                              color={toneTagColor(tone)}
                              className={styles.timelineTag}
                            >
                              {statusLabel(step.status)}
                            </Tag>
                          </div>
                        </div>
                        <div className={styles.timelineDetails}>
                          <div className={styles.timelineDetailRow}>
                            <span>เอกสาร</span>
                            <strong>{step.documentNo ?? "—"}</strong>
                          </div>
                          <div className={styles.timelineDetailRow}>
                            <span>วันที่</span>
                            <strong>{formatDate(step.date)}</strong>
                          </div>
                          {step.actorName ? (
                            <div className={styles.timelineDetailRow}>
                              <span>โดย</span>
                              <strong>{step.actorName}</strong>
                            </div>
                          ) : null}
                        </div>
                        {step.href ? (
                          <Link href={step.href} className={styles.timelineLink}>
                            เปิดเอกสาร
                            <ExportOutlined />
                          </Link>
                        ) : (
                          <span className={styles.timelineLinkDisabled}>
                            ยังไม่มีเอกสาร
                          </span>
                        )}
                      </div>
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
