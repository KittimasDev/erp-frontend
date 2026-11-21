"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useArDebitNotesQuery, useCreateArDebitNoteMutation } from "@/hooks/ar-adjustments/useArAdjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useSalesInvoiceQuery, useSalesInvoicesQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import { AR_DEBIT_BASE } from "@/lib/sales/ar-routes";
import { AR_DEBIT_STATUS_COLOR, AR_DEBIT_STATUS_LABEL, type ArDebitNote } from "@/types/ar-adjustments";

const SCREEN_CODE = "FINANCE_RECEIVABLE_DEBIT_NOTES";
const PAGE_SIZE = 20;

/** ใบเพิ่มหนี้ลูกหนี้ — เพิ่มยอดของใบตั้งลูกหนี้ (AR) ที่ยืนยันแล้ว */
export default function ArDebitNotesPage() {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const query = useArDebitNotesQuery({ page, limit: PAGE_SIZE, keyword, status });
  const createMutation = useCreateArDebitNoteMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{
    salesInvoiceId: string;
    debitNoteDate: dayjs.Dayjs;
    reason: string;
    entryMode: "AMOUNT" | "LINES";
    subtotalAmount?: number;
    vatPercent?: number;
    remark?: string;
  }>();
  const invoices = useSalesInvoicesQuery(open ? { status: "POSTED", limit: 200 } : undefined);
  const watchedInvoice = Form.useWatch("salesInvoiceId", form);
  const entryMode = Form.useWatch("entryMode", form) ?? "AMOUNT";
  const sourceInvoice = useSalesInvoiceQuery(open && entryMode === "LINES" ? watchedInvoice : undefined);
  const [lineDrafts, setLineDrafts] = useState<
    Array<{ id: string; itemCode: string; itemName: string; quantity: number; unitPrice: number; selected: boolean }>
  >([]);
  useEffect(() => {
    const items = sourceInvoice.data?.data.items ?? [];
    setLineDrafts(
      items.map((item) => ({
        id: item.id,
        itemCode: item.itemCode ?? "",
        itemName: item.itemName ?? "",
        quantity: 0,
        unitPrice: Number(item.unitPrice),
        selected: false,
      })),
    );
  }, [sourceInvoice.data]);

  if (!perms.canView) return <AccessDenied screenCodes={[SCREEN_CODE]} />;

  const columns: ColumnsType<ArDebitNote> = [
    { title: t("เลขที่"), dataIndex: "debitNoteNo", width: 150, render: (v: string, r) => <Link href={`${AR_DEBIT_BASE}/${r.id}`}><strong>{v}</strong></Link> },
    { title: t("วันที่"), dataIndex: "debitNoteDate", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: t("ลูกค้า"), dataIndex: "customerName", render: (v?: string) => v ?? "—" },
    { title: t("เลขที่ AR"), dataIndex: "invoiceNo", render: (v?: string) => v ?? "—" },
    { title: t("เหตุผล"), dataIndex: "reason", ellipsis: true },
    { title: t("ยอดรวม"), dataIndex: "totalAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("สถานะ"), dataIndex: "status", width: 110, render: (v: string) => <Tag color={AR_DEBIT_STATUS_COLOR[v] ?? "default"}>{t(AR_DEBIT_STATUS_LABEL[v] ?? v)}</Tag> },
    { title: "", key: "action", width: 120, render: (_v, r) => <Link href={`${AR_DEBIT_BASE}/${r.id}`}><Button size="small">{t("ดูรายละเอียด")}</Button></Link> },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={t("ใบเพิ่มหนี้ (ลูกหนี้)")}
        subtitle={t("เพิ่มยอดของใบตั้งลูกหนี้ที่ยืนยันแล้ว เช่น ปรับราคา/ค่าบริการเพิ่ม")}
        actions={
          perms.canAdd ? (
            <Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ debitNoteDate: dayjs(), entryMode: "AMOUNT" }); setOpen(true); }}>
              {t("สร้างใบเพิ่มหนี้")}
            </Button>
          ) : null
        }
      />
      <div className={masterStyles.tableCard}>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input allowClear placeholder={t("เลขที่ใบเพิ่มหนี้ / AR / ลูกค้า")} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={apply} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={Object.entries(AR_DEBIT_STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) }))} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={() => { setSearch(""); setKeyword(""); setStatus(undefined); setPage(1); }}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={apply}>{t("ค้นหา")}</Button>
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
          dataSource={query.data?.items ?? []}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onChange: setPage, showSizeChanger: false, showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }) }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: t("ยังไม่มีใบเพิ่มหนี้") }}
        />
      </div>

      <Modal
        open={open}
        title={t("สร้างใบเพิ่มหนี้")}
        okText={t("สร้างใบเพิ่มหนี้ (ร่าง)")}
        cancelText={t("ยกเลิก")}
        confirmLoading={createMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              const picked = lineDrafts.filter((line) => line.selected && line.quantity > 0);
              if (v.entryMode === "LINES" && picked.length === 0) {
                message.error(t("เลือกอย่างน้อย 1 รายการ"));
                return;
              }
              const res = await createMutation.mutateAsync({
                salesInvoiceId: v.salesInvoiceId,
                debitNoteDate: v.debitNoteDate.format("YYYY-MM-DD"),
                reason: v.reason.trim(),
                subtotalAmount: v.entryMode === "LINES" ? undefined : v.subtotalAmount,
                items:
                  v.entryMode === "LINES"
                    ? picked.map((line) => ({
                        salesInvoiceItemId: line.id,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                      }))
                    : undefined,
                vatPercent: v.vatPercent,
                remark: v.remark?.trim() || undefined,
              });
              setOpen(false);
              router.push(`${AR_DEBIT_BASE}/${res.data.id}`);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          <Form.Item name="salesInvoiceId" label={t("ใบตั้งลูกหนี้ที่เพิ่มยอด")} rules={[{ required: true, message: t("เลือกใบตั้งลูกหนี้") }]}>
            <Select
              showSearch
              loading={invoices.isLoading}
              placeholder={t("เลือกใบตั้งลูกหนี้ (ยืนยันแล้ว)")}
              optionFilterProp="label"
              options={(invoices.data?.data.items ?? []).map((i) => ({ value: i.id, label: `${i.invoiceNo} · ${i.customer?.nameTh ?? ""}` }))}
            />
          </Form.Item>
          <Form.Item name="debitNoteDate" label={t("วันที่")} rules={[{ required: true, message: t("ระบุวันที่") }]}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label={t("เหตุผล")} rules={[{ required: true, message: t("ระบุเหตุผล") }]}>
            <Input maxLength={2000} />
          </Form.Item>
          <Form.Item name="entryMode" label={t("วิธีระบุยอด")} initialValue="AMOUNT">
            <Radio.Group>
              <Radio value="AMOUNT">{t("ระบุยอดรวม")}</Radio>
              <Radio value="LINES">{t("รายการจากใบแจ้งหนี้")}</Radio>
            </Radio.Group>
          </Form.Item>
          {entryMode !== "LINES" ? (
            <Form.Item name="subtotalAmount" label={t("ยอดเพิ่ม (ก่อน VAT)")} rules={[{ required: true, message: t("ระบุจำนวนเงิน") }, { type: "number", min: 0.01, message: t("ต้องมากกว่า 0") }]}>
              <InputNumber precision={2} min={0} style={{ width: "100%" }} />
            </Form.Item>
          ) : (
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={lineDrafts}
              columns={[
                {
                  title: "",
                  width: 48,
                  render: (_, line, index) => (
                    <Checkbox
                      checked={line.selected}
                      onChange={(event) =>
                        setLineDrafts((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, selected: event.target.checked } : row,
                          ),
                        )
                      }
                    />
                  ),
                },
                { title: t("รหัส"), dataIndex: "itemCode", width: 110 },
                { title: t("สินค้า"), dataIndex: "itemName" },
                {
                  title: t("จำนวนที่เพิ่ม"),
                  width: 130,
                  render: (_, line, index) => (
                    <InputNumber
                      min={0}
                      value={line.quantity}
                      style={{ width: "100%" }}
                      onChange={(value) =>
                        setLineDrafts((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, quantity: Number(value ?? 0) } : row,
                          ),
                        )
                      }
                    />
                  ),
                },
                {
                  title: t("ราคาต่อหน่วยของยอดที่เพิ่ม"),
                  width: 180,
                  render: (_, line, index) => (
                    <InputNumber
                      min={0}
                      value={line.unitPrice}
                      style={{ width: "100%" }}
                      onChange={(value) =>
                        setLineDrafts((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, unitPrice: Number(value ?? 0) } : row,
                          ),
                        )
                      }
                    />
                  ),
                },
              ]}
            />
          )}
          <Form.Item name="vatPercent" label={t("VAT % (เว้นว่าง = ตามใบสั่งขาย)")}>
            <InputNumber precision={2} min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
