"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { getAccessToken } from "@/lib/auth/token";
import { getFifoLotSuggestion } from "@/lib/api/dispatch-orders";
import { useConfirmShiftRecordMutation } from "@/hooks/production-cycles/useProductionCycles";
import {
  useInventoryLotsQuery,
  useStockBalancesByItemQuery,
} from "@/hooks/inventory/useInventoryQueries";
import type { ShiftRecord } from "@/types/production-cycle";
import type { ProductionOrderInputItem } from "@/types/production-order";
import {
  computeRecordingFieldStockQty,
  type RecordingFieldValues,
} from "@/utils/recordingCalc";
import { createClientId } from "@/utils/createClientId";
import masterStyles from "@/components/masters/shared/master-page.module.css";

type DraftLine = {
  key: string;
  fieldId: string;
  itemId: string;
  label: string;
  needQty: number;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  unitId: string;
  quantity: number;
};

type Props = {
  record: ShiftRecord;
  inputItems: ProductionOrderInputItem[];
  onClose: () => void;
};

export default function ConfirmShiftStockModal({
  record,
  inputItems,
  onClose,
}: Props) {
  const { message } = App.useApp();
  const confirm = useConfirmShiftRecordMutation();
  const config = record.recordingConfigSnapshot;
  const values = (record.values ?? {}) as RecordingFieldValues;

  const requirements = useMemo(() => {
    const fields = [...(config?.fields ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const rows: Array<{
      fieldId: string;
      itemId: string;
      label: string;
      needQty: number;
      unitId: string;
    }> = [];
    for (const field of fields) {
      if (field.resultRole !== "INPUT" && field.resultRole !== "TRACKING") {
        continue;
      }
      if (!field.linkedItemId) continue;
      // บันทึกข้อมูลอย่างเดียว — ไม่ตัด Stock
      if (field.stockDeduct === false) continue;
      const qty = computeRecordingFieldStockQty(field, values[field.id]);
      if (qty === null || qty <= 1e-9) continue;
      const fromOrder = inputItems.find((i) => i.itemId === field.linkedItemId);
      const unitId = field.stockUnitId || fromOrder?.unitId;
      if (!unitId) continue;
      rows.push({
        fieldId: field.id,
        itemId: field.linkedItemId,
        label: field.label || field.code,
        needQty: qty,
        unitId,
      });
    }
    return rows;
  }, [config, values, inputItems]);

  const [lines, setLines] = useState<DraftLine[]>(() =>
    requirements.map((r) => ({
      key: createClientId(),
      fieldId: r.fieldId,
      itemId: r.itemId,
      label: r.label,
      needQty: r.needQty,
      unitId: r.unitId,
      quantity: r.needQty,
    })),
  );

  const stockByItem = useStockBalancesByItemQuery({ hasStock: true });

  const submit = () => {
    for (const req of requirements) {
      const sum = lines
        .filter((l) => l.fieldId === req.fieldId && l.itemId === req.itemId)
        .reduce((a, l) => a + (Number(l.quantity) || 0), 0);
      if (Math.abs(sum - req.needQty) > 1e-9) {
        message.error(
          `${req.label}: ยอดตัดรวม ${sum} ต้องเท่ากับ ${req.needQty}`,
        );
        return;
      }
    }
    for (const line of lines) {
      if (!line.warehouseId || !line.locationId || !line.lotId || !line.unitId) {
        message.error("เลือกคลัง ตำแหน่ง Lot และหน่วยให้ครบทุกบรรทัด");
        return;
      }
      if (!(line.quantity > 0)) {
        message.error("จำนวนตัดต้องมากกว่า 0");
        return;
      }
    }
    confirm.mutate(
      {
        id: record.id,
        body: {
          stockLines: lines.map((l) => ({
            fieldId: l.fieldId,
            itemId: l.itemId,
            warehouseId: l.warehouseId!,
            locationId: l.locationId!,
            lotId: l.lotId!,
            quantity: l.quantity,
            unitId: l.unitId,
          })),
        },
      },
      { onSuccess: onClose },
    );
  };

  if (requirements.length === 0) {
    return (
      <Modal
        open
        title="ยืนยันบันทึกกะ"
        okText="ยืนยัน"
        cancelText="ยกเลิก"
        confirmLoading={confirm.isPending}
        onCancel={onClose}
        onOk={() =>
          confirm.mutate(
            { id: record.id, body: { stockLines: [] } },
            { onSuccess: onClose },
          )
        }
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          title="ไม่มียอด INPUT ที่ต้องตัดสต๊อก"
          description="จะเปลี่ยนสถานะเป็นยืนยันโดยไม่ตัดสต๊อก"
        />
      </Modal>
    );
  }

  return (
    <Modal
      open
      width={720}
      title="ยืนยันบันทึกกะ — เลือกคลัง/Lot เพื่อตัดสต๊อก"
      okText="ยืนยันและตัดสต๊อก"
      cancelText="ยกเลิก"
      okButtonProps={{ className: masterStyles.createButton }}
      confirmLoading={confirm.isPending}
      onCancel={onClose}
      onOk={submit}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        title="ยืนยันแล้วจะตัดสต๊อกทันที"
        description="ยอดรวมต่อรายการต้องตรงกับที่บันทึกในฟอร์ม · ของไม่พอระบบจะไม่ตัดบางส่วน"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {requirements.map((req) => {
          const group = lines.filter(
            (l) => l.fieldId === req.fieldId && l.itemId === req.itemId,
          );
          const sum = group.reduce((a, l) => a + (Number(l.quantity) || 0), 0);
          const match = Math.abs(sum - req.needQty) <= 1e-9;
          return (
            <div
              key={req.fieldId}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#f5f5f5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div>
                  <Typography.Text strong>{req.label}</Typography.Text>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                    ต้องตัด {req.needQty.toLocaleString("th-TH")} · รวมที่เลือก{" "}
                    <span style={{ color: match ? "#739816" : "#cf1322" }}>
                      {sum.toLocaleString("th-TH")}
                    </span>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      {
                        key: createClientId(),
                        fieldId: req.fieldId,
                        itemId: req.itemId,
                        label: req.label,
                        needQty: req.needQty,
                        unitId: req.unitId,
                        quantity: Math.max(0, req.needQty - sum),
                      },
                    ])
                  }
                >
                  เพิ่ม Lot
                </Button>
              </div>
              {group.map((line) => (
                <StockLineEditors
                  key={line.key}
                  line={line}
                  onChange={(next) =>
                    setLines((prev) =>
                      prev.map((l) => (l.key === line.key ? next : l)),
                    )
                  }
                  onRemove={
                    group.length > 1
                      ? () =>
                          setLines((prev) =>
                            prev.filter((l) => l.key !== line.key),
                          )
                      : undefined
                  }
                  availableHint={
                    stockByItem.isSuccess
                      ? (stockByItem.data?.data ?? []).find(
                          (b) => b.itemId === line.itemId,
                        )?.totalQuantityAvailable
                      : undefined
                  }
                />
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function StockLineEditors({
  line,
  onChange,
  onRemove,
  availableHint,
}: {
  line: DraftLine;
  onChange: (next: DraftLine) => void;
  onRemove?: () => void;
  availableHint?: string | number;
}) {
  const { message } = App.useApp();
  const lotsForItemQuery = useInventoryLotsQuery(
    { itemId: line.itemId, hasStock: true },
    { enabled: Boolean(line.itemId) },
  );
  const lots = lotsForItemQuery.data?.data ?? [];
  const warehouseOptions = Array.from(
    new Map(
      lots
        .filter((l) => l.warehouseId)
        .map((l) => [
          l.warehouseId,
          {
            value: l.warehouseId!,
            label: `${l.warehouseCode} — ${l.warehouseName}`,
          },
        ]),
    ).values(),
  );
  const locationOptions = Array.from(
    new Map(
      lots
        .filter(
          (l) =>
            l.locationId &&
            line.warehouseId &&
            l.warehouseId === line.warehouseId,
        )
        .map((l) => [
          l.locationId,
          {
            value: l.locationId!,
            label: `${l.locationCode} — ${l.locationName}`,
          },
        ]),
    ).values(),
  );
  const lotOptions = lots
    .filter(
      (l) =>
        line.warehouseId &&
        line.locationId &&
        l.warehouseId === line.warehouseId &&
        l.locationId === line.locationId,
    )
    .map((l) => ({
      value: l.lotId,
      label: `${l.lotNo} (คงเหลือ ${l.quantityAvailable})`,
    }));

  const applyFifo = async () => {
    if (!line.warehouseId || !line.locationId) {
      message.warning("เลือกคลังและตำแหน่งก่อน");
      return;
    }
    try {
      const res = await getFifoLotSuggestion(getAccessToken(), {
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        quantity: line.quantity,
      });
      const first = res.data?.[0];
      if (!first) {
        message.warning("ไม่พบ Lot ตาม FIFO");
        return;
      }
      onChange({
        ...line,
        lotId: first.lotId,
        quantity: Number(first.quantity) || line.quantity,
      });
    } catch {
      message.error("ดึง FIFO ไม่สำเร็จ");
    }
  };

  return (
    <Space wrap style={{ width: "100%", marginBottom: 8 }} align="start">
      <Select
        placeholder="คลัง"
        style={{ width: 160 }}
        options={warehouseOptions}
        value={line.warehouseId}
        onChange={(warehouseId) =>
          onChange({
            ...line,
            warehouseId,
            locationId: undefined,
            lotId: undefined,
          })
        }
      />
      <Select
        placeholder="ตำแหน่ง"
        style={{ width: 140 }}
        disabled={!line.warehouseId}
        options={locationOptions}
        value={line.locationId}
        onChange={(locationId) =>
          onChange({ ...line, locationId, lotId: undefined })
        }
      />
      <Select
        placeholder="Lot"
        style={{ width: 200 }}
        disabled={!(line.warehouseId && line.locationId)}
        options={lotOptions}
        value={line.lotId}
        onChange={(lotId) => onChange({ ...line, lotId })}
      />
      <InputNumber
        min={0.001}
        precision={3}
        style={{ width: 110 }}
        value={line.quantity}
        onChange={(quantity) =>
          onChange({ ...line, quantity: Number(quantity) || 0 })
        }
      />
      <Button size="small" onClick={() => void applyFifo()}>
        FIFO
      </Button>
      {onRemove ? (
        <Button size="small" danger onClick={onRemove}>
          ลบ
        </Button>
      ) : null}
      {availableHint !== undefined ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          รวมคงเหลือ {Number(availableHint).toLocaleString("th-TH")}
        </Typography.Text>
      ) : null}
    </Space>
  );
}
