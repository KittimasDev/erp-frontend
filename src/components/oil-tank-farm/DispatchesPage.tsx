"use client";

import { useState } from "react";
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CarOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  useApproveOilDispatchMutation,
  useCancelOilDispatchMutation,
  useCreateOilDispatchMutation,
  useOilDispatchesQuery,
  useOilTanksQuery,
} from "@/hooks/oil-tank-farm/useOilTankFarm";
import { useSalesOrdersQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { OIL_DOC_STATUS_COLOR, oilDocStatusLabel, type OilDispatch } from "@/types/oil-tank-farm";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const n = (v: string | number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: 3 });
const SO_OK = ["CONFIRMED", "STOCK_CHECKED", "PICKING", "PACKED", "PARTIALLY_ISSUED"];

type Values = {
  dispatchDate: dayjs.Dayjs;
  tankId: string;
  quantityLiters: number;
  unitId: string;
  salesOrderId?: string;
  customerId?: string;
  truckId?: string;
  truckLicensePlate?: string;
  driverName?: string;
  weighbridgeTicketNo?: string;
  remark?: string;
};

function CreateModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<Values>();
  const create = useCreateOilDispatchMutation();
  const tanksQuery = useOilTanksQuery();
  const unitsQuery = useUnitsQuery({ isActive: true });
  const customersQuery = useCustomersQuery({ isActive: true });
  const salesOrdersQuery = useSalesOrdersQuery({});
  const trucksQuery = useTrucksQuery({});
  const tankId = Form.useWatch("tankId", form);
  const salesOrderId = Form.useWatch("salesOrderId", form);
  const tank = (tanksQuery.data?.data ?? []).find((tk) => tk.id === tankId);
  const orders = (salesOrdersQuery.data?.data ?? []).filter((so) => SO_OK.includes(so.status));
  const order = orders.find((o) => o.id === salesOrderId);

  return (
    <Modal
      open
      width={680}
      title={t("เปิดรายการ Loading น้ำมัน")}
      okText={t("สร้างใบจ่าย")}
      cancelText={t("ยกเลิก")}
      confirmLoading={create.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          create.mutate(
            {
              dispatchDate: v.dispatchDate.format("YYYY-MM-DD"),
              tankId: v.tankId,
              quantityLiters: v.quantityLiters,
              unitId: v.unitId,
              salesOrderId: v.salesOrderId,
              customerId: v.salesOrderId ? undefined : v.customerId,
              truckId: v.truckId,
              truckLicensePlate: v.truckLicensePlate?.trim() || undefined,
              driverName: v.driverName?.trim() || undefined,
              weighbridgeTicketNo: v.weighbridgeTicketNo?.trim() || undefined,
              remark: v.remark,
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ dispatchDate: dayjs() }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="dispatchDate" label={t("วันที่")} rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="tankId" label={t("ถังที่จ่าย")} rules={[{ required: true, message: t("เลือกถัง") }]} style={{ flex: 1 }}>
            <Select options={(tanksQuery.data?.data ?? []).filter((tk) => tk.status === "ACTIVE").map((tk) => ({ value: tk.id, label: `${tk.tankNo} (${t("พร้อมใช้")} ${n(tk.availableLiters ?? 0)})` }))} />
          </Form.Item>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="quantityLiters" label={t("ปริมาณ")} rules={[{ required: true, message: t("ใส่ปริมาณ") }]} style={{ flex: 1 }}>
            <InputNumber min={0.001} max={tank ? Number(tank.availableLiters ?? 0) : undefined} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="unitId" label={t("หน่วย")} rules={[{ required: true, message: t("เลือกหน่วย") }]} style={{ flex: 1 }}>
            <Select showSearch optionFilterProp="label" options={(unitsQuery.data?.data ?? []).map((u) => ({ value: u.id, label: u.code }))} />
          </Form.Item>
        </div>
        <Form.Item name="salesOrderId" label={t("ใบสั่งขาย (ที่ยืนยันแล้ว)")} extra={t("เลือกแล้วระบบดึงลูกค้าจากใบสั่งขายให้")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={salesOrdersQuery.isLoading}
            options={orders.map((o) => ({ value: o.id, label: `${o.soNo}${o.customer?.nameTh ? ` — ${o.customer.nameTh}` : ""}` }))}
          />
        </Form.Item>
        <Form.Item name="customerId" label={t("ลูกค้า")} extra={order ? t("ใช้ลูกค้าของใบสั่งขายที่เลือก") : t("ไม่ผูกใบสั่งขาย → เลือกลูกค้าเอง")}>
          <Select
            allowClear
            showSearch
            disabled={Boolean(order)}
            optionFilterProp="label"
            loading={customersQuery.isLoading}
            options={(customersQuery.data?.data ?? []).map((c) => ({ value: c.id, label: `${c.customerCode} — ${c.nameTh}` }))}
          />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="truckId" label={t("รถบรรทุก (จากทะเบียนรถ)")} style={{ flex: 1 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={trucksQuery.isLoading}
              options={(trucksQuery.data?.data ?? []).map((t) => ({ value: t.id, label: `${t.licensePlate}${t.driverName ? ` · ${t.driverName}` : ""}` }))}
              onChange={(id) => {
                const t = (trucksQuery.data?.data ?? []).find((x) => x.id === id);
                if (t) {
                  form.setFieldValue("truckLicensePlate", t.licensePlate);
                  if (t.driverName && !form.getFieldValue("driverName")) form.setFieldValue("driverName", t.driverName);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="truckLicensePlate" label={t("ทะเบียนรถ")} style={{ flex: 1 }}>
            <Input maxLength={50} placeholder={t("พิมพ์เองได้ถ้าไม่มีในทะเบียนรถ")} />
          </Form.Item>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="driverName" label={t("ชื่อคนขับ")} style={{ flex: 1 }}>
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="weighbridgeTicketNo" label={t("เลขตั๋วชั่ง (ขาออก)")} style={{ flex: 1 }} extra={t("แสดงน้ำมันสุทธิตามตั๋วเทียบกับลิตรที่จ่าย (ไม่บล็อก)")}>
            <Input maxLength={50} />
          </Form.Item>
        </div>
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Alert type="info" showIcon title={t("สร้างใบแล้วระบบจองน้ำมันในถังไว้ให้ จนกว่าจะอนุมัติหรือยกเลิก · อนุมัติจ่ายตัดตาม Lot (FIFO) — Lot ที่ QC/COA ยังไม่ผ่านจ่ายไม่ได้")} />
      </Form>
    </Modal>
  );
}

/** หน้า /oil-tank-farm/dispatches — Oil Loading: จ่ายน้ำมันให้ลูกค้า ระบุรถ/คนขับ/ตั๋วชั่ง */
export default function DispatchesPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const query = useOilDispatchesQuery();
  const approve = useApproveOilDispatchMutation();
  const cancel = useCancelOilDispatchMutation();
  const { canAdd, canApprove } = getScreenActionPermissions("OIL_DISPATCHES");
  const [creating, setCreating] = useState(false);

  const columns: ColumnsType<OilDispatch> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: t("ใบจ่าย"), key: "no", width: 150, render: (_v, r) => <div><strong>{r.dispatchNo}</strong><div style={{ fontSize: 12, color: "#8a94a6" }}>{dayjs(r.dispatchDate).format("DD/MM/BBBB")}</div></div> },
    { title: t("ลูกค้า / ใบสั่งขาย"), key: "c", render: (_v, r) => <div>{r.customerName ?? "—"}<div style={{ fontSize: 12, color: "#8a94a6" }}>{r.salesOrderNo ?? r.referenceDocNo ?? ""}</div></div> },
    { title: t("รถ / คนขับ"), key: "t", width: 170, render: (_v, r) => <div>{r.truckLicensePlate ?? "—"}<div style={{ fontSize: 12, color: "#8a94a6" }}>{r.driverName ?? ""}</div></div> },
    { title: t("ถัง"), dataIndex: "tankNo", width: 90 },
    { title: t("ปริมาณ"), key: "q", width: 130, align: "right", render: (_v, r) => `${n(r.quantityLiters)} ${r.unitCode ?? ""}` },
    {
      title: t("ตั๋วชั่ง"),
      key: "w",
      width: 170,
      render: (_v, r) => (r.weighbridgeTicketNo ? <div>{r.weighbridgeTicketNo}<div style={{ fontSize: 12, color: "#8a94a6" }}>{r.weighbridgeNetKg ? t("สุทธิ {w} กก.", { w: n(r.weighbridgeNetKg) }) : t("ยังไม่มีน้ำหนักสุทธิ")}</div></div> : "—"),
    },
    { title: t("สถานะ"), key: "s", width: 110, render: (_v, r) => <Tag color={OIL_DOC_STATUS_COLOR[r.status]}>{oilDocStatusLabel(r.status, lang)}</Tag> },
    {
      title: "",
      key: "act",
      width: 190,
      render: (_v, r) =>
        r.status === "DRAFT" ? (
          <div style={{ display: "flex", gap: 6 }}>
            {canApprove ? (
              <Popconfirm title={t("อนุมัติจ่ายน้ำมัน?")} description={t("ตัดน้ำมันจากถังตาม Lot (FIFO)")} okText={t("อนุมัติ")} cancelText={t("ยกเลิก")} onConfirm={() => approve.mutate(r.id)}>
                <Button size="small" type="primary" loading={approve.isPending && approve.variables === r.id}>{t("อนุมัติจ่าย")}</Button>
              </Popconfirm>
            ) : null}
            <Popconfirm title={t("ยกเลิกใบจ่าย? (ปล่อยที่จองคืน)")} okText={t("ยกเลิกใบ")} cancelText={t("ไม่")} onConfirm={() => cancel.mutate(r.id)}>
              <Button size="small" danger>{t("ยกเลิก")}</Button>
            </Popconfirm>
          </div>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="OIL TANK FARM · LOADING"
          icon={<CarOutlined />}
          title={t("จ่ายน้ำมัน / Oil Loading")}
          subtitle={t("ระบุลูกค้า (หรือใบสั่งขาย) รถบรรทุก คนขับ ปริมาณ และตั๋วชั่ง · จองน้ำมันในถังตั้งแต่สร้างใบ")}
          actions={
            <>
{canAdd ? <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>{t("เปิดรายการ Loading")}</Button> : <div />}
            </>
          }
        />
        <div className={styles.tableCard}>
          <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={query.data?.data ?? []} loading={query.isFetching} pagination={{ pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} ใบ", { n: total }) }} scroll={{ x: 1100 }} locale={{ emptyText: t("ยังไม่มีรายการ Loading") }} />
        </div>
        {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}
      </section>
    </MasterPageGate>
  );
}
