"use client";

import { useEffect } from "react";
import { Alert, Form, Input, InputNumber, Modal, Select } from "antd";

import { useSortDestinationsQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import { useSaveInspectionLineMutation } from "@/hooks/return-notes/useReturnNoteMutations";
import type { ReturnNoteItem } from "@/types/return-notes";
import { useT } from "@/lib/i18n/useT";

const QTY_EPSILON = 0.0005;

function roundQty(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatQty(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

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
  const t = useT();
  const [form] = Form.useForm();
  const destinations = useSortDestinationsQuery(Boolean(item));
  const save = useSaveInspectionLineMutation(noteId);
  const goodQty = Form.useWatch("goodQty", form) as number | undefined;
  const scrapQty = Form.useWatch("scrapQty", form) as number | undefined;
  const returnQty = item ? Number(item.returnQty) : 0;

  const fillCounterpart = (
    field: "goodQty" | "scrapQty",
    value: number | null,
  ) => {
    if (value == null) return;
    form.setFieldValue(field, Math.max(roundQty(returnQty - value), 0));
    void form.validateFields(["scrapQty"]).catch(() => undefined);
  };

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
      title={t("คัดแยกสินค้า")}
      okText={t("บันทึกผลการคัดแยก")}
      cancelText={t("ปิด")}
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
            {item.itemCode} {item.itemNameTh} · Lot {item.lotNo ?? "—"} · {t("คืน")}{" "}
            {formatQty(returnQty)}
          </p>
          <p style={{ color: "#64748b" }}>
            {t("ดี")} {formatQty(Number(goodQty ?? 0))} + {t("เสีย")}{" "}
            {formatQty(Number(scrapQty ?? 0))} ={" "}
            {formatQty(roundQty(Number(goodQty ?? 0) + Number(scrapQty ?? 0)))}{" "}
            {t("จากคืน")} {formatQty(returnQty)}
          </p>
          {destinations.isError ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              title={t("โหลดรายการคลังปลายทางไม่สำเร็จ")}
              description={destinations.error?.message}
            />
          ) : null}
          <Form.Item
            label={t("จำนวนใช้งานได้")}
            name="goodQty"
            rules={[{ required: true, message: t("ระบุจำนวนใช้งานได้") }]}
          >
            <InputNumber
              min={0}
              max={returnQty}
              precision={3}
              style={{ width: "100%" }}
              onChange={(value) =>
                fillCounterpart("scrapQty", value as number | null)
              }
            />
          </Form.Item>
          <Form.Item
            label={t("จำนวนเสีย")}
            name="scrapQty"
            dependencies={["goodQty"]}
            rules={[
              { required: true, message: t("ระบุจำนวนเสีย") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const good = getFieldValue("goodQty");
                  if (value == null || good == null) return Promise.resolve();
                  if (
                    Math.abs(Number(good) + Number(value) - returnQty) >
                    QTY_EPSILON
                  ) {
                    return Promise.reject(
                      new Error(
                        t("จำนวนใช้งานได้รวมจำนวนเสียต้องเท่ากับจำนวนคืน ({returnQty})", { returnQty: formatQty(returnQty) }),
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              max={returnQty}
              precision={3}
              style={{ width: "100%" }}
              onChange={(value) =>
                fillCounterpart("goodQty", value as number | null)
              }
            />
          </Form.Item>
          {(goodQty ?? 0) > 0 ? (
            <>
              <Form.Item
                label={t("คลังปลายทางสินค้าที่ใช้งานได้")}
                name="goodWarehouseId"
                rules={[{ required: true, message: t("เลือกคลังสำเร็จรูป") }]}
              >
                <Select
                  loading={destinations.isLoading}
                  notFoundContent={t("ยังไม่มีคลังประเภท FINISHED_GOODS ที่เปิดใช้งาน — ตั้งค่าที่ข้อมูลหลักคลังสินค้า")}
                  options={goodWarehouses.map((row) => ({
                    value: row.id,
                    label: `${row.warehouseCode} — ${row.warehouseName}`,
                  }))}
                  onChange={() => form.setFieldValue("goodLocationId", undefined)}
                />
              </Form.Item>
              {goodLocations.length > 1 ? (
                <Form.Item
                  label={t("ตำแหน่งของดี")}
                  name="goodLocationId"
                  rules={[{ required: true, message: t("เลือกตำแหน่ง") }]}
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
                label={t("คลังปลายทางสินค้าที่เสีย")}
                name="scrapWarehouseId"
                rules={[{ required: true, message: t("เลือกคลังของเสีย") }]}
              >
                <Select
                  loading={destinations.isLoading}
                  notFoundContent={t("ยังไม่มีคลังประเภท REJECT ที่เปิดใช้งาน — ตั้งค่าที่ข้อมูลหลักคลังสินค้า")}
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
                  label={t("ตำแหน่งของเสีย")}
                  name="scrapLocationId"
                  rules={[{ required: true, message: t("เลือกตำแหน่ง") }]}
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
          <Form.Item label={t("หมายเหตุ")} name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );
}
