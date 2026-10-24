"use client";

import { Button, Empty, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import type { BulkCreateProductionOrderSelectionBody } from "@/types/production-order";

/**
 * ใบขอผลิตที่จะผลิตในรอบนี้ — ตารางสรุปที่ภาพต้นแบบเรียกว่า "ใบสั่งผลิตที่เลือก"
 *
 * ## จำนวนที่จัดสรรรวมกัน ≠ แผนผลผลิตของรอบ
 *
 * เตาเดินเป็นรอบ · ผลิต 1,000 แล้วจัดสรรให้ลูกค้าแค่ 50 ที่เหลือเข้าคลัง — ตัวเลขสองตัวนี้
 * ต่างกันโดยตั้งใจ จึงไม่มีการเตือนว่า "ไม่เท่ากัน" ที่นี่
 *
 * ## แถวนี้แสดงชื่อสินค้ามาจากไหน
 *
 * `selections` เก็บแค่ id ตาม DTO ของ backend · ชื่อที่อ่านออกถูกส่งมาคู่กันจากโมดัลเลือก
 * (`labelByKey`) แทนที่จะยิง query ซ้ำ เพราะข้อมูลชุดเดียวกันเพิ่งโหลดไปแล้วในโมดัล
 */

export type SelectionLabel = {
  requestNo: string;
  requiredDate?: string;
  itemLabel: string;
  unitCode?: string;
};

type Props = {
  selections: BulkCreateProductionOrderSelectionBody[];
  labelByKey: Record<string, SelectionLabel>;
  onOpenPicker: () => void;
  onRemove: (selection: BulkCreateProductionOrderSelectionBody) => void;
  /** ไม่มีสิทธิ์ดูใบขอผลิต — ซ่อนปุ่มเลือก แต่หน้ายังสร้างใบได้ */
  canPick: boolean;
  disabled?: boolean;
};

export function selectionKeyOf(
  selection: BulkCreateProductionOrderSelectionBody,
) {
  return `${selection.productionRequestId}::${selection.productionRequestItemId}`;
}

function fmtQty(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

export default function SelectedProductionRequestsCard({
  selections,
  labelByKey,
  onOpenPicker,
  onRemove,
  canPick,
  disabled,
}: Props) {
  const columns: ColumnsType<BulkCreateProductionOrderSelectionBody> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "เลขที่ใบขอผลิต",
      key: "requestNo",
      render: (_v, row) => labelByKey[selectionKeyOf(row)]?.requestNo ?? "-",
    },
    {
      title: "วันที่ต้องการ",
      key: "requiredDate",
      width: 130,
      render: (_v, row) =>
        fmtDate(labelByKey[selectionKeyOf(row)]?.requiredDate),
    },
    {
      title: "สินค้า",
      key: "item",
      render: (_v, row) => labelByKey[selectionKeyOf(row)]?.itemLabel ?? "-",
    },
    {
      title: "จำนวนที่จัดสรร",
      key: "plannedQty",
      width: 150,
      align: "right",
      render: (_v, row) =>
        `${fmtQty(row.plannedQty)} ${labelByKey[selectionKeyOf(row)]?.unitCode ?? ""}`,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_v, row) => (
        <Button
          size="small"
          danger
          type="text"
          disabled={disabled}
          icon={<DeleteOutlined />}
          onClick={() => onRemove(row)}
        />
      ),
    },
  ];

  const total = selections.reduce((sum, row) => sum + row.plannedQty, 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div>
          <strong>ใบขอผลิตที่จะผลิตรอบนี้</strong>
          {selections.length > 0 ? (
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {selections.length} รายการ · จัดสรรรวม {fmtQty(total)}
            </Typography.Text>
          ) : null}
        </div>
        {canPick ? (
          <Button
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={onOpenPicker}
          >
            เลือกใบขอผลิต
          </Button>
        ) : (
          <Tooltip title="ต้องมีสิทธิ์ดูใบขอผลิตจึงจะเลือกได้ — สร้างใบสั่งผลิตโดยกรอกเองยังทำได้ตามปกติ">
            <Button disabled icon={<PlusOutlined />}>
              เลือกใบขอผลิต
            </Button>
          </Tooltip>
        )}
      </div>

      {selections.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่ได้เลือกใบขอผลิต — ผลิตเก็บเข้าคลังโดยไม่ผูกใบขอผลิตก็ได้"
        />
      ) : (
        <Table
          rowKey={selectionKeyOf}
          size="small"
          pagination={false}
          dataSource={selections}
          columns={columns}
        />
      )}
    </div>
  );
}
