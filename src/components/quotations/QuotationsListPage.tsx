"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Dropdown, Input, Pagination, Select, Table } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useQuotationsQuery } from "@/hooks/quotations/useQuotationsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useLanguage } from "@/lib/i18n/language";
import { useT, type TFunction } from "@/lib/i18n/useT";
import {
  quotationFlowText,
  quotationStatusLabel,
  type Quotation,
} from "@/types/quotations";
import {
  QUOTATION_FLOW_STEPS,
  QUOTATION_STATUS_FILTER_LABEL,
  resolveQuotationFlow,
} from "@/utils/quotation-flow";
import styles from "./QuotationsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const PAGE_SIZE = 10;

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

/** วันที่เอกสารแสดงเป็น พ.ศ. ทั้งภาษาไทยและอังกฤษ (ให้ตรงกับหน้า detail/create/edit) */
function formatDate(value: string | undefined) {
  if (!value) return "—";
  const d = dayjs(value);
  if (!d.isValid()) return "—";
  return d.format("DD/MM/BBBB");
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
 * ป้ายสถานะของคอลัมน์ "สถานะ" — ข้อความ/สีตามดีไซน์หน้านี้
 * (แยกจาก shortLabel ใน resolveQuotationFlow ที่หน้ารายละเอียดกับหน้าติดตามใช้ร่วมกัน)
 */
function resolveStatusBadge(
  row: Quotation,
  t: TFunction,
  lang: "th" | "en",
): { label: string; tone: string } {
  if (row.salesOrderId) {
    return { label: t("เปิด SO แล้ว"), tone: styles.statusDone };
  }
  switch (row.status) {
    case "ACCEPTED":
      return { label: t("ลูกค้าตอบรับแล้ว"), tone: styles.statusAccepted };
    case "SENT":
      return { label: t("รอลูกค้าตอบรับ"), tone: styles.statusSent };
    case "REJECTED":
      return { label: t("ลูกค้าปฏิเสธ"), tone: styles.statusRejected };
    case "CANCELLED":
      return { label: quotationStatusLabel("CANCELLED", lang), tone: styles.statusCancelled };
    default:
      return { label: quotationStatusLabel("DRAFT", lang), tone: styles.statusDraft };
  }
}

function QuotationProgressCell({ row }: { row: Quotation }) {
  const t = useT();
  const lang = useLanguage();
  const flow = resolveQuotationFlow(row);
  const stopped = flow.tone === "stopped";

  return (
    <div className={styles.progressCell}>
      <div className={styles.progressTrack} aria-hidden>
        {QUOTATION_FLOW_STEPS.map((step, index) => {
          const filled = index + 1 <= flow.step;
          return (
            <span
              key={step.key}
              title={quotationFlowText(step.label, lang)}
              className={[
                styles.progressSeg,
                filled ? styles.progressSegOn : "",
                filled && stopped ? styles.progressSegStopped : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          );
        })}
      </div>
      <span className={styles.progressStep}>
        {stopped
          ? quotationFlowText(flow.shortLabel, lang)
          : t("ขั้นตอนที่ {step}/{total}", { step: flow.step, total: flow.total })}
      </span>
    </div>
  );
}

export default function QuotationsListPage() {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();

  const [quotationNo, setQuotationNo] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [createdById, setCreatedById] = useState<string | undefined>();
  const [step, setStep] = useState<number | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<{
    quotationNo?: string;
    customerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    itemIds?: string[];
  }>({});
  /** ผู้สร้าง + ขั้นตอน ยังไม่มีใน query ของ API — กรองฝั่ง client จากผลที่ได้มา */
  const [appliedLocal, setAppliedLocal] = useState<{
    createdById?: string;
    step?: number;
  }>({});

  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const canView = quotationActions.canView;
  const canViewAll = quotationActions.canViewAll;
  const canCreate = quotationActions.canAdd;
  const canEdit = quotationActions.canEdit;
  const canApprove = quotationActions.canApprove;

  const customersQuery = useCustomersQuery();
  const customers = useMemo(
    () => customersQuery.data?.data ?? [],
    [customersQuery.data],
  );
  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

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

  const query = useQuotationsQuery(applied, { enabled: canView });
  const serverRows = useMemo(() => query.data?.data ?? [], [query.data]);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of serverRows) {
      const id = row.createdById ?? row.createdBy?.id;
      if (!id) continue;
      map.set(
        id,
        row.createdBy?.displayName?.trim() || row.createdBy?.username || id,
      );
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [serverRows]);

  const rows = useMemo(
    () =>
      serverRows.filter((row) => {
        if (
          appliedLocal.createdById &&
          (row.createdById ?? row.createdBy?.id) !== appliedLocal.createdById
        ) {
          return false;
        }
        if (
          appliedLocal.step &&
          resolveQuotationFlow(row).step !== appliedLocal.step
        ) {
          return false;
        }
        return true;
      }),
    [serverRows, appliedLocal],
  );

  const total = rows.length;
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  const applyFilters = () => {
    setPage(1);
    setApplied({
      quotationNo: quotationNo.trim() || undefined,
      customerId,
      status,
      dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
      dateTo: date ? date.format("YYYY-MM-DD") : undefined,
      itemIds: itemIds.length ? itemIds : undefined,
    });
    setAppliedLocal({ createdById, step });
  };

  const clearFilters = () => {
    setQuotationNo("");
    setCustomerId(undefined);
    setStatus(undefined);
    setCreatedById(undefined);
    setStep(undefined);
    setDate(null);
    setItemIds([]);
    setPage(1);
    setApplied({});
    setAppliedLocal({});
  };

  const rowActions = (row: Quotation): MenuProps["items"] => {
    const items: NonNullable<MenuProps["items"]> = [
      {
        key: "view",
        icon: <EyeOutlined />,
        label: t("ดูรายละเอียด"),
        onClick: (info) => {
          info.domEvent.stopPropagation();
          router.push(`/quotations/${row.id}`);
        },
      },
    ];

    if (canEdit && row.status === "DRAFT") {
      items.push({
        key: "edit",
        icon: <EditOutlined />,
        label: t("แก้ไข"),
        onClick: (info) => {
          info.domEvent.stopPropagation();
          router.push(`/quotations/${row.id}/edit`);
        },
      });
    }

    if (canApprove && row.status === "SENT") {
      items.push({
        key: "accept",
        icon: <CheckOutlined />,
        label: t("บันทึกผลลูกค้าตอบรับ"),
        onClick: (info) => {
          info.domEvent.stopPropagation();
          router.push(`/quotations/${row.id}`);
        },
      });
    }

    return items;
  };

  const columns: ColumnsType<Quotation> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "index",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      {
        title: t("เลขที่ใบเสนอราคา"),
        dataIndex: "quotationNo",
        width: 170,
        render: (value: string) => <span className={styles.prNo}>{value}</span>,
      },
      {
        title: t("วันที่เอกสาร"),
        dataIndex: "quotationDate",
        width: 130,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ลูกค้า"),
        key: "customer",
        render: (_v, row) => {
          if (!row.customer) return "—";
          const master = customerById.get(row.customer.id);
          const typeLabel = master?.customerType
            ? t(CUSTOMER_TYPE_LABEL[master.customerType] ?? master.customerType)
            : undefined;
          return (
            <div className={styles.customerCell}>
              <span className={styles.customerName}>{row.customer.nameTh}</span>
              <span className={styles.customerMeta}>
                {row.customer.customerCode}
                {typeLabel ? ` · ${typeLabel}` : ""}
              </span>
            </div>
          );
        },
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 240,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: t("ผู้สร้าง"),
        key: "createdBy",
        width: 150,
        ellipsis: true,
        render: (_v, row) =>
          row.createdBy?.displayName?.trim() || row.createdBy?.username || "—",
      },
      {
        title: t("ยอดสุทธิ(บาท)"),
        dataIndex: "totalAmount",
        align: "right",
        width: 140,
        render: (value: string) => (
          <span className={styles.moneyCell}>{formatMoney(value)}</span>
        ),
      },
      {
        title: t("ขั้นตอน"),
        key: "progress",
        width: 160,
        render: (_v, row) => <QuotationProgressCell row={row} />,
      },
      {
        title: t("สถานะ"),
        key: "status",
        width: 160,
        render: (_v, row) => {
          const badge = resolveStatusBadge(row, t, lang);
          return (
            <span className={`${styles.statusPill} ${badge.tone}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        title: t("จัดการ"),
        key: "actions",
        width: 90,
        align: "center",
        render: (_v, row) => (
          <div
            className={styles.actionsCell}
            onClick={(event) => event.stopPropagation()}
          >
            <Dropdown
              // hover = เปิดเมนูได้เลยไม่ต้องคลิก, click = เผื่อ touch/keyboard ที่ hover ไม่ทำงาน
              trigger={["hover", "click"]}
              mouseEnterDelay={0.1}
              mouseLeaveDelay={0.2}
              placement="bottomRight"
              menu={{ items: rowActions(row) }}
            >
              <Button
                type="text"
                className={styles.actionBtn}
                icon={<EllipsisOutlined />}
                aria-label={t("จัดการใบเสนอราคา {no}", { no: row.quotationNo })}
              />
            </Dropdown>
          </div>
        ),
      },
    ],
    // rowActions ใช้ canEdit / canApprove / router อยู่ข้างใน
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApprove, canEdit, customerById, lang, page, router, t],
  );

  if (!canView) {
    return <AccessDenied screenCodes={["QUOTATIONS"]} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Quotation"
        icon={<FileTextOutlined />}
        title={t("ใบเสนอราคา")}
        subtitle={t("ใช้ใบเสนอราคาให้ลูกค้าพิจารณา และนำไปสร้าง SO เมื่อลูกค้าตอบรับ โดยยังไม่ตัดสต๊อก")}
        actions={
          <>
{canCreate ? (
            <Link href="/quotations/create">
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<PlusOutlined />}
              >
                {t("สร้างใบเสนอราคา")}
              </Button>
            </Link>
          ) : null}
          </>
        }
      />

      <section className={styles.filterCard}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>Search</p>
          <h2 className={styles.sectionTitle}>{t("ค้นหาใบเสนอราคา")}</h2>
          <p className={styles.sectionSubtitle}>
            {t("กรองด้วยเลขที่ใบเสนอราคา สินค้า ข้อมูลลูกค้า สถานะเอกสาร และช่วงเวลา")}
          </p>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่ใบเสนอราคา")}</label>
            <Input
              allowClear
              prefix={<SearchOutlined className={styles.inputPrefix} />}
              placeholder="QT-2026..."
              value={quotationNo}
              onChange={(e) => setQuotationNo(e.target.value)}
              onPressEnter={applyFilters}
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
              aria-label={t("สินค้าในใบเสนอราคา")}
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
              placeholder={t("ทั้งหมด")}
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
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={Object.entries(QUOTATION_STATUS_FILTER_LABEL).map(
                ([value, label]) => ({
                  value,
                  label: quotationFlowText(label, lang),
                }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ผู้สร้าง")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={createdById}
              onChange={setCreatedById}
              style={{ width: "100%" }}
              options={creatorOptions}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ขั้นตอน")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={step}
              onChange={setStep}
              style={{ width: "100%" }}
              options={QUOTATION_FLOW_STEPS.map((flowStep, index) => ({
                value: index + 1,
                label: t("ขั้นตอนที่ {no} — {label}", {
                  no: index + 1,
                  label: quotationFlowText(flowStep.label, lang),
                }),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่เอกสาร")}</label>
            <DatePicker
              value={date}
              onChange={setDate}
              format="DD/MM/BBBB"
              style={{ width: "100%" }}
              placeholder={t("เลือกวันที่")}
            />
          </div>
        </div>

        <div className={styles.filterActions}>
          <Button
            className={styles.clearBtn}
            icon={<FilterOutlined />}
            onClick={clearFilters}
          >
            {t("ล้างค่า")}
          </Button>
          <Button
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applyFilters}
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={`${styles.sectionHead} ${styles.tableHead}`}>
          <p className={styles.sectionEyebrow}>Quotation List</p>
          <div className={styles.tableTitleRow}>
            <h2 className={styles.sectionTitle}>{t("รายการใบเสนอราคา")}</h2>
            <span className={styles.countPill}>
              {t("พบทั้งหมด {n} รายการ", { n: total.toLocaleString("th-TH") })}
            </span>
          </div>
          <p className={styles.sectionSubtitle}>
            {canViewAll
              ? t("แสดงข้อมูลและสถานะใบเสนอราคาทั้งหมด")
              : t("แสดงข้อมูลและสถานะใบเสนอราคาที่คุณสร้าง")}
          </p>
        </div>

        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={pagedRows}
          pagination={false}
          className={styles.table}
          scroll={{ x: 1420 }}
          onRow={(row) => ({
            onClick: () => router.push(`/quotations/${row.id}`),
          })}
          locale={{ emptyText: t("ยังไม่มีใบเสนอราคา") }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดงทั้งหมด {shown} รายการ จาก {total} รายการ", {
              shown: pagedRows.length.toLocaleString("th-TH"),
              total: total.toLocaleString("th-TH"),
            })}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
