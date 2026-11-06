"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  BarChartOutlined,
  CarOutlined,
  CloseOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { getStoredLanguage, useLanguage } from "@/lib/i18n/language";
import { tNow, useT } from "@/lib/i18n/useT";
import { useCreateWeighbridgeTicketMutation } from "@/hooks/weighbridge-tickets/useCreateWeighbridgeTicketMutation";
import { useWeighbridgeDashboardQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { useCreateSellerMutation } from "@/hooks/sellers/useCreateSellerMutation";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useSellerTypesQuery } from "@/hooks/seller-types/useSellerTypesQuery";
import { useCreateTruckMutation } from "@/hooks/trucks/useCreateTruckMutation";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useWeighbridgeScalesQuery } from "@/hooks/weighbridge-scales/useWeighbridgeScalesQuery";
import type { CreateSellerRequest } from "@/types/sellers";
import type { CreateTruckRequest, Truck } from "@/types/trucks";
import type {
  WeighbridgeTicketListItem,
  WeighbridgeTicketOrigin,
} from "@/types/weighbridge-tickets";
import type { T2900ErpOutboundTicket } from "@/types/t2900";

import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useT2900LiveUpdates } from "@/hooks/weighbridge-tickets/useT2900LiveUpdates";
import { useT2900OutboundTicketsQuery } from "@/hooks/weighbridge-tickets/useT2900OutboundTicketsQuery";
import { useAiOcrAvailabilityQuery } from "@/hooks/ai-ocr-settings/useAiOcrSettingsQueries";
import { useScanWeighTicketOcrStandaloneMutation } from "@/hooks/weighbridge-tickets/useScanWeighTicketOcrStandaloneMutation";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import type { WeighTicketOcrResult } from "@/types/weighbridge-ocr";

import CreateTicketFromOcrModal from "./CreateTicketFromOcrModal";
import DailySummaryReportModal from "./DailySummaryReportModal";
import WeighTicketOcrCaptureButton from "./WeighTicketOcrCaptureButton";
import {
  TICKET_ORIGIN_COLOR,
  TICKET_ORIGIN_LABEL,
} from "./ticket-origin";
import styles from "./WeighbridgeDashboardPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const { RangePicker } = DatePicker;

/** ซ่อนปุ่ม "เปิดตั๋วจากรูปใบชั่ง" ไว้ก่อน (โค้ดสแกน/ป๊อปอัปยังอยู่ครบ) — เปลี่ยนเป็น true เพื่อเปิดกลับ */
const SHOW_OPEN_TICKET_FROM_IMAGE = false;

/**
 * ปุ่มเปิดตั๋วจากรูป — ยังไม่ตั้ง AI จะไม่เปิดกล้อง
 * คนที่เข้าหน้าตั้งค่าได้จะถูกพาไปกรอก คนที่เข้าไม่ได้เห็นข้อความให้แจ้งผู้ดูแล
 */
function OpenTicketFromImageAction({
  pending,
  onScan,
}: {
  pending: boolean;
  onScan: (file: File, previewUrl: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const availability = useAiOcrAvailabilityQuery();
  const canOpenSettings =
    isAdministrator() || canAccessScreen("SETTINGS_AI_OCR");

  if (availability.isSuccess && availability.data.data.configured) {
    return (
      <WeighTicketOcrCaptureButton
        label={t("เปิดตั๋วจากรูปใบชั่ง")}
        pending={pending}
        onScan={onScan}
      />
    );
  }

  if (availability.isPending) {
    return (
      <Button disabled loading>
        {t("เปิดตั๋วจากรูปใบชั่ง")}
      </Button>
    );
  }

  if (canOpenSettings) {
    return (
      <Button onClick={() => router.push("/settings/ai-ocr")}>
        {t("ไปตั้งค่า AI อ่านเอกสาร")}
      </Button>
    );
  }

  return (
    <Typography.Text type="secondary">
      {t("ยังไม่ได้ตั้งค่า AI อ่านเอกสาร ให้แจ้งผู้ดูแลระบบ")}
    </Typography.Text>
  );
}

type OpenTicketFormValues = {
  sellerId: string;
  truckId: string;
  scaleId: string;
  remark?: string;
};

type SellerFormValues = {
  code: string;
  name: string;
  sellerTypeId?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  paymentMethod?: string;
  remark?: string;
  isActive: boolean;
};

type TruckFormValues = {
  code: string;
  licensePlate: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
  tareWeightKg?: number | null;
  isActive: boolean;
};

const TRUCK_TYPE_OPTIONS = [
  { value: "car", label: "รถส่วนตัว" },
  { value: "6_WHEEL", label: "6_WHEEL" },
  { value: "10_WHEEL", label: "10_WHEEL" },
  { value: "TRAILER", label: "TRAILER" },
  { value: "PICKUP", label: "PICKUP" },
];

type ReceivingStage =
  | "all"
  | "pending-confirm"
  | "payment"
  | "warehouse"
  | "done";

/** ตัวกรอง "ที่มา" ของตั๋ว — all = ไม่กรอง */
type SourceFilter = "all" | WeighbridgeTicketOrigin;

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "MANUAL", label: "เปิดเอง" },
  { value: "T2900", label: "จากเครื่องชั่ง" },
  { value: "OCR", label: "จากรูปใบชั่ง" },
];

/** id ของแถวที่สร้างจากบัตรเครื่องชั่งที่ยังไม่ได้เปิดตั๋วใน ERP */
const PENDING_T2900_PREFIX = "t2900:";

function isPendingT2900(ticket: WeighbridgeTicketListItem) {
  return ticket.id.startsWith(PENDING_T2900_PREFIX);
}

/** ทุกแถวเข้าหน้ารายละเอียดเดียว /receiving/[id] — ตั๋ว ERP ใช้ id, บัตรที่ยังไม่เปิดใช้เลขบัตรชั่ง */
function ticketDetailHref(ticket: WeighbridgeTicketListItem) {
  return isPendingT2900(ticket)
    ? `/receiving/${encodeURIComponent(ticket.referenceDocNo ?? ticket.ticketNo)}`
    : `/receiving/${ticket.id}`;
}

/** บัตรจากเครื่องชั่งที่ยังไม่เปิดตั๋ว → แถวหน้าตาเดียวกับตั๋ว ERP เพื่อใช้ตารางเดียวกัน */
function t2900ToListItem(
  row: T2900ErpOutboundTicket,
): WeighbridgeTicketListItem {
  return {
    id: `${PENDING_T2900_PREFIX}${row.TckNo}`,
    ticketNo: row.TckNo,
    ticketType: "PURCHASE_IN",
    status: "OPEN",
    sellerCode: row.CustID,
    sellerName: row.CustomerName || row.CustID,
    truckLicensePlate: row.TruckNo,
    scaleId: "",
    grossWeightKg: String(row.GrossWt ?? 0),
    tareWeightKg: String(row.TruckWt ?? 0),
    netWeightKg: String(row.NetWt ?? 0),
    createdAt: `${row.DateIn}T${row.TimeIn}`,
    weighOutAt: row.DateOut ? `${row.DateOut}T${row.TimeOut}` : undefined,
    flowState: row.canImport ? "T2900_READY" : "T2900_WAITING_OUT",
    origin: "T2900",
    referenceDocNo: row.TckNo,
  };
}

const FLOW_LABELS: Record<string, string> = {
  T2900_READY: "ยังไม่เปิดตั๋ว · พร้อมยืนยัน",
  T2900_WAITING_OUT: "ยังไม่เปิดตั๋ว · รอชั่งออก",
  WAITING_WEIGH_IN: "รอกรอกน้ำหนัก",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอกรอกน้ำหนัก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  WAITING_STOCK_IN: "รอเข้าคลัง",
  STOCK_REQUEST_PENDING: "รอคลังเลือกคลังและอนุมัติ",
  STOCK_POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

/**
 * ป้ายสถานะตามภาษาปัจจุบัน — "ยกเลิก" ในที่นี้คือสถานะ (Cancelled) ไม่ใช่ปุ่ม Cancel
 * เรียกตอน render เท่านั้น (ผู้เรียกใช้ useT/useLanguage อยู่แล้ว)
 */
function flowLabel(flow: string): string | undefined {
  const label = FLOW_LABELS[flow];
  if (label === undefined) {
    return undefined;
  }
  if (flow === "CANCELLED") {
    return getStoredLanguage() === "en" ? "Cancelled" : label;
  }
  return tNow(label);
}

/*
  ป้ายในคอลัมน์ "ดำเนินการ" ของแถวที่ไม่มีปุ่มให้กดแล้ว — บอก "ไปไหนต่อ" ไม่ใช่ "สถานะอะไร"

  ตั้งใจไม่ใช้ `nextAction` ของ backend มาเป็นข้อความ ทั้งที่มันมีอยู่แล้ว เพราะนั่นเป็น
  ประโยคบอกสถานะ ("รอคลังเลือกคลังและอนุมัติ") ซึ่งคอลัมน์ "สถานะ" พูดไปแล้วทั้งประโยค
  พูดซ้ำสองช่องในแถวเดียวกันทำให้อ่านรก และยาวจนดันเมนู ⋮ ตกบรรทัด แถวสูงกว่าแถวอื่น

  ส่วน "ปลายทาง" ยังใช้ `nextActionHref` จาก backend เหมือนเดิม — เวลา flow ย้ายหน้า
  จะได้ไม่ต้องตามแก้สองที่

  สถานะที่ไม่อยู่ใน map นี้ (เช่น ยกเลิก) = ไม่มีที่ให้ไปจริง ๆ แสดงขีดพอ
*/
const DEAD_END_BADGE: Record<string, { label: string; color: string }> = {
  STOCK_REQUEST_PENDING: { label: "ไปหน้าอนุมัติคลัง", color: "processing" },
  STOCK_POSTED: { label: "ดู Lot", color: "success" },
};

const STAGE_OPTIONS: {
  key: ReceivingStage;
  label: string;
  description: string;
}[] = [
  { key: "all", label: "ทั้งหมด", description: "ทุกรายการในช่วงที่เลือก" },
  {
    key: "pending-confirm",
    label: "รอยืนยัน",
    description: "บัตรจากเครื่องชั่งที่ยังไม่เปิดตั๋วและพร้อมยืนยัน",
  },
  {
    key: "payment",
    label: "รอจ่ายเงิน",
    description: "ยืนยันใบรับซื้อแล้ว รอจ่ายเงินให้ผู้ขาย",
  },
  {
    key: "warehouse",
    label: "รอเข้าคลัง",
    description: "รอบันทึกเข้าคลังหรือรอคลังอนุมัติ",
  },
  {
    key: "done",
    label: "สำเร็จ",
    description: "รับเข้าคลังแล้ว",
  },
];

const ACTION_STAGE_KEYS: Array<Exclude<ReceivingStage, "all">> = [
  "pending-confirm",
  "payment",
  "warehouse",
  "done",
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "เงินสด" },
  { value: "TRANSFER", label: "โอนเงิน" },
];

const SELECT_POPUP_STYLE = { root: { zIndex: 1400 } };

function parseStage(value: string | null): ReceivingStage {
  if (value === "pending-confirm") {
    return "pending-confirm";
  }
  if (value === "payment") {
    return "payment";
  }
  if (value === "warehouse") {
    return "warehouse";
  }
  if (value === "done") {
    return "done";
  }
  // URL เก่า (คัดแยก/ชั่ง) ไม่มีชิปแล้ว — ตีความเป็นทั้งหมด
  return "all";
}

/** ลิงก์เก่า /receiving?tab=t2900 ตีความเป็นตัวกรองที่มา = จากเครื่องชั่ง */
function parseSource(
  source: string | null,
  legacyTab: string | null,
): SourceFilter {
  if (source === "MANUAL" || source === "T2900" || source === "OCR") {
    return source;
  }
  return legacyTab === "t2900" ? "T2900" : "all";
}

/** เงื่อนไขเดียวกับปุ่มในคอลัมน์ "ชั่งน้ำหนัก" — ใช้ทั้ง filter และปุ่ม */
function getTicketActionFlags(ticket: WeighbridgeTicketListItem) {
  if (isPendingT2900(ticket)) {
    // ยังไม่มีตั๋ว/ใบรับซื้อใน ERP — ขั้นถัดไปคือเข้าไปตรวจและยืนยันเปิดตั๋ว (นับอยู่ในชุด "คัดแยกและชั่ง")
    return {
      locked: false,
      isPaid: false,
      canClassifyWeigh: true,
      canPay: false,
      canStockIn: false,
      canStockInRaw: false,
      stockPosted: false,
    };
  }
  const locked =
    ticket.status === "CANCELLED" || ticket.status === "CLOSED";
  // จ่ายเงินจริงเท่านั้น — อย่าใช้ STOCK_* เป็น proxy ของ PAID (เข้าคลังก่อนจ่ายได้)
  const isPaid =
    ticket.receiptPaymentStatus === "PAID" ||
    ticket.flowState === "PAYMENT_PAID";
  const stockPosted = ticket.receiptStockPostingStatus === "POSTED";
  // ล็อกชั่ง/คัดแยกเมื่อจ่ายแล้ว หรือรับเข้าคลังแล้ว
  const receiptConfirmed =
    ticket.receiptStatus === "CONFIRMED" ||
    ticket.receiptStatus === "APPROVED";
  const weightsLocked = locked || isPaid || stockPosted || receiptConfirmed;

  const canClassifyWeigh = !weightsLocked;
  const canPay =
    !locked &&
    !isPaid &&
    Boolean(ticket.receiptId) &&
    (ticket.receiptStatus === "CONFIRMED" ||
      ticket.receiptStatus === "APPROVED") &&
    ticket.receiptPaymentStatus !== "PAID";
  /*
    เข้าคลังได้หลังยืนยันยอดแล้ว — ไม่บังคับจ่ายเงินก่อน

    ต้องเช็ค `locked` ด้วย ไม่งั้นตั๋วที่ยกเลิกแล้วแต่ใบรับซื้อยัง CONFIRMED
    จะยังมีปุ่ม "เข้าคลัง" ให้กด แล้วเอาของเข้าคลังได้ทั้งที่รายการถูกยกเลิกไปแล้ว
    (backend ก็เพิ่งอุดด่านนี้เหมือนกันที่ assertSourceTicketNotCancelled —
    ตรงนี้แค่ไม่ให้ปุ่มโผล่มาหลอกให้กดแล้วเจอ error)
  */
  const canStockInRaw =
    !locked &&
    Boolean(ticket.receiptId) &&
    (ticket.receiptStatus === "CONFIRMED" ||
      ticket.receiptStatus === "APPROVED") &&
    ticket.receiptStockPostingStatus !== "POSTED" &&
    ticket.flowState !== "STOCK_REQUEST_PENDING";
  const canStockIn = canStockInRaw;

  return {
    locked,
    isPaid,
    canClassifyWeigh,
    canPay,
    canStockIn,
    canStockInRaw,
    stockPosted,
  };
}

function matchesStage(
  ticket: WeighbridgeTicketListItem,
  stage: ReceivingStage,
) {
  if (stage === "all") {
    return true;
  }

  const flags = getTicketActionFlags(ticket);
  const flow = ticket.flowState ?? "";

  switch (stage) {
    case "pending-confirm":
      return flow === "T2900_READY";
    case "payment":
      return flags.canPay || flow === "WAITING_PAYMENT";
    case "warehouse":
      return (
        flags.canStockIn ||
        flow === "STOCK_REQUEST_PENDING" ||
        flow === "WAITING_STOCK_IN"
      );
    case "done":
      return flags.stockPosted || flow === "STOCK_POSTED";
    default:
      return false;
  }
}

function matchesSearch(ticket: WeighbridgeTicketListItem, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return true;
  }

  const haystack = [
    ticket.ticketNo,
    ticket.sellerCode,
    ticket.sellerName,
    ticket.truckLicensePlate,
    ticket.driverName,
    ticket.receiptNo,
    ticket.scaleCode,
    ticket.scaleName,
    ticket.referenceDocNo,
    ticket.origin ? TICKET_ORIGIN_LABEL[ticket.origin] : undefined,
    ticket.origin ? tNow(TICKET_ORIGIN_LABEL[ticket.origin]) : undefined,
    FLOW_LABELS[ticket.flowState ?? ""] ?? ticket.flowState,
    flowLabel(ticket.flowState ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword);
}

function filterSelectOption(
  input: string,
  option?: { label?: string; value?: string },
) {
  const keyword = input.trim().toLowerCase();
  if (!keyword) {
    return true;
  }

  const label = String(option?.label ?? "").toLowerCase();
  return label.includes(keyword);
}

/** locale ตัวเลขตามภาษาปัจจุบัน — เรียกตอน render เท่านั้น */
const numberLocale = () => (getStoredLanguage() === "en" ? "en-GB" : "th-TH");

function formatMoney(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString(numberLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString(numberLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

type SideSheetProps = {
  open: boolean;
  width?: number;
  zIndex?: number;
  onClose: () => void;
  children: ReactNode;
};

function SideSheet({
  open,
  width = 480,
  zIndex = 1100,
  onClose,
  children,
}: SideSheetProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className={styles.sideSheetRoot} style={{ zIndex }} role="presentation">
      <button
        type="button"
        className={styles.sideSheetMask}
        aria-label={t("ปิดแผง")}
        onClick={() => onCloseRef.current()}
      />
      <aside
        className={styles.sideSheetPanel}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.sideSheetClose}
          aria-label={t("ปิด")}
          onClick={() => onCloseRef.current()}
        >
          <CloseOutlined />
        </button>
        {children}
      </aside>
    </div>,
    document.body,
  );
}

export default function WeighbridgeDashboardPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ticketForm] = Form.useForm<OpenTicketFormValues>();
  const [sellerForm] = Form.useForm<SellerFormValues>();
  const [truckForm] = Form.useForm<TruckFormValues>();
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);
  const [truckDrawerOpen, setTruckDrawerOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  // SideSheet unmounts Form when closed — use local state instead of Form.useWatch
  const [sellerId, setSellerId] = useState<string | undefined>();
  const [truckId, setTruckId] = useState<string | undefined>();
  const [ocrResult, setOcrResult] = useState<WeighTicketOcrResult | null>(null);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const scanOcrMutation = useScanWeighTicketOcrStandaloneMutation();

  const { message } = App.useApp();
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const stage = parseStage(searchParams.get("stage"));
  const source = parseSource(
    searchParams.get("source"),
    searchParams.get("tab"),
  );
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const showAll = searchParams.get("all") === "1";
  const legacyDateParam = searchParams.get("date")?.trim() || undefined;
  const fromParam = showAll
    ? undefined
    : searchParams.get("from")?.trim() || legacyDateParam || undefined;
  const toParam = showAll
    ? undefined
    : searchParams.get("to")?.trim() || legacyDateParam || undefined;

  const dashboardQuery = useWeighbridgeDashboardQuery(
    showAll
      ? { all: true }
      : fromParam || toParam
        ? { from: fromParam, to: toParam }
        : undefined,
  );

  // บัตรจากเครื่องชั่งในช่วงวันเดียวกัน (ไม่ระบุช่วง = วันนี้ · "ทั้งหมด" = ย้อนหลัง 30 วัน)
  const todayYmd = dayjs().format("YYYY-MM-DD");
  const t2900From = showAll
    ? dayjs().subtract(30, "day").format("YYYY-MM-DD")
    : (fromParam ?? toParam ?? todayYmd);
  const t2900To = showAll ? todayYmd : (toParam ?? fromParam ?? todayYmd);
  // มีบัตรเข้ามาใหม่/สถานะเปลี่ยน หลังบ้านส่งสัญญาณมา → ดึงตารางใหม่ทันที
  useT2900LiveUpdates();
  const t2900Query = useT2900OutboundTicketsQuery({
    dateFrom: t2900From,
    dateTo: t2900To,
    status: "ALL",
    page: 1,
    limit: 200,
  });
  const sellersQuery = useSellersQuery({ isActive: true });
  const sellerTypesQuery = useSellerTypesQuery({ isActive: true });
  const trucksQuery = useTrucksQuery(
    sellerId ? { sellerId, isActive: true } : undefined,
    { enabled: Boolean(sellerId) },
  );
  const scalesQuery = useWeighbridgeScalesQuery({ isActive: true });
  const createTicketMutation = useCreateWeighbridgeTicketMutation();
  const createSellerMutation = useCreateSellerMutation();
  const createTruckMutation = useCreateTruckMutation();

  const summary = dashboardQuery.data?.data.summary;
  const erpTickets = useMemo(
    () => dashboardQuery.data?.data.tickets ?? [],
    [dashboardQuery.data?.data.tickets],
  );
  // บัตรที่เปิดเป็นตั๋ว ERP แล้วอยู่ใน erpTickets อยู่แล้ว — ไม่ใส่ซ้ำ; บัตรที่ยกเลิกไม่แสดง
  const pendingT2900Tickets = useMemo(
    () =>
      (t2900Query.data?.data.items ?? [])
        .filter((row) => !row.alreadyImported && row.recordStatus !== "CANCELLED")
        .map(t2900ToListItem),
    [t2900Query.data?.data.items],
  );
  const t2900Truncated =
    (t2900Query.data?.data.total ?? 0) > (t2900Query.data?.data.items.length ?? 0);
  const tickets = useMemo(
    () =>
      [...erpTickets, ...pendingT2900Tickets]
        .filter((ticket) => source === "all" || ticket.origin === source)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [erpTickets, pendingT2900Tickets, source],
  );

  const sellers = sellersQuery.data?.data ?? [];
  const sellerTypes = sellerTypesQuery.data?.data ?? [];
  const trucks = trucksQuery.data?.data ?? [];
  const scales = scalesQuery.data?.data ?? [];

  const updateParams = (patch: {
    q?: string | null;
    stage?: ReceivingStage | null;
    from?: string | null;
    to?: string | null;
    all?: boolean | null;
    source?: SourceFilter | null;
  }) => {
    const next = new URLSearchParams(searchParams.toString());

    if (patch.q !== undefined) {
      const value = patch.q?.trim() ?? "";
      if (value) {
        next.set("q", value);
      } else {
        next.delete("q");
      }
    }

    if (patch.stage !== undefined) {
      if (patch.stage && patch.stage !== "all") {
        next.set("stage", patch.stage);
      } else {
        next.delete("stage");
      }
    }

    if (patch.all !== undefined) {
      if (patch.all) {
        next.set("all", "1");
        next.delete("date");
        next.delete("from");
        next.delete("to");
      } else {
        next.delete("all");
      }
    }

    if (patch.from !== undefined || patch.to !== undefined) {
      next.delete("date");
      next.delete("all");
      const fromValue =
        patch.from !== undefined
          ? patch.from?.trim() ?? ""
          : next.get("from")?.trim() ?? "";
      const toValue =
        patch.to !== undefined
          ? patch.to?.trim() ?? ""
          : next.get("to")?.trim() ?? "";

      if (fromValue) {
        next.set("from", fromValue);
      } else {
        next.delete("from");
      }
      if (toValue) {
        next.set("to", toValue);
      } else {
        next.delete("to");
      }
    }

    if (patch.source !== undefined) {
      // ตัวกรองใหม่แทนพารามิเตอร์ tab เดิมเสมอ
      next.delete("tab");
      if (patch.source && patch.source !== "all") {
        next.set("source", patch.source);
      } else {
        next.delete("source");
      }
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextValue = searchDraft.trim();
      const currentValue = searchParams.get("q")?.trim() ?? "";
      if (nextValue === currentValue) {
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      if (nextValue) {
        next.set("q", nextValue);
      } else {
        next.delete("q");
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, searchParams, pathname, router]);

  const stageCounts = useMemo(() => {
    const counts: Record<ReceivingStage, number> = {
      all: tickets.length,
      "pending-confirm": 0,
      payment: 0,
      warehouse: 0,
      done: 0,
    };
    for (const ticket of tickets) {
      for (const key of ACTION_STAGE_KEYS) {
        if (matchesStage(ticket, key)) {
          counts[key] += 1;
        }
      }
    }
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          matchesStage(ticket, stage) && matchesSearch(ticket, searchQuery),
      ),
    // t เปลี่ยนตามภาษา — ป้ายสถานะที่ใช้ค้นหาต้องคำนวณใหม่
    [tickets, stage, searchQuery],
  );

  const selectedTruck = useMemo(
    () => trucks.find((truck) => truck.id === truckId) ?? null,
    [trucks, truckId],
  );

  const sellerOptions = useMemo(
    () =>
      sellers.map((seller) => ({
        value: seller.id,
        label: `${seller.sellerCode} — ${seller.sellerName}`,
      })),
    [sellers],
  );

  const sellerTypeOptions = useMemo(
    () =>
      sellerTypes.map((item) => ({
        value: item.id,
        label: `${item.sellerTypeCode} — ${item.sellerTypeName}`,
      })),
    [sellerTypes],
  );

  const truckOptions = useMemo(
    () =>
      trucks.map((truck) => ({
        value: truck.id,
        label: `${truck.licensePlate}${truck.truckCode ? ` (${truck.truckCode})` : ""}`,
      })),
    [trucks],
  );

  const scaleOptions = useMemo(
    () =>
      scales.map((scale) => ({
        value: scale.id,
        label: `${scale.scaleCode} — ${scale.scaleName}`,
      })),
    [scales],
  );

  useEffect(() => {
    if (!ticketDrawerOpen) {
      return;
    }
    ticketForm.resetFields();
    setSellerId(undefined);
    setTruckId(undefined);
  }, [ticketDrawerOpen, ticketForm]);

  useEffect(() => {
    if (!sellerDrawerOpen) {
      return;
    }
    sellerForm.setFieldsValue({
      code: "",
      name: "",
      sellerTypeId: undefined,
      taxId: "",
      phone: "",
      email: "",
      address: "",
      contactName: "",
      paymentMethod: undefined,
      remark: "",
      isActive: true,
    });
  }, [sellerDrawerOpen, sellerForm]);

  useEffect(() => {
    if (!truckDrawerOpen) {
      return;
    }
    truckForm.setFieldsValue({
      code: "",
      licensePlate: "",
      province: "",
      truckType: undefined,
      driverName: "",
      driverPhone: "",
      tareWeightKg: undefined,
      isActive: true,
    });
  }, [truckDrawerOpen, truckForm]);

  const summaryCards = [
    {
      key: "all" as ReceivingStage,
      label: showAll ? t("รถเข้าทั้งหมด") : t("รถเข้าวันนี้"),
      value: tickets.length,
    },
    {
      key: "pending-confirm" as ReceivingStage,
      label: t("รอยืนยัน"),
      value: stageCounts["pending-confirm"],
    },
    {
      key: "payment" as ReceivingStage,
      label: t("รอจ่ายเงิน"),
      value: stageCounts.payment,
    },
    {
      key: "warehouse" as ReceivingStage,
      label: t("รอเข้าคลัง"),
      value: stageCounts.warehouse,
    },
    {
      key: "done" as ReceivingStage,
      label: t("สำเร็จ"),
      value: stageCounts.done,
    },
  ];

  const openTicketDrawer = () => {
    setSellerDrawerOpen(false);
    setTicketDrawerOpen(true);
  };

  const closeTicketDrawer = () => {
    setSellerDrawerOpen(false);
    setTruckDrawerOpen(false);
    setTicketDrawerOpen(false);
    setSellerId(undefined);
    setTruckId(undefined);
  };

  const handleTicketSheetClose = () => {
    if (truckDrawerOpen) {
      setTruckDrawerOpen(false);
      return;
    }
    if (sellerDrawerOpen) {
      setSellerDrawerOpen(false);
      return;
    }
    closeTicketDrawer();
  };

  const handleSellerChange = (value?: string) => {
    setSellerId(value);
    setTruckId(undefined);
    if (ticketDrawerOpen) {
      ticketForm.setFieldsValue({ truckId: undefined });
    }
  };

  const handleSubmitTicket = async (values: OpenTicketFormValues) => {
    await createTicketMutation.mutateAsync({
      sellerId: values.sellerId,
      truckId: values.truckId,
      scaleId: values.scaleId,
      remark: values.remark?.trim() || undefined,
    });
    closeTicketDrawer();
  };

  const handleCreateSeller = async () => {
    const values = await sellerForm.validateFields();
    const payload: CreateSellerRequest = {
      code: values.code.trim(),
      name: values.name.trim(),
      sellerTypeId: values.sellerTypeId || undefined,
      taxId: values.taxId?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      paymentMethod: values.paymentMethod || undefined,
      remark: values.remark?.trim() || undefined,
      isActive: values.isActive,
    };

    createSellerMutation.mutate(payload, {
      onSuccess: (response) => {
        setSellerId(response.data.id);
        setTruckId(undefined);
        if (ticketDrawerOpen) {
          ticketForm.setFieldsValue({
            sellerId: response.data.id,
            truckId: undefined,
          });
        }
        setSellerDrawerOpen(false);
      },
    });
  };

  const handleCreateTruck = async () => {
    if (!sellerId) {
      return;
    }

    const values = await truckForm.validateFields();
    const payload: CreateTruckRequest = {
      code: values.code.trim(),
      licensePlate: values.licensePlate.trim(),
      sellerId,
      province: values.province?.trim() || undefined,
      truckType: values.truckType || undefined,
      driverName: values.driverName?.trim() || undefined,
      driverPhone: values.driverPhone?.trim() || undefined,
      tareWeightKg:
        values.tareWeightKg === undefined || values.tareWeightKg === null
          ? undefined
          : values.tareWeightKg,
      isActive: values.isActive,
    };

    createTruckMutation.mutate(payload, {
      onSuccess: (response) => {
        setTruckId(response.data.id);
        if (ticketDrawerOpen) {
          ticketForm.setFieldsValue({ truckId: response.data.id });
        }
        setTruckDrawerOpen(false);
      },
    });
  };

  const activeStageLabel = t(
    STAGE_OPTIONS.find((item) => item.key === stage)?.label ?? "ทั้งหมด",
  );
  const dateRangeValue: [Dayjs, Dayjs] | null =
    fromParam && toParam ? [dayjs(fromParam), dayjs(toParam)] : null;
  const dateLabel = (() => {
    if (showAll) return t("ทั้งหมด");
    if (!fromParam && !toParam) return t("วันนี้");
    if (fromParam && toParam && fromParam === toParam) {
      return dayjs(fromParam).format("DD/MM/YYYY");
    }
    if (fromParam && toParam) {
      return `${dayjs(fromParam).format("DD/MM/YYYY")} – ${dayjs(toParam).format("DD/MM/YYYY")}`;
    }
    return dayjs(fromParam ?? toParam).format("DD/MM/YYYY");
  })();

  const columns: ColumnsType<WeighbridgeTicketListItem> = [
    {
      title: t("ลำดับ"),
      key: "rowNo",
      width: 72,
      align: "center",
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t("เลขตั๋ว"),
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 150,
    },
    {
      title: t("ที่มา"),
      key: "origin",
      width: 120,
      render: (_value, record) => {
        const origin = record.origin ?? "MANUAL";
        return (
          <Tag color={TICKET_ORIGIN_COLOR[origin]}>
            {t(TICKET_ORIGIN_LABEL[origin])}
          </Tag>
        );
      },
    },
    {
      title: t("ผู้ขาย"),
      key: "seller",
      width: 180,
      render: (_value, record) =>
        record.sellerName
          ? `${record.sellerCode ?? ""} ${record.sellerName}`.trim()
          : "-",
    },
    {
      title: t("ทะเบียน"),
      dataIndex: "truckLicensePlate",
      key: "truckLicensePlate",
      width: 120,
      render: (value?: string) => value || "-",
    },
    {
      title: t("คนขับ"),
      dataIndex: "driverName",
      key: "driverName",
      width: 140,
      render: (value?: string) => value || "-",
    },
    {
      title: t("เครื่องชั่ง"),
      key: "scale",
      width: 160,
      render: (_value, record) =>
        record.scaleName
          ? `${record.scaleCode ?? ""} ${record.scaleName}`.trim()
          : "-",
    },
    {
      title: t("สถานะ"),
      dataIndex: "flowState",
      key: "flowState",
      width: 130,
      render: (value?: string) => (
        <Tag className={styles.flowTag}>
          {flowLabel(value ?? "OTHER") ?? value ?? "-"}
        </Tag>
      ),
    },
    {
      title: t("น้ำหนักสุทธิ"),
      dataIndex: "netWeightKg",
      key: "netWeightKg",
      width: 120,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: t("เวลาสร้าง"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) =>
        value
          ? new Date(value).toLocaleString(lang === "en" ? "en-GB" : "th-TH")
          : "-",
    },
    {
      title: t("ดำเนินการ"),
      key: "weighActions",
      width: 190,
      fixed: "right",
      render: (_value, record) => {
        if (isPendingT2900(record)) {
          const ready = record.flowState === "T2900_READY";
          return (
            <Button
              size="small"
              type={ready ? "primary" : "default"}
              onClick={() => router.push(ticketDetailHref(record))}
            >
              {ready ? t("ดูและยืนยัน") : t("ดูรายละเอียด")}
            </Button>
          );
        }
        const {
          isPaid,
          canClassifyWeigh,
          canPay,
          canStockIn,
          canStockInRaw,
          stockPosted,
        } = getTicketActionFlags(record);

        const goClassify = () => router.push(ticketDetailHref(record));
        const goPay = () =>
          router.push(`/receiving/receipts/${record.receiptId}/payment`);
        const goStockIn = () => {
          if (!canStockIn || !canStockInRaw || !record.receiptId) {
            return;
          }
          router.push(
            `/raw-tire-purchase/receipts/${record.receiptId}/stock-posting-request`,
          );
        };

        // ปุ่มหลัก = ขั้นแรกที่ทำได้ตามลำดับสายงาน ชั่ง → จ่ายเงิน → เข้าคลัง
        // อีกสองอันเข้าเมนู โดยคง disabled ไว้เพื่อให้ label บอกสถานะได้เหมือนเดิม
        const primaryStage = canClassifyWeigh
          ? "classify"
          : canPay
            ? "pay"
            : canStockIn
              ? "stockIn"
              : null;

        const primaryLabel =
          primaryStage === "classify"
            ? t("คัดแยกและชั่ง")
            : primaryStage === "pay"
              ? t("ออกใบจ่ายเงิน")
              : t("เข้าคลัง");

        const primaryAction =
          primaryStage === "classify"
            ? goClassify
            : primaryStage === "pay"
              ? goPay
              : goStockIn;

        /*
          ไม่มีปุ่มให้กดแล้ว = ใส่ป้ายบอกว่าใครถืองานต่อ แทนที่จะเหลือแต่ ⋮ ลอย ๆ
          ซึ่งหน้าตาเหมือนปุ่มตั้งค่าที่กดแล้วไม่มีอะไรเกิดขึ้น

          ใช้ช่อง primary เพราะเป็นตำแหน่งเดียวกับที่ปุ่มหลักเคยอยู่ (ซ้ายเมนู ⋮)
          จึงไม่ต้องเพิ่ม prop ให้ RowActionsMenu ซึ่งเป็น component กลางของหลายหน้า

          ข้อความกับปลายทางมาจาก backend ทั้งคู่ (nextAction / nextActionHref ที่
          resolveRawTireFlowTracking คำนวณให้) — ไม่ map สถานะเองซ้ำ จะได้ไม่หลุดกัน
        */
        const deadEndBadge = (() => {
          if (primaryStage) {
            return null;
          }
          const badge = DEAD_END_BADGE[record.flowState ?? ""];
          // ไม่มีปลายทาง (ยกเลิกแล้ว) — ขีดเดียวพอ อย่าใส่ป้ายที่กดไม่ได้ให้หลอกตา
          if (!badge || !record.nextActionHref) {
            return <span className={styles.deadEndDash}>—</span>;
          }
          return (
            <Link href={record.nextActionHref} className={styles.deadEndLink}>
              <Tag color={badge.color} className={styles.flowTag}>
                {t(badge.label)}
              </Tag>
            </Link>
          );
        })();

        return (
          <RowActionsMenu
            className={styles.tableActions}
            ariaLabel={t("เมนูดำเนินการ {no}", { no: record.ticketNo })}
            primary={
              primaryStage ? (
                <Button size="small" type="primary" onClick={primaryAction}>
                  {primaryLabel}
                </Button>
              ) : (
                deadEndBadge
              )
            }
            actions={[
              primaryStage !== "classify" && {
                key: "classify",
                label: t("คัดแยกและชั่ง"),
                disabled: !canClassifyWeigh,
                disabledReason: t("ยืนยัน/จ่ายเงิน/เข้าคลังแล้ว — แก้น้ำหนักไม่ได้"),
                onClick: goClassify,
              },
              primaryStage !== "pay" && {
                key: "pay",
                label: isPaid ? t("จ่ายแล้ว") : t("ออกใบจ่ายเงิน"),
                disabled: !canPay,
                onClick: goPay,
              },
              primaryStage !== "stockIn" && {
                key: "stockIn",
                label: stockPosted ? t("เข้าคลังแล้ว") : t("เข้าคลัง"),
                disabled: !canStockIn,
                onClick: goStockIn,
              },
            ]}
          />
        );
      },
    },
  ];

  // ปล่อย object URL ของรูปตัวอย่างเมื่อปิด popup หรือออกจากหน้า
  useEffect(() => {
    if (!ocrPreviewUrl) {
      return;
    }
    return () => URL.revokeObjectURL(ocrPreviewUrl);
  }, [ocrPreviewUrl]);

  const closeOcrModal = () => {
    setOcrResult(null);
    setOcrPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  };

  const handleScanFromDashboard = (file: File, previewUrl: string) => {
    void (async () => {
      try {
        const data = await scanOcrMutation.mutateAsync(file);
        setOcrPreviewUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return previewUrl;
        });
        setOcrResult(data);
      } catch {
        // hook แจ้ง error ให้แล้ว แค่ทิ้งรูปตัวอย่างที่สร้างไว้
        URL.revokeObjectURL(previewUrl);
      }
    })();
  };

  return (
    <MasterPageGate
      isLoading={dashboardQuery.isLoading}
    >
      <DailySummaryReportModal
        open={dailySummaryOpen}
        onClose={() => setDailySummaryOpen(false)}
        initialDateFrom={t2900From}
        initialDateTo={t2900To}
      />
      <section className={styles.page}>
        <PageHeader
          eyebrow="Receiving"
          icon={<CarOutlined />}
          title={t("รับซื้อยาง")}
          subtitle={`${dateLabel}${searchQuery ? ` · ${t("ค้นหา")} “${searchQuery}”` : ""} · ${t("ตั๋วที่เปิดเองและบัตรจากเครื่องชั่งอยู่ในตารางเดียวกัน กดแถวเพื่อดูรายละเอียด")}`}
          controls={
                    <div className={styles.scopeSwitch}>
            <span
              className={[
                styles.scopeSwitchLabel,
                !showAll ? styles.scopeSwitchLabelActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {t("วันนี้")}
            </span>
            <Switch
              checked={showAll}
              onChange={(checked) => {
                if (checked) {
                  updateParams({ all: true });
                  return;
                }
                updateParams({ all: false, from: null, to: null });
              }}
              aria-label={t("สลับแสดงทั้งหมดหรือแค่วันนี้")}
            />
            <span
              className={[
                styles.scopeSwitchLabel,
                showAll ? styles.scopeSwitchLabelActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {t("ทั้งหมด")}
            </span>
          </div>
          }
          actions={
            <>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => setDailySummaryOpen(true)}
            >
              {t("รายงานสรุปประจำวัน")}
            </Button>
            <Button
              className={styles.dashboardButton}
              icon={<BarChartOutlined />}
              onClick={() => router.push("/receiving/dashboard")}
            >
              Dashboard
            </Button>
            {SHOW_OPEN_TICKET_FROM_IMAGE ? (
              <OpenTicketFromImageAction
                pending={scanOcrMutation.isPending}
                onScan={handleScanFromDashboard}
              />
            ) : null}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={styles.openTicketButton}
              onClick={openTicketDrawer}
            >
              {t("เปิดตั๋วชั่ง")}
            </Button>
            </>
          }
        />

          <>
        <div className={styles.statsStrip}>
          <div className={styles.statHighlight}>
            <span>{t("น้ำหนักรวม")}</span>
            <strong>
              {formatWeight(summary?.totalNetWeightKgToday ?? "0")}
              <small> {t("กก.")}</small>
            </strong>
          </div>
          <div className={[styles.statHighlight, styles.statHighlightAccent].join(" ")}>
            <span>{t("ยอดเงินรวม")}</span>
            <strong>
              {formatMoney(summary?.totalAmountToday ?? "0")}
              <small> {t("บาท")}</small>
            </strong>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          {summaryCards.map((card) => {
            const active =
              card.key === "all" ? stage === "all" : stage === card.key;
            return (
              <button
                key={card.key}
                type="button"
                className={[
                  styles.summaryCard,
                  styles.summaryCardButton,
                  active ? styles.summaryCardActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  updateParams({
                    stage: card.key === stage ? "all" : card.key,
                  });
                }}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </button>
            );
          })}
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>{t("รายการรับซื้อยาง")}</h3>
              <p>
                {t("ดูรายการ{stage} · {n} รายการ", {
                  stage: activeStageLabel,
                  n: filteredTickets.length,
                })}
              </p>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterTop}>
              <div className={styles.filterField}>
                <span>{t("ค้นหา")}</span>
                <Input
                  allowClear
                  value={searchDraft}
                  prefix={<SearchOutlined />}
                  placeholder={t("เลขตั๋ว ผู้ขาย ทะเบียนรถ คนขับ ใบรับซื้อ")}
                  className={styles.filterSearch}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
              </div>
              <div className={styles.filterField}>
                <span>{t("ช่วงวันทำงาน")}</span>
                <RangePicker
                  allowClear
                  value={dateRangeValue}
                  format="DD/MM/YYYY"
                  placeholder={[t("เริ่มต้น"), t("สิ้นสุด")]}
                  className={styles.filterDateRange}
                  onChange={(values) => {
                    if (!values || !values[0] || !values[1]) {
                      updateParams({ from: null, to: null, all: false });
                      return;
                    }
                    updateParams({
                      from: values[0].format("YYYY-MM-DD"),
                      to: values[1].format("YYYY-MM-DD"),
                      all: false,
                    });
                  }}
                />
              </div>
              <div className={styles.filterField}>
                <span>{t("ที่มา")}</span>
                <Select
                  value={source}
                  options={SOURCE_OPTIONS.map((o) => ({
                    ...o,
                    label: t(o.label),
                  }))}
                  className={styles.productSelect}
                  onChange={(value) => updateParams({ source: value })}
                />
              </div>
            </div>
            <div className={styles.stageStrip}>
              <span className={styles.stageStripLabel}>{t("ขั้นตอน")}</span>
              <div className={styles.stageChips}>
                {STAGE_OPTIONS.map((option) => {
                  const active = stage === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={[
                        styles.stageChip,
                        active ? styles.stageChipActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        updateParams({ stage: option.key });
                      }}
                      title={t(option.description)}
                    >
                      <span>{t(option.label)}</span>
                      <em>{stageCounts[option.key]}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            {t2900Query.isError ? (
              <Typography.Text type="warning" style={{ display: "block", marginBottom: 8 }}>
                {t("โหลดบัตรจากเครื่องชั่งไม่สำเร็จ — แสดงเฉพาะตั๋วในระบบ")}
              </Typography.Text>
            ) : t2900Truncated ? (
              <Typography.Text type="warning" style={{ display: "block", marginBottom: 8 }}>
                {t("บัตรจากเครื่องชั่งในช่วงนี้มีมากกว่าที่แสดง (สูงสุด 200 ใบ) — เลือกช่วงวันที่ให้แคบลง")}
              </Typography.Text>
            ) : null}
            {dashboardQuery.isError ? (
              <Typography.Text type="danger">
                {dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : t("โหลดข้อมูลไม่สำเร็จ")}
              </Typography.Text>
            ) : (
              <Table
                rowKey="id"
                size="middle"
                columns={columns}
                dataSource={filteredTickets}
                loading={dashboardQuery.isFetching || t2900Query.isFetching}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 1290 }}
                locale={{
                  emptyText:
                    searchQuery || stage !== "all" || source !== "all"
                      ? t("ไม่พบรายการตามเงื่อนไขที่เลือก")
                      : t("ยังไม่มีตั๋วชั่งวันนี้"),
                }}
                onRow={(record) => {
                  if (stage === "warehouse") {
                    const { canStockIn, canStockInRaw } =
                      getTicketActionFlags(record);
                    return {
                      onClick: () => {
                        if (!canStockIn || !canStockInRaw || !record.receiptId) {
                          return;
                        }
                        router.push(
                          `/raw-tire-purchase/receipts/${record.receiptId}/stock-posting-request`,
                        );
                      },
                      className: canStockIn ? styles.clickableRow : undefined,
                      style: canStockIn ? undefined : { cursor: "default" },
                    };
                  }

                  return {
                    onClick: () => router.push(ticketDetailHref(record)),
                    className: styles.clickableRow,
                  };
                }}
              />
            )}
          </div>
        </div>
          </>
      </section>

      <SideSheet
        open={ticketDrawerOpen}
        width={480}
        onClose={handleTicketSheetClose}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHero}>
            <span className={styles.drawerEyebrow}>OPEN TICKET</span>
            <h2>{t("เปิดตั๋วชั่ง")}</h2>
            <p>{t("เลือกผู้ขาย รถบรรทุก และเครื่องชั่งเพื่อเริ่มรับซื้อยาง")}</p>
          </div>

          <Form
            form={ticketForm}
            layout="vertical"
            onFinish={handleSubmitTicket}
            requiredMark="optional"
            className={styles.drawerForm}
          >
            <Form.Item label={t("ผู้ขาย")} required>
              <div className={styles.sellerFieldRow}>
                <Form.Item
                  name="sellerId"
                  noStyle
                  rules={[{ required: true, message: t("กรุณาเลือกผู้ขาย") }]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    optionFilterProp="label"
                    filterOption={filterSelectOption}
                    placeholder={t("พิมพ์ค้นหาหรือเลือกผู้ขาย")}
                    loading={sellersQuery.isLoading}
                    options={sellerOptions}
                    notFoundContent={t("ไม่พบผู้ขาย")}
                    onChange={handleSellerChange}
                    className={styles.sellerSelect}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>

                <Button
                  size="large"
                  icon={<UserAddOutlined />}
                  onClick={() => setSellerDrawerOpen(true)}
                  className={styles.addSellerButton}
                >
                  {t("เพิ่ม")}
                </Button>
              </div>
            </Form.Item>

            <Form.Item label={t("รถบรรทุก")} required>
              <div className={styles.sellerFieldRow}>
                <Form.Item
                  name="truckId"
                  noStyle
                  rules={[{ required: true, message: t("กรุณาเลือกรถบรรทุก") }]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    optionFilterProp="label"
                    filterOption={filterSelectOption}
                    placeholder={
                      sellerId
                        ? t("พิมพ์ค้นหาหรือเลือกรถบรรทุก")
                        : t("เลือกผู้ขายก่อน")
                    }
                    disabled={!sellerId}
                    loading={trucksQuery.isLoading}
                    options={truckOptions}
                    notFoundContent={t("ไม่พบรถบรรทุก")}
                    onChange={(value) => setTruckId(value)}
                    className={styles.sellerSelect}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>

                <Button
                  size="large"
                  icon={<CarOutlined />}
                  disabled={!sellerId}
                  onClick={() => setTruckDrawerOpen(true)}
                  className={styles.addSellerButton}
                >
                  {t("เพิ่ม")}
                </Button>
              </div>
            </Form.Item>

            <Form.Item
              label={t("เครื่องชั่ง")}
              name="scaleId"
              rules={[{ required: true, message: t("กรุณาเลือกเครื่องชั่ง") }]}
            >
              <Select
                showSearch
                allowClear
                size="large"
                optionFilterProp="label"
                filterOption={filterSelectOption}
                placeholder={t("พิมพ์ค้นหาหรือเลือกเครื่องชั่ง")}
                loading={scalesQuery.isLoading}
                options={scaleOptions}
                notFoundContent={t("ไม่พบเครื่องชั่ง")}
                styles={{ popup: SELECT_POPUP_STYLE }}
              />
            </Form.Item>

            <Form.Item label={t("หมายเหตุ")} name="remark">
              <Input.TextArea
                rows={3}
                placeholder={t("ระบุหมายเหตุถ้ามี")}
                maxLength={2000}
              />
            </Form.Item>

            {selectedTruck ? <TruckPreview truck={selectedTruck} /> : null}

            <div className={styles.drawerFooter}>
              <Button size="large" onClick={closeTicketDrawer}>
                {t("ยกเลิก")}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className={styles.submitButton}
                loading={createTicketMutation.isPending}
              >
                {t("เปิดตั๋วชั่ง")}
              </Button>
            </div>
          </Form>
        </div>
      </SideSheet>

      <SideSheet
        open={sellerDrawerOpen}
        width={440}
        zIndex={1200}
        onClose={() => setSellerDrawerOpen(false)}
      >
        <div className={styles.drawerPanel}>
          <div className={`${styles.drawerHero} ${styles.sellerHero}`}>
            <span className={styles.drawerEyebrow}>NEW SELLER</span>
            <h2>{t("เพิ่มผู้ขาย")}</h2>
            <p>{t("กรอกข้อมูลผู้ขาย แล้วระบบจะเลือกให้อัตโนมัติ")}</p>
          </div>

          <Form
            form={sellerForm}
            layout="vertical"
            requiredMark="optional"
            className={styles.drawerForm}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={t("รหัสผู้ขาย")}
                  name="code"
                  rules={[
                    { required: true, message: t("กรุณากรอกรหัสผู้ขาย") },
                    { max: 100, message: t("รหัสต้องไม่เกิน 100 ตัวอักษร") },
                  ]}
                >
                  <Input size="large" placeholder={t("เช่น SEL002")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("ประเภทผู้ขาย")} name="sellerTypeId">
                  <Select
                    allowClear
                    size="large"
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("เลือกประเภท")}
                    loading={sellerTypesQuery.isLoading}
                    options={sellerTypeOptions}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label={t("ชื่อผู้ขาย")}
                  name="name"
                  rules={[
                    { required: true, message: t("กรุณากรอกชื่อผู้ขาย") },
                    { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
                  ]}
                >
                  <Input size="large" placeholder={t("เช่น หจก. รับซื้อยาง ABC")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("เลขผู้เสียภาษี")} name="taxId">
                  <Input size="large" placeholder={t("เลขประจำตัวผู้เสียภาษี")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("ชื่อผู้ติดต่อ")} name="contactName">
                  <Input size="large" placeholder={t("เช่น คุณสมชาย")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("เบอร์โทร")} name="phone">
                  <Input size="large" placeholder="0812345678" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t("อีเมล")}
                  name="email"
                  rules={[{ type: "email", message: t("รูปแบบอีเมลไม่ถูกต้อง") }]}
                >
                  <Input size="large" placeholder="seller@example.com" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label={t("วิธีชำระเงิน")} name="paymentMethod">
                  <Select
                    allowClear
                    size="large"
                    placeholder={t("เลือกวิธีชำระเงิน")}
                    options={PAYMENT_METHOD_OPTIONS.map((o) => ({
                      ...o,
                      label: t(o.label),
                    }))}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label={t("ที่อยู่")} name="address">
                  <Input.TextArea rows={2} placeholder={t("ที่อยู่ผู้ขาย")} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label={t("หมายเหตุ")} name="remark">
                  <Input.TextArea rows={2} placeholder={t("หมายเหตุเพิ่มเติม")} />
                </Form.Item>
              </Col>
            </Row>

            <div className={styles.statusRow}>
              <div>
                <strong>{t("สถานะใช้งาน")}</strong>
                <span>{t("เปิดเพื่อให้เลือกในเอกสารได้")}</span>
              </div>
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
              </Form.Item>
            </div>

            <div className={styles.drawerFooter}>
              <Button size="large" onClick={() => setSellerDrawerOpen(false)}>
                {t("ยกเลิก")}
              </Button>
              <Button
                type="primary"
                size="large"
                className={styles.submitButton}
                loading={createSellerMutation.isPending}
                onClick={handleCreateSeller}
              >
                {t("บันทึกผู้ขาย")}
              </Button>
            </div>
          </Form>
        </div>
      </SideSheet>

      <SideSheet
        open={truckDrawerOpen}
        width={440}
        zIndex={1200}
        onClose={() => setTruckDrawerOpen(false)}
      >
        <div className={styles.drawerPanel}>
          <div className={`${styles.drawerHero} ${styles.sellerHero}`}>
            <span className={styles.drawerEyebrow}>NEW TRUCK</span>
            <h2>{t("เพิ่มรถบรรทุก")}</h2>
            <p>
              {t("กรอกข้อมูลรถของ {seller} แล้วระบบจะเลือกให้อัตโนมัติ", {
                seller:
                  sellerOptions.find((s) => s.value === sellerId)?.label ??
                  t("ผู้ขายที่เลือก"),
              })}
            </p>
          </div>

          <Form
            form={truckForm}
            layout="vertical"
            requiredMark="optional"
            className={styles.drawerForm}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={t("รหัสรถ")}
                  name="code"
                  rules={[
                    { required: true, message: t("กรุณากรอกรหัสรถ") },
                    { max: 100, message: t("รหัสต้องไม่เกิน 100 ตัวอักษร") },
                  ]}
                >
                  <Input size="large" placeholder={t("เช่น TRK-001")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t("ทะเบียนรถ")}
                  name="licensePlate"
                  rules={[
                    { required: true, message: t("กรุณากรอกทะเบียนรถ") },
                    { max: 100, message: t("ทะเบียนต้องไม่เกิน 100 ตัวอักษร") },
                  ]}
                >
                  <Input size="large" placeholder={t("เช่น กข-1234")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t("จังหวัด")}
                  name="province"
                  rules={[{ max: 100, message: t("ต้องไม่เกิน 100 ตัวอักษร") }]}
                >
                  <Input size="large" placeholder={t("เช่น สมุทรปราการ")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("ประเภทรถ")} name="truckType">
                  <Select
                    allowClear
                    size="large"
                    placeholder={t("เลือกประเภท")}
                    options={TRUCK_TYPE_OPTIONS.map((o) => ({
                      ...o,
                      label: t(o.label),
                    }))}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label={t("น้ำหนักรถเปล่า (กก.)")}
                  name="tareWeightKg"
                  rules={[
                    {
                      type: "number",
                      min: 0,
                      message: t("น้ำหนักต้องไม่ติดลบ"),
                    },
                  ]}
                >
                  <InputNumber
                    size="large"
                    min={0}
                    step={0.001}
                    style={{ width: "100%" }}
                    placeholder={t("เช่น 8500.5")}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t("ชื่อคนขับ")}
                  name="driverName"
                  rules={[{ max: 255, message: t("ต้องไม่เกิน 255 ตัวอักษร") }]}
                >
                  <Input size="large" placeholder={t("เช่น สมชาย ใจดี")} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t("เบอร์โทรคนขับ")}
                  name="driverPhone"
                  rules={[{ max: 100, message: t("ต้องไม่เกิน 100 ตัวอักษร") }]}
                >
                  <Input size="large" placeholder={t("เช่น 0812345678")} />
                </Form.Item>
              </Col>
            </Row>

            <div className={styles.statusRow}>
              <div>
                <strong>{t("สถานะใช้งาน")}</strong>
                <span>{t("เปิดเพื่อให้เลือกในเอกสารได้")}</span>
              </div>
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
              </Form.Item>
            </div>

            <div className={styles.drawerFooter}>
              <Button size="large" onClick={() => setTruckDrawerOpen(false)}>
                {t("ยกเลิก")}
              </Button>
              <Button
                type="primary"
                size="large"
                className={styles.submitButton}
                loading={createTruckMutation.isPending}
                onClick={handleCreateTruck}
              >
                {t("บันทึกรถ")}
              </Button>
            </div>
          </Form>
        </div>
      </SideSheet>
      {ocrResult ? (
        <CreateTicketFromOcrModal
          result={ocrResult}
          previewUrl={ocrPreviewUrl}
          onClose={closeOcrModal}
          onCreated={(ticket) => {
            closeOcrModal();
            router.push(ticket.nextActionHref ?? `/receiving/${ticket.id}`);
          }}
        />
      ) : null}
    </MasterPageGate>
  );
}

function TruckPreview({ truck }: { truck: Truck }) {
  const t = useT();
  return (
    <div className={styles.previewBox}>
      <h4>{t("ข้อมูลรถที่เลือก")}</h4>
      <div className={styles.previewGrid}>
        <div className={styles.previewItem}>
          <span>{t("ทะเบียน")}</span>
          <strong>{truck.licensePlate || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>{t("จังหวัด")}</span>
          <strong>{truck.province || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>{t("คนขับ")}</span>
          <strong>{truck.driverName || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>{t("เบอร์โทร")}</span>
          <strong>{truck.driverPhone || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>{t("ประเภทรถ")}</span>
          <strong>{truck.truckType || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>{t("น้ำหนักรถเปล่า (กก.)")}</span>
          <strong>
            {truck.tareWeightKg !== undefined && truck.tareWeightKg !== null
              ? String(truck.tareWeightKg)
              : "-"}
          </strong>
        </div>
      </div>
    </div>
  );
}
