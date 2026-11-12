"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

import { useCreateLabSampleMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import { useLabSpecsQuery } from "@/hooks/laboratory/useLabSpecs";
import { useT } from "@/lib/i18n/useT";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  LAB_SAMPLE_TYPE_LABEL,
  LAB_SAMPLE_TYPES,
  type LabSpec,
} from "@/types/laboratory";

type Values = {
  sampleType: string;
  collectedDate: dayjs.Dayjs;
  itemId: string;
  lotId?: string;
  specId: string;
  remark?: string;
};

/** Spec เริ่มต้น: เฉพาะสินค้า → ของประเภทตัวอย่าง (ไม่เจอ = ไม่เลือกให้) */
function defaultSpecId(
  specs: LabSpec[],
  sampleType?: string,
  itemId?: string,
): string | undefined {
  if (itemId) {
    const byItem = specs.find(
      (s) => s.itemId === itemId && (!sampleType || s.sampleType === sampleType),
    );
    if (byItem) return byItem.id;
  }
  if (sampleType) {
    return specs.find((s) => !s.itemId && s.sampleType === sampleType)?.id;
  }
  return undefined;
}

/**
 * ลงทะเบียนตัวอย่างส่งตรวจ (M8.1) — ประเภท/วันที่/สินค้า/Spec บังคับ, Lot ไม่บังคับ
 * Spec แสดงทุกตัวที่เปิดใช้งาน (ไม่จำกัดตามสินค้า) ระบบเลือกค่าเริ่มต้นให้ ผู้ใช้เปลี่ยนได้เสมอ
 */
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
  const itemId = Form.useWatch("itemId", form);
  const lotId = Form.useWatch("lotId", form);
  /** ผู้ใช้เลือก Spec เองแล้ว — ไม่เขียนทับด้วยค่าเริ่มต้นอีก */
  const specTouched = useRef(false);

  const itemsQuery = useItemsQuery({ isActive: true });
  const specsQuery = useLabSpecsQuery({ isActive: true });
  const specs = useMemo(() => specsQuery.data?.data ?? [], [specsQuery.data]);

  const lotsQuery = useInventoryLotsQuery(
    { q: search.trim() || undefined, itemId },
    { enabled: Boolean(itemId) },
  );

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data?.data ?? []).map((i) => ({
        value: i.id,
        label: `${i.itemCode} — ${i.itemNameTh}`,
      })),
    [itemsQuery.data],
  );
  const specOptions = useMemo(
    () =>
      specs.map((s) => ({
        value: s.id,
        label: `${s.nameTh} · ${t(LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType)}${
          s.itemCode ? ` · ${s.itemCode}` : ` · ${t("ทั้งประเภท")}`
        }`,
      })),
    [specs, t],
  );

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

  /** เปลี่ยนประเภท/สินค้า → ตั้ง Spec เริ่มต้นใหม่ (ยกเว้นผู้ใช้เลือกเองแล้ว) */
  const applyDefaultSpec = (type?: string, item?: string) => {
    if (specTouched.current) return;
    form.setFieldValue("specId", defaultSpecId(specs, type, item));
  };

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
              itemId: v.itemId,
              specId: v.specId,
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
            onChange={(value: string) => applyDefaultSpec(value, itemId)}
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
          name="itemId"
          label={t("สินค้า")}
          rules={[{ required: true, message: t("เลือกสินค้า") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={itemsQuery.isLoading}
            placeholder={t("ค้นหาสินค้า")}
            options={itemOptions}
            onChange={(value: string) => {
              form.setFieldValue("lotId", undefined);
              applyDefaultSpec(sampleType, value);
            }}
          />
        </Form.Item>
        <Form.Item
          name="lotId"
          label={t("Lot ต้นทาง")}
          extra={t(
            "ไม่บังคับ — ค้นด้วยเลข Lot / Batch (แสดงเฉพาะ Lot ของสินค้าที่เลือก) · ผล Lab อนุมัติจะปล่อย Lot ที่รอ QC ให้อัตโนมัติ",
          )}
        >
          <Select
            allowClear
            showSearch
            disabled={!itemId}
            filterOption={false}
            onSearch={setSearch}
            loading={lotsQuery.isFetching}
            placeholder={itemId ? t("ค้นหา Lot") : t("เลือกสินค้าก่อน")}
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
        <Form.Item
          name="specId"
          label={t("Spec การตรวจ")}
          rules={[{ required: true, message: t("เลือก Spec การตรวจ") }]}
          extra={t(
            "แสดง Spec ที่เปิดใช้งานทั้งหมด — ระบบเลือกให้ตามสินค้า/ประเภท เปลี่ยนเป็น Spec อื่นได้",
          )}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={specsQuery.isLoading}
            placeholder={t("เลือก Spec")}
            options={specOptions}
            onChange={() => {
              specTouched.current = true;
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
