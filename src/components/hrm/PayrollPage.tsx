"use client";

import { useState } from "react";
import { Alert, App, Button, DatePicker, Form, Input, Modal, Segmented, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined, FileTextOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreatePayrollRunMutation, usePayrollRunsQuery } from "@/hooks/payroll/usePayroll";
import { overlapFromError, payBaseIssuesFromError, validatePayrollRun } from "@/lib/api/payroll";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  PAYROLL_STATUS_COLOR,
  PAYROLL_STATUS_LABEL,
  payrollStatusLabel,
  type CreatePayrollRunRequest,
  type PayBaseIssue,
  type PayrollExclusionInput,
  type PayrollOverlapRun,
  type PayrollRun,
  type PayrollRunStatus,
} from "@/types/payroll";
import styles from "@/components/masters/shared/master-page.module.css";

import PayrollDetailDrawer from "./PayrollDetailDrawer";
import PayrollPayBaseIssuesModal from "./PayrollPayBaseIssuesModal";
import PayrollSettingsModal from "./PayrollSettingsModal";
import PayrollWhtModal from "./PayrollWhtModal";
import PayrollSalaryCertificateModal from "./PayrollSalaryCertificateModal";
import { formatBeRange } from "./shutdownPlanFormat";
import PageHeader from "@/components/common/PageHeader";

type CreateValues = { name: string; month?: Dayjs; range: [Dayjs, Dayjs]; note?: string };

const STATUS_FILTER_OPTIONS: PayrollRunStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PENDING_PAYMENT",
  "PAID",
  "FINALIZED",
  "CANCELLED",
];

type OverlapInfo = { body: CreatePayrollRunRequest; code: "PAYROLL_PERIOD_OVERLAP" | "PAYROLL_PERIOD_OVERLAP_FINALIZED"; runs: PayrollOverlapRun[] };

/** หน้า /hrm/payroll — งวดเงินเดือน: สร้างงวด (เลือกเดือน/ปี หรือกำหนดช่วงเอง) → ตรวจ/ปรับ → ส่งอนุมัติ → อนุมัติ → จ่ายเงิน → ปิดงวด */
export default function PayrollPage() {
  const t = useT();
  const language = useLanguage();
  const money = (v: number) => formatMoney(v, language);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whtOpen, setWhtOpen] = useState(false);
  const [salaryCertOpen, setSalaryCertOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const { message } = App.useApp();
  // ตรวจฐานค่าจ้างก่อนสร้างงวด: ถ้ามีคนไม่มีเงินเดือน เก็บคำขอไว้แล้วเปิด modal รายชื่อ
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<CreatePayrollRunRequest | null>(null);
  const [issues, setIssues] = useState<PayBaseIssue[]>([]);
  const [form] = Form.useForm<CreateValues>();
  // โหมดช่วงวันที่: เลือกเดือน/ปี (เติมวันที่อัตโนมัติ) หรือกำหนดเอง (รอบเงินเดือนไม่ตรงเดือนปฏิทิน)
  const [rangeMode, setRangeMode] = useState<"month" | "custom">("month");
  // งวดที่ช่วงวันทับกับงวดที่สร้าง: แจ้งชื่อ/ช่วง/สถานะ + ลิงก์ไปงวดเดิม
  const [overlap, setOverlap] = useState<OverlapInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<PayrollRunStatus | undefined>();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const canAdd = !isMatrixPermissionMode() || hasPermission("HRM_PAYROLL.ADD");

  const runsQuery = usePayrollRunsQuery();
  const createMutation = useCreatePayrollRunMutation();
  const allRuns = runsQuery.data?.data ?? [];
  const yearOptions = Array.from(
    new Set(allRuns.flatMap((r) => [r.periodStart.slice(0, 4), r.periodEnd.slice(0, 4)])),
  )
    .sort((a, b) => b.localeCompare(a))
    .map((y) => ({ value: y, label: language === "en" ? y : String(Number(y) + 543) }));
  const keyword = search.trim().toLowerCase();
  const runs = allRuns.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    // งวดที่ช่วงวันทับกับปี/ช่วงวันที่ที่เลือก
    if (yearFilter && !(r.periodStart.slice(0, 4) <= yearFilter && r.periodEnd.slice(0, 4) >= yearFilter)) return false;
    if (dateRange?.[0] && r.periodEnd < dateRange[0].format("YYYY-MM-DD")) return false;
    if (dateRange?.[1] && r.periodStart > dateRange[1].format("YYYY-MM-DD")) return false;
    if (keyword) {
      const hay = [r.name, r.periodStart, r.periodEnd, payrollStatusLabel(r.status, language), r.status]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });
  const hasFilter = Boolean(statusFilter || yearFilter || dateRange || keyword);

  /** เลือกเดือน/ปี → วันที่เริ่ม–สิ้นสุดอัตโนมัติ (วันแรก–วันสุดท้ายของเดือน) + ตั้งชื่องวดให้ถ้ายังไม่ได้พิมพ์เอง */
  const onMonthChange = (month: Dayjs | null) => {
    if (!month) return;
    const label = month.toDate().toLocaleDateString(language === "en" ? "en-GB" : "th-TH", { month: "long", year: "numeric" });
    form.setFieldsValue({
      range: [month.startOf("month"), month.endOf("month")],
      name: form.getFieldValue("name")?.trim() ? form.getFieldValue("name") : `${t("เงินเดือน")} ${label}`,
    });
  };

  const finishCreate = (id: string) => {
    setCreateOpen(false);
    setPending(null);
    setIssues([]);
    setOverlap(null);
    form.resetFields();
    setRangeMode("month");
    setDetailId(id);
  };

  const createWith = async (body: CreatePayrollRunRequest) => {
    try {
      const res = await createMutation.mutateAsync(body);
      finishCreate(res.data.id);
    } catch (error) {
      const found = payBaseIssuesFromError(error);
      if (found) {
        setPending(body);
        setIssues(found);
        return;
      }
      const clash = overlapFromError(error);
      if (clash) {
        setPending(null);
        setIssues([]);
        setOverlap({ body, code: clash.code, runs: clash.runs });
      }
    }
  };

  /** เปิดงวดเดิมที่ทับกัน — ปิด modal สร้างงวดแล้วเปิดรายละเอียดงวดนั้น */
  const openExisting = (id: string) => {
    setOverlap(null);
    setCreateOpen(false);
    setDetailId(id);
  };

  const submit = () =>
    void form.validateFields().then(async (v) => {
      const body: CreatePayrollRunRequest = {
        name: v.name.trim(),
        periodStart: v.range[0].format("YYYY-MM-DD"),
        periodEnd: v.range[1].format("YYYY-MM-DD"),
        note: v.note?.trim() || undefined,
      };
      setChecking(true);
      try {
        const res = await validatePayrollRun(getAccessToken(), body);
        if (res.data.count > 0) {
          setPending(body);
          setIssues(res.data.issues);
          return;
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : t("ตรวจฐานค่าจ้างไม่สำเร็จ"));
        return;
      } finally {
        setChecking(false);
      }
      await createWith(body);
    });

  /** "ตรวจใหม่และคำนวณ" จาก modal — ส่งรายการไม่คำนวณไปกับคำขอสร้างงวด ถ้ายังมีคนไม่ครบ backend คืนรายชื่อใหม่ */
  const submitWithExclusions = async (exclusions: PayrollExclusionInput[]) => {
    if (!pending) return;
    await createWith({ ...pending, exclusions });
  };

  const columns: ColumnsType<PayrollRun> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("งวด"),
      key: "name",
      render: (_v, r) => (
        <button
          type="button"
          onClick={() => setDetailId(r.id)}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
        >
          {r.name}
        </button>
      ),
    },
    { title: t("ช่วงวันที่"), key: "range", width: 220, render: (_v, r) => formatBeRange(r.periodStart, r.periodEnd, language) },
    { title: t("พนักงานในงวด"), key: "count", width: 100, align: "right", render: (_v, r) => r.totals.slipCount },
    { title: t("ค่าล่วงเวลา (OT)"), key: "ot", width: 120, align: "right", render: (_v, r) => money(r.totals.otAmount) },
    { title: t("ยอดจ่ายสุทธิรวม"), key: "net", width: 140, align: "right", render: (_v, r) => money(r.totals.netPay) },
    {
      title: t("คำเตือน"),
      key: "warn",
      width: 90,
      align: "center",
      render: (_v, r) => (r.totals.warningCount ? <Tag color="orange">{r.totals.warningCount}</Tag> : "—"),
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 120,
      render: (_v, r) => <Tag color={PAYROLL_STATUS_COLOR[r.status]}>{payrollStatusLabel(r.status, language)}</Tag>,
    },
  ];

  return (
    <MasterPageGate isLoading={runsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="HRM · PAYROLL"
          icon={<DollarOutlined />}
          title={t("เงินเดือน")}
          subtitle={t("คำนวณเงินเดือน/ค่าแรง + OT เป็นงวด → ส่งอนุมัติ → อนุมัติ → ส่งออกรายการจ่าย/บันทึกผลจ่าย → ปิดงวด")}
          actions={
            <>
<div style={{ display: "flex", gap: 8 }}>
            <Button size="large" icon={<FileTextOutlined />} onClick={() => setWhtOpen(true)}>
              {t("50 ทวิ")}
            </Button>
            <Button size="large" icon={<FileTextOutlined />} onClick={() => setSalaryCertOpen(true)}>
              {t("หนังสือรับรองเงินเดือน")}
            </Button>
            <Button size="large" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              {t("ตั้งค่า")}
            </Button>
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                {t("สร้างงวดเงินเดือน")}
              </Button>
            ) : null}
          </div>
            </>
          }
        />

        <Alert
          type="info"
          showIcon
          title={t("ข้อมูลอ่อนไหว — เห็นได้เฉพาะผู้ที่ได้รับสิทธิ์หน้านี้")}
          description={t("ระบบคำนวณให้อัตโนมัติ: เงินเดือน/ค่าแรงรายวัน, OT ที่อนุมัติแล้ว, หักขาดงาน/ลาไม่รับเงิน, ประกันสังคม, กองทุน (เลือก % รายคน), ภาษีหัก ณ ที่จ่าย (ประมาณการทั้งปี) · เบี้ยขยัน ค่ากะ ค่ากะกลางคืน โบนัส ใส่เป็น “รายการปรับ” รายคนในแต่ละงวด")}
          style={{ marginBottom: 12 }}
        />

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>{t("งวดเงินเดือน")}</h3>
              <p>{t("กดชื่องวดเพื่อดูสลิป ปรับรายการ ส่งอนุมัติ บันทึกผลจ่าย และปิดงวด")}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 22px" }}>
            <Input.Search
              allowClear
              style={{ width: 240 }}
              placeholder={t("ค้นหาชื่องวด สถานะ วันที่")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("ค้นหา")}
            />
            <Select
              allowClear
              style={{ width: 120 }}
              placeholder={t("ทุกปี")}
              value={yearFilter}
              onChange={setYearFilter}
              options={yearOptions}
              aria-label={t("ปี")}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v)}
              aria-label={t("ช่วงวันที่")}
            />
            <Select
              allowClear
              style={{ width: 180 }}
              placeholder={t("ทุกสถานะ")}
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS.map((status) => ({
                value: status,
                label: payrollStatusLabel(status, language),
              }))}
              aria-label={t("สถานะ")}
            />
            {hasFilter ? (
              <Button
                onClick={() => {
                  setSearch("");
                  setYearFilter(undefined);
                  setDateRange(null);
                  setStatusFilter(undefined);
                }}
              >
                {t("ล้างตัวกรอง")}
              </Button>
            ) : null}
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={runs}
            loading={runsQuery.isFetching}
            pagination={{ pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} งวด", { n: total }) }}
            scroll={{ x: 900 }}
            locale={{ emptyText: t("ยังไม่มีงวดเงินเดือน — กด สร้างงวดเงินเดือน") }}
          />
        </div>

        <Modal
          open={createOpen}
          title={t("สร้างงวดเงินเดือน")}
          okText={t("สร้างและคำนวณ")}
          cancelText={t("ยกเลิก")}
          confirmLoading={checking || (createMutation.isPending && issues.length === 0)}
          onCancel={() => {
            setCreateOpen(false);
            setRangeMode("month");
          }}
          onOk={submit}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" preserve={false}>
            <Form.Item name="name" label={t("ชื่องวด")} rules={[{ required: true, whitespace: true, message: t("ใส่ชื่องวด") }]}>
              <Input maxLength={200} placeholder={t("เช่น เงินเดือน ต.ค. 2569")} />
            </Form.Item>
            <Segmented
              block
              style={{ marginBottom: 12 }}
              value={rangeMode}
              onChange={(v) => setRangeMode(v as "month" | "custom")}
              options={[
                { value: "month", label: t("เลือกเดือน/ปี") },
                { value: "custom", label: t("กำหนดช่วงวันที่เอง") },
              ]}
            />
            {rangeMode === "month" ? (
              <Form.Item name="month" label={t("เดือน/ปี")} rules={[{ required: true, message: t("เลือกเดือน") }]}>
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MM/YYYY"
                  onChange={onMonthChange}
                  disabledDate={(d) => d.isAfter(dayjs().add(1, "year"))}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="range"
              label={
                rangeMode === "month"
                  ? t("ช่วงวันที่ของงวด (กำหนดให้อัตโนมัติตามเดือนที่เลือก)")
                  : t("ช่วงวันที่ของงวด (เริ่ม–สิ้นสุด กำหนดเองได้ ไม่เกิน 62 วัน)")
              }
              rules={[{ required: true, message: t("เลือกช่วงวันที่") }]}
            >
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                disabled={rangeMode === "month"}
                disabledDate={(d) => d.isAfter(dayjs().add(1, "year"))}
              />
            </Form.Item>
            <Form.Item name="note" label={t("หมายเหตุ")}>
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </Form>
        </Modal>
        <PayrollPayBaseIssuesModal
          open={pending !== null && issues.length > 0}
          issues={issues}
          existing={pending?.exclusions}
          loading={createMutation.isPending}
          onSubmit={submitWithExclusions}
          onClose={() => {
            setPending(null);
            setIssues([]);
          }}
        />
        <Modal
          open={overlap !== null}
          title={t("ช่วงวันที่ทับกับงวดที่มีอยู่แล้ว")}
          onCancel={() => setOverlap(null)}
          footer={
            <>
              <Button onClick={() => setOverlap(null)}>{t("กลับไปแก้ช่วงวันที่")}</Button>
              {overlap?.code === "PAYROLL_PERIOD_OVERLAP" ? (
                <Button
                  danger
                  loading={createMutation.isPending}
                  onClick={() => overlap && void createWith({ ...overlap.body, allowOverlap: true })}
                >
                  {t("ยืนยันสร้างซ้อน")}
                </Button>
              ) : null}
            </>
          }
          destroyOnHidden
        >
          <Alert
            type={overlap?.code === "PAYROLL_PERIOD_OVERLAP_FINALIZED" ? "error" : "warning"}
            showIcon
            style={{ marginBottom: 12 }}
            title={
              overlap?.code === "PAYROLL_PERIOD_OVERLAP_FINALIZED"
                ? t("ทับกับงวดที่ปิดแล้ว — สร้างงวดซ้อนไม่ได้ (กันจ่ายค่าจ้างวันเดียวกันสองรอบ)")
                : t("พบงวดที่ช่วงวันที่ทับกัน — ตรวจว่าไม่ใช่งวดซ้ำ ก่อนสร้างซ้อน")
            }
          />
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={overlap?.runs ?? []}
            columns={[
              { title: t("งวด"), dataIndex: "name" },
              {
                title: t("ช่วงวันที่"),
                key: "range",
                render: (_v: unknown, r: PayrollOverlapRun) => formatBeRange(r.periodStart, r.periodEnd, language),
              },
              {
                title: t("สถานะ"),
                key: "status",
                render: (_v: unknown, r: PayrollOverlapRun) => (
                  <Tag color={PAYROLL_STATUS_COLOR[r.status]}>{PAYROLL_STATUS_LABEL[r.status] ? payrollStatusLabel(r.status, language) : r.status}</Tag>
                ),
              },
              {
                title: "",
                key: "open",
                render: (_v: unknown, r: PayrollOverlapRun) => (
                  <Button size="small" onClick={() => openExisting(r.id)}>
                    {t("เปิดงวดนี้")}
                  </Button>
                ),
              },
            ]}
          />
        </Modal>
        <PayrollSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <PayrollWhtModal open={whtOpen} onClose={() => setWhtOpen(false)} />
        <PayrollSalaryCertificateModal open={salaryCertOpen} onClose={() => setSalaryCertOpen(false)} />
        <PayrollDetailDrawer runId={detailId} onClose={() => setDetailId(undefined)} />
      </section>
    </MasterPageGate>
  );
}
