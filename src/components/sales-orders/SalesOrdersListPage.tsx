"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useSalesOrdersQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  resolveSalesOrderProgress,
  SALES_ORDER_FLOW_STEPS,
} from "@/lib/sales/sales-order-progress";
import { salesOrderRevisionStamp } from "@/lib/datetime/thai-buddhist-date";
import type { SalesOrder } from "@/types/sales-orders";
import {
  isPreConfirmSalesOrderStatus,
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import styles from "./SalesOrdersListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

/**
 * กลุ่มสรุปด้านบน — จัดตาม "ใครถืองานอยู่" ไม่ใช่ไล่ตามชื่อสถานะ
 *
 * ฝ่ายขายเปิดหน้านี้มาเพื่อตอบคำถามเดียว: มีใบไหนค้างที่ฉันบ้าง
 * การไล่สถานะดิบทั้ง 10 ตัวเป็นการ์ดจะกลายเป็นแถวตัวเลขที่ไม่มีใครอ่าน
 */
const SUMMARY_BUCKETS = [
  {
    key: "waiting",
    label: "รอยืนยัน",
    hint: "อยู่ที่ฝ่ายขาย",
    tone: "warn",
    statuses: ["DRAFT", "AWAITING_CONFIRM"],
  },
  {
    key: "running",
    label: "กำลังดำเนินการ",
    hint: "อยู่ที่คลัง",
    tone: "info",
    statuses: [
      "CONFIRMED",
      "STOCK_CHECKED",
      "PICKING",
      "PACKED",
      "PARTIALLY_ISSUED",
    ],
  },
  {
    key: "done",
    label: "ส่งแล้ว",
    hint: "จบงาน",
    tone: "done",
    statuses: ["DELIVERED", "COMPLETED"],
  },
  {
    key: "cancelled",
    label: "ยกเลิก",
    hint: "ไม่นับเป็นยอด",
    tone: "muted",
    statuses: ["CANCELLED"],
  },
] as const;

type SummaryBucketKey = (typeof SUMMARY_BUCKETS)[number]["key"];

const PAGE_SIZE = 10;

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CONFIRMED":
    case "STOCK_CHECKED":
    case "PICKING":
    case "PACKED":
    case "DELIVERED":
    case "PARTIALLY_ISSUED":
      return "processing";
    case "CANCELLED":
      return "default";
    default:
      return "warning";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * ขั้นตอน + สถานะ รวมเป็นช่องเดียว
 *
 * เดิมแยกสองคอลัมน์กว้างรวม 360px ทั้งที่พูดเรื่องเดียวกัน — ช่องขั้นตอนบอกชื่อขั้น
 * ปัจจุบันอยู่แล้ว แล้วมี Tag สถานะซ้ำอีกช่องข้าง ๆ · ยุบรวมแล้วประหยัดไป ~130px
 * ซึ่งเป็นตัวที่ทำให้ตารางต้องเลื่อนแนวนอน
 */
function SalesOrderProgressCell({
  status,
  deliveryStatus,
}: {
  status: string;
  deliveryStatus?: string;
}) {
  const progress = resolveSalesOrderProgress(status, deliveryStatus);
  return (
    <div
      className={`${styles.progressCell} ${styles[`progress_${progress.tone}`]}`}
    >
      <div className={styles.progressMeta}>
        <Tag color={statusColor(status)} className={styles.progressStatusTag}>
          {SALES_ORDER_STATUS_LABEL[status as SalesOrderStatus] ?? status}
        </Tag>
        <span className={styles.progressCount}>
          {progress.tone === "stopped" && progress.current === 0
            ? "—"
            : `${progress.inProgress}/${progress.total}`}
        </span>
      </div>
      <div className={styles.progressLabelRow}>
        <span className={styles.progressLabel}>
          {progress.currentStepLabel}
          {progress.tone !== "done" && progress.tone !== "stopped"
            ? ` · ${progress.label}`
            : ""}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        style={{
          gridTemplateColumns: `repeat(${progress.total}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {SALES_ORDER_FLOW_STEPS.map((step, index) => {
          const stepNo = index + 1;
          const filled = stepNo <= progress.current;
          const current =
            stepNo === progress.inProgress && progress.tone !== "stopped";
          return (
            <span
              key={step.key}
              className={[
                styles.progressSeg,
                filled ? styles.progressSegOn : "",
                current ? styles.progressSegCurrent : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={step.label}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function SalesOrdersListPage() {
  const router = useRouter();
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canViewAll = salesOrderActions.canViewAll;
  const [soNo, setSoNo] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [applied, setApplied] = useState<{
    soNo?: string;
    customerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    itemIds?: string[];
  }>({});

  const customersQuery = useCustomersQuery();
  const customers = customersQuery.data?.data ?? [];
  const itemsQuery = useItemsQuery({
    isActive: true,
    isFinishedGood: true,
    isSalesItem: true,
  });
  const catalogItems = itemsQuery.data?.data ?? [];
  const itemOptions = catalogItems.map((item) => ({
    value: item.id,
    label: `${item.itemCode} — ${item.itemNameTh}`,
  }));
  const query = useSalesOrdersQuery(applied);
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  /*
    กรองด้วยการ์ดสรุปทำฝั่ง client เพราะหน้านี้ดึงมาทั้งชุดแล้วแบ่งหน้าเองอยู่แล้ว
    (Table เป็นคนแบ่งหน้า ไม่ได้ยิง API ต่อหน้า) · และการ์ดหนึ่งใบครอบหลายสถานะ
    ซึ่ง query param `status` ของ API รับได้ทีละตัว
  */
  const [bucket, setBucket] = useState<SummaryBucketKey | null>(null);
  /* ต้องรู้หน้าปัจจุบันเองเพื่อให้คอลัมน์ "ลำดับ" นับต่อเนื่องข้ามหน้า */
  const [page, setPage] = useState(1);

  const bucketCounts = useMemo(() => {
    const counts = new Map<SummaryBucketKey, number>();
    for (const item of SUMMARY_BUCKETS) {
      counts.set(
        item.key,
        rows.filter((row) =>
          (item.statuses as readonly string[]).includes(row.status),
        ).length,
      );
    }
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (!bucket) return rows;
    const active = SUMMARY_BUCKETS.find((item) => item.key === bucket);
    if (!active) return rows;
    return rows.filter((row) =>
      (active.statuses as readonly string[]).includes(row.status),
    );
  }, [rows, bucket]);

  const applyFilters = () => {
    setApplied({
      soNo: soNo.trim() || undefined,
      customerId,
      status,
      dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
      dateTo: date ? date.format("YYYY-MM-DD") : undefined,
      itemIds: itemIds.length ? itemIds : undefined,
    });
    setPage(1);
  };

  const clearFilters = () => {
    setSoNo("");
    setCustomerId(undefined);
    setStatus(undefined);
    setDate(null);
    setItemIds([]);
    setApplied({});
    setBucket(null);
    setPage(1);
  };

  const columns: ColumnsType<SalesOrder> = useMemo(
    () => [
      {
        /*
          เลขลำดับในหน้า — ไม่ใช่ข้อมูลของเอกสาร แต่คนใช้อ้างอิงกันด้วยปากว่า
          "แถวที่ 3" ตอนคุยงาน จึงต้องมี · นับต่อเนื่องข้ามหน้าตามเลขหน้าปัจจุบัน
        */
        title: "ลำดับ",
        key: "seq",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      {
        title: "เลขที่",
        dataIndex: "soNo",
        width: 170,
        onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        render: (_value: string, row) => (
          <div className={styles.soNoCell}>
            <span className={styles.prNo}>{row.soNo}</span>
            <span className={styles.revisionStamp}>
              {salesOrderRevisionStamp(row.revisionNo, row.revisedAt)}
            </span>
          </div>
        ),
      },
      {
        title: "วันที่",
        dataIndex: "soDate",
        width: 100,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ลูกค้า",
        key: "customer",
        ellipsis: true,
        render: (_v, row) =>
          row.customer
            ? `${row.customer.customerCode} — ${row.customer.nameTh}`
            : "—",
      },
      {
        title: "สินค้า",
        key: "items",
        width: 230,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: "ผู้สร้าง",
        key: "createdBy",
        width: 120,
        ellipsis: true,
        render: (_v, row) =>
          row.createdBy?.displayName?.trim() ||
          row.createdBy?.username ||
          "—",
      },
      {
        title: "ยอดสุทธิ",
        dataIndex: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: "ขั้นตอน",
        key: "progress",
        width: 230,
        render: (_v, row) => (
          <SalesOrderProgressCell
            status={row.status}
            deliveryStatus={row.deliveryStatus}
          />
        ),
      },
      {
        /*
          ใช้ RowActionsMenu แบบเดียวกับหน้ารายการอื่นของระบบ (ใบขอซื้อ ฯลฯ)
          แทนปุ่มรูปตาเดี่ยว ๆ ของเดิม — ได้ชื่อเมนูอ่านออก กดด้วยคีย์บอร์ดได้
          และเพิ่ม "แก้ไข" เข้ามาได้โดยไม่ต้องหาที่วางปุ่มเพิ่ม

          ยังไม่มี route /sales-orders/[id]/edit แยก — การแก้ไขทำที่หน้ารายละเอียด
          เมนูแก้ไขจึงพาไปหน้าเดียวกัน แต่โผล่เฉพาะใบที่ยังแก้ได้ (ก่อนยืนยัน)
          จะได้ไม่หลอกให้กดเข้าไปแล้วพบว่าแก้ไม่ได้
        */
        title: "จัดการ",
        key: "actions",
        width: 80,
        align: "center",
        fixed: "right",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={`เมนูจัดการ ${row.soNo}`}
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "ดูรายละเอียด",
                onClick: () => router.push(`/sales-orders/${row.id}`),
              },
              isPreConfirmSalesOrderStatus(row.status) &&
                salesOrderActions.canEdit && {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "แก้ไข",
                  onClick: () => router.push(`/sales-orders/${row.id}`),
                },
            ]}
          />
        ),
      },
    ],
    [page, router, salesOrderActions.canEdit],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="ขาย · ใบสั่งขาย"
        icon={<ShoppingCartOutlined />}
        title="ใบสั่งขาย"
        subtitle={<>ติดตาม {SALES_ORDER_FLOW_STEPS.length} ขั้นตอน:{" "}
            {SALES_ORDER_FLOW_STEPS.map((step) => step.label).join(" → ")}
            {!canViewAll ? " · แสดงเฉพาะเอกสารที่คุณสร้าง" : ""}</>}
      >
{/* สร้างจาก SALES_ORDER_FLOW_STEPS ไม่ hardcode — เดิมเขียน 6 ขั้น
              ค้างไว้ ไม่ตรงกับแถบความคืบหน้าที่เหลือ 5 ขั้นหลังถอดขั้นตรวจสต๊อก */}
      </PageHeader>

      <section className={styles.summaryGrid}>
        {SUMMARY_BUCKETS.map((item) => {
          const active = bucket === item.key;
          return (
            <button
              key={item.key}
              type="button"
              // กดซ้ำที่ใบเดิม = ปลดตัวกรอง จะได้ไม่ต้องไปหาปุ่มเคลียร์
              onClick={() => {
                setBucket(active ? null : item.key);
                setPage(1);
              }}
              className={[
                styles.summaryCard,
                styles[`summary_${item.tone}`],
                active ? styles.summaryCardActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
            >
              <span className={styles.summaryLabel}>{item.label}</span>
              <strong className={styles.summaryValue}>
                {bucketCounts.get(item.key) ?? 0}
              </strong>
              <span className={styles.summaryHint}>{item.hint}</span>
            </button>
          );
        })}
      </section>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่</label>
            <Input
              allowClear
              placeholder="SO-..."
              value={soNo}
              onChange={(e) => setSoNo(e.target.value)}
              onPressEnter={applyFilters}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สินค้า</label>
            <Select
              allowClear
              showSearch
              mode="multiple"
              maxTagCount="responsive"
              optionFilterProp="label"
              placeholder="เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก"
              aria-label="สินค้าในใบสั่งขาย"
              value={itemIds}
              onChange={(value) => setItemIds(value)}
              style={{ width: "100%" }}
              loading={itemsQuery.isLoading}
              options={itemOptions}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ลูกค้า</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={customerId}
              onChange={setCustomerId}
              style={{ width: "100%" }}
              loading={customersQuery.isLoading}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={Object.entries(SALES_ORDER_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่</label>
            <DatePicker
              value={date}
              onChange={setDate}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="เลือกวันที่"
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={applyFilters}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{visibleRows.length}</strong> รายการ
            {bucket ? (
              <>
                {" "}
                <button
                  type="button"
                  className={styles.clearBucket}
                  onClick={() => {
                    setBucket(null);
                    setPage(1);
                  }}
                >
                  ล้างตัวกรองการ์ด
                </button>
              </>
            ) : null}
          </div>
        </div>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={visibleRows}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            onChange: setPage,
          }}
          className={styles.table}
          /* ยุบขั้นตอน+สถานะเป็นช่องเดียวแล้ว ยังแคบกว่าเดิม (เดิม 1280) */
          scroll={{ x: 1200 }}
          onRow={(row) => ({
            onClick: () => router.push(`/sales-orders/${row.id}`),
          })}
          locale={{ emptyText: "ยังไม่มีใบสั่งขาย" }}
        />
      </section>
    </div>
  );
}
