"use client";

import { useState } from "react";
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useApproveOilTransferMutation,
  useCancelOilTransferMutation,
  useCreateOilTransferMutation,
  useOilTanksQuery,
  useOilTransfersQuery,
} from "@/hooks/oil-tank-farm/useOilTankFarm";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { OIL_DOC_STATUS_LABEL, type OilTransfer } from "@/types/oil-tank-farm";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const n = (v: string | number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: 3 });
const STATUS_COLOR: Record<string, string> = { DRAFT: "gold", POSTED: "green", CANCELLED: "default" };

type Values = {
  transferDate: dayjs.Dayjs;
  fromTankId: string;
  toTankId: string;
  quantityLiters: number;
  lossLiters?: number;
  lossReason?: string;
  unitId: string;
  remark?: string;
};

function CreateModal({ onClose }: { onClose: () => void }) {
  const [form] = Form.useForm<Values>();
  const create = useCreateOilTransferMutation();
  const tanksQuery = useOilTanksQuery();
  const unitsQuery = useUnitsQuery({ isActive: true });
  const tanks = (tanksQuery.data?.data ?? []).filter((t) => t.status === "ACTIVE");
  const fromId = Form.useWatch("fromTankId", form);
  const toId = Form.useWatch("toTankId", form);
  const qty = Form.useWatch("quantityLiters", form) ?? 0;
  const loss = Form.useWatch("lossLiters", form) ?? 0;
  const from = tanks.find((t) => t.id === fromId);
  const to = tanks.find((t) => t.id === toId);
  const toFree = to ? Number(to.capacityLiters) - Number(to.currentVolumeLiters ?? 0) : undefined;

  return (
    <Modal
      open
      title="โอนน้ำมันระหว่างถัง"
      okText="สร้างใบโอน"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          create.mutate(
            {
              transferDate: v.transferDate.format("YYYY-MM-DD"),
              fromTankId: v.fromTankId,
              toTankId: v.toTankId,
              quantityLiters: v.quantityLiters,
              unitId: v.unitId,
              lossLiters: v.lossLiters || undefined,
              lossReason: v.lossReason,
              remark: v.remark,
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ transferDate: dayjs(), lossLiters: 0 }}>
        <Form.Item name="transferDate" label="วันที่โอน" rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="fromTankId" label="ถังต้นทาง" rules={[{ required: true, message: "เลือกถัง" }]} style={{ flex: 1 }}>
            <Select options={tanks.map((t) => ({ value: t.id, label: `${t.tankNo} (พร้อมใช้ ${n(t.availableLiters ?? 0)})` }))} />
          </Form.Item>
          <Form.Item
            name="toTankId"
            label="ถังปลายทาง"
            dependencies={["fromTankId"]}
            rules={[{ required: true, message: "เลือกถัง" }, ({ getFieldValue }) => ({ validator: (_r, v) => (v && v === getFieldValue("fromTankId") ? Promise.reject(new Error("ต้องคนละถัง")) : Promise.resolve()) })]}
            style={{ flex: 1 }}
          >
            <Select options={tanks.filter((t) => t.id !== fromId && (!from || t.itemId === from.itemId)).map((t) => ({ value: t.id, label: `${t.tankNo} (ว่าง ${n(Number(t.capacityLiters) - Number(t.currentVolumeLiters ?? 0))})` }))} />
          </Form.Item>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="quantityLiters" label="ปริมาณที่โอนออก" rules={[{ required: true, message: "ใส่ปริมาณ" }]} style={{ flex: 1 }}>
            <InputNumber min={0.001} max={from ? Number(from.availableLiters ?? 0) : undefined} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="lossLiters" label="สูญเสียระหว่างโอน" style={{ flex: 1 }} extra="ถังปลายทางได้ = โอนออก − สูญเสีย">
            <InputNumber min={0} max={qty > 0 ? qty - 0.001 : undefined} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="unitId" label="หน่วย" rules={[{ required: true, message: "เลือกหน่วย" }]} style={{ flex: 1 }}>
            <Select showSearch optionFilterProp="label" options={(unitsQuery.data?.data ?? []).map((u) => ({ value: u.id, label: u.code }))} />
          </Form.Item>
        </div>
        {qty > 0 ? (
          <Alert
            style={{ marginBottom: 12 }}
            type={toFree !== undefined && qty - loss > toFree ? "error" : "info"}
            showIcon
            title={`ถังปลายทางจะได้รับ ${n(Math.max(qty - loss, 0))} ลิตร${loss > 0 ? ` (สูญเสีย ${n(loss)} = ${((loss / qty) * 100).toFixed(2)}%)` : ""}${toFree !== undefined ? ` · ที่ว่างปลายทาง ${n(toFree)} ลิตร` : ""}`}
          />
        ) : null}
        <Form.Item name="lossReason" label="สาเหตุที่สูญเสีย">
          <Input maxLength={2000} placeholder="เช่น ระเหย / ตกค้างในท่อ" />
        </Form.Item>
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <p style={{ color: "#8a94a6", marginBottom: 0 }}>
          โอนได้เฉพาะถังที่เก็บน้ำมันชนิดเดียวกัน · สร้างใบแล้วระบบจองน้ำมันต้นทางไว้ให้ จนกว่าจะอนุมัติหรือยกเลิก · โอนตาม Lot (FIFO) ตามรอยย้อนกลับได้
        </p>
      </Form>
    </Modal>
  );
}

/** หน้า /oil-tank-farm/transfers — โอนน้ำมันระหว่างถังพร้อมบันทึกสูญเสีย */
export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const query = useOilTransfersQuery();
  const approve = useApproveOilTransferMutation();
  const cancel = useCancelOilTransferMutation();
  const { canAdd, canApprove } = getScreenActionPermissions("OIL_TRANSFERS");
  const [creating, setCreating] = useState(false);

  const columns: ColumnsType<OilTransfer> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: "ใบโอน", key: "no", width: 150, render: (_v, r) => <div><strong>{r.transferNo}</strong><div style={{ fontSize: 12, color: "#8a94a6" }}>{dayjs(r.transferDate).format("DD/MM/YYYY")}</div></div> },
    { title: "จาก → ไป", key: "ft", width: 180, render: (_v, r) => `${r.fromTankNo} → ${r.toTankNo}` },
    { title: "โอนออก", key: "q", width: 120, align: "right", render: (_v, r) => `${n(r.quantityLiters)} ${r.unitCode ?? ""}` },
    { title: "สูญเสีย", key: "l", width: 150, align: "right", render: (_v, r) => (Number(r.lossLiters) ? <span style={{ color: "#cf1322" }}>{n(r.lossLiters)} ({((Number(r.lossLiters) / Number(r.quantityLiters)) * 100).toFixed(2)}%)</span> : "—") },
    { title: "ปลายทางได้รับ", key: "r", width: 130, align: "right", render: (_v, r) => n(r.receivedLiters) },
    { title: "หมายเหตุ", key: "m", render: (_v, r) => r.lossReason ?? r.remark ?? "" },
    { title: "สถานะ", key: "s", width: 110, render: (_v, r) => <Tag color={STATUS_COLOR[r.status]}>{OIL_DOC_STATUS_LABEL[r.status] ?? r.status}</Tag> },
    {
      title: "",
      key: "act",
      width: 190,
      render: (_v, r) =>
        r.status === "DRAFT" ? (
          <div style={{ display: "flex", gap: 6 }}>
            {canApprove ? (
              <Popconfirm title="อนุมัติโอนจริง?" description="ตัดน้ำมันถังต้นทางและเพิ่มถังปลายทางตาม Lot" okText="อนุมัติ" cancelText="ยกเลิก" onConfirm={() => approve.mutate(r.id)}>
                <Button size="small" type="primary" loading={approve.isPending && approve.variables === r.id}>อนุมัติ</Button>
              </Popconfirm>
            ) : null}
            <Popconfirm title="ยกเลิกใบโอน? (ปล่อยที่จองคืน)" okText="ยกเลิกใบ" cancelText="ไม่" onConfirm={() => cancel.mutate(r.id)}>
              <Button size="small" danger>ยกเลิก</Button>
            </Popconfirm>
          </div>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="OIL TANK FARM · TRANSFER"
          icon={<SwapOutlined />}
          title="โอนน้ำมันระหว่างถัง"
          subtitle="โอนตาม Lot พร้อมบันทึกปริมาณสูญเสีย · จองน้ำมันต้นทางตั้งแต่สร้างใบ"
          actions={
            <>
{canAdd ? <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>สร้างใบโอน</Button> : <div />}
            </>
          }
        />
        <div className={styles.tableCard}>
          <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={query.data?.data ?? []} loading={query.isFetching} pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} ใบ` }} scroll={{ x: 1000 }} locale={{ emptyText: "ยังไม่มีใบโอน" }} />
        </div>
        {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}
      </section>
    </MasterPageGate>
  );
}
