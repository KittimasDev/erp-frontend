"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FileAddOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AdvanceDeductionPicker from "@/components/sales-invoices/AdvanceDeductionPicker";
import CustomerCreditNotice from "@/components/sales-invoices/CustomerCreditNotice";
import {
  useAdvanceCandidatesQuery,
  usePendingSalesInvoicesQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { advanceDeductionErrors } from "@/utils/advance-deduction-validation";
import { useCreateSalesInvoiceFromDeliveriesMutation } from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { useArInvoicePermissions } from "@/hooks/sales-invoices/useArInvoicePermissions";
import type {
  PendingSalesInvoiceDelivery,
  SalesInvoiceAdvanceDeductionInput,
} from "@/types/sales-invoices";
import { useT } from "@/lib/i18n/useT";
import { arRoutes } from "@/lib/sales/ar-routes";
import styles from "./SalesInvoicesPendingPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesInvoicesPendingPage() {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const { canCreate: canWrite } = useArInvoicePermissions();
  const createMutation = useCreateSalesInvoiceFromDeliveriesMutation();
  const [form] = Form.useForm<{
    invoiceDate: dayjs.Dayjs;
    dueDate?: dayjs.Dayjs;
    remark?: string;
  }>();
  // DN ที่เลือกรวมเป็น AR ใบเดียว — เก็บทั้งแถว (ข้ามหน้าได้) เพื่อตรวจ "ใบสั่งขายเดียวกัน" และรวมยอด
  const [selected, setSelected] = useState<PendingSalesInvoiceDelivery[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deductions, setDeductions] = useState<SalesInvoiceAdvanceDeductionInput[]>([]);
  const lockedSalesOrderId = selected[0]?.salesOrderId;
  const selectedBillable = selected.reduce(
    (sum, row) => sum + (Number(row.billableAmount) || 0),
    0,
  );

  // queryKey เดียวกับ AdvanceDeductionPicker ใน modal → ไม่ยิง API ซ้ำ
  const candidatesQuery = useAdvanceCandidatesQuery(
    modalOpen ? lockedSalesOrderId : undefined,
    selected.map((r) => r.id),
  );
  const candidates = candidatesQuery.data?.data;
  const deductionErrors = advanceDeductionErrors(
    deductions,
    candidates?.items,
    candidates ? Number(candidates.maxDeductibleAmount) : undefined,
  );
  const canSubmitDeductions = deductionErrors.length === 0;

  const query = usePendingSalesInvoicesQuery({
    page,
    limit,
    keyword: appliedKeyword || undefined,
  });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const columns: ColumnsType<PendingSalesInvoiceDelivery> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ DO"),
        dataIndex: "deliveryOrderNo",
        render: (value: string) => (
          <span className={styles.poNo}>{value}</span>
        ),
      },
      {
        title: t("วันที่ส่ง"),
        dataIndex: "deliveryDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        // DN ที่ยังไม่ส่งของ (เฉพาะใบสั่งขายชำระตอนรับสินค้า) ออกบิลก่อนได้ คิดตามจำนวนที่ส่ง
        title: t("สถานะใบส่ง"),
        dataIndex: "status",
        width: 150,
        render: (value: string) =>
          value === "DELIVERED" ? (
            <Tag color="green">{t("ส่งแล้ว")}</Tag>
          ) : (
            <Tooltip title={t("ยังไม่ส่งของ — ออกบิลก่อนส่ง คิดตามจำนวนที่ส่ง")}>
              <Tag color="blue">{t("ยังไม่ส่งของ")}</Tag>
            </Tooltip>
          ),
      },
      {
        title: t("ใบสั่งขาย"),
        dataIndex: "salesOrderNo",
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("ลูกค้า"),
        dataIndex: "customerName",
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("รายการ"),
        dataIndex: "itemCount",
        width: 80,
        align: "center",
      },
      {
        title: t("ยอด SO"),
        dataIndex: "salesOrderTotalAmount",
        align: "right",
        render: (value?: string) => formatMoney(value),
      },
      {
        title: t("ยอดเรียกเก็บ (ก่อน VAT)"),
        dataIndex: "billableAmount",
        align: "right",
        render: (value?: string) => formatMoney(value),
      },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_v, row) =>
          canWrite ? (
            <Button
              type="primary"
              size="small"
              icon={<FileAddOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  arRoutes.createFromDelivery(row.id),
                );
              }}
            >
              {t("ออกบิล")}
            </Button>
          ) : (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/delivery-orders/${row.id}`);
              }}
            >
              {t("ดู DO")}
            </Button>
          ),
      },
    ],
    [canWrite, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Pending Invoices"
        icon={<FileTextOutlined />}
        title={t("รอออกใบแจ้งหนี้")}
        subtitle={t("Delivery Order สถานะส่งมอบแล้ว ที่ยังไม่มีใบแจ้งหนี้ใช้งาน")}
        actions={
          <>
<Link href={arRoutes.list}>
            <Button icon={<HistoryOutlined />}>{t("ประวัติใบแจ้งหนี้")}</Button>
          </Link>
          </>
        }
      />

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("DO / SO / ลูกค้า")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                setAppliedKeyword(keyword.trim());
              }}
            />
          </div>
          <div className={styles.filterActions}>
            <Button
              onClick={() => {
                setPage(1);
                setKeyword("");
                setAppliedKeyword("");
              }}
            >
              {t("เคลียร์")}
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                setPage(1);
                setAppliedKeyword(keyword.trim());
              }}
            >
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        {canWrite ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <Alert
              type="info"
              showIcon
              style={{ flex: 1, minWidth: 260 }}
              title={t("ติ๊กเลือกหลายใบส่งสินค้า (ใบสั่งขายเดียวกัน) เพื่อรวมเป็นใบตั้งลูกหนี้ใบเดียว")}
            />
            <span style={{ color: "#8a9199" }}>
              {t("เลือกแล้ว {n} ใบ · ยอดเรียกเก็บ {amount}", {
                n: selected.length,
                amount: formatMoney(selectedBillable),
              })}
            </span>
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              disabled={selected.length === 0}
              onClick={() => setModalOpen(true)}
            >
              {t("สร้างใบตั้งลูกหนี้จากที่เลือก")}
            </Button>
          </div>
        ) : null}
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowSelection={
            canWrite
              ? {
                  selectedRowKeys: selected.map((r) => r.id),
                  preserveSelectedRowKeys: true,
                  onChange: (_keys, rows) => setSelected(rows),
                  // ล็อกใบสั่งขายตามใบแรกที่เลือก — คนละใบสั่งขายรวมกันไม่ได้
                  getCheckboxProps: (row) => ({
                    disabled:
                      lockedSalesOrderId != null &&
                      row.salesOrderId !== lockedSalesOrderId,
                  }),
                }
              : undefined
          }
          onRow={(row) => ({
            onClick: (e) => {
              // กดช่องติ๊กเลือก ไม่ใช่การเปิดใบส่งสินค้า
              if ((e.target as HTMLElement).closest(".ant-table-selection-column")) return;
              router.push(`/delivery-orders/${row.id}`);
            },
          })}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ไม่มี DO รอออกบิล")}</strong>
                {t("เมื่อส่งมอบสินค้าแล้ว รายการจะแสดงที่นี่")}
              </div>
            ),
          }}
        />
        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("พบ {total} รายการ · แสดงในหน้านี้ {shown}", { total, shown: rows.length })}
          </div>
          <div className={styles.entriesBox}>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <Pagination
              size="small"
              current={page}
              total={total}
              pageSize={limit}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={t("สร้างใบตั้งลูกหนี้จาก {n} ใบส่งสินค้า", { n: selected.length })}
        okText={t("สร้างใบตั้งลูกหนี้ (DRAFT)")}
        cancelText={t("ยกเลิก")}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: !canSubmitDeductions }}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => {
          setModalOpen(false);
          setDeductions([]);
        }}
        onOk={() => {
          if (!canSubmitDeductions) {
            message.warning(t(deductionErrors[0].message));
            return;
          }
          form.submit();
        }}
      >
        <p style={{ color: "#8a9199", marginTop: 0 }}>
          {selected.map((r) => r.deliveryOrderNo).join(", ")} · SO{" "}
          {selected[0]?.salesOrderNo ?? "—"} · {selected[0]?.customerName ?? "—"}
        </p>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ invoiceDate: dayjs() }}
          onFinish={async (values) => {
            if (!canSubmitDeductions) {
              message.warning(t(deductionErrors[0].message));
              return;
            }
            try {
              const res = await createMutation.mutateAsync({
                deliveryOrderIds: selected.map((r) => r.id),
                invoiceDate: values.invoiceDate.format("YYYY-MM-DD"),
                dueDate: values.dueDate?.format("YYYY-MM-DD"),
                remark: values.remark?.trim() || undefined,
                advanceDeductions: deductions.length ? deductions : undefined,
              });
              setModalOpen(false);
              setSelected([]);
              setDeductions([]);
              router.push(arRoutes.detail(res.data.id));
            } catch {
              // hook แจ้ง error แล้ว — เปิด modal ค้างไว้ (รายการที่เลือกอาจถูกคนอื่นใช้ไปแล้ว ให้รีเฟรช)
            }
          }}
        >
          <Form.Item
            name="invoiceDate"
            label={t("วันที่ใบแจ้งหนี้")}
            rules={[{ required: true, message: t("ระบุวันที่") }]}
          >
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="dueDate" label={t("วันครบกำหนดชำระ")}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <AdvanceDeductionPicker
            salesOrderId={lockedSalesOrderId}
            deliveryOrderIds={selected.map((r) => r.id)}
            value={deductions}
            onChange={setDeductions}
          />
          <CustomerCreditNotice customerId={selected[0]?.customerId} />
        </Form>
        <p style={{ color: "#8a9199", fontSize: 13, marginBottom: 0 }}>
          {t("ยอดคิดจากจำนวนที่ลูกค้ารับจริง (ของตีกลับไม่เก็บเงิน) ส่วนลด/VAT ตามสัดส่วนของใบสั่งขาย")}
        </p>
      </Modal>
    </div>
  );
}
