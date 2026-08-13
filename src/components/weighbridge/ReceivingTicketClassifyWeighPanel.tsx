"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  App,
  Button,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
} from "antd";
import {
  CheckOutlined,
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { useRawTirePaymentQuery } from "@/hooks/raw-tire-payment/useRawTirePaymentQuery";
import { useRawTirePriceRulesQuery } from "@/hooks/raw-tire-price-rules/useRawTirePriceRulesQuery";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import {
  useCompleteWeighAndReceiptMutation,
  useSaveClassificationPlanMutation,
} from "@/hooks/weighbridge-tickets/useWeighTicketMutations";
import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";
import { DEDUCTION_TYPE_OPTIONS } from "@/types/raw-tire-classification";
import type { RawTirePriceRule } from "@/types/raw-tire-price-rules";
import type { WeighbridgeTicketDetail } from "@/types/weighbridge-tickets";
import { createClientId } from "@/utils/createClientId";

import styles from "./WeighbridgeDashboardPage.module.css";

type PlanItemRow = {
  key: string;
  tireClassificationId: string;
  description?: string;
  weightKg?: number;
};

type PlanDeductionRow = {
  key: string;
  deductionType: string;
  description?: string;
  deductionWeightKg?: number;
  deductionPricePerKg?: number;
  deductionAmount?: number;
};

type Props = {
  ticket: WeighbridgeTicketDetail;
  currentStep: number;
};

function toEffectiveDate(value?: string) {
  const source = value ? new Date(value) : new Date();
  const date = Number.isNaN(source.getTime()) ? new Date() : source;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ERP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPrice(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function latestPriceByClassification(rules: RawTirePriceRule[]) {
  const map = new Map<string, RawTirePriceRule>();
  for (const rule of rules) {
    const current = map.get(rule.tireClassificationId);
    if (!current || rule.effectiveFrom >= current.effectiveFrom) {
      map.set(rule.tireClassificationId, rule);
    }
  }
  return map;
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function blockNonNumericWeightKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);
  if (allowedKeys.has(event.key)) {
    return;
  }
  if (!/^[0-9.]$/.test(event.key)) {
    event.preventDefault();
  }
}

function createItemRow(partial?: Partial<PlanItemRow>): PlanItemRow {
  return {
    key: partial?.key ?? createClientId(),
    tireClassificationId: partial?.tireClassificationId ?? "",
    description: partial?.description,
    weightKg: partial?.weightKg,
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function withDeductionAmount(
  row: PlanDeductionRow,
  patch: Partial<PlanDeductionRow>,
): PlanDeductionRow {
  const next = { ...row, ...patch };
  const weight = Number(next.deductionWeightKg);
  const price = Number(next.deductionPricePerKg);
  if (
    weight > 0 &&
    next.deductionPricePerKg !== undefined &&
    Number.isFinite(price) &&
    price >= 0
  ) {
    next.deductionAmount = roundMoney(weight * price);
  }
  return next;
}

function createDeductionRow(
  partial?: Partial<PlanDeductionRow>,
): PlanDeductionRow {
  return {
    key: partial?.key ?? createClientId(),
    deductionType: partial?.deductionType ?? "WATER",
    description: partial?.description,
    deductionWeightKg: partial?.deductionWeightKg,
    deductionPricePerKg: partial?.deductionPricePerKg,
    deductionAmount: partial?.deductionAmount,
  };
}

export default function ReceivingTicketClassifyWeighPanel({
  ticket,
  currentStep,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [printingDoc, setPrintingDoc] = useState<
    "ticket" | "receipt" | "payment" | null
  >(null);
  const classificationsQuery = useTireClassificationsQuery({ isActive: true });
  const receiptQuery = useRawTirePurchaseReceiptQuery(ticket.receiptId ?? "");
  const paymentQuery = useRawTirePaymentQuery(ticket.receiptId ?? "");
  const receipt = receiptQuery.data?.data ?? null;
  const paymentContext = paymentQuery.data?.data ?? null;
  const effectiveOn = toEffectiveDate(ticket.createdAt);
  const priceRulesQuery = useRawTirePriceRulesQuery({
    isActive: true,
    effectiveOn,
  });
  const savePlanMutation = useSaveClassificationPlanMutation(ticket.id);
  const completeMutation = useCompleteWeighAndReceiptMutation(ticket.id);

  const [items, setItems] = useState<PlanItemRow[]>([createItemRow()]);
  const [deductions, setDeductions] = useState<PlanDeductionRow[]>([]);
  const [planRemark, setPlanRemark] = useState("");
  const [grossWeightKg, setGrossWeightKg] = useState<number | null>(null);
  const [tareWeightKg, setTareWeightKg] = useState<number | null>(null);
  const [isManual, setIsManual] = useState(true);
  const [reason, setReason] = useState("");

  const receiptConfirmed =
    ticket.receiptStatus === "CONFIRMED" || ticket.receiptStatus === "APPROVED";
  const canSavePlan = Boolean(ticket.canSaveClassificationPlan);
  const canComplete = Boolean(ticket.canCompleteWeighAndReceipt);
  const hasPlan = Boolean(ticket.hasClassificationPlan);

  useEffect(() => {
    const plan = ticket.classificationPlan;
    if (plan?.items?.length) {
      setItems(
        plan.items.map((item) =>
          createItemRow({
            tireClassificationId: item.tireClassificationId,
            description: item.description,
          }),
        ),
      );
    } else {
      setItems([createItemRow()]);
    }
    setDeductions(
      (plan?.deductions ?? []).map((item) =>
        createDeductionRow({
          deductionType: item.deductionType,
          description: item.description,
        }),
      ),
    );
    setPlanRemark(plan?.remark ?? "");
  }, [ticket.id, ticket.classificationPlan]);

  useEffect(() => {
    setGrossWeightKg(
      Number(ticket.grossWeightKg) > 0 ? Number(ticket.grossWeightKg) : null,
    );
    setTareWeightKg(
      Number(ticket.tareWeightKg) > 0 ? Number(ticket.tareWeightKg) : null,
    );
  }, [ticket.id, ticket.grossWeightKg, ticket.tareWeightKg]);

  const netWeightKg = useMemo(() => {
    if (!grossWeightKg || !tareWeightKg) {
      return 0;
    }
    return Math.round((grossWeightKg - tareWeightKg + Number.EPSILON) * 1000) / 1000;
  }, [grossWeightKg, tareWeightKg]);

  useEffect(() => {
    if (items.length !== 1 || netWeightKg <= 0) {
      return;
    }
    setItems((prev) => {
      const [first] = prev;
      if (!first || (first.weightKg ?? 0) > 0) {
        return prev;
      }
      return [{ ...first, weightKg: netWeightKg }];
    });
  }, [items.length, netWeightKg]);

  const classifications = classificationsQuery.data?.data ?? [];
  const priceByClassificationId = useMemo(
    () => latestPriceByClassification(priceRulesQuery.data?.data ?? []),
    [priceRulesQuery.data?.data],
  );
  const selectedTypeCount = items.filter(
    (item) => item.tireClassificationId,
  ).length;
  const selectedDeductions = useMemo(
    () => new Set(deductions.map((item) => item.deductionType)),
    [deductions],
  );
  const classificationLabelById = useMemo(() => {
    return new Map(
      classifications.map((row) => [
        row.id,
        {
          code: row.classificationCode,
          name: row.classificationName,
          description: row.description,
        },
      ]),
    );
  }, [classifications]);
  const classificationOptions = classifications.map((row) => {
    const price = priceByClassificationId.get(row.id);
    const priceText = price
      ? `${formatPrice(price.pricePerKg)} บาท/กก.`
      : "ยังไม่มีราคา";
    return {
      value: row.id,
      label: `${row.classificationCode} · ${row.classificationName} · ${priceText}`,
    };
  });
  const estimatedAvgPricePerKg = useMemo(() => {
    let weight = 0;
    let amount = 0;
    for (const item of items) {
      const kg = Number(item.weightKg);
      if (!item.tireClassificationId || !(kg > 0)) {
        continue;
      }
      const price = Number(
        priceByClassificationId.get(item.tireClassificationId)?.pricePerKg,
      );
      if (!(price >= 0) || Number.isNaN(price)) {
        continue;
      }
      weight += kg;
      amount += kg * price;
    }
    return weight > 0 ? amount / weight : 0;
  }, [items, priceByClassificationId]);

  const toggleDeduction = (type: string) => {
    if (!canSavePlan) {
      return;
    }
    setDeductions((prev) => {
      const existing = prev.find((row) => row.deductionType === type);
      if (existing) {
        return prev.filter((row) => row.key !== existing.key);
      }
      return [...prev, createDeductionRow({ deductionType: type })];
    });
  };

  const handleSavePlan = () => {
    const nextItems = items.filter((item) => item.tireClassificationId);
    if (!nextItems.length) {
      return;
    }
    void savePlanMutation.mutateAsync({
      items: nextItems.map((item) => ({
        tireClassificationId: item.tireClassificationId,
        description: item.description?.trim() || undefined,
      })),
      deductions: deductions
        .filter((item) => item.deductionType)
        .map((item) => ({
          deductionType: item.deductionType,
          description: item.description?.trim() || undefined,
        })),
      remark: planRemark.trim() || undefined,
    });
  };

  const handleComplete = () => {
    if (!grossWeightKg || !tareWeightKg) {
      return;
    }
    const nextItems = items
      .filter((item) => item.tireClassificationId && Number(item.weightKg) > 0)
      .map((item) => ({
        tireClassificationId: item.tireClassificationId,
        weightKg: Number(item.weightKg),
        description: item.description?.trim() || undefined,
      }));
    if (!nextItems.length) {
      return;
    }
    void completeMutation.mutateAsync({
      grossWeightKg,
      tareWeightKg,
      isManual,
      reason: reason.trim() || undefined,
      items: nextItems,
      deductions: deductions
        .filter(
          (item) =>
            item.deductionType &&
            (Number(item.deductionWeightKg) > 0 ||
              item.deductionPricePerKg !== undefined ||
              item.deductionAmount !== undefined),
        )
        .map((item) => ({
          deductionType: item.deductionType,
          deductionWeightKg: Number(item.deductionWeightKg) || 0,
          deductionPricePerKg:
            item.deductionPricePerKg === undefined
              ? undefined
              : Number(item.deductionPricePerKg),
          deductionAmount:
            item.deductionAmount === undefined
              ? undefined
              : Number(item.deductionAmount),
          description: item.description?.trim() || undefined,
        })),
      remark: planRemark.trim() || undefined,
    });
  };

  const handlePrintTicket = async () => {
    if (!ticket.weighOutAt) {
      message.warning("พิมพ์ตั๋วชั่งได้หลังบันทึกน้ำหนักครบแล้ว");
      return;
    }
    setPrintingDoc("ticket");
    try {
      const { generateWeighbridgeTicketPdf, mapWeighbridgeTicketToPdfData } =
        await import("@/utils/generateWeighbridgeTicketPdf");
      await generateWeighbridgeTicketPdf(
        mapWeighbridgeTicketToPdfData({
          ticket,
          receipt,
          isPaid: paymentContext?.receipt.paymentStatus === "PAID",
        }),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "พิมพ์ตั๋วชั่งไม่สำเร็จ",
      );
    } finally {
      setPrintingDoc(null);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receipt) {
      message.warning("ยังไม่มีใบรับซื้อให้พิมพ์");
      return;
    }
    setPrintingDoc("receipt");
    try {
      const { generateRawTirePurchaseReceiptPdf, mapReceiptDetailToPdfData } =
        await import("@/utils/generateRawTirePurchaseReceiptPdf");
      await generateRawTirePurchaseReceiptPdf(
        mapReceiptDetailToPdfData(receipt),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "พิมพ์ใบรับซื้อไม่สำเร็จ",
      );
    } finally {
      setPrintingDoc(null);
    }
  };

  const handlePrintPayment = async () => {
    if (!paymentContext?.voucher) {
      message.warning("ยังไม่มีใบสำคัญจ่าย ให้กดออกใบจ่ายเงินก่อน");
      return;
    }
    setPrintingDoc("payment");
    try {
      const { generateRawTirePaymentVoucherPdf, mapPaymentContextToPdfData } =
        await import("@/utils/generateRawTirePaymentVoucherPdf");
      await generateRawTirePaymentVoucherPdf(
        mapPaymentContextToPdfData(paymentContext),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "พิมพ์ใบสำคัญจ่ายไม่สำเร็จ",
      );
    } finally {
      setPrintingDoc(null);
    }
  };

  return (
    <>
      <div
        className={[
          styles.stepCard,
          currentStep === 0 ? styles.stepCardActive : "",
          hasPlan ? styles.stepCardDone : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.stepCardHeader}>
          <div className={styles.stepCardHeaderMain}>
            <div
              className={[
                styles.stepBadge,
                currentStep === 0 ? styles.stepBadgeActive : "",
                hasPlan ? styles.stepBadgeDone : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              1
            </div>
            <div className={styles.stepCardTitle}>
              <h3>Step 1 · คัดแยกรายการและสารปนเปื้อน</h3>
              <p>เลือกประเภทยางด้านซ้าย (มีราคา/กก.) แล้วเลือกสารปนเปื้อนด้านขวาแยกต่างหาก</p>
            </div>
          </div>
          <Tag
            className={styles.stepStatusTag}
            color={hasPlan ? "success" : currentStep === 0 ? "processing" : "default"}
          >
            {hasPlan
              ? `เลือกแล้ว ${selectedTypeCount} ประเภท`
              : "รอเลือกประเภทยาง"}
          </Tag>
        </div>
        <div className={styles.stepCardBody}>
          <div className={styles.classifyLayout}>
            <div className={styles.classifySplit}>
              <section className={`${styles.classifyPanel} ${styles.classifyPanelTire}`}>
                <div className={styles.classifyPanelHead}>
                  <div>
                    <p className={styles.classifyEyebrow}>สินค้าที่รับซื้อ</p>
                    <h4>ประเภทยาง</h4>
                    <p>เลือกจากรายการราคาที่มีผลวันนี้ — น้ำหนักกก. กรอกในขั้นถัดไป</p>
                  </div>
                  <span
                    className={`${styles.classifyCount} ${
                      selectedTypeCount ? "" : styles.classifyCountMuted
                    }`}
                  >
                    {selectedTypeCount} รายการ
                  </span>
                </div>

                <div className={styles.classifyTypeList}>
                  {items.map((item, index) => {
                    const meta = classificationLabelById.get(
                      item.tireClassificationId,
                    );
                    const priceRule = item.tireClassificationId
                      ? priceByClassificationId.get(item.tireClassificationId)
                      : undefined;
                    return (
                      <div key={item.key} className={styles.classifyTypeRow}>
                        <div className={styles.classifyTypeRowTop}>
                          <span className={styles.classifyTypeIndex}>
                            {index + 1}
                          </span>
                          <Select
                            aria-label={`ประเภทยาง ${index + 1}`}
                            value={item.tireClassificationId || undefined}
                            options={classificationOptions}
                            placeholder="เลือกประเภทยาง"
                            disabled={!canSavePlan}
                            showSearch
                            optionFilterProp="label"
                            popupMatchSelectWidth
                            onChange={(value) =>
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.key === item.key
                                    ? { ...row, tireClassificationId: value }
                                    : row,
                                ),
                              )
                            }
                          />
                          {canSavePlan && items.length > 1 ? (
                            <Button
                              type="text"
                              danger
                              aria-label={`ลบประเภทยาง ${index + 1}`}
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setItems((prev) =>
                                  prev.filter((row) => row.key !== item.key),
                                )
                              }
                            />
                          ) : null}
                        </div>

                        {item.tireClassificationId ? (
                          <div
                            className={`${styles.classifyTypeDetail} ${
                              priceRule ? "" : styles.classifyTypeMissing
                            }`}
                          >
                            {priceRule ? (
                              <>
                                <span>ราคาซื้อวันนี้</span>
                                <strong>
                                  {formatPrice(priceRule.pricePerKg)} บาท/กก.
                                </strong>
                              </>
                            ) : (
                              <strong>ยังไม่มีราคาที่มีผลวันนี้</strong>
                            )}
                            <p>
                              {meta
                                ? `${meta.code} · ${meta.name}`
                                : "ประเภทยางที่เลือก"}
                              {meta?.description
                                ? ` — ${meta.description}`
                                : ""}
                            </p>
                          </div>
                        ) : null}

                        <Input
                          aria-label={`หมายเหตุรายการยาง ${index + 1}`}
                          placeholder="หมายเหตุรายการ (ไม่บังคับ)"
                          value={item.description ?? ""}
                          disabled={!canSavePlan}
                          onChange={(event) =>
                            setItems((prev) =>
                              prev.map((row) =>
                                row.key === item.key
                                  ? { ...row, description: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {canSavePlan ? (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() =>
                      setItems((prev) => [...prev, createItemRow()])
                    }
                  >
                    เพิ่มประเภทยาง
                  </Button>
                ) : null}
              </section>

              <section className={`${styles.classifyPanel} ${styles.classifyPanelContam}`}>
                <div className={styles.classifyPanelHead}>
                  <div>
                    <p className={styles.classifyEyebrow}>รายการหัก</p>
                    <h4>สารปนเปื้อน</h4>
                    <p>
                      เลือกประเภทที่มีบนรถ เช่น น้ำ ดิน โลหะ — ขั้นถัดไปกรอกน้ำหนัก ราคาหัก
                      (บาท/กก.) และยอดเงินได้
                    </p>
                  </div>
                  <span
                    className={`${styles.classifyCount} ${
                      selectedDeductions.size ? "" : styles.classifyCountMuted
                    }`}
                  >
                    {selectedDeductions.size
                      ? `${selectedDeductions.size} รายการ`
                      : "ไม่มี"}
                  </span>
                </div>

                <div className={styles.classifyChips} role="group" aria-label="สารปนเปื้อน">
                  {DEDUCTION_TYPE_OPTIONS.map((option) => {
                    const active = selectedDeductions.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.classifyChip} ${
                          active ? styles.classifyChipActive : ""
                        }`}
                        disabled={!canSavePlan}
                        aria-pressed={active}
                        onClick={() => toggleDeduction(option.value)}
                      >
                        {active ? <CheckOutlined /> : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {deductions
                  .filter((item) => item.deductionType === "OTHER")
                  .map((item) => (
                    <Input
                      key={item.key}
                      aria-label="รายละเอียดรายการหักอื่นๆ"
                      placeholder="ระบุรายการหักอื่นๆ (จำเป็น)"
                      value={item.description ?? ""}
                      disabled={!canSavePlan}
                      onChange={(event) =>
                        setDeductions((prev) =>
                          prev.map((row) =>
                            row.key === item.key
                              ? { ...row, description: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  ))}
                {!selectedDeductions.size ? (
                  <div className={styles.classifyEmpty}>
                    ไม่มีสารปนเปื้อนก็ข้ามได้
                  </div>
                ) : null}
              </section>
            </div>

            <Input.TextArea
              aria-label="หมายเหตุแผนคัดแยก"
              rows={2}
              value={planRemark}
              disabled={!canSavePlan}
              placeholder="หมายเหตุตั๋ว (ไม่บังคับ)"
              onChange={(event) => setPlanRemark(event.target.value)}
            />

            {canSavePlan ? (
              <div className={styles.classifyFooter}>
                <Button
                  type="primary"
                  className={styles.submitButton}
                  loading={savePlanMutation.isPending}
                  disabled={
                    !items.some((item) => item.tireClassificationId) ||
                    deductions.some(
                      (item) =>
                        item.deductionType === "OTHER" &&
                        !item.description?.trim(),
                    )
                  }
                  onClick={handleSavePlan}
                >
                  บันทึกการคัดแยก
                </Button>
              </div>
            ) : (
              <div className={styles.stepEmptyHint}>
                ยืนยันใบรับซื้อแล้ว ไม่สามารถแก้รายการคัดแยกได้
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={[
          styles.stepCard,
          currentStep === 1 ? styles.stepCardActive : "",
          receiptConfirmed ? styles.stepCardDone : "",
          !hasPlan ? styles.stepCardLocked : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.stepCardHeader}>
          <div className={styles.stepCardHeaderMain}>
            <div
              className={[
                styles.stepBadge,
                currentStep === 1 ? styles.stepBadgeActive : "",
                receiptConfirmed ? styles.stepBadgeDone : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              2
            </div>
            <div className={styles.stepCardTitle}>
              <h3>Step 2 · น้ำหนักเข้า-ออก</h3>
              <p>กรอกน้ำหนักตามใบชั่ง และใส่น้ำหนักกก. ของรายการที่เลือกไว้</p>
            </div>
          </div>
          <Tag
            className={styles.stepStatusTag}
            color={
              receiptConfirmed
                ? "success"
                : hasPlan
                  ? "processing"
                  : "default"
            }
          >
            {receiptConfirmed
              ? "ยืนยันใบรับซื้อแล้ว"
              : hasPlan
                ? "พร้อมกรอกน้ำหนัก"
                : "รอคัดแยกก่อน"}
          </Tag>
        </div>
        <div className={styles.stepCardBody}>
          {!hasPlan ? (
            <div className={styles.stepEmptyHint}>
              บันทึกประเภทยางใน Step 1 ก่อน แล้วค่อยกรอกน้ำหนักเข้า-ออก
            </div>
          ) : receiptConfirmed ? (
            <>
              <div className={styles.stepMetaGrid}>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักเข้า</span>
                  <strong>{formatWeight(ticket.grossWeightKg)} กก.</strong>
                </div>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักออก</span>
                  <strong>{formatWeight(ticket.tareWeightKg)} กก.</strong>
                </div>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักสุทธิ</span>
                  <strong>{formatWeight(ticket.netWeightKg)} กก.</strong>
                </div>
              </div>

              <div className={styles.classifyDocGrid}>
                <div className={styles.classifyDocCard}>
                  <p className={styles.classifyEyebrow}>เอกสาร 1</p>
                  <h4>ตั๋วชั่ง</h4>
                  <p>{ticket.ticketNo}</p>
                  <div className={styles.classifyDocActions}>
                    <Button
                      type="primary"
                      icon={<PrinterOutlined />}
                      loading={printingDoc === "ticket"}
                      disabled={!ticket.weighOutAt}
                      onClick={() => void handlePrintTicket()}
                    >
                      พิมพ์
                    </Button>
                  </div>
                </div>
                <div className={styles.classifyDocCard}>
                  <p className={styles.classifyEyebrow}>เอกสาร 2</p>
                  <h4>ใบรับซื้อ</h4>
                  <p>{ticket.receiptNo || receipt?.receiptNo || "รอโหลดเลขที่"}</p>
                  <div className={styles.classifyDocActions}>
                    <Button
                      type="primary"
                      icon={<PrinterOutlined />}
                      loading={printingDoc === "receipt" || receiptQuery.isLoading}
                      disabled={!receipt}
                      onClick={() => void handlePrintReceipt()}
                    >
                      พิมพ์
                    </Button>
                    {ticket.receiptId ? (
                      <Button
                        onClick={() =>
                          router.push(`/receiving/receipts/${ticket.receiptId}`)
                        }
                      >
                        เปิด
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className={styles.classifyDocCard}>
                  <p className={styles.classifyEyebrow}>เอกสาร 3</p>
                  <h4>ใบสำคัญจ่าย</h4>
                  <p>
                    {paymentContext?.voucher?.voucherNo ||
                      "ยังไม่ออก — จ่ายเงินแล้วจึงพิมพ์ได้"}
                  </p>
                  <div className={styles.classifyDocActions}>
                    {paymentContext?.voucher ? (
                      <Button
                        type="primary"
                        icon={<PrinterOutlined />}
                        loading={printingDoc === "payment"}
                        onClick={() => void handlePrintPayment()}
                      >
                        พิมพ์
                      </Button>
                    ) : null}
                    {ticket.receiptId ? (
                      <Button
                        type={paymentContext?.voucher ? "default" : "primary"}
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/payment`,
                          )
                        }
                      >
                        {paymentContext?.voucher
                          ? "เปิด"
                          : "ออกใบสำคัญจ่าย"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.stepMetaGrid}>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักเข้า (กก.)</span>
                  <InputNumber
                    aria-label="น้ำหนักเข้า"
                    min={0.001}
                    step={0.001}
                    className={styles.stepMetaInput}
                    value={grossWeightKg ?? undefined}
                    onKeyDown={blockNonNumericWeightKey}
                    onChange={(value) =>
                      setGrossWeightKg(typeof value === "number" ? value : null)
                    }
                  />
                </div>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักออก (กก.)</span>
                  <InputNumber
                    aria-label="น้ำหนักออก"
                    min={0.001}
                    step={0.001}
                    className={styles.stepMetaInput}
                    value={tareWeightKg ?? undefined}
                    onKeyDown={blockNonNumericWeightKey}
                    onChange={(value) =>
                      setTareWeightKg(typeof value === "number" ? value : null)
                    }
                  />
                </div>
                <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                  <span>น้ำหนักสุทธิ</span>
                  <strong>
                    {netWeightKg > 0 ? `${formatWeight(netWeightKg)} กก.` : "-"}
                  </strong>
                </div>
                <div className={styles.stepMetaItem}>
                  <span>กรอกน้ำหนักเอง</span>
                  <Switch
                    checked={isManual}
                    checkedChildren="ใช่"
                    unCheckedChildren="ไม่"
                    onChange={setIsManual}
                  />
                </div>
                {isManual ? (
                  <div className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}>
                    <span>เหตุผลการกรอกเอง</span>
                    <Input.TextArea
                      aria-label="เหตุผลการกรอกน้ำหนักเอง"
                      rows={2}
                      value={reason}
                      placeholder="เช่น อ่านจากใบชั่ง (ไม่บังคับ)"
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {items
                .filter((item) => item.tireClassificationId)
                .map((item, index) => {
                  const meta = classificationLabelById.get(
                    item.tireClassificationId,
                  );
                  return (
                  <div key={item.key} className={styles.stepMetaGrid}>
                    <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                      <span>
                        น้ำหนัก {meta?.name ?? `รายการ ${index + 1}`} (กก.)
                      </span>
                      <InputNumber
                        aria-label={`น้ำหนักรายการยาง ${index + 1}`}
                        min={0.001}
                        step={0.001}
                        className={styles.stepMetaInput}
                        value={item.weightKg}
                        onKeyDown={blockNonNumericWeightKey}
                        onChange={(value) =>
                          setItems((prev) =>
                            prev.map((row) =>
                              row.key === item.key
                                ? {
                                    ...row,
                                    weightKg:
                                      typeof value === "number"
                                        ? value
                                        : undefined,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                  );
                })}

              {deductions.map((item, index) => {
                const deductionLabel =
                  DEDUCTION_TYPE_OPTIONS.find(
                    (option) => option.value === item.deductionType,
                  )?.label ?? `รายการหัก ${index + 1}`;
                const estimatedFromAvg =
                  item.deductionAmount === undefined &&
                  item.deductionPricePerKg === undefined &&
                  Number(item.deductionWeightKg) > 0 &&
                  estimatedAvgPricePerKg > 0
                    ? Number(item.deductionWeightKg) * estimatedAvgPricePerKg
                    : undefined;
                return (
                <div key={item.key} className={styles.classifyDeductionGrid}>
                  <div className={styles.stepMetaItem}>
                    <span>น้ำหนักหัก {deductionLabel} (กก.)</span>
                    <InputNumber
                      aria-label={`น้ำหนักหัก ${deductionLabel}`}
                      min={0}
                      step={0.001}
                      className={styles.stepMetaInput}
                      value={item.deductionWeightKg}
                      onKeyDown={blockNonNumericWeightKey}
                      onChange={(value) =>
                        setDeductions((prev) =>
                          prev.map((row) =>
                            row.key === item.key
                              ? withDeductionAmount(row, {
                                  deductionWeightKg:
                                    typeof value === "number"
                                      ? value
                                      : undefined,
                                })
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                    <span>ราคาหัก {deductionLabel} (บาท/กก.)</span>
                    <InputNumber
                      aria-label={`ราคาหัก ${deductionLabel}`}
                      min={0}
                      step={0.01}
                      className={styles.stepMetaInput}
                      value={item.deductionPricePerKg}
                      placeholder="เช่น 2.50"
                      onKeyDown={blockNonNumericWeightKey}
                      onChange={(value) =>
                        setDeductions((prev) =>
                          prev.map((row) =>
                            row.key === item.key
                              ? withDeductionAmount(row, {
                                  deductionPricePerKg:
                                    typeof value === "number"
                                      ? value
                                      : undefined,
                                })
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}>
                    <span>ยอดหัก {deductionLabel} (บาท)</span>
                    <InputNumber
                      aria-label={`ยอดหักเงิน ${deductionLabel}`}
                      min={0}
                      step={0.01}
                      className={styles.stepMetaInput}
                      value={item.deductionAmount}
                      placeholder="คำนวณจากน้ำหนัก × ราคา"
                      onKeyDown={blockNonNumericWeightKey}
                      onChange={(value) =>
                        setDeductions((prev) =>
                          prev.map((row) =>
                            row.key === item.key
                              ? {
                                  ...row,
                                  deductionAmount:
                                    typeof value === "number"
                                      ? value
                                      : undefined,
                                }
                              : row,
                          ),
                        )
                      }
                    />
                    <span>
                      {item.deductionPricePerKg !== undefined &&
                      Number(item.deductionWeightKg) > 0
                        ? `${formatWeight(item.deductionWeightKg)} กก. × ${formatPrice(item.deductionPricePerKg)} บาท = ${formatMoney(item.deductionAmount)} บาท`
                        : estimatedFromAvg !== undefined
                          ? `ยังไม่มีราคาหัก — เว้นว่างจะใช้ราคาเฉลี่ย ≈ ${formatMoney(estimatedFromAvg)} บาท`
                          : "กรอกน้ำหนักกับราคาหัก แล้วระบบจะคิดยอดให้"}
                    </span>
                  </div>
                </div>
                );
              })}

              <div className={styles.weighActions} style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  className={styles.submitButton}
                  loading={completeMutation.isPending}
                  disabled={
                    !canComplete ||
                    !grossWeightKg ||
                    !tareWeightKg ||
                    tareWeightKg >= grossWeightKg ||
                    !items.some(
                      (item) =>
                        item.tireClassificationId && Number(item.weightKg) > 0,
                    )
                  }
                  onClick={handleComplete}
                >
                  บันทึกน้ำหนักและยืนยันใบรับซื้อ
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
