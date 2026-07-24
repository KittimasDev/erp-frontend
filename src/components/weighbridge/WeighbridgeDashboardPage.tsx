"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Badge,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  BarChartOutlined,
  CarOutlined,
  CloseOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateWeighbridgeTicketMutation } from "@/hooks/weighbridge-tickets/useCreateWeighbridgeTicketMutation";
import { useWeighbridgeDashboardQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { useCreateSellerMutation } from "@/hooks/sellers/useCreateSellerMutation";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useSellerTypesQuery } from "@/hooks/seller-types/useSellerTypesQuery";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useWeighbridgeScalesQuery } from "@/hooks/weighbridge-scales/useWeighbridgeScalesQuery";
import {
  useProductionOutputPendingTicketsQuery,
  useProductionOutputStockRequestsQuery,
} from "@/hooks/production-output/useProductionOutputQueries";
import type { CreateSellerRequest } from "@/types/sellers";
import { ProductionOutputRequestStatus } from "@/types/production-output-stock-request";
import type { Truck } from "@/types/trucks";
import type { WeighbridgeTicketListItem } from "@/types/weighbridge-tickets";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

import styles from "./WeighbridgeDashboardPage.module.css";

const { RangePicker } = DatePicker;

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

type ReceivingStage =
  | "all"
  | "weigh-in"
  | "weigh-out"
  | "classify"
  | "payment"
  | "paid"
  | "warehouse"
  | "stock-in";

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  WAITING_STOCK_IN: "รอเข้าคลัง",
  STOCK_REQUEST_PENDING: "รออนุมัติเข้าคลัง",
  STOCK_POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

const STAGE_OPTIONS: {
  key: ReceivingStage;
  label: string;
  description: string;
}[] = [
  { key: "all", label: "ทั้งหมด", description: "ทุกรายการในช่วงที่เลือก" },
  { key: "weigh-in", label: "ชั่งเข้า", description: "รอชั่งน้ำหนักเข้า" },
  { key: "weigh-out", label: "ชั่งออก", description: "รอชั่งน้ำหนักออก" },
  {
    key: "classify",
    label: "ออกใบจ่ายเงิน",
    description: "คัดแยก / สร้างใบรับซื้อเพื่อออกเอกสารจ่าย",
  },
  {
    key: "payment",
    label: "จ่ายเงิน",
    description: "รอจ่ายเงินผู้ขาย",
  },
  { key: "paid", label: "จ่ายแล้ว", description: "จ่ายเงินครบแล้ว" },
  {
    key: "warehouse",
    label: "เข้าคลัง",
    description: "รอส่งคำขอรับเข้าคลัง",
  },
  ...(PRODUCTION_OUTPUT_ENABLED
    ? ([
        {
          key: "stock-in",
          label: "รับผลผลิต",
          description: "หน้ารายการตั๋วรอรับผลผลิตเข้าคลัง",
        },
      ] as const)
    : []),
];

const ACTION_STAGE_KEYS: Array<
  Exclude<ReceivingStage, "all" | "stock-in">
> = ["weigh-in", "weigh-out", "classify", "payment", "paid", "warehouse"];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "เงินสด" },
  { value: "TRANSFER", label: "โอนเงิน" },
];

const SELECT_POPUP_STYLE = { root: { zIndex: 1400 } };

function parseStage(value: string | null): ReceivingStage {
  if (
    value === "weigh-in" ||
    value === "weigh-out" ||
    value === "classify" ||
    value === "payment" ||
    value === "paid" ||
    value === "warehouse"
  ) {
    return value;
  }
  if (PRODUCTION_OUTPUT_ENABLED && value === "stock-in") {
    return value;
  }
  return "all";
}

function isPendingProductionStockIn(
  ticket: WeighbridgeTicketListItem,
  pendingTicketIds: Set<string>,
) {
  return pendingTicketIds.has(ticket.id);
}

/** เงื่อนไขเดียวกับปุ่มในคอลัมน์ "ชั่งน้ำหนัก" — ใช้ทั้ง filter และปุ่ม */
function getTicketActionFlags(
  ticket: WeighbridgeTicketListItem,
  pendingTicketIds: Set<string>,
) {
  const locked =
    ticket.status === "CANCELLED" || ticket.status === "CLOSED";
  const isPaid =
    ticket.flowState === "PAYMENT_PAID" ||
    ticket.flowState === "WAITING_STOCK_IN" ||
    ticket.flowState === "STOCK_REQUEST_PENDING" ||
    ticket.flowState === "STOCK_POSTED" ||
    ticket.receiptPaymentStatus === "PAID";
  const receiptLocked =
    isPaid ||
    ticket.flowState === "WAITING_PAYMENT" ||
    ticket.flowState === "STOCK_POSTED" ||
    ticket.receiptStatus === "CONFIRMED";

  const canWeighIn =
    !locked && !isPaid && Number(ticket.grossWeightKg) <= 0;
  const canWeighOut =
    !locked &&
    !isPaid &&
    Number(ticket.grossWeightKg) > 0 &&
    !ticket.weighOutAt;
  const canClassify =
    !locked &&
    !receiptLocked &&
    Boolean(ticket.weighOutAt) &&
    Number(ticket.netWeightKg) > 0;
  const canPay =
    !locked &&
    !isPaid &&
    Boolean(ticket.receiptId) &&
    (ticket.flowState === "WAITING_PAYMENT" ||
      (ticket.receiptStatus === "CONFIRMED" &&
        ticket.receiptPaymentStatus !== "PAID"));
  const canStockInProduction = isPendingProductionStockIn(
    ticket,
    pendingTicketIds,
  );
  const canStockInRaw =
    Boolean(ticket.receiptId) &&
    ticket.receiptStatus === "CONFIRMED" &&
    ticket.receiptStockPostingStatus !== "POSTED";
  const canStockIn = canStockInRaw || canStockInProduction;
  const stockPosted = ticket.receiptStockPostingStatus === "POSTED";

  return {
    locked,
    isPaid,
    canWeighIn,
    canWeighOut,
    canClassify,
    canPay,
    canStockIn,
    canStockInRaw,
    canStockInProduction,
    stockPosted,
  };
}

function matchesStage(
  ticket: WeighbridgeTicketListItem,
  stage: ReceivingStage,
  pendingTicketIds: Set<string> = new Set(),
) {
  if (stage === "all" || stage === "stock-in") {
    return true;
  }

  const flags = getTicketActionFlags(ticket, pendingTicketIds);

  switch (stage) {
    case "weigh-in":
      return flags.canWeighIn;
    case "weigh-out":
      return flags.canWeighOut;
    case "classify":
      return flags.canClassify;
    case "payment":
      return flags.canPay;
    case "paid":
      return flags.isPaid;
    case "warehouse":
      return flags.canStockIn;
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
    FLOW_LABELS[ticket.flowState ?? ""] ?? ticket.flowState,
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

function formatMoney(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString("th-TH", {
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
        aria-label="ปิดแผง"
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
          aria-label="ปิด"
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ticketForm] = Form.useForm<OpenTicketFormValues>();
  const [sellerForm] = Form.useForm<SellerFormValues>();
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const sellerId = Form.useWatch("sellerId", ticketForm);
  const truckId = Form.useWatch("truckId", ticketForm);

  const stage = parseStage(searchParams.get("stage"));
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
  // ต้องใช้ช่วงเดียวกับ dashboard — ห้ามใช้วันจากเบราว์เซอร์คนละวันกับเซิร์ฟเวอร์
  // ไม่ส่ง from/to = API ใช้วันนี้ของเซิร์ฟเวอร์ (pending ย้อนหลัง 7 วัน)
  const pendingOutputQuery = useProductionOutputPendingTicketsQuery(
    showAll
      ? { all: true }
      : fromParam || toParam
        ? { from: fromParam, to: toParam }
        : undefined,
    { enabled: PRODUCTION_OUTPUT_ENABLED },
  );
  const pendingStockRequestsQuery = useProductionOutputStockRequestsQuery(
    {
      status: ProductionOutputRequestStatus.PENDING_APPROVAL,
    },
    { enabled: PRODUCTION_OUTPUT_ENABLED },
  );
  const sellersQuery = useSellersQuery({ isActive: true });
  const sellerTypesQuery = useSellerTypesQuery({ isActive: true });
  const trucksQuery = useTrucksQuery(
    sellerId ? { sellerId, isActive: true } : undefined,
    { enabled: Boolean(sellerId) },
  );
  const scalesQuery = useWeighbridgeScalesQuery({ isActive: true });
  const createTicketMutation = useCreateWeighbridgeTicketMutation();
  const createSellerMutation = useCreateSellerMutation();

  const summary = dashboardQuery.data?.data.summary;
  const tickets = dashboardQuery.data?.data.tickets ?? [];
  const pendingOutputTickets = pendingOutputQuery.data?.data ?? [];
  const pendingOutputCount = pendingOutputTickets.length;
  const pendingStockRequestCount =
    pendingStockRequestsQuery.data?.data.length ?? 0;
  const pendingProductionTicketIds = useMemo(
    () => new Set(pendingOutputTickets.map((ticket) => ticket.id)),
    [pendingOutputTickets],
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
      "weigh-in": 0,
      "weigh-out": 0,
      classify: 0,
      payment: 0,
      paid: 0,
      warehouse: 0,
      "stock-in": pendingOutputCount,
    };
    for (const ticket of tickets) {
      for (const key of ACTION_STAGE_KEYS) {
        if (matchesStage(ticket, key, pendingProductionTicketIds)) {
          counts[key] += 1;
        }
      }
    }
    return counts;
  }, [tickets, pendingOutputCount, pendingProductionTicketIds]);

  const filteredTickets = useMemo(
    () =>
      stage === "stock-in"
        ? []
        : tickets.filter(
            (ticket) =>
              matchesStage(ticket, stage, pendingProductionTicketIds) &&
              matchesSearch(ticket, searchQuery),
          ),
    [tickets, stage, searchQuery, pendingProductionTicketIds],
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

  const summaryCards = [
    {
      key: "all" as ReceivingStage,
      label: showAll ? "รถเข้าทั้งหมด" : "รถเข้าวันนี้",
      value: summary?.trucksInToday ?? tickets.length,
    },
    {
      key: "weigh-in" as ReceivingStage,
      label: "รอชั่งเข้า",
      value: stageCounts["weigh-in"],
    },
    {
      key: "weigh-out" as ReceivingStage,
      label: "รอชั่งออก",
      value: stageCounts["weigh-out"],
    },
    {
      key: "classify" as ReceivingStage,
      label: "รอออกใบจ่ายเงิน",
      value: stageCounts.classify,
    },
    {
      key: "payment" as ReceivingStage,
      label: "รอจ่ายเงิน",
      value: stageCounts.payment,
    },
    {
      key: "paid" as ReceivingStage,
      label: "จ่ายแล้ว",
      value: stageCounts.paid,
    },
    {
      key: "warehouse" as ReceivingStage,
      label: "รอเข้าคลัง",
      value: stageCounts.warehouse,
    },
    ...(PRODUCTION_OUTPUT_ENABLED
      ? [
          {
            key: "stock-in" as ReceivingStage,
            label: "รับผลผลิตเข้าคลัง",
            value: pendingOutputCount,
          },
        ]
      : []),
  ];

  const openTicketDrawer = () => {
    ticketForm.resetFields();
    setSellerDrawerOpen(false);
    setTicketDrawerOpen(true);
  };

  const closeTicketDrawer = () => {
    setSellerDrawerOpen(false);
    setTicketDrawerOpen(false);
    ticketForm.resetFields();
  };

  const handleSellerChange = () => {
    ticketForm.setFieldsValue({ truckId: undefined });
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
        ticketForm.setFieldsValue({
          sellerId: response.data.id,
          truckId: undefined,
        });
        setSellerDrawerOpen(false);
      },
    });
  };

  const activeStageLabel =
    STAGE_OPTIONS.find((item) => item.key === stage)?.label ?? "ทั้งหมด";
  const dateRangeValue: [Dayjs, Dayjs] | null =
    fromParam && toParam ? [dayjs(fromParam), dayjs(toParam)] : null;
  const dateLabel = (() => {
    if (showAll) return "ทั้งหมด";
    if (!fromParam && !toParam) return "วันนี้";
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
      title: "ลำดับ",
      key: "rowNo",
      width: 72,
      align: "center",
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "เลขตั๋ว",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 150,
    },
    {
      title: "ผู้ขาย",
      key: "seller",
      width: 180,
      render: (_value, record) =>
        record.sellerName
          ? `${record.sellerCode ?? ""} ${record.sellerName}`.trim()
          : "-",
    },
    {
      title: "ทะเบียน",
      dataIndex: "truckLicensePlate",
      key: "truckLicensePlate",
      width: 120,
      render: (value?: string) => value || "-",
    },
    {
      title: "คนขับ",
      dataIndex: "driverName",
      key: "driverName",
      width: 140,
      render: (value?: string) => value || "-",
    },
    {
      title: "เครื่องชั่ง",
      key: "scale",
      width: 160,
      render: (_value, record) =>
        record.scaleName
          ? `${record.scaleCode ?? ""} ${record.scaleName}`.trim()
          : "-",
    },
    {
      title: "สถานะ",
      dataIndex: "flowState",
      key: "flowState",
      width: 130,
      render: (value?: string) => (
        <Tag className={styles.flowTag}>
          {FLOW_LABELS[value ?? "OTHER"] ?? value ?? "-"}
        </Tag>
      ),
    },
    {
      title: "น้ำหนักสุทธิ",
      dataIndex: "netWeightKg",
      key: "netWeightKg",
      width: 120,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: "เวลาสร้าง",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) =>
        value ? new Date(value).toLocaleString("th-TH") : "-",
    },
    {
      title: "ดำเนินการ",
      key: "weighActions",
      width: 460,
      fixed: "right",
      render: (_value, record) => {
        const {
          isPaid,
          canWeighIn,
          canWeighOut,
          canClassify,
          canPay,
          canStockIn,
          canStockInRaw,
          canStockInProduction,
          stockPosted,
        } = getTicketActionFlags(record, pendingProductionTicketIds);

        return (
          <div
            className={styles.tableActions}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="small"
              type={canWeighIn ? "primary" : "default"}
              disabled={!canWeighIn}
              onClick={() => router.push(`/receiving/${record.id}`)}
            >
              ชั่งเข้า
            </Button>
            <Button
              size="small"
              type={canWeighOut ? "primary" : "default"}
              disabled={!canWeighOut}
              onClick={() => router.push(`/receiving/${record.id}`)}
            >
              ชั่งออก
            </Button>
            <Button
              size="small"
              type={canClassify && !canPay ? "primary" : "default"}
              disabled={!canClassify}
              onClick={() =>
                router.push(`/receiving/${record.id}/classification`)
              }
            >
              ออกใบจ่ายเงิน
            </Button>
            <Button
              size="small"
              type={canPay ? "primary" : "default"}
              disabled={!canPay}
              onClick={() =>
                router.push(`/receiving/receipts/${record.receiptId}/payment`)
              }
            >
              {isPaid ? "จ่ายแล้ว" : "จ่ายเงิน"}
            </Button>
            <Button
              size="small"
              type={canStockIn ? "primary" : "default"}
              disabled={!canStockIn}
              onClick={() => {
                if (!canStockIn) {
                  return;
                }
                if (canStockInRaw && record.receiptId) {
                  router.push(
                    `/raw-tire-purchase/receipts/${record.receiptId}/stock-posting-request`,
                  );
                  return;
                }
                if (canStockInProduction) {
                  router.push(
                    `/receiving/production-output/stock-requests/create?ticketId=${encodeURIComponent(record.id)}`,
                  );
                }
              }}
            >
              {stockPosted ? "เข้าคลังแล้ว" : "เข้าคลัง"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <MasterPageGate isLoading={dashboardQuery.isLoading}>
      <section className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <CarOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>Receiving</p>
            <h1 className={styles.pageTitle}>รับซื้อยาง</h1>
            <p className={styles.pageSubtitle}>
              {dateLabel}
              {searchQuery ? ` · ค้นหา “${searchQuery}”` : ""} · กดแถวเพื่อดูรายละเอียดตั๋ว
            </p>
          </div>
          <div className={styles.scopeSwitch}>
            <span
              className={[
                styles.scopeSwitchLabel,
                !showAll ? styles.scopeSwitchLabelActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              วันนี้
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
              aria-label="สลับแสดงทั้งหมดหรือแค่วันนี้"
            />
            <span
              className={[
                styles.scopeSwitchLabel,
                showAll ? styles.scopeSwitchLabelActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              ทั้งหมด
            </span>
          </div>
          <div className={styles.headerActions}>
            <Button
              className={styles.dashboardButton}
              icon={<BarChartOutlined />}
              onClick={() => router.push("/receiving/dashboard")}
            >
              Dashboard
            </Button>
            {PRODUCTION_OUTPUT_ENABLED ? (
              <>
                <Button
                  className={styles.dashboardButton}
                  onClick={() =>
                    router.push("/receiving/pending-production-output")
                  }
                >
                  ตั๋วรอรับผลผลิต
                </Button>
                <Badge
                  count={pendingStockRequestCount}
                  size="small"
                  offset={[-4, 4]}
                >
                  <Button
                    className={styles.dashboardButton}
                    onClick={() =>
                      router.push(
                        "/receiving/production-output/stock-requests",
                      )
                    }
                  >
                    คำขอรับผลผลิต
                  </Button>
                </Badge>
              </>
            ) : null}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={styles.openTicketButton}
              onClick={openTicketDrawer}
            >
              เปิดตั๋วชั่ง
            </Button>
          </div>
        </header>

        <div className={styles.statsStrip}>
          <div className={styles.statHighlight}>
            <span>น้ำหนักรวม</span>
            <strong>
              {formatWeight(summary?.totalNetWeightKgToday ?? "0")}
              <small> กก.</small>
            </strong>
          </div>
          <div className={[styles.statHighlight, styles.statHighlightAccent].join(" ")}>
            <span>ยอดเงินรวม</span>
            <strong>
              {formatMoney(summary?.totalAmountToday ?? "0")}
              <small> บาท</small>
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
                  if (card.key === "stock-in") {
                    router.push("/receiving/pending-production-output");
                    return;
                  }
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
              <h3>รายการรับซื้อยาง</h3>
              <p>
                ดูรายการ{activeStageLabel} · {filteredTickets.length} รายการ
              </p>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterTop}>
              <div className={styles.filterField}>
                <span>ค้นหา</span>
                <Input
                  allowClear
                  value={searchDraft}
                  prefix={<SearchOutlined />}
                  placeholder="เลขตั๋ว ผู้ขาย ทะเบียนรถ คนขับ ใบรับซื้อ"
                  className={styles.filterSearch}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
              </div>
              <div className={styles.filterField}>
                <span>ช่วงวันทำงาน</span>
                <RangePicker
                  allowClear
                  value={dateRangeValue}
                  format="DD/MM/YYYY"
                  placeholder={["เริ่มต้น", "สิ้นสุด"]}
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
            </div>
            <div className={styles.stageStrip}>
              <span className={styles.stageStripLabel}>ขั้นตอน</span>
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
                        if (option.key === "stock-in") {
                          router.push("/receiving/pending-production-output");
                          return;
                        }
                        updateParams({ stage: option.key });
                      }}
                      title={option.description}
                    >
                      <span>{option.label}</span>
                      <em>{stageCounts[option.key]}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            {stage === "stock-in" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <Typography.Text>
                  ตั๋วรอรับผลผลิตเข้าคลังในช่วงวันที่เลือก — มี{" "}
                  <strong>{pendingOutputCount}</strong> ใบที่ยังไม่ได้ส่งคำขอ
                  (ผงยาง / น้ำมัน Pyrolysis / เศษเหล็ก ฯลฯ)
                </Typography.Text>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() =>
                      router.push("/receiving/pending-production-output")
                    }
                  >
                    ตั๋วรอรับผลผลิต ({pendingOutputCount})
                  </Button>
                  <Button
                    onClick={() =>
                      router.push("/receiving/production-output/stock-requests")
                    }
                  >
                    ดูรายการคำขอ
                  </Button>
                </Space>
              </div>
            ) : dashboardQuery.isError ? (
              <Typography.Text type="danger">
                {dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : "โหลดข้อมูลไม่สำเร็จ"}
              </Typography.Text>
            ) : (
              <Table
                rowKey="id"
                size="middle"
                columns={columns}
                dataSource={filteredTickets}
                loading={dashboardQuery.isFetching}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 1400 }}
                locale={{
                  emptyText:
                    searchQuery || stage !== "all"
                      ? "ไม่พบรายการตามเงื่อนไขที่เลือก"
                      : "ยังไม่มีตั๋วชั่งวันนี้",
                }}
                onRow={(record) => {
                  if (stage === "warehouse") {
                    const { canStockIn, canStockInRaw, canStockInProduction } =
                      getTicketActionFlags(record, pendingProductionTicketIds);
                    return {
                      onClick: () => {
                        if (!canStockIn) {
                          return;
                        }
                        if (canStockInRaw && record.receiptId) {
                          router.push(
                            `/raw-tire-purchase/receipts/${record.receiptId}/stock-posting-request`,
                          );
                          return;
                        }
                        if (canStockInProduction) {
                          router.push(
                            `/receiving/production-output/stock-requests/create?ticketId=${encodeURIComponent(record.id)}`,
                          );
                        }
                      },
                      className: canStockIn ? styles.clickableRow : undefined,
                      style: canStockIn ? undefined : { cursor: "default" },
                    };
                  }

                  return {
                    onClick: () => router.push(`/receiving/${record.id}`),
                    className: styles.clickableRow,
                  };
                }}
              />
            )}
          </div>
        </div>
      </section>

      <SideSheet open={ticketDrawerOpen} width={480} onClose={closeTicketDrawer}>
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHero}>
            <span className={styles.drawerEyebrow}>OPEN TICKET</span>
            <h2>เปิดตั๋วชั่ง</h2>
            <p>เลือกผู้ขาย รถบรรทุก และเครื่องชั่งเพื่อเริ่มรับซื้อยาง</p>
          </div>

          <Form
            form={ticketForm}
            layout="vertical"
            onFinish={handleSubmitTicket}
            requiredMark="optional"
            className={styles.drawerForm}
          >
            <Form.Item label="ผู้ขาย" required>
              <div className={styles.sellerFieldRow}>
                <Form.Item
                  name="sellerId"
                  noStyle
                  rules={[{ required: true, message: "กรุณาเลือกผู้ขาย" }]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    optionFilterProp="label"
                    filterOption={filterSelectOption}
                    placeholder="พิมพ์ค้นหาหรือเลือกผู้ขาย"
                    loading={sellersQuery.isLoading}
                    options={sellerOptions}
                    notFoundContent="ไม่พบผู้ขาย"
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
                  เพิ่ม
                </Button>
              </div>
            </Form.Item>

            <Form.Item
              label="รถบรรทุก"
              name="truckId"
              rules={[{ required: true, message: "กรุณาเลือกรถบรรทุก" }]}
            >
              <Select
                showSearch
                allowClear
                size="large"
                optionFilterProp="label"
                filterOption={filterSelectOption}
                placeholder={
                  sellerId ? "พิมพ์ค้นหาหรือเลือกรถบรรทุก" : "เลือกผู้ขายก่อน"
                }
                disabled={!sellerId}
                loading={trucksQuery.isLoading}
                options={truckOptions}
                notFoundContent="ไม่พบรถบรรทุก"
                styles={{ popup: SELECT_POPUP_STYLE }}
              />
            </Form.Item>

            <Form.Item
              label="เครื่องชั่ง"
              name="scaleId"
              rules={[{ required: true, message: "กรุณาเลือกเครื่องชั่ง" }]}
            >
              <Select
                showSearch
                allowClear
                size="large"
                optionFilterProp="label"
                filterOption={filterSelectOption}
                placeholder="พิมพ์ค้นหาหรือเลือกเครื่องชั่ง"
                loading={scalesQuery.isLoading}
                options={scaleOptions}
                notFoundContent="ไม่พบเครื่องชั่ง"
                styles={{ popup: SELECT_POPUP_STYLE }}
              />
            </Form.Item>

            <Form.Item label="หมายเหตุ" name="remark">
              <Input.TextArea
                rows={3}
                placeholder="ระบุหมายเหตุถ้ามี"
                maxLength={2000}
              />
            </Form.Item>

            {selectedTruck ? <TruckPreview truck={selectedTruck} /> : null}

            <div className={styles.drawerFooter}>
              <Button size="large" onClick={closeTicketDrawer}>
                ยกเลิก
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className={styles.submitButton}
                loading={createTicketMutation.isPending}
              >
                เปิดตั๋วชั่ง
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
            <h2>เพิ่มผู้ขาย</h2>
            <p>กรอกข้อมูลผู้ขาย แล้วระบบจะเลือกให้อัตโนมัติ</p>
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
                  label="รหัสผู้ขาย"
                  name="code"
                  rules={[
                    { required: true, message: "กรุณากรอกรหัสผู้ขาย" },
                    { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
                  ]}
                >
                  <Input size="large" placeholder="เช่น SEL002" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="ประเภทผู้ขาย" name="sellerTypeId">
                  <Select
                    allowClear
                    size="large"
                    showSearch
                    optionFilterProp="label"
                    placeholder="เลือกประเภท"
                    loading={sellerTypesQuery.isLoading}
                    options={sellerTypeOptions}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="ชื่อผู้ขาย"
                  name="name"
                  rules={[
                    { required: true, message: "กรุณากรอกชื่อผู้ขาย" },
                    { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
                  ]}
                >
                  <Input size="large" placeholder="เช่น หจก. รับซื้อยาง ABC" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="เลขผู้เสียภาษี" name="taxId">
                  <Input size="large" placeholder="เลขประจำตัวผู้เสียภาษี" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="ชื่อผู้ติดต่อ" name="contactName">
                  <Input size="large" placeholder="เช่น คุณสมชาย" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="เบอร์โทร" name="phone">
                  <Input size="large" placeholder="0812345678" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="อีเมล"
                  name="email"
                  rules={[{ type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }]}
                >
                  <Input size="large" placeholder="seller@example.com" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="วิธีชำระเงิน" name="paymentMethod">
                  <Select
                    allowClear
                    size="large"
                    placeholder="เลือกวิธีชำระเงิน"
                    options={PAYMENT_METHOD_OPTIONS}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="ที่อยู่" name="address">
                  <Input.TextArea rows={2} placeholder="ที่อยู่ผู้ขาย" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="หมายเหตุ" name="remark">
                  <Input.TextArea rows={2} placeholder="หมายเหตุเพิ่มเติม" />
                </Form.Item>
              </Col>
            </Row>

            <div className={styles.statusRow}>
              <div>
                <strong>สถานะใช้งาน</strong>
                <span>เปิดเพื่อให้เลือกในเอกสารได้</span>
              </div>
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
              </Form.Item>
            </div>

            <div className={styles.drawerFooter}>
              <Button size="large" onClick={() => setSellerDrawerOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                type="primary"
                size="large"
                className={styles.submitButton}
                loading={createSellerMutation.isPending}
                onClick={handleCreateSeller}
              >
                บันทึกผู้ขาย
              </Button>
            </div>
          </Form>
        </div>
      </SideSheet>
    </MasterPageGate>
  );
}

function TruckPreview({ truck }: { truck: Truck }) {
  return (
    <div className={styles.previewBox}>
      <h4>ข้อมูลรถที่เลือก</h4>
      <div className={styles.previewGrid}>
        <div className={styles.previewItem}>
          <span>ทะเบียน</span>
          <strong>{truck.licensePlate || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>จังหวัด</span>
          <strong>{truck.province || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>คนขับ</span>
          <strong>{truck.driverName || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>เบอร์โทร</span>
          <strong>{truck.driverPhone || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>ประเภทรถ</span>
          <strong>{truck.truckType || "-"}</strong>
        </div>
        <div className={styles.previewItem}>
          <span>น้ำหนักรถเปล่า (กก.)</span>
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
