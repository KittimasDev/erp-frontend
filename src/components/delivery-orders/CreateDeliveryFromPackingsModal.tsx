"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useCreateDeliveryOrderFromPackingsMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useReadyPackingsForDeliveryQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import type { ReadyPacking } from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";
import {
  buildPackingPreviewLines,
  byRoundThenNo,
  packingPreviewColumns,
  packingPreviewRowKey,
} from "./packingPreview";

type Props = {
  open: boolean;
  onClose: () => void;
  /** ใบบรรจุที่ผู้ใช้กดมา — อยู่ในใบส่งเสมอ เอาติ๊กออกไม่ได้ */
  anchorPackingId?: string;
  salesOrderId?: string;
};

export default function CreateDeliveryFromPackingsModal({
  open,
  onClose,
  anchorPackingId,
  salesOrderId,
}: Props) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={900}
      footer={null}
      title="สร้างใบส่งสินค้า — เลือกใบบรรจุของ SO เดียวกัน"
    >
      {open && anchorPackingId && salesOrderId ? (
        <ModalBody
          anchorPackingId={anchorPackingId}
          salesOrderId={salesOrderId}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function ModalBody({
  anchorPackingId,
  salesOrderId,
  onClose,
}: {
  anchorPackingId: string;
  salesOrderId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const query = useReadyPackingsForDeliveryQuery();
  const createMutation = useCreateDeliveryOrderFromPackingsMutation();
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  // รายการพร้อมส่งเปลี่ยนตลอด (คนอื่นสร้างใบส่งไปแล้ว / เพิ่งยืนยันใบบรรจุ) — โหลดใหม่ทุกครั้งที่เปิด
  const { refetch } = query;
  useEffect(() => {
    void refetch();
  }, [refetch]);

  const rows = useMemo(
    () =>
      (query.data?.data ?? [])
        .filter((row) => row.salesOrderId === salesOrderId)
        .sort(byRoundThenNo),
    [query.data, salesOrderId],
  );
  const anchorReady = rows.some((row) => row.id === anchorPackingId);
  const selected = useMemo(
    () =>
      rows.filter(
        (row) => row.id === anchorPackingId || pickedIds.includes(row.id),
      ),
    [rows, anchorPackingId, pickedIds],
  );
  const previewLines = useMemo(
    () => buildPackingPreviewLines(selected),
    [selected],
  );
  const othersCount = rows.length - (anchorReady ? 1 : 0);

  const loading = query.isLoading || query.isFetching;
  const confirmBlockedReason = loading
    ? "กำลังโหลดรายการใบบรรจุ"
    : !anchorReady
      ? "ใบบรรจุนี้ถูกใช้สร้างใบส่งแล้ว หรือรอบยังไม่พร้อม — สร้างใบส่งจากใบนี้ไม่ได้"
      : undefined;

  const onConfirm = async () => {
    if (confirmBlockedReason) return;
    try {
      const res = await createMutation.mutateAsync({
        packingIds: selected.map((row) => row.id),
      });
      onClose();
      router.push(`/delivery-orders/${res.data.id}`);
    } catch {
      /* แจ้งผ่าน message ใน hook แล้ว · 409 → hook โหลดรายการใหม่ ใบที่หายไปหลุดจากที่เลือกเอง */
    }
  };

  const columns: ColumnsType<ReadyPacking> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "เลขที่ใบบรรจุ",
      dataIndex: "packingNo",
      render: (v: string, row) => (
        <span className={styles.prNo}>
          {v}
          {row.id === anchorPackingId ? " (ใบนี้)" : ""}
        </span>
      ),
    },
    {
      title: "รอบ",
      dataIndex: "roundNo",
      width: 90,
      render: (v?: number) => (v ? `รอบที่ ${v}` : "—"),
    },
    {
      title: "รายการ",
      dataIndex: "itemCount",
      width: 80,
      align: "right",
    },
    {
      title: "วันที่",
      dataIndex: "packingDate",
      width: 110,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!loading && !anchorReady ? (
        <Alert
          type="warning"
          showIcon
          title="ใบบรรจุนี้ถูกใช้สร้างใบส่งแล้ว หรือรอบยังไม่พร้อม"
          description="เปิดใบส่งสินค้าเดิมจากหน้าใบสั่งขาย หรือยกเลิกใบส่งเดิมก่อนถ้าต้องการสร้างใหม่"
        />
      ) : null}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowSelection={{
          hideSelectAll: true,
          selectedRowKeys: selected.map((row) => row.id),
          onChange: (keys) =>
            setPickedIds(
              keys.map(String).filter((key) => key !== anchorPackingId),
            ),
          getCheckboxProps: (row) => ({
            disabled: row.id === anchorPackingId,
          }),
          renderCell: (_checked, row, _index, node) =>
            row.id === anchorPackingId ? (
              <Tooltip title="ใบบรรจุที่เปิดอยู่ — รวมอยู่ในใบส่งเสมอ">
                <span>{node}</span>
              </Tooltip>
            ) : (
              node
            ),
        }}
        locale={{ emptyText: "ไม่มีใบบรรจุของ SO นี้ที่พร้อมส่ง" }}
      />
      {!loading && anchorReady && othersCount === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13 }}>
          ไม่มีใบบรรจุอื่นของ SO นี้ที่พร้อมส่ง — ใบส่งจะมีเฉพาะใบบรรจุนี้
        </div>
      ) : null}

      <strong>รายการสินค้าในใบส่ง</strong>
      <Table
        rowKey={packingPreviewRowKey}
        size="small"
        columns={packingPreviewColumns}
        dataSource={previewLines}
        pagination={false}
        locale={{ emptyText: "—" }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Tooltip title={confirmBlockedReason}>
          <span>
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<CarOutlined />}
              disabled={Boolean(confirmBlockedReason)}
              loading={createMutation.isPending}
              onClick={onConfirm}
            >
              ยืนยันสร้างใบส่งสินค้า ({selected.length} ใบบรรจุ)
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
