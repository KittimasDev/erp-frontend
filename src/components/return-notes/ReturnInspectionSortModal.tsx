"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select } from "antd";

import { useSortDestinationsQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import { useSaveInspectionLineMutation } from "@/hooks/return-notes/useReturnNoteMutations";
import type { ReturnNoteItem } from "@/types/return-notes";

type Props = {
  noteId: string;
  item: ReturnNoteItem | null;
  onClose: () => void;
};

export default function ReturnInspectionSortModal({
  noteId,
  item,
  onClose,
}: Props) {
  const [form] = Form.useForm();
  const destinations = useSortDestinationsQuery(Boolean(item));
  const save = useSaveInspectionLineMutation(noteId);
  const goodQty = Form.useWatch("goodQty", form) as number | undefined;
  const scrapQty = Form.useWatch("scrapQty", form) as number | undefined;

  useEffect(() => {
    if (!item) return;
    form.setFieldsValue({
      goodQty: item.goodQty != null ? Number(item.goodQty) : undefined,
      scrapQty: item.scrapQty != null ? Number(item.scrapQty) : undefined,
      goodWarehouseId: item.goodWarehouseId,
      goodLocationId: item.goodLocationId,
      scrapWarehouseId: item.scrapWarehouseId,
      scrapLocationId: item.scrapLocationId,
      remark: item.inspectionRemark,
    });
  }, [form, item]);

  const goodWarehouses = destinations.data?.data.goodWarehouses ?? [];
  const scrapWarehouses = destinations.data?.data.scrapWarehouses ?? [];
  const goodWarehouseId = Form.useWatch("goodWarehouseId", form) as
    | string
    | undefined;
  const scrapWarehouseId = Form.useWatch("scrapWarehouseId", form) as
    | string
    | undefined;
  const goodLocations =
    goodWarehouses.find((row) => row.id === goodWarehouseId)?.locations ?? [];
  const scrapLocations =
    scrapWarehouses.find((row) => row.id === scrapWarehouseId)?.locations ?? [];

  return (
    <Modal
      open={Boolean(item)}
      title="คัดแยกสินค้า"
      okText="บันทึกผลการคัดแยก"
      cancelText="ปิด"
      confirmLoading={save.isPending}
      destroyOnHidden
      onCancel={onClose}
      onOk={() => {
        form.submit();
      }}
    >
      {item ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            save.mutate(
              {
                itemId: item.id,
                body: {
                  goodQty: Number(values.goodQty ?? 0),
                  scrapQty: Number(values.scrapQty ?? 0),
                  goodWarehouseId: values.goodWarehouseId,
                  goodLocationId: values.goodLocationId,
                  scrapWarehouseId: values.scrapWarehouseId,
                  scrapLocationId: values.scrapLocationId,
                  remark: values.remark,
                },
              },
              { onSuccess: onClose },
            );
          }}
        >
          <p>
            {item.itemCode} {item.itemNameTh} · Lot {item.lotNo ?? "—"} · คืน{" "}
            {Number(item.returnQty).toLocaleString("th-TH")}
          </p>
          <Form.Item
            label="จำนวนใช้งานได้"
            name="goodQty"
            rules={[{ required: true, message: "ระบุจำนวนใช้งานได้" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="จำนวนเสีย"
            name="scrapQty"
            rules={[{ required: true, message: "ระบุจำนวนเสีย" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          {(goodQty ?? 0) > 0 ? (
            <>
              <Form.Item
                label="คลังปลายทางสินค้าที่ใช้งานได้"
                name="goodWarehouseId"
                rules={[{ required: true, message: "เลือกคลังสำเร็จรูป" }]}
              >
                <Select
                  options={goodWarehouses.map((row) => ({
                    value: row.id,
                    label: `${row.warehouseCode} — ${row.warehouseName}`,
                  }))}
                  onChange={() => form.setFieldValue("goodLocationId", undefined)}
                />
              </Form.Item>
              {goodLocations.length > 1 ? (
                <Form.Item
                  label="ตำแหน่งของดี"
                  name="goodLocationId"
                  rules={[{ required: true, message: "เลือกตำแหน่ง" }]}
                >
                  <Select
                    options={goodLocations.map((row) => ({
                      value: row.id,
                      label: `${row.locationCode} — ${row.locationName}`,
                    }))}
                  />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          {(scrapQty ?? 0) > 0 ? (
            <>
              <Form.Item
                label="คลังปลายทางสินค้าที่เสีย"
                name="scrapWarehouseId"
                rules={[{ required: true, message: "เลือกคลังของเสีย" }]}
              >
                <Select
                  options={scrapWarehouses.map((row) => ({
                    value: row.id,
                    label: `${row.warehouseCode} — ${row.warehouseName}`,
                  }))}
                  onChange={() =>
                    form.setFieldValue("scrapLocationId", undefined)
                  }
                />
              </Form.Item>
              {scrapLocations.length > 1 ? (
                <Form.Item
                  label="ตำแหน่งของเสีย"
                  name="scrapLocationId"
                  rules={[{ required: true, message: "เลือกตำแหน่ง" }]}
                >
                  <Select
                    options={scrapLocations.map((row) => ({
                      value: row.id,
                      label: `${row.locationCode} — ${row.locationName}`,
                    }))}
                  />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          <Form.Item label="หมายเหตุ" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );
}
