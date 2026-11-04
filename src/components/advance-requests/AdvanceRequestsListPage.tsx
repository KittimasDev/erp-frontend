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
import PageHeader from "@/components/common/PageHeader";

export const ADVANCE_BASE_PATH = "/finance/payables/advance-requests";
export const ADVANCE_SCREEN = "FINANCE_ADVANCE_REQUESTS";

/** รายการขอจ่ายล่วงหน้า / มัดจำ — ใต้เมนู การจ่ายเงิน */
export default function AdvanceRequestsListPage() {
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
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: "วันที่ PO", dataIndex: "poDate", width: 120, render: formatThaiDate },
    {
      title: "ผู้ขาย",
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    {
      title: "% มัดจำ",
      dataIndex: "advancePercent",
      width: 90,
      align: "right",
      render: (v: number) => `${v}%`,
    },
    {
      title: "วงเงินมัดจำ",
      dataIndex: "advanceLimitAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: "ขอไปแล้ว",
      dataIndex: "alreadyRequestedAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: "คงเหลือ",
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
                สร้างคำขอจ่าย
              </Button>
            ),
          } satisfies ColumnsType<EligiblePayable>[number],
        ]
      : []),
  ];

  const columns: ColumnsType<AdvanceRequest> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: "เลขที่รายการ", dataIndex: "requestNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "วันที่เอกสาร", dataIndex: "requestDate", width: 120, render: formatThaiDate },
    { title: "เลขที่ PO", dataIndex: "poNo" },
    {
      title: "ผู้ขาย",
      key: "cr",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: "ยอดขอจ่าย", dataIndex: "requestedAmount", align: "right", render: (v: number) => money.format(v) },
    { title: "WHT", dataIndex: "whtAmount", align: "right", render: (v: number, r) => (r.whtApplicable ? money.format(v) : "—") },
    { title: "ยอดโอนจริง", dataIndex: "netTransferAmount", align: "right", render: (v: number) => money.format(v) },
    { title: "วันที่ต้องการจ่าย", dataIndex: "desiredPayDate", width: 130, render: (v?: string) => formatThaiDate(v) },
    { title: "ใบสำคัญจ่าย", dataIndex: "paymentVoucherNo", width: 150, render: (v?: string) => v ?? "—" },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 160,
      render: (v: string, r) => (
        <span>
          <Tag color={ADVANCE_STATUS_COLOR[v]}>{ADVANCE_STATUS_LABEL[v] ?? v}</Tag>
          {v === "DRAFT" && !r.whtVerified ? <Tag color="orange">รอตรวจ WHT</Tag> : null}
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
        title="รายการขอจ่ายล่วงหน้า / มัดจำ"
        subtitle="ขอจ่ายตามเงื่อนไขชำระล่วงหน้า/มัดจำของรายการจ่ายเงิน (PO) พร้อมตรวจภาษีหัก ณ ที่จ่ายก่อนยืนยันเพื่อสร้างใบสำคัญจ่าย"
        actions={
          <>
{canAdd ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push(`${ADVANCE_BASE_PATH}/create`)}>
            สร้างรายการขอจ่าย
          </Button>
        ) : null}
          </>
        }
      />

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>รอจ่ายมัดจำ</span>
          <span className={styles.statValue}>{eligibleCount.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ดำเนินการแล้ว</span>
          <span className={styles.statValue}>{doneTotal.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รอจ่ายมัดจำ</h3>
          </div>
          <span className={masterStyles.tableCount}>{eligibleCount.toLocaleString("th-TH")} รายการ</span>
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
          locale={{ emptyText: "ไม่มีรายการรอขอมัดจำ" }}
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
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รายการที่ดำเนินการแล้ว</h3>
          </div>
          <span className={masterStyles.tableCount}>{doneTotal.toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่รายการ / เลขที่ PO / ชื่อผู้ขาย"
                value={dSearch}
                onChange={(e) => setDSearch(e.target.value)}
                onPressEnter={applySearch}
              />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะ</label>
              <Select
                allowClear
                placeholder="ทั้งหมด"
                value={dStatus}
                onChange={setDStatus}
                options={Object.entries(ADVANCE_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearFilters}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
                ค้นหา
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
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          onRow={(r) => ({ onClick: () => router.push(`${ADVANCE_BASE_PATH}/${r.id}`), style: { cursor: "pointer" } })}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ยังไม่มีรายการขอจ่าย" }}
        />
      </div>
    </section>
  );
}
