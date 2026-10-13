"use client";

import { useMemo, useState } from "react";
import { Alert, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

import { useCreateLabSampleMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import {
  LAB_SAMPLE_TYPE_ITEM_CATEGORY,
  LAB_SAMPLE_TYPE_LABEL,
  LAB_SAMPLE_TYPES,
} from "@/types/laboratory";

type Values = {
  sampleType: string;
  collectedDate: dayjs.Dayjs;
  lotId?: string;
  remark?: string;
};

/** ลงทะเบียนตัวอย่างส่งตรวจ (M8.1) — เลือกประเภท + Lot ต้นทาง ระบบดึงสินค้า/Batch ให้ */
export default function LabSampleCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form] = Form.useForm<Values>();
  const create = useCreateLabSampleMutation();
  const [search, setSearch] = useState("");
  const sampleType = Form.useWatch("sampleType", form);
  const lotId = Form.useWatch("lotId", form);

  const lotsQuery = useInventoryLotsQuery({
    q: search.trim() || undefined,
    itemCategoryCode: sampleType
      ? LAB_SAMPLE_TYPE_ITEM_CATEGORY[sampleType]
      : undefined,
  });

  // ยอดคงเหลือเป็นแถว Lot × ตำแหน่ง — รวมเหลือแถวละ Lot
  const lotOptions = useMemo(() => {
    const seen = new Map<
      string,
      { value: string; label: string; qcStatus?: string }
    >();
    for (const row of lotsQuery.data?.data ?? []) {
      if (seen.has(row.lotId)) continue;
      seen.set(row.lotId, {
        value: row.lotId,
        label: `${row.lotNo} — ${row.itemNameTh}${row.batchNo ? ` · Batch ${row.batchNo}` : ""}`,
        qcStatus: row.qcStatus,
      });
    }
    return [...seen.values()];
  }, [lotsQuery.data]);
  const selected = lotOptions.find((o) => o.value === lotId);

  return (
    <Modal
      open
      title="ลงทะเบียนตัวอย่างส่งตรวจ"
      okText="ลงทะเบียน"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          create.mutate(
            {
              sampleType: v.sampleType,
              collectedDate: v.collectedDate.format("YYYY-MM-DD"),
              lotId: v.lotId,
              remark: v.remark?.trim() || undefined,
            },
            {
              onSuccess: (res) => {
                onClose();
                onCreated(res.data.id);
              },
            },
          ),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ collectedDate: dayjs() }}
      >
        <Form.Item
          name="sampleType"
          label="ประเภทตัวอย่าง"
          rules={[{ required: true, message: "เลือกประเภทตัวอย่าง" }]}
        >
          <Select
            placeholder="เลือกประเภท"
            options={LAB_SAMPLE_TYPES.map((value) => ({
              value,
              label: LAB_SAMPLE_TYPE_LABEL[value],
            }))}
            onChange={() => form.setFieldValue("lotId", undefined)}
          />
        </Form.Item>
        <Form.Item
          name="collectedDate"
          label="วันที่เก็บตัวอย่าง"
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          name="lotId"
          label="Lot ต้นทาง"
          extra="ค้นด้วยเลข Lot / ชื่อสินค้า / Batch — เลือกแล้วระบบดึงสินค้าและเลข Batch ให้ · ผล Lab อนุมัติจะปล่อย Lot ที่รอ QC ให้อัตโนมัติ"
        >
          <Select
            allowClear
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={lotsQuery.isFetching}
            placeholder="ค้นหา Lot"
            options={lotOptions}
          />
        </Form.Item>
        {selected?.qcStatus &&
        selected.qcStatus !== "PENDING" &&
        selected.qcStatus !== "HOLD" ? (
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            title={`Lot นี้ QC สถานะ ${selected.qcStatus} แล้ว — ผล Lab จะไม่เปลี่ยนสถานะ QC ของ Lot`}
          />
        ) : null}
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
