"use client";

import { Divider, Form, Input, Modal, Select } from "antd";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useHazardClassesQuery, useUpsertChemicalProfileMutation } from "@/hooks/chemicals/useChemicals";
import { DOCUMENT_TYPE_CHEMICAL_SDS, type ChemicalRow } from "@/types/chemicals";

type FormValues = {
  manufacturer?: string;
  casNo?: string;
  hazardClassId?: string;
  storageNote?: string;
};

type Props = {
  chemical: ChemicalRow | null;
  canEdit: boolean;
  onClose: () => void;
  /** เรียกหลังแนบ/ลบ SDS เพื่อรีเฟรชจำนวนไฟล์ในตาราง */
  onSdsChanged: () => void;
};

/** แก้ข้อมูลสารเคมี (ผู้ผลิต/CAS/Hazard Class/ข้อกำหนดจัดเก็บ) + แนบ Safety Data Sheet */
export default function ChemicalProfileModal({ chemical, canEdit, onClose, onSdsChanged }: Props) {
  const [form] = Form.useForm<FormValues>();
  const hazards = useHazardClassesQuery();
  const save = useUpsertChemicalProfileMutation();
  if (!chemical) return null;

  const options = (hazards.data?.data ?? [])
    .filter((h) => h.isActive || h.id === chemical.hazardClassId)
    .map((h) => ({ value: h.id, label: h.nameTh }));

  return (
    <Modal
      open
      title={`${chemical.itemCode} — ${chemical.itemNameTh}`}
      width={640}
      okText="บันทึก"
      cancelText="ปิด"
      okButtonProps={{ style: canEdit ? undefined : { display: "none" } }}
      confirmLoading={save.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          save.mutate(
            {
              itemId: chemical.itemId,
              body: {
                manufacturer: v.manufacturer ?? "",
                casNo: v.casNo ?? "",
                hazardClassId: v.hazardClassId ?? null,
                storageNote: v.storageNote ?? "",
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        disabled={!canEdit}
        initialValues={{
          manufacturer: chemical.manufacturer ?? undefined,
          casNo: chemical.casNo ?? undefined,
          hazardClassId: chemical.hazardClassId ?? undefined,
          storageNote: chemical.storageNote ?? undefined,
        }}
      >
        <Form.Item name="manufacturer" label="ผู้ผลิต">
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item
          name="casNo"
          label="เลข CAS"
          rules={[
            {
              pattern: /^\d{2,7}-\d{2}-\d$/,
              message: "รูปแบบเลข CAS เช่น 7647-01-0",
            },
          ]}
        >
          <Input placeholder="เช่น 7647-01-0" maxLength={20} />
        </Form.Item>
        <Form.Item
          name="hazardClassId"
          label="Hazard Class"
          extra="ใช้ตรวจว่าเก็บรวมกับสารอื่นในตำแหน่งเดียวกันได้ไหม (ไม่ระบุ = ไม่ตรวจ)"
        >
          <Select allowClear showSearch optionFilterProp="label" options={options} placeholder="เลือกประเภทอันตราย" />
        </Form.Item>
        <Form.Item name="storageNote" label="ข้อกำหนดการจัดเก็บ">
          <Input.TextArea rows={2} maxLength={2000} placeholder="เช่น เก็บที่เย็น ห่างแหล่งความร้อน" />
        </Form.Item>
      </Form>
      <Divider titlePlacement="start" plain>
        Safety Data Sheet (SDS)
      </Divider>
      <DocumentAttachmentsPanel
        documentType={DOCUMENT_TYPE_CHEMICAL_SDS}
        documentId={chemical.itemId}
        canEdit={canEdit}
        emptyText="ยังไม่ได้แนบ SDS"
        uploadLabel="แนบไฟล์ SDS"
        onChanged={onSdsChanged}
      />
    </Modal>
  );
}
