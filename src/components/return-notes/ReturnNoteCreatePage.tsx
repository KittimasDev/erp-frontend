"use client";

import { useMemo, useState } from "react";
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
import type {
  ReturnSourceLine,
  ReturnSourcePicking,
  ReturnSourceSalesOrder,
} from "@/types/return-notes";
import styles from "./ReturnNoteDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT, type TFunction } from "@/lib/i18n/useT";

const EPS = 5e-4;

type SelectOption = { value: string; label: string };

function fmt(value: string | number) {
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function isReturnResult(result?: string) {
  return result === "FULL_RETURN" || result === "PARTIAL_RETURN";
}

/** ตรงกับ BE isStockReturnDelivery — คืนเข้าคลังต้องเป็น true เท่านั้น */
function isStockReturnDelivery(delivery?: {
  deliveryResult?: string | null;
  returnToStock?: boolean | null;
}) {
  return (
    isReturnResult(delivery?.deliveryResult ?? undefined) &&
    delivery?.returnToStock === true
  );
}

function soOptionLabel(so: ReturnSourceSalesOrder) {
  return `${so.soNo}${so.customerName ? ` · ${so.customerName}` : ""}`;
}

function pickingOptionLabel(p: ReturnSourcePicking, t: TFunction) {
  return `${p.pickingNo}${p.roundNo ? t(" · รอบที่ {roundNo}", { roundNo: p.roundNo }) : ""}${
    p.deliveryOrderNo ? ` · ${p.deliveryOrderNo}` : ""
  }${
    isReturnResult(p.deliveryResult)
      ? ` (${t(DELIVERY_RESULT_LABEL[p.deliveryResult as DeliveryResult])})`
      : ""
  }`;
}

export default function ReturnNoteCreatePage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDeliveryOrderId = searchParams.get("deliveryOrderId") ?? undefined;

  const deliveryOrderQuery = useDeliveryOrderQuery(fromDeliveryOrderId);
  const fromDeliveryOrder = deliveryOrderQuery.data?.data;

  const [soKeyword, setSoKeyword] = useState("");
  const [salesOrderId, setSalesOrderId] = useState<string>();
  const [pickedPickingId, setPickedPickingId] = useState<string>();
  const [pickedDeliveryOrderId, setPickedDeliveryOrderId] = useState<string>();
  /** TASK 13: เก็บตัวเลือกที่เลือกไว้ — ค้นหาใหม่แล้วยังโชว์เลขเอกสาร */
  const [selectedSoOption, setSelectedSoOption] = useState<SelectOption | null>(
    null,
  );
  const [selectedPickingOption, setSelectedPickingOption] =
    useState<SelectOption | null>(null);
  const [edited, setEdited] = useState<Record<string, number | null>>({});
  const [reasonInput, setReasonInput] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const prefilled = Boolean(fromDeliveryOrderId);
  // ใบส่งที่รวมหลายใบบรรจุ = หลายใบเบิก · ใบคืนผูกกับใบเบิกทีละใบ ต้องให้เลือก
  const [prefilledPickingId, setPrefilledPickingId] = useState<string>();
  const doPickings = (fromDeliveryOrder?.packings ?? []).filter(
    (ref, index, all) =>
      all.findIndex((other) => other.pickingId === ref.pickingId) === index,
  );
  const multiPicking = doPickings.length > 1;
  const pickingId = prefilled
    ? (prefilledPickingId ??
      (multiPicking ? undefined : fromDeliveryOrder?.pickingId))
    : pickedPickingId;
  const deliveryOrderId = prefilled ? fromDeliveryOrderId : pickedDeliveryOrderId;

  // TASK 12: DO จากลิงก์ที่ไม่เข้าเงื่อนไข — ไม่โหลดตาราง/ไม่เติมจำนวน
  const prefilledDoLoaded = !prefilled || Boolean(fromDeliveryOrder);
  const prefilledDoEligible =
    !prefilled ||
    (fromDeliveryOrder != null && isStockReturnDelivery(fromDeliveryOrder));
  const prefilledIneligibleReason = (() => {
    if (!prefilled || !fromDeliveryOrder) return null;
    if (isStockReturnDelivery(fromDeliveryOrder)) return null;
    const doNo =
      fromDeliveryOrder.deliveryOrderNo?.trim() || t("ใบส่งสินค้า");
    if (!isReturnResult(fromDeliveryOrder.deliveryResult)) {
      return t(
        "{doNo} ส่งสำเร็จหรือยังไม่บันทึกผลตีกลับ — สร้างใบรับคืนได้เฉพาะใบที่ตีกลับ",
        { doNo },
      );
    }
    return t(
      "{doNo} เลือกไม่นำเข้าคลังตอนตีกลับ — สร้างใบรับคืนไม่ได้",
      { doNo },
    );
  })();

  const salesOrdersQuery = useReturnSourceSalesOrdersQuery(soKeyword, !prefilled);
  const pickingsQuery = useReturnSourcePickingsQuery(prefilled ? undefined : salesOrderId);
  const sourceQuery = useReturnSourcePickingDetailQuery(
    prefilledDoLoaded && prefilledDoEligible ? pickingId : undefined,
    prefilledDoLoaded && prefilledDoEligible ? deliveryOrderId : undefined,
  );
  const source = sourceQuery.data?.data;
  const createMutation = useCreateReturnNoteMutation();

  const fromReturn = isStockReturnDelivery(source);
  const canCreate = Boolean(source) && isStockReturnDelivery(source);

  const soOptions = useMemo(() => {
    const list = (salesOrdersQuery.data?.data ?? []).map((so) => ({
      value: so.id,
      label: soOptionLabel(so),
    }));
    if (
      selectedSoOption &&
      !list.some((row) => row.value === selectedSoOption.value)
    ) {
      return [selectedSoOption, ...list];
    }
    return list;
  }, [salesOrdersQuery.data?.data, selectedSoOption]);

  const pickingOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: SelectOption[] = [];
    const byId = new Map<string, ReturnSourcePicking>();
    for (const p of pickingsQuery.data?.data ?? []) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      byId.set(p.id, p);
      list.push({ value: p.id, label: pickingOptionLabel(p, t) });
    }
    if (
      selectedPickingOption &&
      !list.some((row) => row.value === selectedPickingOption.value)
    ) {
      return {
        options: [selectedPickingOption, ...list],
        byId,
      };
    }
    return { options: list, byId };
  }, [pickingsQuery.data?.data, selectedPickingOption, t]);

  const qtyOf = (line: ReturnSourceLine): number | null => {
    if (line.pickingItemId in edited) return edited[line.pickingItemId];
    // เติมจำนวนคืนเฉพาะตอน DO เข้าเงื่อนไขคืนเข้าคลัง
    return fromReturn ? Number(line.maxReturnQty) : 0;
  };

  const reason = reasonInput ?? source?.deliveryReturnReason ?? "";

  const resetLines = () => {
    setEdited({});
    setReasonInput(null);
    setSubmitted(false);
  };

  const formErrors: string[] = [];
  if (source && isStockReturnDelivery(source)) {
    if (!reason.trim()) formErrors.push(t("กรุณาระบุเหตุผลการคืนสินค้า"));
    let positive = 0;
    for (const line of source.lines) {
      const q = qtyOf(line) ?? 0;
      if (q < 0) formErrors.push(`${line.itemCode ?? t("สินค้า")}: ${t("จำนวนคืนต้องไม่ติดลบ")}`);
      if (q - Number(line.maxReturnQty) > EPS) {
        formErrors.push(`${line.itemCode ?? t("สินค้า")}: ${t("คืนได้สูงสุด {max}", { max: fmt(line.maxReturnQty) })}`);
      }
      if (q > EPS) positive += 1;
    }
    if (positive === 0) formErrors.push(t("ต้องมีจำนวนคืนมากกว่า 0 อย่างน้อย 1 รายการ"));
  }

  const eligibilityErrors: string[] = [];
  if (prefilledIneligibleReason) {
    eligibilityErrors.push(prefilledIneligibleReason);
  } else if (source && !isStockReturnDelivery(source)) {
    const doNo = source.deliveryOrderNo?.trim() || t("ใบส่งสินค้า");
    if (!isReturnResult(source.deliveryResult)) {
      eligibilityErrors.push(
        t(
          "{doNo} ส่งสำเร็จหรือยังไม่บันทึกผลตีกลับ — สร้างใบรับคืนได้เฉพาะใบที่ตีกลับ",
          { doNo },
        ),
      );
    } else {
      eligibilityErrors.push(
        t("{doNo} เลือกไม่นำเข้าคลังตอนตีกลับ — สร้างใบรับคืนไม่ได้", {
          doNo,
        }),
      );
    }
  }

  const columns: ColumnsType<ReturnSourceLine> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("สินค้า"),
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
      title: t("จ่ายออก"),
      key: "issued",
      width: 100,
      align: "right",
      render: (_: unknown, line) => `${fmt(line.issuedQty)} ${line.unitCode ?? ""}`,
    },
    {
      title: t("คืนสะสม"),
      key: "returned",
      width: 100,
      align: "right",
      render: (_: unknown, line) => fmt(line.returnedQty),
    },
    ...(fromReturn
      ? [
          {
            title: t("ตีกลับตอนส่ง"),
            key: "deliveryReturned",
            width: 110,
            align: "right" as const,
            render: (_: unknown, line: ReturnSourceLine) =>
              line.deliveryReturnedQty != null ? fmt(line.deliveryReturnedQty) : "—",
          },
        ]
      : []),
    {
      title: t("คืนได้"),
      key: "max",
      width: 100,
      align: "right",
      render: (_: unknown, line) => <strong>{fmt(line.maxReturnQty)}</strong>,
    },
    {
      title: t("คืนครั้งนี้"),
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
    if (!source || !canCreate || formErrors.length || eligibilityErrors.length) {
      return;
    }
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
  const showReturnLines =
    Boolean(pickingId) && prefilledDoEligible && !prefilledIneligibleReason;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Return Note"
        icon={<RollbackOutlined />}
        title={t("สร้างใบคืนสินค้า")}
        subtitle={prefilled ? t("ดึงข้อมูลจากใบส่งสินค้าที่ถูกตีกลับ — ตรวจจำนวนแล้วบันทึก") : t("เลือกใบสั่งขาย → ใบเบิกสินค้า แล้วระบุจำนวนที่คืน")}
        actions={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/return-notes")}>
            {t("กลับ")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("เอกสารอ้างอิง")}</h2>
            </div>

            {prefilled ? (
              deliveryOrderQuery.isLoading ? (
                <Spin />
              ) : !fromDeliveryOrder ? (
                <Alert type="error" showIcon title={t("ไม่พบใบส่งสินค้าที่อ้างอิง")} />
              ) : (
                <>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t("ใบส่งสินค้า")}</span>
                      <div className={styles.metaValue}>
                        <Link href={`/delivery-orders/${fromDeliveryOrder.id}`}>
                          {fromDeliveryOrder.deliveryOrderNo ?? "—"}
                        </Link>
                        {fromDeliveryOrder.deliveryResult ? (
                          <Tag
                            style={{ marginLeft: 8 }}
                            color={
                              DELIVERY_RESULT_COLOR[
                                fromDeliveryOrder.deliveryResult as DeliveryResult
                              ]
                            }
                          >
                            {t(
                              DELIVERY_RESULT_LABEL[
                                fromDeliveryOrder.deliveryResult as DeliveryResult
                              ] ?? fromDeliveryOrder.deliveryResult,
                            )}
                          </Tag>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {prefilledIneligibleReason ? (
                    <Alert
                      type="error"
                      showIcon
                      style={{ marginTop: 12 }}
                      title={prefilledIneligibleReason}
                    />
                  ) : multiPicking ? (
                    <div className={styles.metaGrid} style={{ marginTop: 12 }}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>
                          {t("ใบเบิกสินค้า (ใบส่ง {doNo} รวม {n} ใบเบิก)", {
                            doNo: fromDeliveryOrder.deliveryOrderNo ?? "",
                            n: doPickings.length,
                          })}
                        </span>
                        <Select
                          style={{ width: "100%" }}
                          placeholder={t("เลือกใบเบิกสินค้าที่จะคืน")}
                          value={pickingId}
                          onChange={(value: string) => {
                            setPrefilledPickingId(value);
                            resetLines();
                          }}
                          options={doPickings.map((ref) => ({
                            value: ref.pickingId,
                            label: `${ref.pickingNo ?? ref.pickingId}${
                              ref.packingNo ? ` · ${ref.packingNo}` : ""
                            }${ref.roundNo ? t(" · รอบที่ {roundNo}", { roundNo: ref.roundNo }) : ""}`,
                          }))}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )
            ) : (
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ใบสั่งขาย")}</span>
                  <Select
                    showSearch
                    allowClear
                    style={{ width: "100%" }}
                    placeholder={t("ค้นหาเลขที่ SO / ลูกค้า")}
                    filterOption={false}
                    onSearch={setSoKeyword}
                    loading={salesOrdersQuery.isFetching}
                    value={salesOrderId}
                    onChange={(value?: string) => {
                      if (!value) {
                        setSalesOrderId(undefined);
                        setSelectedSoOption(null);
                      } else {
                        const fromList = soOptions.find(
                          (row) => row.value === value,
                        );
                        setSalesOrderId(value);
                        setSelectedSoOption(
                          fromList ??
                            (selectedSoOption?.value === value
                              ? selectedSoOption
                              : { value, label: value }),
                        );
                      }
                      setPickedPickingId(undefined);
                      setPickedDeliveryOrderId(undefined);
                      setSelectedPickingOption(null);
                      resetLines();
                    }}
                    options={soOptions}
                    notFoundContent={t(
                      "ไม่พบ SO ที่มีใบส่งตีกลับและเลือกนำเข้าคลัง",
                    )}
                  />
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ใบเบิกสินค้า")}</span>
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    placeholder={salesOrderId ? t("เลือกใบเบิกสินค้า") : t("เลือก SO ก่อน")}
                    disabled={!salesOrderId}
                    loading={pickingsQuery.isFetching}
                    value={pickedPickingId}
                    onChange={(value?: string) => {
                      if (!value) {
                        setPickedPickingId(undefined);
                        setPickedDeliveryOrderId(undefined);
                        setSelectedPickingOption(null);
                      } else {
                        const picking = pickingOptions.byId.get(value);
                        const fromList = pickingOptions.options.find(
                          (row) => row.value === value,
                        );
                        setPickedPickingId(value);
                        setPickedDeliveryOrderId(picking?.deliveryOrderId);
                        setSelectedPickingOption(
                          fromList ??
                            (selectedPickingOption?.value === value
                              ? selectedPickingOption
                              : { value, label: picking?.pickingNo ?? value }),
                        );
                      }
                      resetLines();
                    }}
                    options={pickingOptions.options}
                    notFoundContent={t(
                      "ไม่พบบิลส่งที่ตีกลับและเลือกนำเข้าคลังของ SO นี้",
                    )}
                  />
                </div>
              </div>
            )}

            {source && prefilledDoEligible ? (
              <div className={styles.metaGrid} style={{ marginTop: 12 }}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ใบสั่งขาย")}</span>
                  <div className={styles.metaValue}>
                    {source.salesOrderNo ?? "—"}
                    {source.roundNo ? t(" · รอบที่ {roundNo}", { roundNo: source.roundNo }) : ""}
                  </div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ลูกค้า")}</span>
                  <div className={styles.metaValue}>{source.customerName ?? "—"}</div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ใบเบิกสินค้า")}</span>
                  <div className={styles.metaValue}>{source.pickingNo}</div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("ใบส่งสินค้า")}</span>
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
                        {t(DELIVERY_RESULT_LABEL[source.deliveryResult as DeliveryResult] ??
                          source.deliveryResult)}
                      </Tag>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {showReturnLines ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("รายการคืน")}</h2>
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
                  locale={{ emptyText: t("ใบเบิกนี้ไม่มีรายการที่จ่ายออก") }}
                />
              )}
            </div>
          ) : null}

          {source && isStockReturnDelivery(source) ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("เหตุผลการคืน")}</h2>
              </div>
              <Input.TextArea
                rows={3}
                value={reason}
                status={submitted && !reason.trim() ? "error" : undefined}
                placeholder={t("เช่น ลูกค้าตีกลับ สินค้าเสียหาย")}
                onChange={(e) => setReasonInput(e.target.value)}
              />
              <Input.TextArea
                rows={2}
                style={{ marginTop: 8 }}
                value={remark}
                placeholder={t("หมายเหตุ (ถ้ามี)")}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สรุป")}</p>
            <h2 className={styles.sideTitle}>{t("ใบคืนสินค้าใหม่")}</h2>
          </div>
          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("รายการที่คืน")}</span>
              <strong>
                {(source?.lines ?? []).filter((l) => (qtyOf(l) ?? 0) > EPS).length}
              </strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("จำนวนคืนรวม")}</span>
              <strong>{fmt(totalQty)}</strong>
            </div>
          </div>
          <p className={styles.sideNote}>
            {t("บันทึกแล้วสถานะเป็น “รอคลังอนุมัติ” ยังไม่แตะสต๊อก — คลังอนุมัติจึงรับเข้าคลังตรวจสอบ")}
          </p>
          {eligibilityErrors.length ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title={eligibilityErrors[0]}
              description={
                eligibilityErrors.length > 1 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {eligibilityErrors.slice(1).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : undefined
              }
            />
          ) : null}
          {submitted && formErrors.length ? (
            <Alert
              type="error"
              showIcon
              title={t("ตรวจข้อมูลก่อนบันทึก")}
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {formErrors.map((e) => (
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
              disabled={!canCreate}
              loading={createMutation.isPending}
              onClick={onSubmit}
            >
              {t("บันทึกใบคืนสินค้า")}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
