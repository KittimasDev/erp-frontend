"use client";

import { useMemo, useState } from "react";
import { Alert, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

import { useCreateLabSampleMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import { useT } from "@/lib/i18n/useT";
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
  const t = useT();
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
      title={t("ลงทะเบียนตัวอย่างส่งตรวจ")}
      okText={t("ลงทะเบียน")}
      cancelText={t("ยกเลิก")}
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
          label={t("ประเภทตัวอย่าง")}
          rules={[{ required: true, message: t("เลือกประเภทตัวอย่าง") }]}
        >
          <Select
            placeholder={t("เลือกประเภท")}
            options={LAB_SAMPLE_TYPES.map((value) => ({
              value,
              label: t(LAB_SAMPLE_TYPE_LABEL[value]),
            }))}
            onChange={() => form.setFieldValue("lotId", undefined)}
          />
        </Form.Item>
        <Form.Item
          name="collectedDate"
          label={t("วันที่เก็บตัวอย่าง")}
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
        </Form.Item>
        <Form.Item
          name="lotId"
          label={t("Lot ต้นทาง")}
          extra={t(
            "ค้นด้วยเลข Lot / ชื่อสินค้า / Batch — เลือกแล้วระบบดึงสินค้าและเลข Batch ให้ · ผล Lab อนุมัติจะปล่อย Lot ที่รอ QC ให้อัตโนมัติ",
          )}
        >
          <Select
            allowClear
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={lotsQuery.isFetching}
            placeholder={t("ค้นหา Lot")}
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
            title={t("Lot นี้ QC สถานะ {status} แล้ว — ผล Lab จะไม่เปลี่ยนสถานะ QC ของ Lot", {
              status: selected.qcStatus,
            })}
          />
        ) : null}
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
