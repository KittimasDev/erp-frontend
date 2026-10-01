"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Input, InputNumber, Select, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, RollbackOutlined, SaveOutlined } from "@ant-design/icons";

import { useDeliveryOrderQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useCreateReturnNoteMutation } from "@/hooks/return-notes/useReturnNoteMutations";
import {
  useReturnSourcePickingDetailQuery,
  useReturnSourcePickingsQuery,
  useReturnSourceSalesOrdersQuery,
} from "@/hooks/return-notes/useReturnNotesQuery";
import {
  DELIVERY_RESULT_COLOR,
  DELIVERY_RESULT_LABEL,
  type DeliveryResult,
} from "@/types/delivery-orders";
import type { ReturnSourceLine } from "@/types/return-notes";
import styles from "./ReturnNoteDetailPage.module.css";

const EPS = 5e-4;

function fmt(value: string | number) {
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function isReturnResult(result?: string) {
  return result === "FULL_RETURN" || result === "PARTIAL_RETURN";
}

export default function ReturnNoteCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDeliveryOrderId = searchParams.get("deliveryOrderId") ?? undefined;

  const deliveryOrderQuery = useDeliveryOrderQuery(fromDeliveryOrderId);
  const fromDeliveryOrder = deliveryOrderQuery.data?.data;

  const [soKeyword, setSoKeyword] = useState("");
  const [salesOrderId, setSalesOrderId] = useState<string>();
  const [pickedPickingId, setPickedPickingId] = useState<string>();
  const [pickedDeliveryOrderId, setPickedDeliveryOrderId] = useState<string>();
  const [edited, setEdited] = useState<Record<string, number | null>>({});
  const [reasonInput, setReasonInput] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const prefilled = Boolean(fromDeliveryOrderId);
  const pickingId = prefilled ? fromDeliveryOrder?.pickingId : pickedPickingId;
  const deliveryOrderId = prefilled ? fromDeliveryOrderId : pickedDeliveryOrderId;

  const salesOrdersQuery = useReturnSourceSalesOrdersQuery(soKeyword, !prefilled);
  const pickingsQuery = useReturnSourcePickingsQuery(prefilled ? undefined : salesOrderId);
  const sourceQuery = useReturnSourcePickingDetailQuery(pickingId, deliveryOrderId);
  const source = sourceQuery.data?.data;
  const createMutation = useCreateReturnNoteMutation();

  const fromReturn = isReturnResult(source?.deliveryResult);

  const qtyOf = (line: ReturnSourceLine): number | null => {
    if (line.pickingItemId in edited) return edited[line.pickingItemId];
    return fromReturn ? Number(line.maxReturnQty) : 0;
  };

  const reason = reasonInput ?? source?.deliveryReturnReason ?? "";

  const resetLines = () => {
    setEdited({});
    setReasonInput(null);
    setSubmitted(false);
  };

  const errors: string[] = [];
  if (source) {
    if (!reason.trim()) errors.push("กรุณาระบุเหตุผลการคืนสินค้า");
    let positive = 0;
    for (const line of source.lines) {
      const q = qtyOf(line) ?? 0;
      if (q < 0) errors.push(`${line.itemCode ?? "สินค้า"}: จำนวนคืนต้องไม่ติดลบ`);
      if (q - Number(line.maxReturnQty) > EPS) {
        errors.push(`${line.itemCode ?? "สินค้า"}: คืนได้สูงสุด ${fmt(line.maxReturnQty)}`);
      }
      if (q > EPS) positive += 1;
    }
    if (positive === 0) errors.push("ต้องมีจำนวนคืนมากกว่า 0 อย่างน้อย 1 รายการ");
  }

  const columns: ColumnsType<ReturnSourceLine> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_: unknown, line) => (
        <div style={{ lineHeight: 1.4 }}>
          <div>{line.itemNameTh ?? "—"}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {line.itemCode ?? "—"}
            {line.lotNo ? ` · Lot ${line.lotNo}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "จ่ายออก",
      key: "issued",
      width: 100,
      align: "right",
      render: (_: unknown, line) => `${fmt(line.issuedQty)} ${line.unitCode ?? ""}`,
    },
    {
      title: "คืนสะสม",
      key: "returned",
      width: 100,
      align: "right",
      render: (_: unknown, line) => fmt(line.returnedQty),
    },
    ...(fromReturn
      ? [
          {
            title: "ตีกลับตอนส่ง",
            key: "deliveryReturned",
            width: 110,
            align: "right" as const,
            render: (_: unknown, line: ReturnSourceLine) =>
              line.deliveryReturnedQty != null ? fmt(line.deliveryReturnedQty) : "—",
          },
        ]
      : []),
    {
      title: "คืนได้",
      key: "max",
      width: 100,
      align: "right",
      render: (_: unknown, line) => <strong>{fmt(line.maxReturnQty)}</strong>,
    },
    {
      title: "คืนครั้งนี้",
      key: "qty",
      width: 150,
      render: (_: unknown, line) => {
        const max = Number(line.maxReturnQty);
        const q = qtyOf(line);
        const over = (q ?? 0) - max > EPS;
        return (
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            max={max}
            step={1}
            precision={3}
            disabled={max <= EPS}
            status={over ? "error" : undefined}
            value={q}
            onChange={(value) =>
              setEdited((prev) => ({
                ...prev,
                [line.pickingItemId]: value == null ? null : Number(value),
              }))
            }
          />
        );
      },
    },
  ];

  const totalQty = (source?.lines ?? []).reduce((sum, l) => sum + (qtyOf(l) ?? 0), 0);

  const onSubmit = async () => {
    setSubmitted(true);
    if (!source || errors.length) return;
    try {
      const res = await createMutation.mutateAsync({
        pickingId: source.pickingId,
        deliveryOrderId: source.deliveryOrderId,
        reason: reason.trim(),
        remark: remark.trim() || undefined,
        items: source.lines
          .map((line) => ({
            pickingItemId: line.pickingItemId,
            returnQty: qtyOf(line) ?? 0,
          }))
          .filter((row) => row.returnQty > EPS),
      });
      router.push(`/return-notes/${res.data.id}`);
    } catch {
      /* แจ้งผ่าน message ใน hook แล้ว */
    }
  };

  const sourceError = sourceQuery.error as Error | null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <RollbackOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Return Note</p>
          <h1 className={styles.pageTitle}>สร้างใบคืนสินค้า</h1>
          <p className={styles.pageSubtitle}>
            {prefilled
              ? "ดึงข้อมูลจากใบส่งสินค้าที่ถูกตีกลับ — ตรวจจำนวนแล้วบันทึก"
              : "เลือกใบสั่งขาย → ใบจ่ายสินค้า แล้วระบุจำนวนที่คืน"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/return-notes")}>
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>เอกสารอ้างอิง</h2>
            </div>

            {prefilled ? (
              deliveryOrderQuery.isLoading ? (
                <Spin />
              ) : !fromDeliveryOrder ? (
                <Alert type="error" showIcon title="ไม่พบใบส่งสินค้าที่อ้างอิง" />
              ) : null
            ) : (
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ใบสั่งขาย</span>
                  <Select
                    showSearch
                    allowClear
                    style={{ width: "100%" }}
                    placeholder="ค้นหาเลขที่ SO / ลูกค้า"
                    filterOption={false}
                    onSearch={setSoKeyword}
                    loading={salesOrdersQuery.isFetching}
                    value={salesOrderId}
                    onChange={(value?: string) => {
                      setSalesOrderId(value);
                      setPickedPickingId(undefined);
                      setPickedDeliveryOrderId(undefined);
                      resetLines();
                    }}
                    options={(salesOrdersQuery.data?.data ?? []).map((so) => ({
                      value: so.id,
                      label: `${so.soNo}${so.customerName ? ` · ${so.customerName}` : ""}`,
                    }))}
                    notFoundContent="ไม่พบ SO ที่มีใบส่งสินค้าส่งถึงลูกค้าแล้ว"
                  />
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ใบจ่ายสินค้า</span>
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    placeholder={salesOrderId ? "เลือกใบจ่ายสินค้า" : "เลือก SO ก่อน"}
                    disabled={!salesOrderId}
                    loading={pickingsQuery.isFetching}
                    value={pickedPickingId}
                    onChange={(value?: string) => {
                      const picking = pickingsQuery.data?.data.find((p) => p.id === value);
                      setPickedPickingId(value);
                      setPickedDeliveryOrderId(picking?.deliveryOrderId);
                      resetLines();
                    }}
                    options={(pickingsQuery.data?.data ?? []).map((p) => ({
                      value: p.id,
                      label: `${p.pickingNo}${p.roundNo ? ` · รอบที่ ${p.roundNo}` : ""}${
                        p.deliveryOrderNo ? ` · ${p.deliveryOrderNo}` : ""
                      }${
                        isReturnResult(p.deliveryResult)
                          ? ` (${DELIVERY_RESULT_LABEL[p.deliveryResult as DeliveryResult]})`
                          : ""
                      }`,
                    }))}
                  />
                </div>
              </div>
            )}

            {source ? (
              <div className={styles.metaGrid} style={{ marginTop: 12 }}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ใบสั่งขาย</span>
                  <div className={styles.metaValue}>
                    {source.salesOrderNo ?? "—"}
                    {source.roundNo ? ` · รอบที่ ${source.roundNo}` : ""}
                  </div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ลูกค้า</span>
                  <div className={styles.metaValue}>{source.customerName ?? "—"}</div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ใบจ่ายสินค้า</span>
                  <div className={styles.metaValue}>{source.pickingNo}</div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>ใบส่งสินค้า</span>
                  <div className={styles.metaValue}>
                    {source.deliveryOrderId ? (
                      <Link href={`/delivery-orders/${source.deliveryOrderId}`}>
                        {source.deliveryOrderNo ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {source.deliveryResult ? (
                      <Tag
                        style={{ marginLeft: 8 }}
                        color={DELIVERY_RESULT_COLOR[source.deliveryResult as DeliveryResult]}
                      >
                        {DELIVERY_RESULT_LABEL[source.deliveryResult as DeliveryResult] ??
                          source.deliveryResult}
                      </Tag>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {pickingId ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>รายการคืน</h2>
              </div>
              {sourceError ? (
                <Alert type="error" showIcon title={sourceError.message} />
              ) : (
                <Table
                  rowKey="pickingItemId"
                  size="small"
                  columns={columns}
                  dataSource={source?.lines ?? []}
                  loading={sourceQuery.isLoading}
                  pagination={false}
                  scroll={{ x: 760 }}
                  locale={{ emptyText: "ใบจ่ายนี้ไม่มีรายการที่จ่ายออก" }}
                />
              )}
            </div>
          ) : null}

          {source ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>เหตุผลการคืน</h2>
              </div>
              <Input.TextArea
                rows={3}
                value={reason}
                status={submitted && !reason.trim() ? "error" : undefined}
                placeholder="เช่น ลูกค้าตีกลับ สินค้าเสียหาย"
                onChange={(e) => setReasonInput(e.target.value)}
              />
              <Input.TextArea
                rows={2}
                style={{ marginTop: 8 }}
                value={remark}
                placeholder="หมายเหตุ (ถ้ามี)"
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สรุป</p>
            <h2 className={styles.sideTitle}>ใบคืนสินค้าใหม่</h2>
          </div>
          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>รายการที่คืน</span>
              <strong>
                {(source?.lines ?? []).filter((l) => (qtyOf(l) ?? 0) > EPS).length}
              </strong>
            </div>
            <div className={styles.sideRow}>
              <span>จำนวนคืนรวม</span>
              <strong>{fmt(totalQty)}</strong>
            </div>
          </div>
          <p className={styles.sideNote}>
            บันทึกแล้วสถานะเป็น “รอคลังอนุมัติ” ยังไม่แตะสต๊อก — คลังอนุมัติจึงรับเข้าคลังตรวจสอบ
          </p>
          {submitted && errors.length ? (
            <Alert
              type="error"
              showIcon
              title="ตรวจข้อมูลก่อนบันทึก"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              }
            />
          ) : null}
          <div className={styles.actionStack}>
            <Button
              className={styles.primaryBtn}
              type="primary"
              icon={<SaveOutlined />}
              disabled={!source}
              loading={createMutation.isPending}
              onClick={onSubmit}
            >
              บันทึกใบคืนสินค้า
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
