"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateStockPostingRequestMutation } from "@/hooks/stock-posting/useStockPostingMutations";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { StockPostingReceiptItem } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/masters/shared/master-page.module.css";

type FormValues = {
  warehouseId: string;
  warehouseLocationId: string;
  postingDate: dayjs.Dayjs;
  remark?: string;
};

type Props = {
  receiptId: string;
};

export default function StockPostingRequestPage({ receiptId }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const warehouseId = Form.useWatch("warehouseId", form);

  const canRequest = userHasRole(RoleCode.WAREHOUSE_OFFICER);
  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const existingQuery = useStockPostingRequestByReceiptQuery(receiptId);
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    warehouseId ? { warehouseId, isActive: true } : undefined,
    { enabled: Boolean(warehouseId) },
  );
  const createMutation = useCreateStockPostingRequestMutation(receiptId);

  const receipt = receiptQuery.data?.data;
  const existing = existingQuery.data?.data;
  const pendingExists =
    existing?.status === StockPostingRequestStatus.PENDING_APPROVAL;
  const alreadyPosted =
    receipt?.stockPostingStatus === "POSTED" ||
    existing?.status === StockPostingRequestStatus.APPROVED;
  const canSubmit =
    canRequest &&
    receipt?.status === "CONFIRMED" &&
    !pendingExists &&
    !alreadyPosted;

  useEffect(() => {
    form.setFieldsValue({
      postingDate: dayjs(),
    });
  }, [form]);

  useEffect(() => {
    form.setFieldValue("warehouseLocationId", undefined);
  }, [warehouseId, form]);

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );

  const locationOptions = useMemo(
    () =>
      (locationsQuery.data?.data ?? []).map((loc) => ({
        value: loc.id,
        label: `${loc.locationCode} — ${loc.locationName}`,
      })),
    [locationsQuery.data?.data],
  );

  const itemColumns: ColumnsType<StockPostingReceiptItem> = [
    { title: "ประเภทสินค้า", dataIndex: "classificationName", key: "classificationName" },
    { title: "น้ำหนัก (กก.)", dataIndex: "weightKg", key: "weightKg", align: "right" },
    { title: "ราคา/กก.", dataIndex: "pricePerKg", key: "pricePerKg", align: "right" },
    { title: "ยอดเงิน", dataIndex: "amount", key: "amount", align: "right" },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(
      {
        warehouseId: values.warehouseId,
        warehouseLocationId: values.warehouseLocationId,
        postingDate: values.postingDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.push("/warehouse/stock-posting-approvals");
        },
      },
    );
  };

  return (
    <MasterPageGate
      isLoading={existingQuery.isLoading || receiptQuery.isLoading}
    >
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <Button
            icon={<ArrowLeftOutlined />}
            className={styles.editButton}
            onClick={() => router.push(`/receiving/receipts/${receiptId}`)}
          >
            กลับ
          </Button>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>WAREHOUSE · STOCK POSTING</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              ส่งคำขอรับเข้าคลัง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              ใบรับซื้อ {receipt?.receiptNo ?? "—"} — เจ้าหน้าที่คลังส่งคำขอ
              หัวหน้าคลังอนุมัติแล้วระบบจึง POST สต๊อกจริง
            </Typography.Text>
          </div>
          <div />
        </div>

        {receipt && receipt.status !== "CONFIRMED" ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="ใบรับซื้อต้องสถานะ CONFIRMED ก่อนส่งคำขอรับเข้าคลัง"
          />
        ) : null}

        {!canRequest ? (
          <Alert
            type="warning"
            showIcon
            message="ต้องมีสิทธิ์ WAREHOUSE_OFFICER เพื่อส่งคำขอรับเข้าคลัง"
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {existing ? (
          <Alert
            type={
              pendingExists
                ? "info"
                : alreadyPosted
                  ? "success"
                  : "warning"
            }
            showIcon
            style={{ marginBottom: 16 }}
            message={`คำขอล่าสุด: ${existing.requestNo} — ${
              STOCK_POSTING_REQUEST_STATUS_LABEL[existing.status] ??
              existing.status
            }`}
            description={
              pendingExists
                ? "มีคำขอรออนุมัติอยู่แล้ว ไม่สามารถส่งซ้ำได้"
                : alreadyPosted
                  ? "อนุมัติและรับเข้าคลังแล้ว"
                  : existing.rejectReason
                    ? `เหตุผลที่ไม่อนุมัติ: ${existing.rejectReason}`
                    : undefined
            }
          />
        ) : null}

        {receipt?.items?.length ? (
          <div className={styles.tableCard} style={{ marginBottom: 16 }}>
            <h3>รายการในใบรับซื้อ</h3>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={itemColumns}
              dataSource={receipt.items.map((item) => ({
                id: item.id,
                classificationName:
                  item.classificationName ?? item.description ?? "-",
                weightKg: item.weightKg,
                pricePerKg: item.pricePerKg,
                amount: item.amount,
              }))}
            />
          </div>
        ) : null}

        <div className={styles.tableCard}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
            disabled={!canSubmit}
            onFinish={handleSubmit}
          >
            <Form.Item
              label="คลังสินค้า"
              name="warehouseId"
              rules={[{ required: true, message: "กรุณาเลือกคลัง" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกคลัง"
                options={warehouseOptions}
                loading={warehousesQuery.isLoading}
              />
            </Form.Item>

            <Form.Item
              label="ตำแหน่งจัดเก็บ"
              name="warehouseLocationId"
              rules={[{ required: true, message: "กรุณาเลือกตำแหน่ง" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder={
                  warehouseId ? "เลือกตำแหน่ง" : "เลือกคลังก่อน"
                }
                options={locationOptions}
                loading={locationsQuery.isFetching}
                disabled={!warehouseId}
              />
            </Form.Item>

            <Form.Item
              label="วันที่รับเข้า"
              name="postingDate"
              rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
            >
              <DatePicker size="large" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="หมายเหตุ" name="remark">
              <Input.TextArea rows={3} placeholder="หมายเหตุเพิ่มเติม" />
            </Form.Item>

            <Space>
              <Button
                onClick={() =>
                  router.push(`/receiving/receipts/${receiptId}`)
                }
              >
                ยกเลิก
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.createButton}
                loading={createMutation.isPending}
                disabled={!canSubmit}
              >
                ส่งคำขอรับเข้าคลัง
              </Button>
            </Space>
          </Form>
        </div>
      </section>
    </MasterPageGate>
  );
}
