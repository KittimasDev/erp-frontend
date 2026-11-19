"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import pageStyles from "@/components/ar-billing-notes/ar-billing-notes-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useArBillingNotesQuery,
  useCreateArBillingNoteMutation,
  usePendingArInvoicesQuery,
} from "@/hooks/ar-billing-notes/useArBillingNotes";
import { useT } from "@/lib/i18n/useT";
import { arBillingRoutes, arRoutes } from "@/lib/sales/ar-routes";
import {
  AR_BILLING_STATUS_COLOR,
  AR_BILLING_STATUS_LABEL,
  type ArBillingNote,
  type PendingArInvoice,
} from "@/types/ar-billing-notes";

const SCREEN_CODE = "FINANCE_AR_BILLING_NOTES";
const PENDING_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;

function IndexCell({ n }: { n: number }) {
  return <span className={pageStyles.index}>{n}</span>;
}

/**
 * ใบวางบิลฝั่งขาย — ส่วนบน: ใบตั้งลูกหนี้ (AR) ที่ยืนยันแล้วและมียอดค้าง รอวางบิล
 * (เลือกหลายใบของลูกค้าเดียวกันรวมเป็นใบเดียวได้ · วางบิลเต็มยอดค้างชำระ ไม่แบ่ง AR)
 * ส่วนล่าง: ใบวางบิลที่สร้างแล้ว
 */
export default function ArBillingNotesPage() {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const createMutation = useCreateArBillingNoteMutation();
  const [form] = Form.useForm<{
    billingDate: dayjs.Dayjs;
    appointmentDate?: dayjs.Dayjs;
    remark?: string;
  }>();

  // ── รอวางบิล ──
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [selected, setSelected] = useState<PendingArInvoice[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const pending = usePendingArInvoicesQuery({
    page: pPage,
    limit: PENDING_PAGE_SIZE,
    keyword: pKeyword,
  });
  const selectedCustomerId = selected[0]?.customerId;
  const selectedTotal = selected.reduce(
    (sum, row) => sum + (Number(row.outstandingAmount) || 0),
    0,
  );

  // ── ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cStatus, setCStatus] = useState<string | undefined>();
  const created = useArBillingNotesQuery({
    page: cPage,
    limit: CREATED_PAGE_SIZE,
    keyword: cKeyword,
    status: cStatus,
  });

  const pendingColumns: ColumnsType<PendingArInvoice> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      dataIndex: "id",
      width: 84,
      align: "center",
      fixed: "left",
      render: (_v, _r, index) => (
        <IndexCell n={(pPage - 1) * PENDING_PAGE_SIZE + index + 1} />
      ),
    },
    {
      title: t("วันที่ AR"),
      dataIndex: "invoiceDate",
      width: 110,
      render: (v: string) => formatThaiDate(v),
    },
    {
      title: t("เลขที่ AR"),
      dataIndex: "invoiceNo",
      width: 170,
      render: (v: string, r) => <Link href={arRoutes.detail(r.id)}>{v}</Link>,
    },
    { title: t("ใบสั่งขาย"), dataIndex: "salesOrderNo", width: 150, render: (v?: string) => v ?? "—" },
    {
      title: t("ลูกค้า"),
      key: "customer",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.customerCode}</Typography.Text>{" "}
          {r.customerName}
        </span>
      ),
    },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      align: "right",
      width: 120,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("รับชำระแล้ว"),
      dataIndex: "paidAmount",
      align: "right",
      width: 120,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("ยอดพร้อมวางบิล"),
      dataIndex: "outstandingAmount",
      align: "right",
      width: 140,
      render: (v: string) => (
        <Typography.Text strong>{money.format(Number(v))}</Typography.Text>
      ),
    },
    {
      title: t("วันครบกำหนด"),
      dataIndex: "dueDate",
      width: 120,
      render: (v?: string | null) => formatThaiDate(v),
    },
  ];

  const createdColumns: ColumnsType<ArBillingNote> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      dataIndex: "id",
      width: 84,
      align: "center",
      fixed: "left",
      render: (_v, _r, index) => (
        <IndexCell n={(cPage - 1) * CREATED_PAGE_SIZE + index + 1} />
      ),
    },
    {
      title: t("เลขที่ใบวางบิล"),
      dataIndex: "billingNo",
      width: 160,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: t("วันที่"),
      dataIndex: "billingDate",
      width: 110,
      render: (v: string) => formatThaiDate(v),
    },
    {
      title: t("ลูกค้า"),
      key: "customer",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.customerCode}</Typography.Text>{" "}
          {r.customerName}
        </span>
      ),
    },
    { title: t("จำนวน AR"), dataIndex: "itemCount", align: "right", width: 100 },
    {
      title: t("ยอดวางบิล"),
      dataIndex: "totalAmount",
      align: "right",
      width: 130,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("วันนัดรับเงิน"),
      dataIndex: "appointmentDate",
      width: 120,
      render: (v?: string | null) => formatThaiDate(v),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 120,
      render: (v: string) => (
        <Tag color={AR_BILLING_STATUS_COLOR[v] ?? "default"}>
          {t(AR_BILLING_STATUS_LABEL[v] ?? v)}
        </Tag>
      ),
    },
    {
      title: "",
      key: "action",
      width: 130,
      render: (_v, r) => (
        <Link href={arBillingRoutes.detail(r.id)}>
          <Button size="small">{t("ดูรายละเอียด")}</Button>
        </Link>
      ),
    },
  ];

  const statusOptions = Object.entries(AR_BILLING_STATUS_LABEL).map(
    ([value, label]) => ({ value, label: t(label) }),
  );

  return (
    <section className={styles.page} style={{ gap: 24 }}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        icon={<FileTextOutlined />}
        title={t("ใบวางบิล (ลูกหนี้)")}
        subtitle={t(
          "ใบตั้งลูกหนี้ที่ยืนยันแล้วรอวางบิล และใบวางบิลที่สร้างแล้ว — เลือกหลายใบของลูกค้าเดียวกันรวมเป็นใบเดียวได้",
        )}
        actions={
          perms.canAdd ? (
            <Button
              type="primary"
              disabled={selected.length === 0}
              onClick={() => setModalOpen(true)}
            >
              {t("วางบิลที่เลือก ({n})", { n: selected.length })}
            </Button>
          ) : null
        }
      />

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รอวางบิล")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {(pending.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}
            {selected.length > 0
              ? ` · ${t("เลือก {n} ใบ ยอดรวม {amount}", { n: selected.length, amount: money.format(selectedTotal) })}`
              : ""}
          </span>
        </div>
        <div className={pageStyles.panelBody}>
        <section className={styles.filterCard} style={{ boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ AR / ใบสั่งขาย / ลูกค้า")}
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                onPressEnter={() => {
                  setPKeyword(pSearch.trim());
                  setPPage(1);
                }}
              />
            </div>
            <div className={styles.filterActions}>
              <Button
                onClick={() => {
                  setPSearch("");
                  setPKeyword("");
                  setPPage(1);
                }}
              >
                {t("เคลียร์")}
              </Button>
              <Button
                type="primary"
                className={styles.searchBtn}
                icon={<SearchOutlined />}
                onClick={() => {
                  setPKeyword(pSearch.trim());
                  setPPage(1);
                }}
              >
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <p className={pageStyles.hint}>
          {t("เลือกได้หลายใบเฉพาะ AR ของลูกค้าเดียวกัน — วางบิลเต็มยอดค้างชำระของแต่ละ AR (ไม่แบ่ง AR)")}
        </p>
        <Table
          className={`${masterStyles.dataTable} ${pageStyles.table}`}
          size="middle"
          bordered={false}
          rowKey="id"
          loading={pending.isLoading}
          columns={pendingColumns}
          dataSource={pending.data?.items ?? []}
          rowSelection={
            perms.canAdd
              ? {
                  fixed: true,
                  columnWidth: 56,
                  selectedRowKeys: selected.map((s) => s.id),
                  preserveSelectedRowKeys: true,
                  onChange: (_keys, rows) => setSelected(rows),
                  getCheckboxProps: (r) => ({
                    disabled:
                      selectedCustomerId !== undefined &&
                      r.customerId !== selectedCustomerId,
                  }),
                }
              : undefined
          }
          pagination={{
            current: pPage,
            pageSize: PENDING_PAGE_SIZE,
            total: pending.data?.total ?? 0,
            onChange: setPPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1280 }}
          locale={{ emptyText: t("ไม่มีรายการรอวางบิล") }}
        />
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบวางบิลที่สร้างแล้ว")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {(created.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}
          </span>
        </div>
        <div className={pageStyles.panelBody}>
        <section className={styles.filterCard} style={{ boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ใบวางบิล / ลูกค้า")}
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={() => {
                  setCKeyword(cSearch.trim());
                  setCPage(1);
                }}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={cStatus}
                onChange={(v) => {
                  setCStatus(v);
                  setCPage(1);
                }}
                options={statusOptions}
              />
            </div>
            <div className={styles.filterActions}>
              <Button
                onClick={() => {
                  setCSearch("");
                  setCKeyword("");
                  setCStatus(undefined);
                  setCPage(1);
                }}
              >
                {t("เคลียร์")}
              </Button>
              <Button
                type="primary"
                className={styles.searchBtn}
                icon={<SearchOutlined />}
                onClick={() => {
                  setCKeyword(cSearch.trim());
                  setCPage(1);
                }}
              >
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
          loading={created.isLoading}
          columns={createdColumns}
          dataSource={created.data?.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1180 }}
          locale={{ emptyText: t("ยังไม่มีใบวางบิล") }}
        />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={t("สร้างใบวางบิลจาก {n} ใบตั้งลูกหนี้", { n: selected.length })}
        okText={t("สร้างใบวางบิล (ร่าง)")}
        cancelText={t("ยกเลิก")}
        confirmLoading={createMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <p style={{ color: "#8a9199", marginTop: 0 }}>
          {selected.map((r) => r.invoiceNo).join(", ")} ·{" "}
          {selected[0]?.customerName ?? "—"} ·{" "}
          {t("ยอดรวม {amount}", { amount: money.format(selectedTotal) })}
        </p>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ billingDate: dayjs() }}
          onFinish={async (values) => {
            if (!selectedCustomerId) return;
            try {
              const res = await createMutation.mutateAsync({
                customerId: selectedCustomerId,
                salesInvoiceIds: selected.map((r) => r.id),
                billingDate: values.billingDate.format("YYYY-MM-DD"),
                appointmentDate: values.appointmentDate?.format("YYYY-MM-DD"),
                remark: values.remark?.trim() || undefined,
              });
              setModalOpen(false);
              setSelected([]);
              router.push(arBillingRoutes.detail(res.data.id));
            } catch {
              // hook แจ้ง error แล้ว (เช่น AR ถูกวางบิลโดยคนอื่นไปแล้ว) — ค้าง modal ไว้
            }
          }}
        >
          <div>
            <Form.Item
              name="billingDate"
              label={t("วันที่ใบวางบิล")}
              rules={[{ required: true, message: t("ระบุวันที่") }]}
              style={{ width: "100%" }}
            >
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="appointmentDate"
              label={t("วันนัดรับเงิน")}
              style={{ width: "100%" }}
            >
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="remark" label={t("หมายเหตุ")} style={{ width: "100%" }}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </section>
  );
}
