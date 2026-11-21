"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Checkbox, DatePicker, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import pageStyles from "./ar-receipts-list.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useArAwaitingOrdersQuery,
  useArReceiptsQuery,
} from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { ArReceiptRelatedDocsInline } from "./ArReceiptRelatedDocs";
import {
  awaitingOrderHref,
  DELIVERY_LABEL,
  isAdvanceAwaiting,
} from "@/components/ar-receipts/ArAwaitingOrdersPage";
import { arReceiptRoutes } from "@/lib/sales/ar-routes";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_COLOR,
  AR_RECEIPT_STATUS_LABEL,
  AWAITING_PAY_STATUS_COLOR,
  AWAITING_PAY_STATUS_LABEL,
  type ArReceipt,
  type AwaitingOrder,
} from "@/types/ar-receipts";

const PAGE_SIZE = 20;

function seqColumn<T>(page: number, label: string): ColumnsType<T>[number] {
  return {
    title: label,
    key: "seq",
    width: 76,
    align: "center",
    render: (_v, _r, index) => (
      <span className={masterStyles.orderBadge}>{(page - 1) * PAGE_SIZE + index + 1}</span>
    ),
  };
}

function CustomerCell({ code, name }: { code?: string | null; name?: string | null }) {
  return (
    <div className={pageStyles.customer}>
      <span className={pageStyles.customerName}>{name || "—"}</span>
      {code ? <span className={pageStyles.customerCode}>{code}</span> : null}
    </div>
  );
}

function MoneyCell({ value, strong }: { value: string; strong?: boolean }) {
  const text = money.format(Number(value));
  return <span className={pageStyles.money}>{strong ? <strong>{text}</strong> : text}</span>;
}

/** ใบสั่งขายที่ยังมียอดค้าง — วางเหนือใบรับชำระที่บันทึกแล้ว */
function AwaitingPaymentSection() {
  const t = useT();
  const receiptPerms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const advancePerms = useScreenActionPermissions("FINANCE_ADVANCE_RECEIPTS");
  const arPerms = useScreenActionPermissions("FINANCE_AR_INVOICES");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [termGroup, setTermGroup] = useState<"PREPAY" | "ON_DELIVERY_OR_CREDIT" | undefined>();
  const [payStatus, setPayStatus] = useState<string | undefined>();
  const [deliveryStatus, setDeliveryStatus] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);

  const query = useArAwaitingOrdersQuery({
    page,
    limit: PAGE_SIZE,
    keyword: keyword || undefined,
    termGroup,
    payStatus,
    deliveryStatus,
    overdueOnly: overdueOnly || undefined,
  });

  const columns: ColumnsType<AwaitingOrder> = [
    seqColumn<AwaitingOrder>(page, t("ลำดับ")),
    {
      title: t("เลขที่ SO"),
      dataIndex: "soNo",
      width: 160,
      render: (v: string, r) => (
        <Link href={`/sales-orders/${r.salesOrderId}`} className={pageStyles.docNo}>
          <strong>{v}</strong>
        </Link>
      ),
    },
    { title: t("วันที่ SO"), dataIndex: "soDate", width: 128, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ลูกค้า"),
      key: "customer",
      width: 240,
      render: (_v, r) => <CustomerCell code={r.customerCode} name={r.customerName} />,
    },
    {
      title: t("คงค้าง"),
      dataIndex: "outstandingAmount",
      align: "right",
      width: 150,
      render: (v: string) => <MoneyCell value={v} strong />,
    },
    {
      title: t("ครบกำหนด"),
      dataIndex: "paymentDueDate",
      width: 180,
      render: (v: string | undefined, r) =>
        v ? (
          <span className={pageStyles.due}>
            {formatThaiDate(v)}
            {r.isOverdue ? <Tag color="red">{t("เกินกำหนด")}</Tag> : null}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "payStatus",
      width: 140,
      render: (v: string) => (
        <Tag color={AWAITING_PAY_STATUS_COLOR[v] ?? "default"}>{t(AWAITING_PAY_STATUS_LABEL[v] ?? v)}</Tag>
      ),
    },
    {
      title: "",
      key: "action",
      width: 168,
      render: (_v, r) => {
        const advance = isAdvanceAwaiting(r);
        const allowed = advance
          ? advancePerms.canAdd
          : r.targetPage === "RECEIPT"
            ? receiptPerms.canAdd
            : arPerms.canView;
        if (!allowed) return null;
        return (
          <Link href={awaitingOrderHref(r)}>
            <Button size="small" type={r.targetPage === "RECEIPT" ? "primary" : "default"}>
              {advance ? t("รับเงินล่วงหน้า") : r.targetPage === "RECEIPT" ? t("รับชำระเงิน") : t("ไปใบตั้งลูกหนี้")}
            </Button>
          </Link>
        );
      },
    },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <div className={masterStyles.tableCard}>
      <div className={masterStyles.tableHeader}>
        <div>
          <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
          <h3>{t("รอรับชำระ")}</h3>
          <p>{t("ใบสั่งขาย (SO) ที่ยังใช้งานและยอดยังไม่ครบ — รอรับเงินจากลูกค้า")}</p>
        </div>
        <span className={masterStyles.tableCount}>
          {(query.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}
          {" · "}
          {money.format(Number(query.data?.summary.outstandingTotal ?? 0))} {t("บาท")}
        </span>
      </div>
      <section className={`${styles.filterCard} ${pageStyles.filterInset}`}>
        <div className={styles.filterRow}>
          <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("เลขที่ SO / ลูกค้า")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={apply}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("เงื่อนไขชำระ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={termGroup}
              onChange={(v) => {
                setTermGroup(v);
                setPage(1);
              }}
              options={[
                { value: "PREPAY", label: t("ชำระล่วงหน้า / มัดจำบางส่วน") },
                { value: "ON_DELIVERY_OR_CREDIT", label: t("ชำระเมื่อรับสินค้า / เครดิต") },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={payStatus}
              onChange={(v) => {
                setPayStatus(v);
                setPage(1);
              }}
              options={Object.entries(AWAITING_PAY_STATUS_LABEL).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะส่งของ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={deliveryStatus}
              onChange={(v) => {
                setDeliveryStatus(v);
                setPage(1);
              }}
              options={Object.entries(DELIVERY_LABEL).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>&nbsp;</label>
            <Checkbox
              checked={overdueOnly}
              onChange={(e) => {
                setOverdueOnly(e.target.checked);
                setPage(1);
              }}
            >
              {t("เฉพาะเกินกำหนด")}
            </Checkbox>
          </div>
          <div className={styles.filterActions}>
            <Button
              onClick={() => {
                setSearch("");
                setKeyword("");
                setTermGroup(undefined);
                setPayStatus(undefined);
                setDeliveryStatus(undefined);
                setOverdueOnly(false);
                setPage(1);
              }}
            >
              {t("เคลียร์")}
            </Button>
            <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={apply}>
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>
      <Table
        className={`${masterStyles.dataTable} ${pageStyles.table}`}
        size="middle"
        bordered={false}
        rowKey="salesOrderId"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: query.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
        }}
        scroll={{ x: 1280 }}
        locale={{ emptyText: t("ไม่มีรายการรอรับชำระ") }}
      />
    </div>
  );
}

type Props = {
  /** payment = หน้ารับชำระ (มีปุ่มบันทึกรับชำระ) · receipt = หน้าใบเสร็จรับเงิน (อ่านอย่างเดียว) */
  variant: "payment" | "receipt";
};

/** รายการใบรับชำระเงิน / ใบเสร็จรับเงิน ฝั่งขาย */
export default function ArReceiptsListPage({ variant }: Props) {
  const t = useT();
  const screen = variant === "payment" ? "FINANCE_PAYMENT_RECEIPTS" : "FINANCE_RECEIPTS";
  const perms = useScreenActionPermissions(screen);
  const addPerms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const query = useArReceiptsQuery({
    page,
    limit: PAGE_SIZE,
    keyword,
    status,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  });

  if (!perms.canView) return <AccessDenied screenCodes={[screen]} />;

  const receiptColumns: ColumnsType<ArReceipt> = [
    seqColumn<ArReceipt>(page, t("ลำดับ")),
    {
      title: t("เลขที่ใบเสร็จ"),
      dataIndex: "receiptNo",
      width: 170,
      render: (v: string, r) => (
        <Link href={arReceiptRoutes.detail(r.id)} className={pageStyles.docNo}>
          <strong>{v}</strong>
        </Link>
      ),
    },
    {
      title: t("ลูกค้า"),
      key: "customer",
      width: 240,
      render: (_v, r) => <CustomerCell code={r.customerCode} name={r.customerName} />,
    },
    { title: t("วันที่รับเงิน"), dataIndex: "receiptDate", width: 140, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ยอดเงิน"),
      dataIndex: "receivedAmount",
      align: "right",
      width: 150,
      render: (v: string) => <MoneyCell value={v} strong />,
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={AR_RECEIPT_STATUS_COLOR[v] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[v] ?? v)}</Tag>,
    },
  ];

  const columns: ColumnsType<ArReceipt> = [
    seqColumn<ArReceipt>(page, t("ลำดับ")),
    {
      title: t("เลขที่"),
      dataIndex: "receiptNo",
      width: 160,
      render: (v: string, r) => (
        <Link href={arReceiptRoutes.detail(r.id)} className={pageStyles.docNo}>
          <strong>{v}</strong>
        </Link>
      ),
    },
    { title: t("วันที่"), dataIndex: "receiptDate", width: 128, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ลูกค้า"),
      key: "customer",
      width: 220,
      render: (_v, r) => <CustomerCell code={r.customerCode} name={r.customerName} />,
    },
    {
      title: t("อ้างอิง SO / เอกสารที่เกี่ยวข้อง"),
      key: "related",
      width: 280,
      render: (_v, r) => <ArReceiptRelatedDocsInline receipt={r} />,
    },
    {
      title: t("วิธีรับชำระ"),
      dataIndex: "paymentMethod",
      width: 130,
      render: (v: string) => t(AR_PAYMENT_METHOD_LABEL[v] ?? v),
    },
    { title: t("เลขอ้างอิง"), dataIndex: "transactionRef", width: 160, render: (v?: string | null) => v ?? "—" },
    {
      title: t("เงินที่รับ"),
      dataIndex: "receivedAmount",
      align: "right",
      width: 140,
      render: (v: string) => <MoneyCell value={v} strong />,
    },
    {
      title: t("ภาษีที่ลูกค้าหัก"),
      dataIndex: "whtAmount",
      align: "right",
      width: 150,
      render: (v: string) => <MoneyCell value={v} />,
    },
    {
      title: t("รับเกิน (เครดิต)"),
      dataIndex: "overpayAmount",
      align: "right",
      width: 150,
      render: (v: string) => <MoneyCell value={v} />,
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={AR_RECEIPT_STATUS_COLOR[v] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[v] ?? v)}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 140,
      render: (_v, r) => (
        <Link href={arReceiptRoutes.detail(r.id)}>
          <Button size="small">{t("ดูรายละเอียด")}</Button>
        </Link>
      ),
    },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <section className={`${styles.page} ${pageStyles.page}`}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={variant === "payment" ? t("รับชำระเงิน") : t("ใบเสร็จรับเงิน")}
        subtitle={
          variant === "payment"
            ? t("บันทึกรับเงินจากลูกค้า ตัดได้หลายใบตั้งลูกหนี้ในครั้งเดียว")
            : t("ใบเสร็จรับเงินที่ออกจากการรับชำระ (ดู/พิมพ์)")
        }
        actions={
          variant === "payment" && addPerms.canAdd ? (
            <Link href={arReceiptRoutes.create}>
              <Button type="primary">{t("บันทึกรับชำระ")}</Button>
            </Link>
          ) : null
        }
      />
      {variant === "payment" ? <AwaitingPaymentSection /> : null}
      <div className={masterStyles.tableCard}>
        {variant === "payment" ? (
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t("รับชำระแล้ว")}</h3>
            </div>
          </div>
        ) : null}
        <section className={`${styles.filterCard} ${pageStyles.filterInset}`}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ / ลูกค้า / เลขอ้างอิง")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={apply}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={range} onChange={(v) => { setRange(v); setPage(1); }} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={Object.entries(AR_RECEIPT_STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={() => { setSearch(""); setKeyword(""); setStatus(undefined); setRange(null); setPage(1); }}>
                {t("เคลียร์")}
              </Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={apply}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={`${masterStyles.dataTable} ${pageStyles.table}`}
          size="middle"
          bordered={false}
          rowKey="id"
          loading={query.isLoading}
          columns={variant === "receipt" ? receiptColumns : columns}
          dataSource={query.data?.items ?? []}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: query.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: variant === "receipt" ? 980 : 1900 }}
          locale={{ emptyText: variant === "receipt" ? t("ยังไม่มีใบเสร็จรับเงิน") : t("ยังไม่มีใบรับชำระ") }}
        />
      </div>
    </section>
  );
}
