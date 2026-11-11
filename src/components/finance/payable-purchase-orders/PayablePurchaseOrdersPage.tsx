"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  App,
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EyeOutlined, FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { usePayablePurchaseOrdersQuery } from "@/hooks/payable-purchase-orders/usePayablePurchaseOrders";
import { getPayablePurchaseOrders } from "@/lib/api/payable-purchase-orders";
import { fetchAllReportRows } from "@/lib/api/sales-reports";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import {
  PAYABLE_ITEM_STATUS_COLOR,
  PAYABLE_ITEM_STATUS_LABEL,
  type PayableItemStatus,
  type PayablePurchaseOrder,
  type PayableTermTypeFilter,
} from "@/types/payable-purchase-orders";
import { PAYMENT_TERM_TYPE_COLOR, PAYMENT_TERM_TYPE_LABEL } from "@/types/payment-terms";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

import styles from "@/components/finance/shared/finance-list-page.module.css";
import {
  describeTerm,
  formatThaiDate,
  money,
  SCREEN_CODE,
  TERM_TYPE_FILTER_LABEL,
  toPayableSheet,
} from "./payableFormat";
import PageHeader from "@/components/common/PageHeader";

const PAGE_SIZE = 20;
const DETAIL_BASE_PATH = "/finance/payables/creditors";

const emptySummary = { unpaid: 0, partial: 0, paid: 0, overdue: 0 };

export default function PayablePurchaseOrdersPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const t = useT();
  const [page, setPage] = useState(1);

  // draft filters
  const [dSearch, setDSearch] = useState("");
  const [dSupplier, setDSupplier] = useState("");
  const [dPoRange, setDPoRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [dTermType, setDTermType] = useState<PayableTermTypeFilter | undefined>();
  const [dStatus, setDStatus] = useState<PayableItemStatus | undefined>();

  // applied filters
  const [keyword, setKeyword] = useState("");
  const [supplier, setSupplier] = useState("");
  const [poRange, setPoRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [termType, setTermType] = useState<PayableTermTypeFilter | undefined>();
  const [status, setStatus] = useState<PayableItemStatus | undefined>();

  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const canExport = !isMatrixPermissionMode() || hasPermission(`${SCREEN_CODE}.EXPORT`);

  const applySearch = () => {
    setKeyword(dSearch.trim());
    setSupplier(dSupplier.trim());
    setPoRange(dPoRange);
    setTermType(dTermType);
    setStatus(dStatus);
    setPage(1);
  };

  const clearFilters = () => {
    setDSearch("");
    setDSupplier("");
    setDPoRange(null);
    setDTermType(undefined);
    setDStatus(undefined);
    setKeyword("");
    setSupplier("");
    setPoRange(null);
    setTermType(undefined);
    setStatus(undefined);
    setPage(1);
  };

  const filterParams = useMemo(
    () => ({
      search: keyword || undefined,
      supplier: supplier || undefined,
      poDateFrom: poRange?.[0]?.format("YYYY-MM-DD"),
      poDateTo: poRange?.[1]?.format("YYYY-MM-DD"),
      termType,
      status,
    }),
    [keyword, supplier, poRange, termType, status],
  );

  const listQuery = usePayablePurchaseOrdersQuery({
    ...filterParams,
    page,
    limit: PAGE_SIZE,
  });
  const summary = listQuery.data?.summary ?? emptySummary;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const all = await fetchAllReportRows((exportPage, limit) =>
        getPayablePurchaseOrders(getAccessToken(), {
          ...filterParams,
          page: exportPage,
          limit,
        }),
      );
      if (all.truncated) {
        message.warning(
          t("มี {total} รายการ — ไฟล์มีเฉพาะ {shown} รายการแรก", {
            total: all.total.toLocaleString("th-TH"),
            shown: all.rows.length.toLocaleString("th-TH"),
          }),
        );
      }
      const filters = [
        keyword ? `ค้นหา: ${keyword}` : null,
        supplier ? `ผู้ขาย: ${supplier}` : null,
        poRange
          ? `วันที่ PO: ${formatThaiDate(poRange[0].format("YYYY-MM-DD"))} - ${formatThaiDate(poRange[1].format("YYYY-MM-DD"))}`
          : null,
        termType ? `เงื่อนไข: ${TERM_TYPE_FILTER_LABEL[termType]}` : null,
        status ? `สถานะ: ${PAYABLE_ITEM_STATUS_LABEL[status]}` : null,
      ].filter((value): value is string => Boolean(value));
      await downloadTabularReport(
        format,
        toPayableSheet(all.rows, {
          filters,
          total: all.total,
          truncated: all.truncated,
        }),
      );
    } catch {
      message.error(t("ส่งออกรายการจ่ายเงินไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnsType<PayablePurchaseOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่ PO"),
      dataIndex: "poNo",
      width: 140,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: t("วันที่ PO"), dataIndex: "poDate", width: 110, render: formatThaiDate },
    {
      title: t("ผู้ขาย (Supplier)"),
      key: "creditor",
      width: 220,
      render: (_, row) =>
        row.creditor ? (
          <span>
            <Typography.Text type="secondary">{row.creditor.creditorCode}</Typography.Text>{" "}
            {row.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: t("เงื่อนไขการชำระเงิน"),
      key: "paymentTerm",
      width: 200,
      render: (_, row) =>
        row.paymentTerm ? (
          <Space orientation="vertical" size={0}>
            <Tag color={PAYMENT_TERM_TYPE_COLOR[row.paymentTerm.termType]}>
              {t(PAYMENT_TERM_TYPE_LABEL[row.paymentTerm.termType] ?? row.paymentTerm.termType)}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {describeTerm(row.paymentTerm)}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">{t("ไม่ระบุเงื่อนไข")}</Typography.Text>
        ),
    },
    {
      title: t("ยอดเงินตาม PO"),
      dataIndex: "totalAmount",
      width: 140,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: t("ค่าใช้จ่ายเพิ่มเติม (ตั้งหนี้แล้ว / ทั้งหมด)"),
      key: "extraCharges",
      width: 210,
      align: "right",
      render: (_: unknown, row: PayablePurchaseOrder) =>
        row.extraChargesAmount > 0 ? (
          <span>
            {money.format(row.extraChargesInvoiced)} / {money.format(row.extraChargesAmount)}
            {row.extraChargesRemaining > 0 ? (
              <Typography.Text type="warning" style={{ display: "block", fontSize: 12 }}>
                {t("ยังไม่ได้ตั้งหนี้")} {money.format(row.extraChargesRemaining)}
              </Typography.Text>
            ) : null}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: t("ยอดที่ต้องชำระตามเงื่อนไข"),
      dataIndex: "amountDue",
      width: 170,
      align: "right",
      render: (value: number) => <Typography.Text strong>{money.format(value)}</Typography.Text>,
    },
    {
      title: t("วันครบกำหนดชำระ"),
      key: "dueDate",
      width: 180,
      align: "center",
      render: (_v, row) => {
        const aps = row.apDueDates ?? [];
        if (aps.length === 0) {
          return (
            <Tooltip title={t("ประมาณการจากเงื่อนไขใน PO (ยังไม่มีใบตั้งหนี้)")}>
              <span>{formatThaiDate(row.dueDate)}</span>
            </Tooltip>
          );
        }
        if (aps.length === 1) {
          return (
            <Link href={`/finance/payables/ap-invoices/${aps[0].id}`}>
              {formatThaiDate(aps[0].dueDate)}
            </Link>
          );
        }
        return (
          <Tooltip
            title={
              <div>
                {aps.map((ap) => (
                  <div key={ap.id}>
                    {ap.docNo}: {formatThaiDate(ap.dueDate)}
                  </div>
                ))}
              </div>
            }
          >
            <span>
              {formatThaiDate(row.dueDate)}
              <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                {t("{n} ใบตั้งหนี้", { n: aps.length })}
              </Typography.Text>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t("สถานะรายการ"),
      dataIndex: "payableStatus",
      width: 140,
      render: (value: PayableItemStatus) => (
        <Tag color={PAYABLE_ITEM_STATUS_COLOR[value] ?? "default"}>
          {t(PAYABLE_ITEM_STATUS_LABEL[value] ?? value)}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            router.push(`${DETAIL_BASE_PATH}/${row.id}`);
          }}
        >
          {t("ดูรายละเอียด")}
        </Button>
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title={t("รายการจ่ายเงิน")}
        subtitle={t(
          "ใบสั่งซื้อที่อนุมัติแล้ว 1 ใบต่อ 1 รายการ — หลังตั้งหนี้แล้ววันครบกำหนดมาจากใบตั้งหนี้ (แสดงวันเร็วสุดถ้ามีหลายใบ) · ยังไม่ตั้งหนี้ใช้ประมาณการจากเงื่อนไขใน PO · สถานะเทียบยอดจ่ายจริงกับยอดทั้งใบ",
        )}
        actions={
          <>
<ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
          csvRequiresExport
        />
          </>
        }
      />

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t(PAYABLE_ITEM_STATUS_LABEL.UNPAID)}</span>
          <span className={styles.statValue}>{summary.unpaid.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t(PAYABLE_ITEM_STATUS_LABEL.PARTIAL)}</span>
          <span className={styles.statValue}>{summary.partial.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t(PAYABLE_ITEM_STATUS_LABEL.PAID)}</span>
          <span className={styles.statValue}>{summary.paid.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t(PAYABLE_ITEM_STATUS_LABEL.OVERDUE)}</span>
          <span className={styles.statValue}>{summary.overdue.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
            <label>{t("ค้นหาเลขที่ PO")}</label>
            <Input
              allowClear
              placeholder={t("เลขที่ PO / รหัส / ชื่อผู้ขาย")}
              value={dSearch}
              onChange={(event) => setDSearch(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ผู้ขาย (Supplier)")}</label>
            <Input
              allowClear
              placeholder={t("รหัสหรือชื่อผู้ขาย")}
              value={dSupplier}
              onChange={(event) => setDSupplier(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่ PO")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/BBBB"
              value={dPoRange}
              onChange={(values) =>
                setDPoRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
              }
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("เงื่อนไขการชำระเงิน")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dTermType}
              onChange={setDTermType}
              options={(Object.keys(TERM_TYPE_FILTER_LABEL) as PayableTermTypeFilter[]).map(
                (value) => ({ value, label: t(TERM_TYPE_FILTER_LABEL[value]) }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะรายการ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dStatus}
              onChange={setDStatus}
              options={(Object.keys(PAYABLE_ITEM_STATUS_LABEL) as PayableItemStatus[]).map(
                (value) => ({ value, label: t(PAYABLE_ITEM_STATUS_LABEL[value]) }),
              )}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
            <Button
              type="primary"
              className={styles.searchBtn}
              icon={<SearchOutlined />}
              onClick={applySearch}
            >
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รายการจ่ายเงิน")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {t("{n} รายการ", { n: (listQuery.data?.total ?? 0).toLocaleString("th-TH") })}
          </span>
        </div>

        {listQuery.isError ? (
          <Typography.Text type="danger">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : t("โหลดรายการจ่ายเงินไม่สำเร็จ")}
          </Typography.Text>
        ) : (
          <Table
            className={masterStyles.dataTable}
            size="middle"
            bordered={false}
            rowKey="id"
            loading={listQuery.isFetching}
            columns={columns}
            dataSource={listQuery.data?.items ?? []}
            scroll={{ x: 1700 }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: listQuery.data?.total ?? 0,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) =>
                t("ทั้งหมด {n} รายการ", { n: total.toLocaleString("th-TH") }),
            }}
            locale={{ emptyText: t("ไม่มีใบสั่งซื้อที่อนุมัติแล้วตามเงื่อนไขที่เลือก") }}
            onRow={(record) => ({
              onClick: () => router.push(`${DETAIL_BASE_PATH}/${record.id}`),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </div>
    </section>
  );
}
