"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  InputNumber,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { useProductionRequestPlanningSummaryQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import type { ProductionRequestPlanningSummaryItem } from "@/types/production-request";
import type { BulkCreateProductionOrderSelectionBody } from "@/types/production-order";
import type { SelectionLabel } from "./SelectedProductionRequestsCard";

/**
 * เลือกใบขอผลิตที่จะผลิตในรอบนี้
 *
 * ## ทำไมเป็น "ใบขอผลิต" ไม่ใช่ "ใบสั่งผลิต"
 *
 * ภาพต้นแบบเขียนว่า "ใบสั่งผลิตที่เลือก" แต่ในระบบนี้ **ใบสั่งผลิตคือเอกสารที่กำลังสร้างอยู่**
 * ส่วนตารางนี้คือ *ความต้องการ* ที่มาจากใบสั่งขาย ซึ่งเรียกว่าใบขอผลิต · ถ้าใช้คำตามภาพ
 * หน้าจอเดียวจะมีคำว่า "ใบสั่งผลิต" สองความหมาย
 *
 * ## ข้อมูลมาจาก planning-summary ที่มีอยู่แล้ว
 *
 * `GET /production/production-requests/planning-summary` จัดกลุ่มยอดค้างตามสินค้าให้เสร็จ
 * พร้อมธง `hasActiveProductionOrder` มาแล้ว — ไม่ต้องคำนวณเองที่หน้าจอ
 *
 * ## ปิดใบที่เปิดใบสั่งผลิตไปแล้วตั้งแต่ต้นทาง
 *
 * `resolvePlanningSelections()` ฝั่ง backend จะโยน 400 อยู่ดีถ้าเลือกใบพวกนี้มา ·
 * ดักที่ checkbox ให้เห็นเหตุผลก่อน ดีกว่าปล่อยให้กดสร้างแล้วเจอ error ตอนท้าย
 */

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (result: {
    selections: BulkCreateProductionOrderSelectionBody[];
    /** ชื่อที่อ่านออกของแต่ละใบ คีย์ด้วย `productionRequestId::productionRequestItemId` */
    labels: Record<string, SelectionLabel>;
  }) => void;
  /** ใบที่เลือกไว้แล้ว — เปิดโมดัลซ้ำต้องเห็นของเดิมติ๊กอยู่ */
  selected: BulkCreateProductionOrderSelectionBody[];
  /** ไม่มีสิทธิ์ดูใบขอผลิตทั้งหมด — รายการอาจไม่ครบ */
  scopedToOwnRequests?: boolean;
};

/** หนึ่งแถวในตาราง = ใบขอผลิตหนึ่งบรรทัด (หนึ่งสินค้าในหนึ่งใบ) */
type PickerRow = {
  key: string;
  productionRequestId: string;
  productionRequestItemId: string;
  itemId: string;
  unitId: string;
  itemLabel: string;
  unitCode?: string;
  requestNo: string;
  soNo?: string;
  customerName?: string;
  requiredDate?: string;
  outstandingQty: number;
  requestStatus: string;
  hasActiveProductionOrder: boolean;
};

/**
 * เลือกใบนี้ได้ไหม — ต้องตรงกับ `resolvePlanningSelections()` ฝั่ง backend เป๊ะ
 *
 * **ธง `hasActiveProductionOrder` อย่างเดียวไม่พอ** · ตรวจกับข้อมูลจริงแล้วพบว่า
 * `planning-summary` คืนใบสถานะ COMPLETED ที่ยังมียอดค้าง มาพร้อมธง `false`
 * แต่ backend บังคับสถานะ `PENDING` เท่านั้น → ถ้าเช็คแค่ธง ผู้ใช้จะติ๊กได้แล้วไป
 * เจอ 400 ตอนกดสร้าง ซึ่งเป็นสิ่งที่โมดัลนี้ตั้งใจจะกันตั้งแต่แรก
 */
function isSelectable(row: PickerRow) {
  return row.requestStatus === "PENDING" && !row.hasActiveProductionOrder;
}

function blockedReason(row: PickerRow) {
  if (row.hasActiveProductionOrder) {
    return "ใบนี้ถูกเปิดใบสั่งผลิตไปแล้ว ระบบไม่ให้เปิดซ้ำ";
  }
  return `ใบนี้สถานะ ${row.requestStatus} ไม่ใช่ "รอเปิดใบสั่งผลิต" จึงเลือกไม่ได้`;
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

function buildRows(
  items: ProductionRequestPlanningSummaryItem[] | undefined,
): PickerRow[] {
  const rows: PickerRow[] = [];
  for (const item of items ?? []) {
    const itemLabel = item.itemCode
      ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
      : (item.itemNameTh ?? item.itemId);
    for (const tag of item.tags) {
      /*
        ไม่มี `productionRequestItemId` = ผูกกลับไปหาบรรทัดในใบขอผลิตไม่ได้
        ซึ่ง backend บังคับต้องมี → ข้ามไปเลย ดีกว่าโชว์แถวที่เลือกแล้วพัง
      */
      if (!tag.productionRequestItemId) continue;
      rows.push({
        key: `${tag.productionRequestId}::${tag.productionRequestItemId}`,
        productionRequestId: tag.productionRequestId,
        productionRequestItemId: tag.productionRequestItemId,
        itemId: item.itemId,
        unitId: item.unitId,
        itemLabel,
        unitCode: item.unitCode,
        requestNo: tag.requestNo,
        soNo: tag.soNo,
        customerName: tag.customerName,
        requiredDate: tag.requiredDate,
        outstandingQty: Number(tag.outstandingQty),
        requestStatus: tag.productionRequestStatus,
        hasActiveProductionOrder: tag.hasActiveProductionOrder,
      });
    }
  }
  return rows;
}

function selectionKey(selection: BulkCreateProductionOrderSelectionBody) {
  return `${selection.productionRequestId}::${selection.productionRequestItemId}`;
}

export default function ProductionRequestPickerModal(props: Props) {
  // destroyOnHidden + Body ที่ตั้งค่าตอน mount — เลี่ยง setState ใน effect ตามกฎ eslint
  return (
    <Modal
      title="เลือกใบขอผลิตที่จะผลิตรอบนี้"
      open={props.open}
      onCancel={props.onCancel}
      footer={null}
      destroyOnHidden
      width={980}
    >
      <PickerBody {...props} />
    </Modal>
  );
}

function PickerBody({
  onCancel,
  onConfirm,
  selected,
  scopedToOwnRequests,
}: Props) {
  const summaryQuery = useProductionRequestPlanningSummaryQuery();
  const rows = buildRows(summaryQuery.data?.data.items);

  // ตั้งค่าจากของที่เลือกไว้แล้วตอน mount — ไม่ใช้ effect
  const [checkedKeys, setCheckedKeys] = useState<string[]>(() =>
    selected.map(selectionKey),
  );
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      selected.map((item) => [selectionKey(item), item.plannedQty]),
    ),
  );

  const qtyOf = (row: PickerRow) => qtyByKey[row.key] ?? row.outstandingQty;

  const columns: ColumnsType<PickerRow> = [
    {
      title: "เลขที่ใบขอผลิต",
      key: "requestNo",
      width: 190,
      render: (_v, row) => (
        <div>
          <div>{row.requestNo}</div>
          {row.soNo ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.soNo}
              {row.customerName ? ` · ${row.customerName}` : ""}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "วันที่ต้องการ",
      key: "requiredDate",
      width: 120,
      render: (_v, row) => fmtDate(row.requiredDate),
    },
    { title: "สินค้า", dataIndex: "itemLabel", key: "itemLabel" },
    {
      title: "ยอดค้าง",
      key: "outstandingQty",
      width: 130,
      align: "right",
      render: (_v, row) => `${fmtQty(row.outstandingQty)} ${row.unitCode ?? ""}`,
    },
    {
      title: "จำนวนที่จะจัดสรร",
      key: "plannedQty",
      width: 170,
      render: (_v, row) => (
        <InputNumber
          style={{ width: "100%" }}
          min={0.001}
          max={row.outstandingQty}
          precision={3}
          value={qtyOf(row)}
          disabled={!isSelectable(row) || !checkedKeys.includes(row.key)}
          onChange={(value) =>
            setQtyByKey((prev) => ({
              ...prev,
              [row.key]: value ?? row.outstandingQty,
            }))
          }
        />
      ),
    },
    {
      title: "สถานะ",
      key: "status",
      width: 130,
      render: (_v, row) =>
        isSelectable(row) ? (
          <Tag color="processing">รอผลิต</Tag>
        ) : (
          <Tooltip title={blockedReason(row)}>
            <Tag color="default">
              {row.hasActiveProductionOrder ? "เปิดใบแล้ว" : "เลือกไม่ได้"}
            </Tag>
          </Tooltip>
        ),
    },
  ];

  const handleConfirm = () => {
    const picked = rows.filter((row) => checkedKeys.includes(row.key));
    onConfirm({
      selections: picked.map((row, index) => ({
        productionRequestId: row.productionRequestId,
        productionRequestItemId: row.productionRequestItemId,
        itemId: row.itemId,
        unitId: row.unitId,
        plannedQty: qtyOf(row),
        sortOrder: index,
      })),
      labels: Object.fromEntries(
        picked.map((row) => [
          row.key,
          {
            requestNo: row.requestNo,
            requiredDate: row.requiredDate,
            itemLabel: row.itemLabel,
            unitCode: row.unitCode,
          },
        ]),
      ),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        เลือกได้หลายใบ — ระบบจะสร้างใบสั่งผลิต 1 ใบที่ผูกกลับไปทุกใบที่เลือก
        จำนวนที่จัดสรรรวมกันไม่จำเป็นต้องเท่ากับแผนผลผลิตของรอบ
        เพราะผลิตเกินแล้วเก็บเข้าคลังได้
      </Typography.Paragraph>

      {scopedToOwnRequests ? (
        <Alert
          type="info"
          showIcon
          message="รายการอาจไม่ครบ"
          description="บัญชีนี้ไม่มีสิทธิ์ดูใบขอผลิตทั้งหมด จึงเห็นเฉพาะใบที่ตัวเองเป็นผู้ขอ"
        />
      ) : null}

      {summaryQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="ดึงรายการใบขอผลิตไม่สำเร็จ"
          description="ลองปิดแล้วเปิดใหม่อีกครั้ง หรือกรอกวัตถุดิบและผลผลิตเองโดยไม่ผูกใบขอผลิต"
        />
      ) : null}

      <Table
        rowKey="key"
        size="small"
        loading={summaryQuery.isLoading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ y: 380 }}
        locale={{ emptyText: "ไม่มีใบขอผลิตที่ยังค้างอยู่" }}
        rowSelection={{
          selectedRowKeys: checkedKeys,
          onChange: (keys) => setCheckedKeys(keys.map(String)),
          getCheckboxProps: (row) => ({ disabled: !isSelectable(row) }),
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onCancel}>ยกเลิก</Button>
        <Button
          type="primary"
          disabled={checkedKeys.length === 0}
          onClick={handleConfirm}
        >
          ใช้ {checkedKeys.length} ใบนี้
        </Button>
      </div>
    </div>
  );
}
