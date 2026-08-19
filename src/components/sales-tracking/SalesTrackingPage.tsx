"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Col,
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
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  LineChartOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  ExportOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  useSalesTrackingDetailQuery,
  useSalesTrackingListQuery,
  useSalesTrackingSummaryQuery,
} from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { SALES_ORDER_STATUS_LABEL } from "@/types/sales-orders";
import type {
  SalesTrackingRow,
  SalesTrackingTimelineStep,
} from "@/types/sales-tracking";
import styles from "./SalesTrackingPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

type StepTone = "done" | "active" | "pending" | "cancelled";

function resolveStepTone(step: SalesTrackingTimelineStep): StepTone {
  const status = (step.status ?? "").toUpperCase();

  if (["CANCELLED", "REJECTED", "EXPIRED"].includes(status)) {
    return "cancelled";
  }

  if (
    ["DONE", "DELIVERED", "ACCEPTED", "COMPLETED", "PARTIALLY_ISSUED"].includes(
      status,
    ) ||
    status.endsWith("/PAID") ||
    status === "PAID"
  ) {
    return "done";
  }

  if (status.endsWith("/PARTIALLY_PAID") || status.endsWith("/UNPAID")) {
    return "active";
  }

  if (status === "CONFIRMED") {
    // Delivery confirmed = พร้อม Mark Delivered / SO confirmed = ขั้น SO เสร็จแล้ว
    return step.step === "Delivery" ? "active" : "done";
  }

  if (["STOCK_CHECKED", "PICKING", "PACKED", "POSTED"].includes(status)) {
    return "done";
  }

  if (["PENDING", "DRAFT", "SENT"].includes(status)) {
    return "active";
  }

  return "pending";
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
    case "Invoice":
      return <ExportOutlined />;
    default:
      return <ClockCircleFilled />;
  }
}

function toneIcon(tone: StepTone) {
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
    "POSTED/UNPAID": "โพสต์แล้ว / รอชำระ",
    "POSTED/PARTIALLY_PAID": "โพสต์แล้ว / ชำระบางส่วน",
    "POSTED/PAID": "โพสต์แล้ว / ชำระครบ",
    POSTED: "โพสต์แล้ว",
    UNPAID: "รอชำระ",
    PARTIALLY_PAID: "ชำระบางส่วน",
    PAID: "ชำระครบ",
  };
  return map[status.toUpperCase()] ?? status;
}

function toneTagColor(tone: StepTone): string {
  if (tone === "done") return "success";
  if (tone === "active") return "processing";
  if (tone === "cancelled") return "error";
  return "default";
}

export default function SalesTrackingPage() {
  const [keyword, setKeyword] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<{
    keyword?: string;
    customerId?: string;
    salesOrderStatus?: string;
    page: number;
    pageSize: number;
  }>({ page: 1, pageSize: 20 });
  const [selectedSoId, setSelectedSoId] = useState<string | undefined>();

  const summaryQuery = useSalesTrackingSummaryQuery();
  const listQuery = useSalesTrackingListQuery(applied);
  const detailQuery = useSalesTrackingDetailQuery(selectedSoId);
  const customersQuery = useCustomersQuery();

  const summary = summaryQuery.data?.data;
  const list = listQuery.data?.data;
  const customers = customersQuery.data?.data ?? [];

  const cards = [
    { label: "รอลูกค้ายืนยัน QT", value: summary?.quotationAwaiting },
    { label: "รอตรวจสต๊อก", value: summary?.soAwaitingStockCheck },
    { label: "รอ Picking", value: summary?.soAwaitingPicking },
    { label: "รอ Packing", value: summary?.awaitingPacking },
    { label: "รอ Delivery", value: summary?.awaitingDelivery },
    { label: "ส่งแล้ว", value: summary?.delivered },
    { label: "ยกเลิก", value: summary?.cancelled },
  ];

  const columns: ColumnsType<SalesTrackingRow> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * 20 + index + 1,
      },
      {
        title: "SO",
        dataIndex: "salesOrderNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: "QT",
        dataIndex: "quotationNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "ลูกค้า",
        dataIndex: "customerName",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "วันที่",
        dataIndex: "orderDate",
        width: 110,
        render: formatDate,
      },
      { title: "สถานะ SO", dataIndex: "salesOrderStatus", width: 120 },
      { title: "ขั้นตอน", dataIndex: "currentStep" },
      { title: "Next", dataIndex: "nextAction" },
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
            ดูภาพรวม Quotation → SO → Stock Check → Picking → Packing → Delivery
            (จบที่ส่งสินค้า)
          </p>
        </div>
      </header>

      <Row gutter={[12, 12]}>
        {cards.map((card) => (
          <Col xs={12} sm={8} md={6} lg={3} key={card.label}>
            <Card size="small">
              <div style={{ fontSize: 12, color: "#8a9199" }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {card.value ?? "—"}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
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
        </div>
        <div className={styles.filterActions}>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              setApplied({
                keyword: keyword.trim() || undefined,
                customerId,
                salesOrderStatus: status,
                page: 1,
                pageSize: 20,
              });
            }}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="salesOrderId"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={list?.items ?? []}
          pagination={{
            current: page,
            pageSize: 20,
            total: list?.total ?? 0,
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
            </div>

            <div className={styles.timeline}>
              {detail.timeline
                .filter((step) => step.step !== "Invoice")
                .map((step, index, visible) => {
                const tone = resolveStepTone(step);
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
                            {step.step}
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
