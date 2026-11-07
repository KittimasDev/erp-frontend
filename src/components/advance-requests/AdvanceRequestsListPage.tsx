"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Table, Tag, Typography } from "antd";
import { FileTextOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useAdvanceRequestsQuery,
  useEligiblePayablesQuery,
} from "@/hooks/advance-payment-requests/useAdvanceRequests";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  type AdvanceRequest,
  type EligiblePayable,
} from "@/types/advance-payment-requests";
import { tFin } from "@/components/payment-vouchers/paymentVoucherUtils";
import { useT } from "@/lib/i18n/useT";
import PageHeader from "@/components/common/PageHeader";

export const ADVANCE_BASE_PATH = "/finance/payables/advance-requests";
export const ADVANCE_SCREEN = "FINANCE_ADVANCE_REQUESTS";

/** รายการขอจ่ายล่วงหน้า / มัดจำ — ใต้เมนู การจ่ายเงิน */
export default function AdvanceRequestsListPage() {
  const t = useT();
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(ADVANCE_SCREEN);
  const [page, setPage] = useState(1);
  const [dStatus, setDStatus] = useState<string | undefined>();
  const [dSearch, setDSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const query = useAdvanceRequestsQuery({ page, limit: 20, status, search: keyword });
  const eligible = useEligiblePayablesQuery("", true);

  const applySearch = () => {
    setStatus(dStatus);
    setKeyword(dSearch.trim());
    setPage(1);
  };
  const clearFilters = () => {
    setDStatus(undefined);
    setDSearch("");
    setStatus(undefined);
    setKeyword("");
    setPage(1);
  };

  const eligibleColumns: ColumnsType<EligiblePayable> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("เลขที่ PO"),
      dataIndex: "poNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: t("วันที่ PO"), dataIndex: "poDate", width: 120, render: formatThaiDate },
    {
      title: t("ผู้ขาย"),
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    {
      title: t("% มัดจำ"),
      dataIndex: "advancePercent",
      width: 90,
      align: "right",
      render: (v: number) => `${v}%`,
    },
    {
      title: t("วงเงินมัดจำ"),
      dataIndex: "advanceLimitAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: t("ขอไปแล้ว"),
      dataIndex: "alreadyRequestedAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: t("คงเหลือ"),
      dataIndex: "remainingAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    ...(canAdd
      ? [
          {
            title: "",
            key: "action",
            width: 140,
            render: (_: unknown, r: EligiblePayable) => (
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`${ADVANCE_BASE_PATH}/create?poId=${r.purchaseOrderId}`);
                }}
              >
                {t("สร้างคำขอจ่าย")}
              </Button>
            ),
          } satisfies ColumnsType<EligiblePayable>[number],
        ]
      : []),
  ];

  const columns: ColumnsType<AdvanceRequest> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: t("เลขที่รายการ"), dataIndex: "requestNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: t("วันที่เอกสาร"), dataIndex: "requestDate", width: 120, render: formatThaiDate },
    { title: t("เลขที่ PO"), dataIndex: "poNo" },
    {
      title: t("ผู้ขาย"),
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: t("ยอดขอจ่าย"), dataIndex: "requestedAmount", align: "right", render: (v: number) => money.format(v) },
    { title: "WHT", dataIndex: "whtAmount", align: "right", render: (v: number, r) => (r.whtApplicable ? money.format(v) : "—") },
    { title: t("ยอดโอนจริง"), dataIndex: "netTransferAmount", align: "right", render: (v: number) => money.format(v) },
    { title: t("วันที่ต้องการจ่าย"), dataIndex: "desiredPayDate", width: 130, render: (v?: string) => formatThaiDate(v) },
    { title: t("ใบสำคัญจ่าย"), dataIndex: "paymentVoucherNo", width: 150, render: (v?: string) => v ?? "—" },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 160,
      render: (v: string, r) => (
        <span>
          <Tag color={ADVANCE_STATUS_COLOR[v]}>{ADVANCE_STATUS_LABEL[v] ? tFin(ADVANCE_STATUS_LABEL[v]) : v}</Tag>
          {v === "DRAFT" && !r.whtVerified ? <Tag color="orange">{t("รอตรวจ WHT")}</Tag> : null}
        </span>
      ),
    },
  ];

  const eligibleCount = eligible.data?.data?.length ?? 0;
  const doneTotal = query.data?.data.total ?? 0;

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title={t("รายการขอจ่ายล่วงหน้า / มัดจำ")}
        subtitle={t("ขอจ่ายตามเงื่อนไขชำระล่วงหน้า/มัดจำของรายการจ่ายเงิน (PO) พร้อมตรวจภาษีหัก ณ ที่จ่ายก่อนยืนยันเพื่อสร้างใบสำคัญจ่าย")}
        actions={
          <>
{canAdd ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push(`${ADVANCE_BASE_PATH}/create`)}>
            {t("สร้างรายการขอจ่าย")}
          </Button>
        ) : null}
          </>
        }
      />

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("รอจ่ายมัดจำ")}</span>
          <span className={styles.statValue}>{eligibleCount.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ดำเนินการแล้ว")}</span>
          <span className={styles.statValue}>{doneTotal.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รอจ่ายมัดจำ")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{eligibleCount.toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="purchaseOrderId"
          loading={eligible.isLoading}
          columns={eligibleColumns}
          dataSource={eligible.data?.data ?? []}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: t("ไม่มีรายการรอขอมัดจำ") }}
          onRow={
            canAdd
              ? (r) => ({
                  onClick: () => router.push(`${ADVANCE_BASE_PATH}/create?poId=${r.purchaseOrderId}`),
                  style: { cursor: "pointer" },
                })
              : undefined
          }
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รายการที่ดำเนินการแล้ว")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{doneTotal.toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่รายการ / เลขที่ PO / ชื่อผู้ขาย")}
                value={dSearch}
                onChange={(e) => setDSearch(e.target.value)}
                onPressEnter={applySearch}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={dStatus}
                onChange={setDStatus}
                options={Object.entries(ADVANCE_STATUS_LABEL).map(([value, label]) => ({ value, label: tFin(label) }))}
              />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={query.data?.data.items ?? []}
          pagination={{
            current: page,
            pageSize: 20,
            total: doneTotal,
            onChange: setPage,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          onRow={(r) => ({ onClick: () => router.push(`${ADVANCE_BASE_PATH}/${r.id}`), style: { cursor: "pointer" } })}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("ยังไม่มีรายการขอจ่าย") }}
        />
      </div>
    </section>
  );
}
