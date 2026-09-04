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
import { useCompleteWeighAndReceiptMutation } from "@/hooks/weighbridge-tickets/useWeighTicketMutations";
import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";
import { DEDUCTION_TYPE_LABELS } from "@/types/raw-tire-purchase-receipt";
import type { RawTirePriceRule } from "@/types/raw-tire-price-rules";
import type { WeighbridgeTicketDetail } from "@/types/weighbridge-tickets";
import { createClientId } from "@/utils/createClientId";

import styles from "./WeighbridgeDashboardPage.module.css";

type PlanItemRow = {
  key: string;
  tireClassificationId: string;
  description?: string;
  weightKg?: number;
  pricePerKg?: number;
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

function formatBaht(value?: number) {
  return Number(value ?? 0).toLocaleString("th-TH", {
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

function round3(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function deductionLineAmount(row: PlanDeductionRow) {
  const lumpSum = Number(row.deductionAmount ?? 0);
  if (lumpSum > 0) {
    return roundMoney(lumpSum);
  }
  const weight = Number(row.deductionWeightKg ?? 0);
  const price = Number(row.deductionPricePerKg ?? 0);
  if (weight <= 0 || price <= 0) {
    return 0;
  }
  return roundMoney(weight * price);
}

function isLumpSumDeduction(row: PlanDeductionRow) {
  return (
    Number(row.deductionAmount ?? 0) > 0 &&
    Number(row.deductionWeightKg ?? 0) <= 0
  );
}

function createItemRow(partial?: Partial<PlanItemRow>): PlanItemRow {
  return {
    key: partial?.key ?? createClientId(),
    tireClassificationId: partial?.tireClassificationId ?? "",
    description: partial?.description,
    weightKg: partial?.weightKg,
    pricePerKg: partial?.pricePerKg,
  };
}

function createDeductionRow(
  partial?: Partial<PlanDeductionRow>,
): PlanDeductionRow {
  return {
    key: partial?.key ?? createClientId(),
    deductionType: partial?.deductionType ?? "OTHER",
    description: partial?.description,
    deductionWeightKg: partial?.deductionWeightKg,
    deductionPricePerKg: partial?.deductionPricePerKg,
    deductionAmount: partial?.deductionAmount,
  };
}

function resolveDeductionName(item: {
  deductionType: string;
  description?: string;
}) {
  const customName = item.description?.trim();
  if (customName) {
    return customName;
  }
  if (item.deductionType && item.deductionType !== "OTHER") {
    return DEDUCTION_TYPE_LABELS[item.deductionType] ?? item.deductionType;
  }
  return "";
}

export default function ReceivingTicketClassifyWeighPanel({
  ticket,
  currentStep,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [printingDoc, setPrintingDoc] = useState<"receipt" | "payment" | null>(
    null,
  );
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
  const completeMutation = useCompleteWeighAndReceiptMutation(ticket.id);

  const [items, setItems] = useState<PlanItemRow[]>([createItemRow()]);
  const [deductions, setDeductions] = useState<PlanDeductionRow[]>([]);
  const [planRemark, setPlanRemark] = useState("");
  const [priceSourceLineNo, setPriceSourceLineNo] = useState<
    number | undefined
  >(undefined);
  const [grossWeightKg, setGrossWeightKg] = useState<number | null>(null);
  const [tareWeightKg, setTareWeightKg] = useState<number | null>(null);
  const [isManual, setIsManual] = useState(true);
  const [reason, setReason] = useState("");

  const receiptConfirmed =
    ticket.receiptStatus === "CONFIRMED" || ticket.receiptStatus === "APPROVED";
  const canComplete = Boolean(ticket.canCompleteWeighAndReceipt);
  const formEditable =
    (Boolean(ticket.canSaveClassificationPlan) || canComplete) &&
    !receiptConfirmed;

  /**
   * hydrate ฟอร์มจากตั๋ว — ปรับ state ตอน render แทน effect
   * effect จะทำให้เห็นฟอร์มเปล่าหนึ่งเฟรมก่อนค่าจะเด้งขึ้นมา และ render ซ้อน
   * ทุกครั้งที่ตั๋วถูก refetch · คีย์รวมเท่ากับ deps เดิมของสอง effect ที่รวมมา
   */
  const hydrateKey = [
    ticket.id,
    ticket.grossWeightKg,
    ticket.tareWeightKg,
  ].join("|");
  const [hydrated, setHydrated] = useState<{
    key: string;
    plan: typeof ticket.classificationPlan;
  } | null>(null);

  if (hydrated?.key !== hydrateKey || hydrated.plan !== ticket.classificationPlan) {
    const plan = ticket.classificationPlan;
    setHydrated({ key: hydrateKey, plan });
    setItems(
      plan?.items?.length
        ? plan.items.map((item) =>
            createItemRow({
              tireClassificationId: item.tireClassificationId,
              description: item.description,
              pricePerKg:
                Number(item.pricePerKg) > 0 ? Number(item.pricePerKg) : undefined,
              weightKg:
                Number(item.weightKg) > 0
                  ? Number(item.weightKg)
                  : plan.items.length === 1 && Number(ticket.netWeightKg) > 0
                    ? Number(ticket.netWeightKg)
                    : undefined,
            }),
          )
        : [createItemRow()],
    );
    setDeductions(
      (plan?.deductions ?? []).map((item) =>
        createDeductionRow({
          deductionType: item.deductionType,
          description: resolveDeductionName(item),
          deductionWeightKg:
            item.deductionWeightKg === undefined
              ? undefined
              : Number(item.deductionWeightKg),
          deductionPricePerKg: item.deductionPricePerKg,
          deductionAmount:
            item.deductionAmount === undefined
              ? undefined
              : Number(item.deductionAmount),
        }),
      ),
    );
    setPlanRemark(plan?.remark ?? "");
    setPriceSourceLineNo(plan?.priceSourceLineNo);
    setGrossWeightKg(
      Number(ticket.grossWeightKg) > 0 ? Number(ticket.grossWeightKg) : null,
    );
    setTareWeightKg(
      Number(ticket.tareWeightKg) > 0 ? Number(ticket.tareWeightKg) : null,
    );
  }

  const netWeightKg = useMemo(() => {
    if (!grossWeightKg || !tareWeightKg) {
      return 0;
    }
    return round3(grossWeightKg - tareWeightKg);
  }, [grossWeightKg, tareWeightKg]);

  const classifications = classificationsQuery.data?.data ?? [];
  const priceByClassificationId = useMemo(
    () => latestPriceByClassification(priceRulesQuery.data?.data ?? []),
    [priceRulesQuery.data?.data],
  );

  useEffect(() => {
    if (items.length <= 1) {
      setPriceSourceLineNo(undefined);
      return;
    }
    if (
      priceSourceLineNo !== undefined &&
      (priceSourceLineNo < 1 || priceSourceLineNo > items.length)
    ) {
      setPriceSourceLineNo(undefined);
    }
  }, [items.length, priceSourceLineNo]);

  useEffect(() => {
    if (priceSourceLineNo === undefined) {
      return;
    }
    const sourceItem = items[priceSourceLineNo - 1];
    if (!sourceItem?.tireClassificationId) {
      setPriceSourceLineNo(undefined);
      return;
    }
    const hasScalePrice = Number(sourceItem.pricePerKg ?? 0) > 0;
    if (
      !hasScalePrice &&
      !priceByClassificationId.has(sourceItem.tireClassificationId)
    ) {
      setPriceSourceLineNo(undefined);
    }
  }, [items, priceByClassificationId, priceSourceLineNo]);

  const selectedTypeCount = items.filter(
    (item) => item.tireClassificationId,
  ).length;
  const totalDeductionWeightKg = useMemo(
    () =>
      round3(
        deductions.reduce(
          (sum, item) => sum + Number(item.deductionWeightKg ?? 0),
          0,
        ),
      ),
    [deductions],
  );
  const totalDeductionAmount = useMemo(
    () =>
      roundMoney(
        deductions.reduce((sum, item) => sum + deductionLineAmount(item), 0),
      ),
    [deductions],
  );
  const allocatedTireWeightKg = useMemo(
    () =>
      round3(
        items
          .filter((item) => item.tireClassificationId)
          .reduce((sum, item) => sum + Number(item.weightKg ?? 0), 0),
      ),
    [items],
  );
  const remainingTireWeightKg = useMemo(() => {
    if (netWeightKg <= 0) {
      return 0;
    }
    return round3(netWeightKg - allocatedTireWeightKg);
  }, [allocatedTireWeightKg, netWeightKg]);
  const isTireWeightOver =
    netWeightKg > 0 && allocatedTireWeightKg - netWeightKg > 0.0005;
  const isDeductionWeightOver =
    allocatedTireWeightKg > 0 &&
    totalDeductionWeightKg - allocatedTireWeightKg > 0.0005;
  const tireWeightFillPercent =
    netWeightKg > 0
      ? Math.min(100, Math.round((allocatedTireWeightKg / netWeightKg) * 100))
      : 0;
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
  const selectedClassificationIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.tireClassificationId)
          .filter((id): id is string => Boolean(id)),
      ),
    [items],
  );
  const classificationOptionsForRow = (currentId: string) =>
    classificationOptions.map((option) => ({
      ...option,
      disabled:
        option.value !== currentId &&
        selectedClassificationIds.has(option.value),
    }));

  const rowHasPricable = (item: PlanItemRow) => {
    if (!item.tireClassificationId) {
      return false;
    }
    return (
      Number(item.pricePerKg ?? 0) > 0 ||
      priceByClassificationId.has(item.tireClassificationId)
    );
  };

  const priceSourceOptions = useMemo(() => {
    const options: Array<{ value: number | "OWN"; label: string; disabled?: boolean }> =
      [
        {
          value: "OWN",
          label: "ราคาของใครของมัน (แยกตามประเภท)",
        },
      ];
    items.forEach((item, index) => {
      const lineNo = index + 1;
      options.push({
        value: lineNo,
        label: `ราคาของรายการที่ ${lineNo} ทั้งชุด`,
        disabled: !rowHasPricable(item),
      });
    });
    return options;
  }, [items, priceByClassificationId]);

  const resolveRowPrice = (item?: PlanItemRow): { pricePerKg: number; source: "scale" | "rule" } | undefined => {
    if (!item) {
      return undefined;
    }
    const scalePrice = Number(item.pricePerKg ?? 0);
    if (scalePrice > 0) {
      return { pricePerKg: scalePrice, source: "scale" };
    }
    if (!item.tireClassificationId) {
      return undefined;
    }
    const rule = priceByClassificationId.get(item.tireClassificationId);
    if (!rule) {
      return undefined;
    }
    return { pricePerKg: Number(rule.pricePerKg), source: "rule" };
  };

  const sharedEffectivePrice = useMemo(() => {
    if (priceSourceLineNo === undefined) {
      return undefined;
    }
    return resolveRowPrice(items[priceSourceLineNo - 1]);
  }, [items, priceByClassificationId, priceSourceLineNo]);

  const resolveEffectivePrice = (lineIndex: number) => {
    if (priceSourceLineNo !== undefined) {
      return sharedEffectivePrice;
    }
    return resolveRowPrice(items[lineIndex]);
  };

  const tireLineAmount = (lineIndex: number, weightKg?: number) => {
    const price = resolveEffectivePrice(lineIndex);
    const weight = Number(weightKg ?? 0);
    if (!price || weight <= 0) {
      return 0;
    }
    return roundMoney(weight * price.pricePerKg);
  };

  const totalTireAmount = roundMoney(
    items.reduce(
      (sum, item, index) => sum + tireLineAmount(index, item.weightKg),
      0,
    ),
  );

  const maxWeightForItem = (currentWeight?: number) => {
    if (netWeightKg <= 0) {
      return undefined;
    }
    const others = round3(allocatedTireWeightKg - Number(currentWeight ?? 0));
    const max = round3(netWeightKg - others);
    return Math.max(0, max);
  };

  const handleComplete = () => {
    if (!grossWeightKg || !tareWeightKg) {
      return;
    }
    const includedUiIndexes: number[] = [];
    const nextItems = items.flatMap((item, index) => {
      if (!item.tireClassificationId || Number(item.weightKg) <= 0) {
        return [];
      }
      includedUiIndexes.push(index);
      return [
        {
          tireClassificationId: item.tireClassificationId,
          weightKg: Number(item.weightKg),
          description: item.description?.trim() || undefined,
          ...(Number(item.pricePerKg) > 0
            ? { pricePerKg: Number(item.pricePerKg) }
            : {}),
        },
      ];
    });
    if (!nextItems.length) {
      return;
    }

    const uniqueClassificationIds = new Set(
      nextItems.map((item) => item.tireClassificationId),
    );
    if (uniqueClassificationIds.size !== nextItems.length) {
      message.error("ประเภทยางแต่ละรายการต้องไม่ซ้ำกัน");
      return;
    }

    let submittedPriceSourceLineNo: number | undefined;
    if (priceSourceLineNo !== undefined && nextItems.length > 1) {
      const mappedIndex = includedUiIndexes.indexOf(priceSourceLineNo - 1);
      if (mappedIndex >= 0) {
        submittedPriceSourceLineNo = mappedIndex + 1;
      }
    }
    const itemsTotal = round3(
      nextItems.reduce((sum, item) => sum + item.weightKg, 0),
    );
    if (itemsTotal > netWeightKg + 0.0005) {
      message.error(
        `น้ำหนักรายการยางรวม ${formatWeight(itemsTotal)} กก. เกินน้ำหนักสุทธิของรถ ${formatWeight(netWeightKg)} กก.`,
      );
      return;
    }

    const nextDeductions = deductions
      .map((item) => ({
        deductionType: "OTHER" as const,
        description: item.description?.trim() || "",
        deductionWeightKg: Number(item.deductionWeightKg ?? 0),
        deductionPricePerKg:
          item.deductionPricePerKg === undefined
            ? undefined
            : Number(item.deductionPricePerKg),
        deductionAmount:
          item.deductionAmount === undefined
            ? undefined
            : Number(item.deductionAmount),
      }))
      .filter(
        (item) =>
          item.deductionWeightKg > 0 ||
          Number(item.deductionPricePerKg ?? 0) > 0 ||
          Number(item.deductionAmount ?? 0) > 0,
      );

    for (const item of nextDeductions) {
      if (!item.description) {
        message.error("รายการหักสารปนเปื้อนต้องระบุชื่อ");
        return;
      }
      const hasLumpSum = Number(item.deductionAmount ?? 0) > 0;
      if (hasLumpSum) {
        continue;
      }
      if (item.deductionWeightKg <= 0) {
        message.error(`"${item.description}" ต้องใส่น้ำหนักหัก (กก.)`);
        return;
      }
      if (Number(item.deductionPricePerKg ?? 0) <= 0) {
        message.error(`"${item.description}" ต้องใส่ราคา/กก.`);
        return;
      }
    }

    const lineHasPrice = (uiIndex: number, pricePerKg?: number) => {
      if (Number(pricePerKg) > 0) {
        return true;
      }
      const effective = resolveEffectivePrice(uiIndex);
      if (effective && effective.pricePerKg > 0) {
        return true;
      }
      const classificationId = items[uiIndex]?.tireClassificationId;
      return Boolean(
        classificationId && priceByClassificationId.has(classificationId),
      );
    };

    if (submittedPriceSourceLineNo !== undefined) {
      const sourceItem = nextItems[submittedPriceSourceLineNo - 1];
      const sourceUiIndex = includedUiIndexes[submittedPriceSourceLineNo - 1];
      if (!sourceItem?.tireClassificationId) {
        message.error(
          `รายการที่ ${submittedPriceSourceLineNo} ยังไม่ได้เลือกประเภทยาง`,
        );
        return;
      }
      if (!lineHasPrice(sourceUiIndex, sourceItem.pricePerKg)) {
        message.error(
          `รายการที่ ${submittedPriceSourceLineNo} ยังไม่มีราคาที่มีผลวันนี้`,
        );
        return;
      }
    } else {
      for (let index = 0; index < nextItems.length; index += 1) {
        const item = nextItems[index];
        const uiIndex = includedUiIndexes[index];
        if (!lineHasPrice(uiIndex, item.pricePerKg)) {
          const meta = classificationLabelById.get(item.tireClassificationId);
          message.error(
            meta
              ? `${meta.name} ยังไม่มีราคาที่มีผลวันนี้`
              : "มีรายการที่ยังไม่มีราคาที่มีผลวันนี้",
          );
          return;
        }
      }
    }

    const deductionWeightTotal = round3(
      nextDeductions.reduce((sum, item) => sum + item.deductionWeightKg, 0),
    );
    if (deductionWeightTotal > itemsTotal + 0.0005) {
      message.error(
        `น้ำหนักหักรวม ${formatWeight(deductionWeightTotal)} กก. เกินน้ำหนักคัดแยก ${formatWeight(itemsTotal)} กก.`,
      );
      return;
    }

    void completeMutation.mutateAsync({
      grossWeightKg,
      tareWeightKg,
      isManual,
      reason: reason.trim() || undefined,
      items: nextItems,
      deductions: nextDeductions,
      remark: planRemark.trim() || undefined,
      priceSourceLineNo: submittedPriceSourceLineNo,
    });
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
        // ส่ง receipt เข้าไปด้วย ใบสำคัญจ่ายจะได้พิมพ์ตารางรายการรับซื้อ
        mapPaymentContextToPdfData(paymentContext, receipt),
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
    <div
      className={[
        styles.stepCard,
        currentStep === 0 ? styles.stepCardActive : "",
        receiptConfirmed ? styles.stepCardDone : "",
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
              receiptConfirmed ? styles.stepBadgeDone : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            1
          </div>
          <div className={styles.stepCardTitle}>
            <h3>Step 1 · คัดแยกและบันทึกน้ำหนัก</h3>
            <p>
              กรอกจากใบเครื่องจักร: น้ำหนักเข้า-ออก ประเภทยาง+กก. และสารปนเปื้อน
              (กก. × บาท/กก.)
            </p>
          </div>
        </div>
        <Tag
          className={styles.stepStatusTag}
          color={
            receiptConfirmed
              ? "success"
              : currentStep === 0
                ? "processing"
                : "default"
          }
        >
          {receiptConfirmed
            ? "ยืนยันใบรับซื้อแล้ว"
            : selectedTypeCount
              ? `${selectedTypeCount} ประเภท · ${formatWeight(allocatedTireWeightKg)} กก.`
              : "รอกรอกข้อมูล"}
        </Tag>
      </div>

      <div className={styles.stepCardBody}>
        {receiptConfirmed ? (
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
                <p className={styles.classifyEyebrow}>เอกสาร 2</p>
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
                      {paymentContext?.voucher ? "เปิด" : "ออกใบสำคัญจ่าย"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.weighStepLayout}>
            <section className={styles.weighBridgeCard}>
              <div className={styles.weighBridgeHead}>
                <div>
                  <p className={styles.classifyEyebrow}>ชั่งรถ</p>
                  <h4>น้ำหนักเข้า − ออก = สุทธิ</h4>
                </div>
                <label className={styles.weighManualToggle}>
                  <span>กรอกเอง</span>
                  <Switch
                    checked={isManual}
                    checkedChildren="ใช่"
                    unCheckedChildren="ไม่"
                    disabled={!formEditable}
                    onChange={setIsManual}
                  />
                </label>
              </div>

              <div className={styles.weighBridgeMath}>
                <div className={styles.weighBridgeField}>
                  <span>น้ำหนักเข้า</span>
                  <div className={styles.weighBridgeInputRow}>
                    <InputNumber
                      aria-label="น้ำหนักเข้า"
                      min={0.001}
                      step={0.001}
                      className={styles.weighBridgeInput}
                      value={grossWeightKg ?? undefined}
                      placeholder="0.000"
                      disabled={!formEditable}
                      onKeyDown={blockNonNumericWeightKey}
                      onChange={(value) =>
                        setGrossWeightKg(
                          typeof value === "number" ? value : null,
                        )
                      }
                    />
                    <em>กก.</em>
                  </div>
                </div>
                <span className={styles.weighBridgeOp} aria-hidden>
                  −
                </span>
                <div className={styles.weighBridgeField}>
                  <span>น้ำหนักออก</span>
                  <div className={styles.weighBridgeInputRow}>
                    <InputNumber
                      aria-label="น้ำหนักออก"
                      min={0.001}
                      step={0.001}
                      className={styles.weighBridgeInput}
                      value={tareWeightKg ?? undefined}
                      placeholder="0.000"
                      disabled={!formEditable}
                      onKeyDown={blockNonNumericWeightKey}
                      onChange={(value) =>
                        setTareWeightKg(
                          typeof value === "number" ? value : null,
                        )
                      }
                    />
                    <em>กก.</em>
                  </div>
                </div>
                <span className={styles.weighBridgeOp} aria-hidden>
                  =
                </span>
                <div
                  className={`${styles.weighBridgeField} ${styles.weighBridgeNet}`}
                >
                  <span>น้ำหนักสุทธิของรถ</span>
                  <strong>
                    {netWeightKg > 0 ? formatWeight(netWeightKg) : "—"}
                    <em>กก.</em>
                  </strong>
                </div>
              </div>

              {isManual ? (
                <Input.TextArea
                  aria-label="เหตุผลการกรอกน้ำหนักเอง"
                  rows={2}
                  value={reason}
                  disabled={!formEditable}
                  placeholder="เหตุผลการกรอกเอง เช่น อ่านจากใบชั่ง (ไม่บังคับ)"
                  onChange={(event) => setReason(event.target.value)}
                />
              ) : null}
            </section>

            <section
              className={`${styles.weighAllocCard} ${
                isTireWeightOver ? styles.weighAllocCardOver : ""
              }`}
            >
              <div className={styles.weighAllocHead}>
                <div>
                  <p className={styles.classifyEyebrow}>จัดสรรน้ำหนักยาง</p>
                  <h4>
                    รวมรายการยางต้องไม่เกิน{" "}
                    {netWeightKg > 0
                      ? `${formatWeight(netWeightKg)} กก.`
                      : "น้ำหนักสุทธิของรถ"}
                  </h4>
                </div>
                <strong
                  className={
                    isTireWeightOver
                      ? styles.weighAllocValueOver
                      : styles.weighAllocValue
                  }
                >
                  {formatWeight(allocatedTireWeightKg)}
                  <span>
                    {" "}
                    / {netWeightKg > 0 ? formatWeight(netWeightKg) : "—"} กก.
                  </span>
                </strong>
              </div>

              <div
                className={styles.weighAllocTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={tireWeightFillPercent}
                aria-label="สัดส่วนน้ำหนักยางต่อสุทธิ"
              >
                <div
                  className={`${styles.weighAllocFill} ${
                    isTireWeightOver ? styles.weighAllocFillOver : ""
                  }`}
                  style={{ width: `${tireWeightFillPercent}%` }}
                />
              </div>

              <div className={styles.weighAllocMeta}>
                <span>
                  จัดสรรแล้ว {formatWeight(allocatedTireWeightKg)} กก.
                </span>
                <span>
                  {isTireWeightOver
                    ? `เกิน ${formatWeight(Math.abs(remainingTireWeightKg))} กก.`
                    : `เหลือจัดสรร ${formatWeight(Math.max(0, remainingTireWeightKg))} กก.`}
                </span>
              </div>
            </section>

            <div className={styles.weighSplitGrid}>
              <section
                className={`${styles.classifyPanel} ${styles.classifyPanelTire}`}
              >
                <div className={styles.classifyPanelHead}>
                  <div>
                    <p className={styles.classifyEyebrow}>สินค้าที่รับซื้อ</p>
                    <h4>ประเภทยาง + น้ำหนัก</h4>
                    <p>เลือกประเภทแล้วใส่กก. — รวมแล้วต้องไม่เกินสุทธิของรถ</p>
                  </div>
                  <span
                    className={`${styles.classifyCount} ${
                      selectedTypeCount ? "" : styles.classifyCountMuted
                    }`}
                  >
                    {selectedTypeCount
                      ? `${selectedTypeCount} รายการ · ${formatBaht(totalTireAmount)} บาท`
                      : "0 รายการ"}
                  </span>
                </div>

                {items.length > 1 ? (
                  <div className={styles.classifyPriceSource}>
                    <label htmlFor="price-source-select">การใช้ราคา</label>
                    <Select
                      id="price-source-select"
                      aria-label="เลือกแหล่งราคาทั้งชุด"
                      value={priceSourceLineNo ?? "OWN"}
                      options={priceSourceOptions}
                      disabled={!formEditable}
                      popupMatchSelectWidth
                      onChange={(value) =>
                        setPriceSourceLineNo(
                          value === "OWN" ? undefined : Number(value),
                        )
                      }
                    />
                  </div>
                ) : null}

                <div className={styles.classifyTypeList}>
                  {items.map((item, index) => {
                    const meta = classificationLabelById.get(
                      item.tireClassificationId,
                    );
                    const price = resolveEffectivePrice(index);
                    const usingSharedPrice =
                      priceSourceLineNo !== undefined &&
                      priceSourceLineNo !== index + 1;
                    const isPriceSourceLine =
                      priceSourceLineNo === index + 1;
                    const maxKg = maxWeightForItem(item.weightKg);
                    const lineAmount = tireLineAmount(index, item.weightKg);
                    return (
                      <div key={item.key} className={styles.classifyTypeRow}>
                        <div className={styles.classifyTypeRowTop}>
                          <span className={styles.classifyTypeIndex}>
                            {index + 1}
                          </span>
                          <Select
                            aria-label={`ประเภทยาง ${index + 1}`}
                            value={item.tireClassificationId || undefined}
                            options={classificationOptionsForRow(
                              item.tireClassificationId,
                            )}
                            placeholder="เลือกประเภทยาง"
                            disabled={!formEditable}
                            showSearch
                            optionFilterProp="label"
                            popupMatchSelectWidth
                            onChange={(value) =>
                              setItems((prev) => {
                                const taken = prev.some(
                                  (row) =>
                                    row.key !== item.key &&
                                    row.tireClassificationId === value,
                                );
                                if (taken) {
                                  return prev;
                                }
                                return prev.map((row) =>
                                  row.key === item.key
                                    ? { ...row, tireClassificationId: value }
                                    : row,
                                );
                              })
                            }
                          />
                          {formEditable && items.length > 1 ? (
                            <Button
                              type="text"
                              danger
                              aria-label={`ลบประเภทยาง ${index + 1}`}
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setItems((prev) => {
                                  const next = prev.filter(
                                    (row) => row.key !== item.key,
                                  );
                                  const deletedLineNo = index + 1;
                                  if (priceSourceLineNo === deletedLineNo) {
                                    setPriceSourceLineNo(undefined);
                                  } else if (
                                    priceSourceLineNo !== undefined &&
                                    priceSourceLineNo > deletedLineNo
                                  ) {
                                    setPriceSourceLineNo(priceSourceLineNo - 1);
                                  }
                                  return next;
                                })
                              }
                            />
                          ) : null}
                        </div>

                        {item.tireClassificationId ? (
                          <div
                            className={`${styles.classifyTypeDetail} ${
                              price ? "" : styles.classifyTypeMissing
                            }`}
                          >
                            {price ? (
                              <>
                                <span>
                                  {usingSharedPrice
                                    ? `ใช้ราคาจากรายการที่ ${priceSourceLineNo}`
                                    : isPriceSourceLine &&
                                        priceSourceLineNo !== undefined
                                      ? "ใช้เป็นแหล่งราคาทั้งชุด"
                                      : price.source === "scale"
                                        ? "ราคาจากตาชั่ง"
                                        : "ราคาซื้อวันนี้"}
                                </span>
                                <strong>
                                  {formatPrice(price.pricePerKg)} บาท/กก.
                                </strong>
                                <p className={styles.classifyTypeAmount}>
                                  {lineAmount > 0
                                    ? `${formatWeight(item.weightKg)} กก. × ${formatPrice(price.pricePerKg)} = ${formatBaht(lineAmount)} บาท`
                                    : "ใส่น้ำหนักเพื่อดูยอดเงิน"}
                                </p>
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

                        <div className={styles.weighItemInput}>
                          <InputNumber
                            aria-label={`น้ำหนักยาง ${index + 1}`}
                            min={0}
                            max={maxKg}
                            step={0.001}
                            className={styles.classifyDeductionInput}
                            value={item.weightKg}
                            placeholder="0.000"
                            disabled={!formEditable || !item.tireClassificationId}
                            status={isTireWeightOver ? "error" : undefined}
                            onKeyDown={blockNonNumericWeightKey}
                            onChange={(value) => {
                              const next =
                                typeof value === "number" ? value : undefined;
                              const capped =
                                next !== undefined &&
                                maxKg !== undefined &&
                                next > maxKg
                                  ? maxKg
                                  : next;
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.key === item.key
                                    ? { ...row, weightKg: capped }
                                    : row,
                                ),
                              );
                            }}
                          />
                          <Button
                            type="default"
                            size="small"
                            className={styles.weighItemMaxButton}
                            aria-label={`ใส่น้ำหนักสูงสุดของรายการยาง ${index + 1}`}
                            disabled={
                              !formEditable ||
                              !item.tireClassificationId ||
                              maxKg === undefined ||
                              maxKg <= 0
                            }
                            onClick={() => {
                              if (maxKg === undefined || maxKg <= 0) {
                                return;
                              }
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.key === item.key
                                    ? { ...row, weightKg: maxKg }
                                    : row,
                                ),
                              );
                            }}
                          >
                            Max
                          </Button>
                          <em>กก.</em>
                        </div>

                        <Input
                          aria-label={`หมายเหตุรายการยาง ${index + 1}`}
                          placeholder="หมายเหตุรายการ (ไม่บังคับ)"
                          value={item.description ?? ""}
                          disabled={!formEditable}
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

                {formEditable ? (
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

              <section
                className={`${styles.classifyPanel} ${styles.classifyPanelContam}`}
              >
                <div className={styles.classifyPanelHead}>
                  <div>
                    <p className={styles.classifyEyebrow}>รายการหัก</p>
                    <h4>สารปนเปื้อน</h4>
                    <p>กรอกชื่อรายการแล้วหักด้วยน้ำหนัก × ราคา/กก. หรือยอดหักเป็นก้อนเงิน</p>
                  </div>
                  <span
                    className={`${styles.classifyCount} ${
                      deductions.length ? "" : styles.classifyCountMuted
                    }`}
                  >
                    {deductions.length
                      ? `${formatWeight(totalDeductionWeightKg)} กก. · ${formatBaht(totalDeductionAmount)} บาท`
                      : "ไม่มี"}
                  </span>
                </div>

                {deductions.length ? (
                  <div className={styles.classifyDeductionPlanList}>
                    {deductions.map((item) => {
                      const lineAmount = deductionLineAmount(item);
                      const lumpSum = isLumpSumDeduction(item);
                      return (
                        <div
                          key={item.key}
                          className={styles.classifyDeductionPlanRow}
                        >
                          <div className={styles.classifyDeductionPlanTop}>
                            <Input
                              aria-label="ชื่อรายการหัก"
                              placeholder="ชื่อรายการ เช่น ดิน, น้ำ, โลหะ"
                              value={item.description ?? ""}
                              disabled={!formEditable}
                              onChange={(event) =>
                                setDeductions((prev) =>
                                  prev.map((row) =>
                                    row.key === item.key
                                      ? {
                                          ...row,
                                          description: event.target.value,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            <span>
                              {lineAmount > 0
                                ? `= ${formatBaht(lineAmount)} บาท`
                                : lumpSum
                                  ? "ยอดหัก (บาท)"
                                  : "กก. × บาท/กก."}
                            </span>
                            {formEditable ? (
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="ลบรายการหัก"
                                onClick={() =>
                                  setDeductions((prev) =>
                                    prev.filter((row) => row.key !== item.key),
                                  )
                                }
                              />
                            ) : null}
                          </div>
                          {lumpSum ? (
                            <div className={styles.classifyDeductionAmount}>
                              <InputNumber
                                aria-label="ยอดหัก"
                                min={0.01}
                                step={0.01}
                                precision={2}
                                className={styles.classifyDeductionInput}
                                value={item.deductionAmount}
                                placeholder="0.00"
                                disabled={!formEditable}
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
                              <em>บาท</em>
                            </div>
                          ) : (
                            <>
                          <div className={styles.classifyDeductionAmount}>
                            <InputNumber
                              aria-label="น้ำหนักหัก"
                              min={0.001}
                              step={0.001}
                              className={styles.classifyDeductionInput}
                              value={item.deductionWeightKg}
                              placeholder="0.000"
                              disabled={!formEditable}
                              status={
                                isDeductionWeightOver ? "error" : undefined
                              }
                              onKeyDown={blockNonNumericWeightKey}
                              onChange={(value) =>
                                setDeductions((prev) =>
                                  prev.map((row) =>
                                    row.key === item.key
                                      ? {
                                          ...row,
                                          deductionWeightKg:
                                            typeof value === "number"
                                              ? value
                                              : undefined,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            <em>กก.</em>
                          </div>
                          <div className={styles.classifyDeductionAmount}>
                            <InputNumber
                              aria-label="ราคาต่อกก."
                              min={0.01}
                              step={0.01}
                              precision={4}
                              className={styles.classifyDeductionInput}
                              value={item.deductionPricePerKg}
                              placeholder="0.00"
                              disabled={!formEditable}
                              onKeyDown={blockNonNumericWeightKey}
                              onChange={(value) =>
                                setDeductions((prev) =>
                                  prev.map((row) =>
                                    row.key === item.key
                                      ? {
                                          ...row,
                                          deductionPricePerKg:
                                            typeof value === "number"
                                              ? value
                                              : undefined,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            <em>บาท/กก.</em>
                          </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.classifyEmpty}>
                    ไม่มีสารปนเปื้อนก็ข้ามได้
                  </div>
                )}

                {formEditable ? (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() =>
                      setDeductions((prev) => [...prev, createDeductionRow()])
                    }
                  >
                    เพิ่มรายการหัก
                  </Button>
                ) : null}
                {isDeductionWeightOver ? (
                  <div className={styles.stepEmptyHint}>
                    น้ำหนักหักรวมเกินน้ำหนักคัดแยกยาง — ปรับกก. หักลง
                  </div>
                ) : null}
              </section>
            </div>

            <Input.TextArea
              aria-label="หมายเหตุตั๋ว"
              rows={2}
              value={planRemark}
              disabled={!formEditable}
              placeholder="หมายเหตุตั๋ว (ไม่บังคับ)"
              onChange={(event) => setPlanRemark(event.target.value)}
            />

            <div className={styles.weighActions}>
              <Button
                type="primary"
                className={styles.submitButton}
                loading={completeMutation.isPending}
                disabled={
                  !formEditable ||
                  !grossWeightKg ||
                  !tareWeightKg ||
                  tareWeightKg >= grossWeightKg ||
                  isTireWeightOver ||
                  isDeductionWeightOver ||
                  !items.some(
                    (item) =>
                      item.tireClassificationId && Number(item.weightKg) > 0,
                  ) ||
                  deductions.some((item) => {
                    const hasData =
                      Number(item.deductionWeightKg ?? 0) > 0 ||
                      Number(item.deductionPricePerKg ?? 0) > 0 ||
                      Number(item.deductionAmount ?? 0) > 0 ||
                      Boolean(item.description?.trim());
                    return hasData && !item.description?.trim();
                  })
                }
                onClick={handleComplete}
              >
                บันทึกและยืนยันใบรับซื้อ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
