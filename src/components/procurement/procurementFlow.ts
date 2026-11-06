import { tNow } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";

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
    status === "COMPLETED" ||
    status === "CLOSED_PARTIAL" ||
    status === "RECEIVE_CANCELLED"
  );
}

function isGrStepDone(
  poStatus?: string,
  _goodsReceipts?: Array<{ status: string }>,
) {
  // รับครบแล้วเท่านั้นถึงจะไปขั้นจ่ายเงิน — partial ยังอยู่ขั้นรับของ
  return poStatus === "COMPLETED" || poStatus === "CLOSED_PARTIAL";
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
  const poExists = Boolean(po && !isTerminalFail(po.status));
  const poDone = isPoStepDone(po?.status);
  const grDone = isGrStepDone(po?.status, goodsReceipts);
  const payDone = isPayStepDone(po?.paymentStatus, payment);

  const failed =
    isTerminalFail(pr?.status) ||
    isTerminalFail(po?.status) ||
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

  // PO ที่ยังไม่ผ่านอนุมัติ (ร่าง / ส่งกลับแก้ไข / รออนุมัติ) = ยังอยู่ขั้นสั่งซื้อ
  if (
    po &&
    (po.status === "DRAFT" ||
      po.status === "REVISING" ||
      po.status === "PENDING_APPROVAL") &&
    !failed
  ) {
    current = 1;
  }

  const stepStates: ProcurementFlowStepState[] = PROCUREMENT_FLOW_STEPS.map(
    (_, index) => {
      if (failed && index === Math.min(current, 3)) {
        // mark the step where failure is visible
        if (
          (index === 0 && isTerminalFail(pr?.status)) ||
          (index === 1 && isTerminalFail(po?.status)) ||
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
  } else if (isTerminalFail(po?.status)) {
    stepStates[1] = "error";
    current = 1;
  } else if (po?.status === "RECEIVE_CANCELLED") {
    stepStates[2] = "error";
    current = 2;
  } else if (payment?.status === "CANCELLED" && !payDone) {
    stepStates[3] = "error";
    current = 3;
  }

  let nextHint = tNow("ติดตามสถานะเอกสารในสายจัดซื้อ");
  let summaryLabel = tNow("อยู่ระหว่างดำเนินการ");
  let badgeLabel = `${Math.min(current + 1, 4)}/4 · ${PROCUREMENT_FLOW_STEPS[Math.min(current, 3)].shortTitle}`;
  let badgeTone: ProcurementFlowResult["badgeTone"] = "active";
  let stepsStatus: ProcurementFlowResult["stepsStatus"] = "process";

  if (isTerminalFail(pr?.status)) {
    nextHint =
      pr?.status === "REJECTED"
        ? tNow("ใบขอซื้อถูกปฏิเสธ — แก้ไขหรือสร้างใบใหม่")
        : tNow("ใบขอซื้อถูกยกเลิกแล้ว");
    summaryLabel = pr?.status === "REJECTED" ? tNow("ปฏิเสธแล้ว") : tNow("ยกเลิกแล้ว");
    badgeLabel = pr?.status === "REJECTED" ? tNow("ปฏิเสธ") : tStatus("ยกเลิก");
    badgeTone = "error";
    stepsStatus = "error";
  } else if (isTerminalFail(po?.status)) {
    nextHint =
      po?.status === "REJECTED"
        ? tNow("ใบสั่งซื้อไม่ผ่านอนุมัติ — แก้ไขแล้วสร้างใบใหม่")
        : tNow("ใบสั่งซื้อถูกยกเลิกแล้ว");
    summaryLabel = po?.status === "REJECTED" ? tNow("ไม่อนุมัติ") : tNow("ยกเลิกแล้ว");
    badgeLabel = po?.status === "REJECTED" ? tNow("ไม่อนุมัติ") : tStatus("ยกเลิก");
    badgeTone = "error";
    stepsStatus = "error";
  } else if (po?.status === "RECEIVE_CANCELLED") {
    nextHint = tNow("ยกเลิกการรับทุกรอบแล้ว — ไม่มีของเข้าคลัง จึงไม่ต้องจ่ายเงิน");
    summaryLabel = tNow("ยกเลิกการรับ");
    badgeLabel = tNow("ยกเลิกการรับ");
    badgeTone = "error";
    stepsStatus = "error";
    current = 2;
    stepStates[2] = "error";
  } else if (current >= 4 || (grDone && payDone)) {
    nextHint = tNow("สายงานจัดซื้อเสร็จครบแล้ว (ขอซื้อ → สั่งซื้อ → รับของ → จ่ายเงิน)");
    summaryLabel = tNow("เสร็จครบ");
    badgeLabel = tNow("เสร็จครบ");
    badgeTone = "done";
    stepsStatus = "finish";
    current = 4;
  } else if (current === 0) {
    if (!pr || pr.status === "DRAFT") {
      nextHint = tNow("ส่งใบขอซื้อเพื่อรออนุมัติ");
    } else if (pr.status === "REVISING") {
      nextHint = tNow("ผู้อนุมัติส่งกลับให้แก้ไข — แก้แล้วส่งอนุมัติอีกครั้ง");
    } else if (pr.status === "PENDING_APPROVAL") {
      nextHint = tNow("รอผู้อนุมัติพิจารณาใบขอซื้อ");
    } else {
      nextHint = tNow("ดำเนินการใบขอซื้อให้เสร็จ");
    }
    summaryLabel = tNow("ขั้นขอซื้อ");
    badgeLabel = tNow("1/4 · ขอซื้อ");
  } else if (current === 1) {
    if (!poExists) {
      nextHint = tNow("ไปที่เมนูใบสั่งซื้อ เพื่อสร้างใบสั่งซื้อจากรายการที่อนุมัติแล้ว");
      badgeLabel = tNow("รอสร้างที่ใบสั่งซื้อ");
      badgeTone = "wait";
    } else if (po?.status === "DRAFT") {
      nextHint = tNow("ตรวจสอบราคา/ผู้ขายแล้วกดส่งอนุมัติใบสั่งซื้อ");
      badgeLabel = tNow("2/4 · สั่งซื้อ");
    } else if (po?.status === "REVISING") {
      nextHint = tNow("หัวหน้าส่งกลับให้แก้ไข — แก้แล้วกดส่งอนุมัติอีกครั้ง");
      badgeLabel = tNow("2/4 · แก้ไข PO");
    } else if (po?.status === "PENDING_APPROVAL") {
      nextHint = tNow("รอหัวหน้าจัดซื้ออนุมัติใบสั่งซื้อ");
      badgeLabel = tNow("2/4 · รออนุมัติ PO");
    } else {
      nextHint = tNow("ดำเนินการใบสั่งซื้อ");
      badgeLabel = tNow("2/4 · สั่งซื้อ");
    }
    summaryLabel = tNow("ขั้นสั่งซื้อ");
  } else if (current === 2) {
    if (payDone) {
      nextHint = tNow("ชำระเงินเรียบร้อยแล้ว — อยู่ระหว่างรอตรวจรับสินค้าเข้าคลัง");
      summaryLabel = tNow("จ่ายแล้ว รอรับของ");
      badgeLabel = tNow("3/4 · จ่ายแล้ว รอรับของ");
    } else {
      nextHint = tNow("สร้างและ Confirm ใบรับของเพื่อโพสต์สต๊อก");
      summaryLabel = tNow("ขั้นรับของ");
      badgeLabel = tNow("3/4 · รับของ");
    }
  } else if (current === 3) {
    nextHint = tNow("สร้างใบสำคัญจ่ายและ Confirm การจ่ายเงิน");
    summaryLabel = tNow("ขั้นจ่ายเงิน");
    badgeLabel = tNow("4/4 · จ่ายเงิน");
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
  | {
      kind: "gr";
      status: string;
      poStatus?: string;
      paymentStatus?: string;
    }
  | { kind: "pending-pay" }
  | { kind: "payment"; status: string };

export function resolveListFlowBadge(source: ListFlowSource): {
  label: string;
  tone: "active" | "done" | "error" | "wait";
  href?: string;
} {
  switch (source.kind) {
    case "pr": {
      if (source.status === "REJECTED") {
        return { label: tNow("ปฏิเสธ"), tone: "error" };
      }
      if (source.status === "CANCELLED") {
        return { label: tStatus("ยกเลิก"), tone: "error" };
      }
      if (source.status === "REVISING") {
        return { label: tNow("1/4 · แก้ไข PR"), tone: "active" };
      }
      if (source.status === "APPROVED") {
        return {
          label: tNow("รอสร้างที่ใบสั่งซื้อ"),
          tone: "wait",
          href: "/purchase-orders",
        };
      }
      return { label: tNow("1/4 · ขอซื้อ"), tone: "active" };
    }
    case "po": {
      if (source.status === "CANCELLED") {
        return { label: tStatus("ยกเลิก"), tone: "error" };
      }
      if (source.status === "REJECTED") {
        return { label: tNow("ไม่อนุมัติ"), tone: "error" };
      }
      if (source.status === "PENDING_APPROVAL") {
        return {
          label: tNow("2/4 · รออนุมัติ PO"),
          tone: "wait",
          href: "/purchase-orders/approvals",
        };
      }
      if (source.status === "REVISING") {
        return { label: tNow("2/4 · แก้ไข PO"), tone: "active" };
      }
      if (source.status === "DRAFT") {
        return { label: tNow("2/4 · สั่งซื้อ"), tone: "active" };
      }
      if (
        source.status === "CONFIRMED" ||
        source.status === "PARTIALLY_RECEIVED"
      ) {
        return { label: tNow("3/4 · รับของ"), tone: "active" };
      }
      if (source.status === "RECEIVE_CANCELLED") {
        return { label: tNow("ยกเลิกการรับ"), tone: "error" };
      }
      if (
        source.status === "COMPLETED" ||
        source.status === "CLOSED_PARTIAL"
      ) {
        if (source.paymentStatus === "PAID") {
          return { label: tNow("เสร็จครบ"), tone: "done" };
        }
        return { label: tNow("4/4 · จ่ายเงิน"), tone: "active" };
      }
      return { label: tNow("2/4 · สั่งซื้อ"), tone: "active" };
    }
    case "gr": {
      if (source.status === "CANCELLED") {
        return { label: tStatus("ยกเลิก"), tone: "error" };
      }
      // ให้ตรงกับ resolveProcurementFlow: รับครบหรือปิดรับบางส่วน = ขั้นจ่ายเงิน
      if (
        source.status === "CONFIRMED" &&
        (source.poStatus === "COMPLETED" ||
          source.poStatus === "CLOSED_PARTIAL")
      ) {
        if (source.paymentStatus === "PAID") {
          return { label: tNow("เสร็จครบ"), tone: "done" };
        }
        return { label: tNow("4/4 · จ่ายเงิน"), tone: "active" };
      }
      if (source.status === "CONFIRMED") {
        return { label: tNow("3/4 · รับของ"), tone: "active" };
      }
      return { label: tNow("3/4 · รับของ"), tone: "active" };
    }
    case "pending-pay":
      return { label: tNow("4/4 · จ่ายเงิน"), tone: "active" };
    case "payment": {
      if (source.status === "CANCELLED") {
        return { label: tStatus("ยกเลิก"), tone: "error" };
      }
      if (source.status === "PAID") {
        return { label: tNow("เสร็จครบ"), tone: "done" };
      }
      return { label: tNow("4/4 · จ่ายเงิน"), tone: "active" };
    }
    default:
      return { label: "—", tone: "wait" };
  }
}
