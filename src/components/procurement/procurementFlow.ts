export const PROCUREMENT_FLOW_STEPS = [
  { key: "pr", title: "ขอซื้อ", shortTitle: "ขอซื้อ" },
  { key: "po", title: "สั่งซื้อ", shortTitle: "สั่งซื้อ" },
  { key: "gr", title: "รับของ", shortTitle: "รับของ" },
  { key: "pay", title: "จ่ายเงิน", shortTitle: "จ่ายเงิน" },
] as const;

export type ProcurementFlowStepKey =
  (typeof PROCUREMENT_FLOW_STEPS)[number]["key"];

export type ProcurementFlowDocRef = {
  id: string;
  no: string;
  status: string;
  href: string;
};

export type ProcurementFlowInput = {
  pr?: { id: string; prNo: string; status: string } | null;
  po?: {
    id: string;
    poNo: string;
    status: string;
    paymentStatus?: string;
  } | null;
  goodsReceipts?: Array<{ id: string; grNo: string; status: string }>;
  payment?: { id: string; voucherNo: string; status: string } | null;
};

export type ProcurementFlowStepState = "wait" | "process" | "finish" | "error";

export type ProcurementFlowResult = {
  current: number;
  stepsStatus: "process" | "finish" | "error";
  stepStates: ProcurementFlowStepState[];
  nextHint: string;
  summaryLabel: string;
  badgeLabel: string;
  badgeTone: "active" | "done" | "error" | "wait";
  docs: {
    pr?: ProcurementFlowDocRef;
    po?: ProcurementFlowDocRef;
    goodsReceipts: ProcurementFlowDocRef[];
    payment?: ProcurementFlowDocRef;
  };
};

function isTerminalFail(status?: string) {
  return status === "CANCELLED" || status === "REJECTED";
}

function isPrStepDone(status?: string) {
  return status === "APPROVED";
}

function isPoStepDone(status?: string) {
  return (
    status === "CONFIRMED" ||
    status === "PARTIALLY_RECEIVED" ||
    status === "COMPLETED"
  );
}

function isGrStepDone(
  poStatus?: string,
  goodsReceipts?: Array<{ status: string }>,
) {
  if (poStatus === "PARTIALLY_RECEIVED" || poStatus === "COMPLETED") {
    return true;
  }
  return (goodsReceipts ?? []).some((gr) => gr.status === "CONFIRMED");
}

function isPayStepDone(
  paymentStatus?: string,
  payment?: { status: string } | null,
) {
  return paymentStatus === "PAID" || payment?.status === "PAID";
}

export function resolveProcurementFlow(
  input: ProcurementFlowInput,
): ProcurementFlowResult {
  const { pr, po, goodsReceipts = [], payment } = input;

  const prDone = isPrStepDone(pr?.status);
  const poExists = Boolean(po && po.status !== "CANCELLED");
  const poDone = isPoStepDone(po?.status);
  const grDone = isGrStepDone(po?.status, goodsReceipts);
  const payDone = isPayStepDone(po?.paymentStatus, payment);

  const failed =
    isTerminalFail(pr?.status) ||
    po?.status === "CANCELLED" ||
    payment?.status === "CANCELLED";

  const stepDone = [prDone, poDone, grDone, payDone];

  let current = 0;
  if (!pr || !prDone) {
    current = 0;
  } else if (!poDone) {
    current = 1;
  } else if (!grDone) {
    current = 2;
  } else if (!payDone) {
    current = 3;
  } else {
    current = 4;
  }

  // If PR approved but no PO yet, still on step 1 (สั่งซื้อ) as process
  if (prDone && !poExists && !failed) {
    current = 1;
  }

  // If PO draft exists, on step 1
  if (po && po.status === "DRAFT" && !failed) {
    current = 1;
  }

  const stepStates: ProcurementFlowStepState[] = PROCUREMENT_FLOW_STEPS.map(
    (_, index) => {
      if (failed && index === Math.min(current, 3)) {
        // mark the step where failure is visible
        if (
          (index === 0 && isTerminalFail(pr?.status)) ||
          (index === 1 && po?.status === "CANCELLED") ||
          (index === 3 && payment?.status === "CANCELLED")
        ) {
          return "error";
        }
      }
      if (stepDone[index]) return "finish";
      if (index === current) return "process";
      if (index < current) return "finish";
      return "wait";
    },
  );

  // Fix error state for cancelled/rejected
  if (isTerminalFail(pr?.status)) {
    stepStates[0] = "error";
    current = 0;
  } else if (po?.status === "CANCELLED") {
    stepStates[1] = "error";
    current = 1;
  } else if (payment?.status === "CANCELLED" && !payDone) {
    stepStates[3] = "error";
    current = 3;
  }

  let nextHint = "ติดตามสถานะเอกสารในสายจัดซื้อ";
  let summaryLabel = "อยู่ระหว่างดำเนินการ";
  let badgeLabel = `${Math.min(current + 1, 4)}/4 · ${PROCUREMENT_FLOW_STEPS[Math.min(current, 3)].shortTitle}`;
  let badgeTone: ProcurementFlowResult["badgeTone"] = "active";
  let stepsStatus: ProcurementFlowResult["stepsStatus"] = "process";

  if (isTerminalFail(pr?.status)) {
    nextHint =
      pr?.status === "REJECTED"
        ? "ใบขอซื้อถูกปฏิเสธ — แก้ไขหรือสร้างใบใหม่"
        : "ใบขอซื้อถูกยกเลิกแล้ว";
    summaryLabel = pr?.status === "REJECTED" ? "ปฏิเสธแล้ว" : "ยกเลิกแล้ว";
    badgeLabel = pr?.status === "REJECTED" ? "ปฏิเสธ" : "ยกเลิก";
    badgeTone = "error";
    stepsStatus = "error";
  } else if (po?.status === "CANCELLED") {
    nextHint = "ใบสั่งซื้อถูกยกเลิกแล้ว";
    summaryLabel = "ยกเลิกแล้ว";
    badgeLabel = "ยกเลิก";
    badgeTone = "error";
    stepsStatus = "error";
  } else if (current >= 4 || payDone) {
    nextHint = "สายงานจัดซื้อเสร็จครบแล้ว (ขอซื้อ → สั่งซื้อ → รับของ → จ่ายเงิน)";
    summaryLabel = "เสร็จครบ";
    badgeLabel = "เสร็จครบ";
    badgeTone = "done";
    stepsStatus = "finish";
    current = 4;
  } else if (current === 0) {
    if (!pr || pr.status === "DRAFT") {
      nextHint = "ส่งใบขอซื้อเพื่อรออนุมัติ";
    } else if (pr.status === "PENDING_APPROVAL") {
      nextHint = "รอผู้อนุมัติพิจารณาใบขอซื้อ";
    } else {
      nextHint = "ดำเนินการใบขอซื้อให้เสร็จ";
    }
    summaryLabel = "ขั้นขอซื้อ";
    badgeLabel = "1/4 · ขอซื้อ";
  } else if (current === 1) {
    if (!poExists) {
      nextHint = "สร้างใบสั่งซื้อจาก PR ที่อนุมัติแล้ว";
      badgeLabel = "1/4 เสร็จ · รอสั่งซื้อ";
      badgeTone = "wait";
    } else if (po?.status === "DRAFT") {
      nextHint = "ตรวจสอบราคาแล้ว Confirm ใบสั่งซื้อ";
      badgeLabel = "2/4 · สั่งซื้อ";
    } else {
      nextHint = "ดำเนินการใบสั่งซื้อ";
      badgeLabel = "2/4 · สั่งซื้อ";
    }
    summaryLabel = "ขั้นสั่งซื้อ";
  } else if (current === 2) {
    nextHint = "สร้างและ Confirm ใบรับของเพื่อโพสต์สต๊อก";
    summaryLabel = "ขั้นรับของ";
    badgeLabel = "3/4 · รับของ";
  } else if (current === 3) {
    nextHint = "สร้างใบสำคัญจ่ายและ Confirm การจ่ายเงิน";
    summaryLabel = "ขั้นจ่ายเงิน";
    badgeLabel = "4/4 · จ่ายเงิน";
  }

  const confirmedGrs = goodsReceipts.filter((gr) => gr.status === "CONFIRMED");
  const docs: ProcurementFlowResult["docs"] = {
    goodsReceipts: (confirmedGrs.length ? confirmedGrs : goodsReceipts)
      .filter((gr) => gr.status !== "CANCELLED")
      .map((gr) => ({
        id: gr.id,
        no: gr.grNo,
        status: gr.status,
        href: `/goods-receipts/${gr.id}`,
      })),
  };

  if (pr) {
    docs.pr = {
      id: pr.id,
      no: pr.prNo,
      status: pr.status,
      href: `/purchase-requests/${pr.id}`,
    };
  }
  if (po && po.status !== "CANCELLED") {
    docs.po = {
      id: po.id,
      no: po.poNo,
      status: po.status,
      href: `/purchase-orders/${po.id}`,
    };
  }
  if (payment && payment.status !== "CANCELLED") {
    docs.payment = {
      id: payment.id,
      no: payment.voucherNo,
      status: payment.status,
      href: `/purchase-payments/${payment.id}`,
    };
  }

  return {
    current: Math.min(current, 4),
    stepsStatus,
    stepStates,
    nextHint,
    summaryLabel,
    badgeLabel,
    badgeTone,
    docs,
  };
}

/** Compact badge for list rows — no extra API, derived from row fields only */
export type ListFlowSource =
  | { kind: "pr"; status: string }
  | { kind: "po"; status: string; paymentStatus?: string }
  | { kind: "gr"; status: string }
  | { kind: "pending-pay" }
  | { kind: "payment"; status: string };

export function resolveListFlowBadge(source: ListFlowSource): {
  label: string;
  tone: "active" | "done" | "error" | "wait";
} {
  switch (source.kind) {
    case "pr": {
      if (source.status === "REJECTED") {
        return { label: "ปฏิเสธ", tone: "error" };
      }
      if (source.status === "CANCELLED") {
        return { label: "ยกเลิก", tone: "error" };
      }
      if (source.status === "APPROVED") {
        return { label: "1/4 เสร็จ · รอสั่งซื้อ", tone: "wait" };
      }
      return { label: "1/4 · ขอซื้อ", tone: "active" };
    }
    case "po": {
      if (source.status === "CANCELLED") {
        return { label: "ยกเลิก", tone: "error" };
      }
      if (source.status === "DRAFT") {
        return { label: "2/4 · สั่งซื้อ", tone: "active" };
      }
      if (
        source.status === "CONFIRMED" ||
        source.status === "PARTIALLY_RECEIVED"
      ) {
        return { label: "3/4 · รับของ", tone: "active" };
      }
      if (source.status === "COMPLETED") {
        if (source.paymentStatus === "PAID") {
          return { label: "เสร็จครบ", tone: "done" };
        }
        return { label: "4/4 · จ่ายเงิน", tone: "active" };
      }
      return { label: "2/4 · สั่งซื้อ", tone: "active" };
    }
    case "gr": {
      if (source.status === "CANCELLED") {
        return { label: "ยกเลิก", tone: "error" };
      }
      if (source.status === "CONFIRMED") {
        return { label: "3/4 เสร็จ", tone: "wait" };
      }
      return { label: "3/4 · รับของ", tone: "active" };
    }
    case "pending-pay":
      return { label: "4/4 · จ่ายเงิน", tone: "active" };
    case "payment": {
      if (source.status === "CANCELLED") {
        return { label: "ยกเลิก", tone: "error" };
      }
      if (source.status === "PAID") {
        return { label: "เสร็จครบ", tone: "done" };
      }
      return { label: "4/4 · จ่ายเงิน", tone: "active" };
    }
    default:
      return { label: "—", tone: "wait" };
  }
}
