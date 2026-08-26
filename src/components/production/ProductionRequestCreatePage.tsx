"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useDeliverySchedulesQuery } from "@/hooks/delivery-schedules/useDeliverySchedulesQuery";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
} from "antd";
import { ArrowLeftOutlined, ProfileOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateProductionRequestMutation,
  useUpdateProductionRequestMutation,
} from "@/hooks/production-requests/useProductionRequestMutations";
import {
  useEligibleSalesOrderQuery,
  useEligibleSalesOrdersQuery,
  useProductionRequestQuery,
  useProductionRequestsQuery,
} from "@/hooks/production-requests/useProductionRequestQueries";
import type {
  CreateProductionRequestItemBody,
  EligibleSalesOrderItem,
  ProductionRequest,
} from "@/types/production-request";
import styles from "./ProductionOrderCreatePage.module.css";

function toNumber(value?: string) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function fmt(value: string | number) {
  return Number(value).toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

type Props = {
  /** ระบุเมื่อใช้หน้านี้แก้ไขใบขอผลิตเดิม — ใบสั่งขายที่อ้างอิงจะถูกล็อกไว้ */
  requestId?: string;
  /**
   * รอบจัดส่งจาก deep-link ?deliveryScheduleId=
   * มาจากหน้าเลือกรอบสร้างใบจ่าย ตอนกด "เปิดใบขอผลิตสำหรับส่วนที่ขาด"
   * ใบขอผลิตที่สร้างจะผูกกับรอบนั้น ของที่ผลิตเสร็จจึงเข้ารอบที่ตั้งใจ
   */
  initialDeliveryScheduleId?: string;
  /** จาก deep-link ?salesOrderId= บนหน้าสร้างใหม่ */
  initialSalesOrderId?: string;
};

/**
 * โหมดแก้ไขต้องรอโหลดใบเดิมให้เสร็จก่อน แล้วค่อย mount ฟอร์ม
 * เพื่อให้ฟอร์มตั้งค่าเริ่มต้นจากข้อมูลจริงได้ตั้งแต่ render แรก (ไม่ต้อง setState ใน effect)
 */
export default function ProductionRequestCreatePage({
  requestId,
  initialSalesOrderId,
  initialDeliveryScheduleId,
}: Props) {
  const existingQuery = useProductionRequestQuery(requestId);
  const existing = existingQuery.data?.data;

  if (requestId && !existing) {
    return <MasterPageGate isLoading>{null}</MasterPageGate>;
  }

  return (
    <ProductionRequestForm
      key={existing?.id ?? initialSalesOrderId ?? "new"}
      requestId={requestId}
      existing={existing}
      initialSalesOrderId={initialSalesOrderId}
      initialDeliveryScheduleId={initialDeliveryScheduleId}
    />
  );
}

export function ProductionRequestCreatePageWithSearchParams() {
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get("salesOrderId") ?? undefined;
  const deliveryScheduleId =
    searchParams.get("deliveryScheduleId") ?? undefined;
  return (
    <ProductionRequestCreatePage
      initialSalesOrderId={salesOrderId}
      initialDeliveryScheduleId={deliveryScheduleId}
    />
  );
}

function ProductionRequestForm({
  requestId,
  existing,
  initialDeliveryScheduleId,
  initialSalesOrderId,
}: {
  requestId?: string;
  existing?: ProductionRequest;
  initialSalesOrderId?: string;
  initialDeliveryScheduleId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(requestId);
  const lockedSalesOrder = Boolean(initialSalesOrderId) && !isEdit;
  const createMutation = useCreateProductionRequestMutation();
  const updateMutation = useUpdateProductionRequestMutation();

  const [soSearch, setSoSearch] = useState("");
  const [salesOrderId, setSalesOrderId] = useState<string | undefined>(
    existing?.salesOrderId ?? initialSalesOrderId,
  );
  const [requestDate, setRequestDate] = useState<Dayjs>(
    existing ? dayjs(existing.requestDate) : dayjs(),
  );
  const [requiredDate, setRequiredDate] = useState<Dayjs | null>(
    existing?.requiredDate ? dayjs(existing.requiredDate) : null,
  );
  const [remark, setRemark] = useState(existing?.remark ?? "");

  /**
   * บรรทัด SO → บรรทัดรอบ ของรอบที่ deep-link ระบุมา
   *
   * ผูกใบขอผลิตกับรอบไว้ตั้งแต่ตอนเปิดใบ (เฟส 3) ของที่ผลิตเสร็จจะเข้ารอบนั้น
   * ตรง ๆ ไม่ต้องให้ระบบเดา — กันกรณีมีรอบใหม่ที่วันส่งเร็วกว่าแทรกเข้ามา
   * ระหว่างรอผลิต แล้วของไหลไปผิดรอบ
   */
  const schedulesQuery = useDeliverySchedulesQuery(
    initialDeliveryScheduleId ? salesOrderId : undefined,
  );
  const scheduleItemIdBySoItemId = useMemo(() => {
    const map = new Map<string, string>();
    if (!initialDeliveryScheduleId) return map;
    const round = (schedulesQuery.data ?? []).find(
      (s) => s.id === initialDeliveryScheduleId,
    );
    for (const line of round?.items ?? []) {
      map.set(line.salesOrderItemId, line.id);
    }
    return map;
  }, [initialDeliveryScheduleId, schedulesQuery.data]);

  const boundRound = useMemo(
    () =>
      initialDeliveryScheduleId
        ? (schedulesQuery.data ?? []).find(
            (s) => s.id === initialDeliveryScheduleId,
          )
        : undefined,
    [initialDeliveryScheduleId, schedulesQuery.data],
  );
  /** จำนวนที่ขอผลิต ต่อ salesOrderItemId — ใส่เฉพาะรายการที่ต้องการขอ */
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (existing?.items ?? []).map((item) => [
        item.salesOrderItemId,
        Number(item.requestedQty),
      ]),
    ),
  );

  /** จำนวนเดิมของใบนี้ — ต้องบวกกลับเข้าเพดาน เพราะ remainingQty หักบรรทัดของใบนี้ไปแล้ว */
  const originalQtyByItemId = useMemo(
    () =>
      Object.fromEntries(
        (existing?.items ?? []).map((item) => [
          item.salesOrderItemId,
          Number(item.requestedQty),
        ]),
      ) as Record<string, number>,
    [existing],
  );

  const eligibleQuery = useEligibleSalesOrdersQuery({
    q: soSearch.trim() || undefined,
    limit: 30,
  });
  const detailQuery = useEligibleSalesOrderQuery(salesOrderId);
  const existingForSoQuery = useProductionRequestsQuery(
    { salesOrderId, limit: 50 },
    { enabled: Boolean(salesOrderId) && !isEdit },
  );
  /**
   * ใบขอผลิตอื่นของ SO เดียวกันที่ยัง active
   *
   * **ไม่บล็อกการเปิดใบใหม่แล้ว (2026-08-26)** — SO ใบเดียวแบ่งส่งหลายรอบ
   * แต่ละรอบขาดของไม่พร้อมกัน จึงต้องเปิดใบขอผลิตแยกกันตามรอบ
   * (backend ก็ถอดกฎ 1 ใบต่อ 1 SO ออกแล้ว)
   *
   * เพดานจำนวนยังคุมอยู่ผ่าน "คงค้างขอได้" ต่อบรรทัด จึงขอผลิตเกิน
   * จำนวนที่ตกลงขายไม่ได้อยู่ดี
   */
  const otherActivePrs = (existingForSoQuery.data?.data.items ?? []).filter(
    (pr) => pr.status !== "CANCELLED",
  );
  const selectedSo = detailQuery.data?.data;
  const soItems = useMemo(() => selectedSo?.items ?? [], [selectedSo]);

  useEffect(() => {
    if (!lockedSalesOrder || !selectedSo || isEdit) {
      return;
    }
    const nextQty: Record<string, number> = {};
    for (const item of selectedSo.items) {
      const ordered = toNumber(item.salesOrderQty);
      const delivered = toNumber(item.deliveredQty);
      const reserved = toNumber(item.reservedQty);
      const available = toNumber(item.availableQty);
      const shortage = Math.max(ordered - delivered - reserved - available, 0);
      if (shortage > 0) {
        nextQty[item.salesOrderItemId] = toNumber(item.remainingQty);
      }
    }
    if (Object.keys(nextQty).length > 0) {
      setQtyByItemId(nextQty);
    }
  }, [isEdit, lockedSalesOrder, selectedSo]);

  const maxQtyFor = useMemo(
    () => (item: EligibleSalesOrderItem) =>
      toNumber(item.remainingQty) +
      (isEdit ? (originalQtyByItemId[item.salesOrderItemId] ?? 0) : 0),
    [isEdit, originalQtyByItemId],
  );

  const selectedLines = useMemo(
    () =>
      soItems
        .map((item) => ({ item, qty: qtyByItemId[item.salesOrderItemId] ?? 0 }))
        .filter((line) => line.qty > 0),
    [soItems, qtyByItemId],
  );

  const hasOverQty = selectedLines.some(
    (line) => line.qty > maxQtyFor(line.item),
  );
  const canSubmit = selectedLines.length > 0 && !hasOverQty;

  const handleSelectSo = (value?: string) => {
    setSalesOrderId(value);
    setQtyByItemId({});
  };

  const handleSubmit = () => {
    if (!salesOrderId) {
      return;
    }

    const items: CreateProductionRequestItemBody[] = selectedLines.map(
      (line, index) => ({
        salesOrderItemId: line.item.salesOrderItemId,
        // ผูกรอบให้บรรทัดที่อยู่ในรอบที่ deep-link ระบุมา · บรรทัดอื่นปล่อยว่าง
        // ให้ระบบเลือกรอบเองตอนของเข้าคลัง
        deliveryScheduleItemId: scheduleItemIdBySoItemId.get(
          line.item.salesOrderItemId,
        ),
        requestedQty: line.qty,
        sortOrder: index,
      }),
    );
    const common = {
      requestDate: requestDate.format("YYYY-MM-DD"),
      requiredDate: requiredDate?.format("YYYY-MM-DD"),
      remark: remark.trim() || undefined,
      items,
    };

    if (isEdit && requestId) {
      updateMutation.mutate(
        { id: requestId, body: common },
        {
          onSuccess: () => {
            router.push(`/production/production-requests/${requestId}`);
          },
        },
      );
      return;
    }

    createMutation.mutate(
      { salesOrderId, ...common },
      {
        onSuccess: (response) => {
          router.push(`/production/production-requests/${response.data.id}`);
        },
      },
    );
  };

  const columns: ColumnsType<EligibleSalesOrderItem> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.itemCode ?? "-"}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{row.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: "จำนวนตาม SO",
      dataIndex: "salesOrderQty",
      key: "salesOrderQty",
      align: "right",
      render: (value: string, row) => `${fmt(value)} ${row.unitCode ?? ""}`,
    },
    {
      title: "ส่งแล้ว",
      dataIndex: "deliveredQty",
      key: "deliveredQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
    {
      title: "ขอผลิตไปแล้ว",
      dataIndex: "alreadyRequestedQty",
      key: "alreadyRequestedQty",
      align: "right",
      render: (value: string) => fmt(value),
    },
    {
      title: "คงค้างขอได้",
      key: "remainingQty",
      align: "right",
      render: (_, row) => {
        const max = maxQtyFor(row);
        return max > 0 ? <Tag color="blue">{fmt(max)}</Tag> : <Tag>0</Tag>;
      },
    },
    {
      title: "จำนวนที่ขอผลิต",
      key: "requestedQty",
      align: "right",
      width: 180,
      render: (_, row) => {
        const remaining = maxQtyFor(row);
        return (
          <InputNumber
            aria-label={`จำนวนที่ขอผลิตของ ${row.itemCode ?? row.itemId}`}
            style={{ width: "100%" }}
            min={0}
            max={remaining}
            disabled={remaining <= 0}
            placeholder={remaining > 0 ? `ไม่เกิน ${fmt(remaining)}` : "ขอครบแล้ว"}
            value={qtyByItemId[row.salesOrderItemId]}
            onChange={(value) =>
              setQtyByItemId((prev) => ({
                ...prev,
                [row.salesOrderItemId]: value ?? 0,
              }))
            }
          />
        );
      },
    },
  ];

  return (
    <MasterPageGate>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <ProfileOutlined />
          </div>
          <div className={styles.headerContent}>
            <Link
              href="/production/production-requests"
              className={styles.backLink}
            >
              <ArrowLeftOutlined /> กลับรายการ
            </Link>
            <p className={styles.eyebrow}>Production · จากใบสั่งขาย</p>
            <h1 className={styles.pageTitle}>
              {isEdit
                ? `แก้ไขใบขอผลิต ${existing?.requestNo ?? ""}`
                : "สร้างใบขอผลิต"}
            </h1>
            <p className={styles.pageSubtitle}>
              {isEdit
                ? "แก้ไขจำนวนและรายการได้ตราบที่ยังไม่มีใบสั่งผลิตอ้างอิง — เปลี่ยนใบสั่งขายไม่ได้"
                : "เลือกใบสั่งขาย 1 ใบ แล้วระบุจำนวนที่ขอผลิตของสินค้าใน SO นั้น · รับถึงใบที่ยืนยันแล้ว"}
            </p>
          </div>
        </header>

        {/* มาจากหน้าเลือกรอบ — บอกให้ชัดว่าใบนี้ผูกกับรอบไหน
            เพราะมันเปลี่ยนว่าของที่ผลิตเสร็จจะไปเข้ารอบใด */}
        {boundRound ? (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 12 }}
            title={`ผูกกับรอบจัดส่งที่ ${boundRound.roundNo} (ส่งวันที่ ${dayjs(
              boundRound.deliveryDate,
            ).format("DD/MM/YYYY")})`}
            description="ของที่ผลิตเสร็จจะถูกกันไว้ให้รอบนี้โดยตรง ใบสั่งขายอื่นและรอบอื่นแย่งไม่ได้"
          />
        ) : null}

        <Alert
          type="info"
          showIcon
          title="ผลผลิตจะถูกกันไว้ให้ใบสั่งขายนี้"
          description="เมื่อผลิตเสร็จและรับเข้าคลัง ระบบจะกันของไว้ให้ SO ต้นทางตามยอดที่ขอผลิตค้างอยู่ ใบสั่งขายอื่นแย่งไม่ได้ · ส่วนที่เกินความต้องการเท่านั้นที่เข้าสต๊อกกลาง"
          style={{ marginBottom: 16 }}
        />
        {otherActivePrs.length ? (
          <Alert
            type="info"
            showIcon
            title={`ใบสั่งขายนี้มีใบขอผลิตอยู่แล้ว ${otherActivePrs.length} ใบ`}
            description={
              <span>
                เปิดใบเพิ่มได้ถ้าต้องแบ่งผลิตตามรอบจัดส่ง · ยอดที่ขอไปแล้วถูกหักออกจาก
                &quot;คงค้างขอได้&quot; ให้แล้ว —{" "}
                {otherActivePrs.map((pr, i) => (
                  <span key={pr.id}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/production/production-requests/${pr.id}`}>
                      {pr.requestNo}
                    </Link>
                  </span>
                ))}
              </span>
            }
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <section className={styles.formCard}>
          <h2 className={styles.sectionTitle}>ใบสั่งขายที่อ้างอิง</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                ใบสั่งขาย (รับถึงใบที่ยืนยันแล้ว)
              </span>
              {isEdit || lockedSalesOrder ? (
                <Input
                  readOnly
                  aria-label="ใบสั่งขายที่อ้างอิง"
                  value={
                    detailQuery.isLoading
                      ? "กำลังโหลด..."
                      : `${selectedSo?.soNo ?? existing?.soNo ?? ""} — ${
                          selectedSo?.customerName ??
                          existing?.customerName ??
                          "ไม่ระบุลูกค้า"
                        }`
                  }
                />
              ) : (
                <Select
                  showSearch
                  allowClear
                  placeholder="ค้นหาเลขที่ SO หรือชื่อลูกค้า"
                  filterOption={false}
                  loading={eligibleQuery.isFetching}
                  value={salesOrderId}
                  style={{ width: "100%" }}
                  onSearch={setSoSearch}
                  onChange={handleSelectSo}
                  notFoundContent={
                    eligibleQuery.isFetching
                      ? "กำลังค้นหา..."
                      : "ไม่พบใบสั่งขายที่ยังขอผลิตได้"
                  }
                  options={(eligibleQuery.data?.data ?? []).map((so) => ({
                    value: so.salesOrderId,
                    label: `${so.soNo} — ${so.customerName ?? "ไม่ระบุลูกค้า"}`,
                  }))}
                />
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>วันที่ขอผลิต</span>
              <DatePicker
                style={{ width: "100%" }}
                value={requestDate}
                format="DD/MM/YYYY"
                onChange={(value) => value && setRequestDate(value)}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                ต้องการผลผลิตภายใน (ไม่บังคับ)
              </span>
              <DatePicker
                style={{ width: "100%" }}
                value={requiredDate}
                format="DD/MM/YYYY"
                onChange={setRequiredDate}
              />
            </div>
          </div>
          {selectedSo ? (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>ข้อมูล SO</span>
              <div>
                ลูกค้า: {selectedSo.customerName ?? "-"} · วันที่ SO:{" "}
                {dayjs(selectedSo.soDate).format("DD/MM/YYYY")} · สถานะ:{" "}
                <Tag>{selectedSo.status}</Tag>
              </div>
            </div>
          ) : null}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>หมายเหตุ</span>
            <Input.TextArea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.materialsHeader}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              สินค้าในใบสั่งขาย ({soItems.length} รายการ)
            </h2>
          </div>

          {!salesOrderId ? (
            <Alert
              type="warning"
              showIcon
              title="เลือกใบสั่งขายก่อน จึงจะเลือกสินค้าได้"
              description="เลือกได้เฉพาะสินค้าที่อยู่ในใบสั่งขายที่อ้างอิงเท่านั้น"
            />
          ) : (
            <>
              <Table
                rowKey="salesOrderItemId"
                columns={columns}
                dataSource={soItems}
                loading={detailQuery.isFetching}
                pagination={false}
                scroll={{ x: "max-content" }}
              />
              {hasOverQty ? (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginTop: 12 }}
                  title="จำนวนที่ขอผลิตเกินจำนวนคงค้างของใบสั่งขาย"
                />
              ) : null}
            </>
          )}

          <div className={styles.footerActions}>
            <Button
              className={styles.secondaryBtn}
              onClick={() =>
                router.push(
                  isEdit && requestId
                    ? `/production/production-requests/${requestId}`
                    : "/production/production-requests",
                )
              }
            >
              ยกเลิก
            </Button>
            <Button
              type="primary"
              className={styles.primaryBtn}
              disabled={!canSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {isEdit ? "บันทึกการแก้ไข" : "สร้างใบขอผลิต"} (
              {selectedLines.length} รายการ)
            </Button>
          </div>
        </section>
      </div>
    </MasterPageGate>
  );
}
