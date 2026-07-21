"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  App,
  Button,
  DatePicker,
  Pagination,
  Select,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { downloadRawTirePurchaseReportCsv } from "@/lib/api/raw-tire-purchase-receipts";
import { useRawTirePurchaseReportQuery } from "@/hooks/raw-tire-purchase-reports/useRawTirePurchaseReportQuery";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import { getAccessToken } from "@/lib/auth/token";
import type { RawTirePurchaseReportRow } from "@/types/raw-tire-purchase-reports";
import {
  PAYMENT_STATUS_LABEL,
  STOCK_POSTING_STATUS_LABEL,
} from "@/types/raw-tire-purchase-reports";
import styles from "./RawTirePurchaseReportPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatNumber(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PaymentStatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? styles.paidTone
      : status === "PARTIAL"
        ? styles.partialTone
        : styles.unpaidTone;

  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function RawTirePurchaseReportPage() {
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [sellerId, setSellerId] = useState<string | undefined>();
  const [tireClassificationId, setTireClassificationId] = useState<
    string | undefined
  >();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [applied, setApplied] = useState<{
    dateFrom?: string;
    dateTo?: string;
    sellerId?: string;
    tireClassificationId?: string;
    paymentStatus?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState(false);

  const sellersQuery = useSellersQuery({ isActive: true });
  const classificationsQuery = useTireClassificationsQuery();
  const query = useRawTirePurchaseReportQuery({ ...applied, page, limit });

  const sellers = sellersQuery.data?.data ?? [];
  const classifications = classificationsQuery.data?.data ?? [];
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;
  const summary = query.data?.data.summary;

  const applySearch = () => {
    setPage(1);
    setApplied({
      dateFrom: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
      dateTo: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
      sellerId,
      tireClassificationId,
      paymentStatus,
    });
  };

  const clearFilters = () => {
    setDateRange(null);
    setSellerId(undefined);
    setTireClassificationId(undefined);
    setPaymentStatus(undefined);
    setApplied({});
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadRawTirePurchaseReportCsv(getAccessToken(), applied);
    } catch {
      message.error("ดาวน์โหลดรายงานไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<RawTirePurchaseReportRow> = useMemo(
    () => [
      {
        title: "#",
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบรับซื้อ",
        dataIndex: "receiptNo",
        key: "receiptNo",
        render: (value: string) => (
          <span className={styles.receiptNo}>{value}</span>
        ),
      },
      {
        title: "วันที่รับซื้อ",
        dataIndex: "receiptDate",
        key: "receiptDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ผู้ขาย",
        key: "seller",
        render: (_v, row) =>
          row.sellerName
            ? `${row.sellerCode ?? ""} — ${row.sellerName}`
            : "—",
      },
      {
        title: "ทะเบียนรถ",
        dataIndex: "truckLicensePlate",
        key: "truckLicensePlate",
        render: (value?: string) => value ?? "—",
      },
      {
        title: "น้ำหนักคิดเงิน (กก.)",
        dataIndex: "payableWeightKg",
        key: "payableWeightKg",
        align: "right",
        render: (value: string) => formatNumber(value),
      },
      {
        title: "ยอดสุทธิ (บาท)",
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        render: (value: string) => formatNumber(value),
      },
      {
        title: "การชำระเงิน",
        dataIndex: "paymentStatus",
        key: "paymentStatus",
        width: 130,
        render: (value: string) => <PaymentStatusPill status={value} />,
      },
      {
        title: "สถานะเข้าคลัง",
        dataIndex: "stockPostingStatus",
        key: "stockPostingStatus",
        width: 130,
        render: (value: string) => STOCK_POSTING_STATUS_LABEL[value] ?? value,
      },
      {
        title: "",
        key: "actions",
        width: 60,
        render: (_v, row) => (
          <Link
            href={`/receiving/receipts/${row.id}`}
            className={styles.actionBtn}
            title="ดูรายละเอียด"
          >
            <EyeOutlined />
          </Link>
        ),
      },
    ],
    [limit, page],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeIcon} aria-hidden>
              <FileTextOutlined />
            </span>
            Reports · Raw Tire Purchase
          </div>
          <h1 className={styles.pageTitle}>รายงานรับซื้อยาง</h1>
          <p className={styles.pageSubtitle}>
            สรุปใบรับซื้อยางที่อนุมัติแล้ว (CONFIRMED) กรองตามช่วงวันที่ ผู้ขาย
            ประเภทยาง และสถานะชำระเงิน
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button
            className={styles.exportBtn}
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>จำนวนใบรับซื้อ</span>
          <span className={styles.statValue}>
            {summary?.totalReceipts ?? 0}
          </span>
          <span className={styles.statHint}>ตามเงื่อนไขที่กรอง</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>น้ำหนักสุทธิรวม</span>
          <span className={styles.statValue}>
            {summary ? formatNumber(summary.totalNetWeightKg) : "0.00"}
          </span>
          <span className={styles.statHint}>กิโลกรัม</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดเงินรวม</span>
          <span className={styles.statValue}>
            {summary ? formatNumber(summary.totalAmount) : "0.00"}
          </span>
          <span className={styles.statHint}>บาท</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่รับซื้อ</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={(values) =>
                setDateRange(
                  values as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
                )
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>ผู้ขาย</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={sellerId}
              onChange={setSellerId}
              loading={sellersQuery.isLoading}
              options={sellers.map((seller) => ({
                value: seller.id,
                label: `${seller.sellerCode} — ${seller.sellerName}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ประเภทยาง</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={tireClassificationId}
              onChange={setTireClassificationId}
              loading={classificationsQuery.isLoading}
              options={classifications.map((item) => ({
                value: item.id,
                label: `${item.classificationCode} — ${item.classificationName}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะชำระเงิน</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={Object.entries(PAYMENT_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applySearch}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{total}</strong> รายการ
          </div>
          <div className={styles.entriesBox}>
            <span>แสดง</span>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "20", value: 20 },
                { label: "50", value: 50 },
                { label: "100", value: 100 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <span>รายการ/หน้า</span>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ไม่พบใบรับซื้อยางตามเงื่อนไขที่ค้นหา</strong>
                ลองปรับช่วงวันที่หรือตัวกรองอื่น
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            แสดง {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} จาก {total}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
