"use client";

import { useState } from "react";
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCancelOilReceivingMutation,
  useCreateOilReceivingMutation,
  useOilReceivingsQuery,
  useOilTanksQuery,
  usePostOilReceivingMutation,
  useSendLabSampleMutation,
} from "@/hooks/oil-tank-farm/useOilTankFarm";
import { useProductionOrdersQuery } from "@/hooks/production-orders/useProductionOrderQueries";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { oilDocStatusLabel, type OilReceiving } from "@/types/oil-tank-farm";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const n = (v: string) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: 3 });
const STATUS_COLOR: Record<string, string> = { DRAFT: "gold", POSTED: "green", CANCELLED: "default" };
const QC_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "รอ QC (Hold)", color: "gold" },
  HOLD: { label: "พักไว้", color: "orange" },
  APPROVED: { label: "QC ผ่าน", color: "green" },
  REJECTED: { label: "QC ไม่ผ่าน", color: "red" },
};

type Values = {
  receivingDate: dayjs.Dayjs;
  tankId: string;
  quantityLiters: number;
  unitId: string;
  batchNo?: string;
  productionOrderId?: string;
  remark?: string;
};

function CreateModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<Values>();
  const create = useCreateOilReceivingMutation();
  const tanksQuery = useOilTanksQuery();
  const unitsQuery = useUnitsQuery({ isActive: true });
  const ordersQuery = useProductionOrdersQuery({ limit: 100 });
  const tankId = Form.useWatch("tankId", form);
  const tank = (tanksQuery.data?.data ?? []).find((tk) => tk.id === tankId);
  const free = tank ? Number(tank.capacityLiters) - Number(tank.currentVolumeLiters ?? 0) : undefined;

  return (
    <Modal
      open
      title={t("รับน้ำมันเข้าถัง")}
      okText={t("สร้างใบรับ")}
      cancelText={t("ยกเลิก")}
      confirmLoading={create.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          create.mutate(
            {
              receivingDate: v.receivingDate.format("YYYY-MM-DD"),
              tankId: v.tankId,
              quantityLiters: v.quantityLiters,
              unitId: v.unitId,
              batchNo: v.batchNo?.trim() || undefined,
              productionOrderId: v.productionOrderId,
              remark: v.remark,
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ receivingDate: dayjs() }}>
        <Form.Item name="receivingDate" label={t("วันที่รับ")} rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="tankId" label={t("ถังที่รับเข้า")} rules={[{ required: true, message: t("เลือกถัง") }]}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={tanksQuery.isLoading}
            options={(tanksQuery.data?.data ?? []).filter((tk) => tk.status === "ACTIVE").map((tk) => ({ value: tk.id, label: `${tk.tankNo} — ${tk.itemNameTh ?? ""}` }))}
          />
        </Form.Item>
        {tank ? (
          <Alert style={{ marginBottom: 12 }} type={free !== undefined && free <= 0 ? "error" : "info"} showIcon title={t("ที่ว่างในถัง {tank}: {free} ลิตร (ความจุ {cap})", { tank: tank.tankNo, free: Number(free).toLocaleString("th-TH"), cap: Number(tank.capacityLiters).toLocaleString("th-TH") })} />
        ) : null}
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="quantityLiters" label={t("ปริมาณ")} rules={[{ required: true, message: t("ใส่ปริมาณ") }]} style={{ flex: 1 }}>
            <InputNumber min={0.001} max={free} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="unitId" label={t("หน่วย")} rules={[{ required: true, message: t("เลือกหน่วย") }]} style={{ flex: 1 }}>
            <Select showSearch optionFilterProp="label" options={(unitsQuery.data?.data ?? []).map((u) => ({ value: u.id, label: `${u.code} — ${u.nameTh}` }))} />
          </Form.Item>
        </div>
        <Form.Item name="batchNo" label={t("เลข Batch จากฝ่ายผลิต")} extra={t("ประทับลง Lot ที่รับเข้า ใช้ตามรอยย้อนกลับ")}>
          <Input maxLength={100} placeholder={t("เช่น BATCH-2026-12")} />
        </Form.Item>
        <Form.Item name="productionOrderId" label={t("ใบสั่งผลิตต้นทาง")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={ordersQuery.isLoading}
            options={(ordersQuery.data?.data.items ?? []).map((o) => ({ value: o.id, label: `${o.orderNo}${o.batchNo ? ` · ${o.batchNo}` : ""}` }))}
            onChange={(id) => {
              const o = (ordersQuery.data?.data.items ?? []).find((x) => x.id === id);
              if (o?.batchNo && !form.getFieldValue("batchNo")) form.setFieldValue("batchNo", o.batchNo);
            }}
          />
        </Form.Item>
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** หน้า /oil-tank-farm/receivings — รับน้ำมันจากฝ่ายผลิตเข้าถัง (Batch, ใบสั่งผลิต, QC Hold, ส่ง Lab) */
export default function ReceivingsPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const query = useOilReceivingsQuery();
  const post = usePostOilReceivingMutation();
  const cancel = useCancelOilReceivingMutation();
  const sendLab = useSendLabSampleMutation();
  const { canAdd, canApprove } = getScreenActionPermissions("OIL_RECEIVINGS");
  const [creating, setCreating] = useState(false);

  const columns: ColumnsType<OilReceiving> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: t("ใบรับ"), key: "no", width: 150, render: (_v, r) => <div><strong>{r.receivingNo}</strong><div style={{ fontSize: 12, color: "#8a94a6" }}>{dayjs(r.receivingDate).format("DD/MM/YYYY")}</div></div> },
    { title: t("ถัง"), dataIndex: "tankNo", width: 100 },
    { title: t("ปริมาณ"), key: "q", width: 130, align: "right", render: (_v, r) => `${n(r.quantityLiters)} ${r.unitCode ?? ""}` },
    { title: t("Batch / ใบสั่งผลิต"), key: "b", render: (_v, r) => <span>{r.batchNo ?? "—"}{r.productionOrderNo ? ` · ${r.productionOrderNo}` : ""}</span> },
    {
      title: "QC / Lab",
      key: "qc",
      width: 230,
      render: (_v, r) => (
        <div>
          {r.qcStatus ? <Tag color={QC_LABEL[r.qcStatus]?.color}>{QC_LABEL[r.qcStatus] ? t(QC_LABEL[r.qcStatus].label) : r.qcStatus}</Tag> : null}
          {r.labSampleNo ? <Tag color={r.labSampleStatus === "APPROVED" ? "green" : r.labSampleStatus === "REJECTED" ? "red" : "blue"}>Lab {r.labSampleNo} · {r.labSampleStatus}</Tag> : null}
        </div>
      ),
    },
    { title: t("สถานะ"), key: "s", width: 110, render: (_v, r) => <Tag color={STATUS_COLOR[r.status]}>{oilDocStatusLabel(r.status, lang)}</Tag> },
    {
      title: "",
      key: "act",
      width: 270,
      render: (_v, r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.status === "DRAFT" && canApprove ? (
            <Popconfirm title={t("รับน้ำมันเข้าถังตามใบนี้?")} description={t("สร้าง Lot ใหม่ (Hold ถ้าสินค้าต้อง QC) — ถังต้องมีที่ว่างพอ")} okText={t("รับเข้า")} cancelText={t("ยกเลิก")} onConfirm={() => post.mutate(r.id)}>
              <Button size="small" type="primary" loading={post.isPending && post.variables === r.id}>{t("รับเข้าถัง")}</Button>
            </Popconfirm>
          ) : null}
          {r.status === "DRAFT" ? (
            <Popconfirm title={t("ยกเลิกใบรับนี้?")} okText={t("ยกเลิกใบ")} cancelText={t("ไม่")} onConfirm={() => cancel.mutate(r.id)}>
              <Button size="small" danger>{t("ยกเลิก")}</Button>
            </Popconfirm>
          ) : null}
          {r.status === "POSTED" && !r.labSampleId ? (
            <Popconfirm
              title={t("ส่งตัวอย่างน้ำมันให้ Lab?")}
              description={t("ผล Lab อนุมัติ → ปล่อย Lot อัตโนมัติ · ตีกลับ → ปฏิเสธ Lot (ยอดถูก Block)")}
              okText={t("ส่งตัวอย่าง")}
              cancelText={t("ยกเลิก")}
              onConfirm={() => sendLab.mutate({ collectedDate: dayjs().format("YYYY-MM-DD"), referenceDocId: r.id, referenceDocNo: r.receivingNo })}
            >
              <Button size="small" loading={sendLab.isPending && sendLab.variables?.referenceDocId === r.id}>{t("ส่งตัวอย่าง Lab")}</Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="OIL TANK FARM · RECEIVING"
          icon={<ExperimentOutlined />}
          title={t("รับน้ำมันเข้าถัง")}
          subtitle={t("รับจากฝ่ายผลิตพร้อม Batch และใบสั่งผลิต · Lot ใหม่ต้องผ่าน QC ก่อนใช้ (ผล Lab ปล่อย Lot ให้อัตโนมัติ)")}
          actions={
            <>
{canAdd ? <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>{t("สร้างใบรับ")}</Button> : <div />}
            </>
          }
        />
        <div className={styles.tableCard}>
          <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={query.data?.data ?? []} loading={query.isFetching} pagination={{ pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} ใบ", { n: total }) }} scroll={{ x: 1100 }} locale={{ emptyText: t("ยังไม่มีใบรับน้ำมัน") }} />
        </div>
        {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}
      </section>
    </MasterPageGate>
  );
}
