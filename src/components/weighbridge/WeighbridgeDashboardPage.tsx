"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
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
import { useCreateTruckMutation } from "@/hooks/trucks/useCreateTruckMutation";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useWeighbridgeScalesQuery } from "@/hooks/weighbridge-scales/useWeighbridgeScalesQuery";
import type { CreateSellerRequest } from "@/types/sellers";
import type { CreateTruckRequest, Truck } from "@/types/trucks";
import type { WeighbridgeTicketListItem } from "@/types/weighbridge-tickets";

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
  | "weigh-in"
  | "weigh-out"
  | "classify"
  | "payment"
  | "paid"
  | "warehouse";

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอกรอกน้ำหนัก",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอกรอกน้ำหนัก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงินหรือเข้าคลัง",
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
  { key: "classify", label: "คัดแยก", description: "เลือกรายการยาง / สารปนเปื้อน" },
  { key: "weigh-in", label: "กรอกน้ำหนัก", description: "รอกรอกน้ำหนักเข้า-ออก" },
  {
    key: "payment",
    label: "ออกใบจ่ายเงิน",
    description: "จ่ายก่อนหรือหลังเข้าคลังก็ได้",
  },
  { key: "paid", label: "จ่ายแล้ว", description: "จ่ายเงินครบแล้ว" },
  {
    key: "warehouse",
    label: "เข้าคลัง",
    description: "ส่งคำขอรับเข้าคลัง (จ่ายก่อนก็ได้)",
  },
];

const ACTION_STAGE_KEYS: Array<Exclude<ReceivingStage, "all">> = [
  "classify",
  "weigh-in",
  "payment",
  "paid",
  "warehouse",
];

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
  return "all";
}

/** เงื่อนไขเดียวกับปุ่มในคอลัมน์ "ชั่งน้ำหนัก" — ใช้ทั้ง filter และปุ่ม */
function getTicketActionFlags(ticket: WeighbridgeTicketListItem) {
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
  const receiptLocked =
    isPaid ||
    stockPosted ||
    ticket.flowState === "WAITING_PAYMENT" ||
    receiptConfirmed;

  const canClassify = !locked && !receiptLocked;
  const canWeighIn =
    !weightsLocked && Boolean(ticket.hasClassificationPlan);
  const canWeighOut = canWeighIn && !ticket.weighOutAt;
  // จ่ายได้หลังยืนยันยอด — เข้าคลังไปแล้วก็ยังจ่ายได้
  const canPay =
    !locked &&
    !isPaid &&
    Boolean(ticket.receiptId) &&
    (ticket.receiptStatus === "CONFIRMED" ||
      ticket.receiptStatus === "APPROVED") &&
    ticket.receiptPaymentStatus !== "PAID";
  // เข้าคลังได้หลังยืนยันยอดแล้ว — ไม่บังคับจ่ายเงินก่อน
  const canStockInRaw =
    Boolean(ticket.receiptId) &&
    (ticket.receiptStatus === "CONFIRMED" ||
      ticket.receiptStatus === "APPROVED") &&
    ticket.receiptStockPostingStatus !== "POSTED" &&
    ticket.flowState !== "STOCK_REQUEST_PENDING";
  const canStockIn = canStockInRaw;

  return {
    locked,
    isPaid,
    canWeighIn,
    canWeighOut,
    canClassify,
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

  switch (stage) {
    case "weigh-in":
      return flags.canWeighIn;
    case "weigh-out":
      return flags.canWeighIn;
    case "classify":
      return flags.canClassify && !ticket.hasClassificationPlan;
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
  const [truckForm] = Form.useForm<TruckFormValues>();
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);
  const [truckDrawerOpen, setTruckDrawerOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  // SideSheet unmounts Form when closed — use local state instead of Form.useWatch
  const [sellerId, setSellerId] = useState<string | undefined>();
  const [truckId, setTruckId] = useState<string | undefined>();

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
  const tickets = dashboardQuery.data?.data.tickets ?? [];

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
      label: showAll ? "รถเข้าทั้งหมด" : "รถเข้าวันนี้",
      value: summary?.trucksInToday ?? tickets.length,
    },
    {
      key: "classify" as ReceivingStage,
      label: "รอคัดแยก",
      value: stageCounts.classify,
    },
    {
      key: "weigh-in" as ReceivingStage,
      label: "รอกรอกน้ำหนัก",
      value: stageCounts["weigh-in"],
    },
    {
      key: "payment" as ReceivingStage,
      label: "รอจ่ายเงิน / เข้าคลัง",
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
      width: 380,
      fixed: "right",
      render: (_value, record) => {
        const {
          isPaid,
          canWeighIn,
          canClassify,
          canPay,
          canStockIn,
          canStockInRaw,
          stockPosted,
        } = getTicketActionFlags(record);

        return (
          <div
            className={styles.tableActions}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="small"
              type={canClassify && !record.hasClassificationPlan ? "primary" : "default"}
              disabled={!canClassify}
              onClick={() => router.push(`/receiving/${record.id}`)}
            >
              คัดแยก
            </Button>
            <Button
              size="small"
              type={canWeighIn ? "primary" : "default"}
              disabled={!canWeighIn}
              onClick={() => router.push(`/receiving/${record.id}`)}
            >
              กรอกน้ำหนัก
            </Button>
            <Button
              size="small"
              type={canPay ? "primary" : "default"}
              disabled={!canPay}
              onClick={() =>
                router.push(`/receiving/receipts/${record.receiptId}/payment`)
              }
            >
              {isPaid ? "จ่ายแล้ว" : "ออกใบจ่ายเงิน"}
            </Button>
            <Button
              size="small"
              type={canStockIn ? "primary" : "default"}
              disabled={!canStockIn}
              onClick={() => {
                if (!canStockIn || !canStockInRaw || !record.receiptId) {
                  return;
                }
                router.push(
                  `/raw-tire-purchase/receipts/${record.receiptId}/stock-posting-request`,
                );
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
            {dashboardQuery.isError ? (
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
                    onClick: () => router.push(`/receiving/${record.id}`),
                    className: styles.clickableRow,
                  };
                }}
              />
            )}
          </div>
        </div>
      </section>

      <SideSheet
        open={ticketDrawerOpen}
        width={480}
        onClose={handleTicketSheetClose}
      >
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

            <Form.Item label="รถบรรทุก" required>
              <div className={styles.sellerFieldRow}>
                <Form.Item
                  name="truckId"
                  noStyle
                  rules={[{ required: true, message: "กรุณาเลือกรถบรรทุก" }]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    optionFilterProp="label"
                    filterOption={filterSelectOption}
                    placeholder={
                      sellerId
                        ? "พิมพ์ค้นหาหรือเลือกรถบรรทุก"
                        : "เลือกผู้ขายก่อน"
                    }
                    disabled={!sellerId}
                    loading={trucksQuery.isLoading}
                    options={truckOptions}
                    notFoundContent="ไม่พบรถบรรทุก"
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
                  เพิ่ม
                </Button>
              </div>
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

      <SideSheet
        open={truckDrawerOpen}
        width={440}
        zIndex={1200}
        onClose={() => setTruckDrawerOpen(false)}
      >
        <div className={styles.drawerPanel}>
          <div className={`${styles.drawerHero} ${styles.sellerHero}`}>
            <span className={styles.drawerEyebrow}>NEW TRUCK</span>
            <h2>เพิ่มรถบรรทุก</h2>
            <p>
              กรอกข้อมูลรถของ{" "}
              {sellerOptions.find((s) => s.value === sellerId)?.label ??
                "ผู้ขายที่เลือก"}{" "}
              แล้วระบบจะเลือกให้อัตโนมัติ
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
                  label="รหัสรถ"
                  name="code"
                  rules={[
                    { required: true, message: "กรุณากรอกรหัสรถ" },
                    { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
                  ]}
                >
                  <Input size="large" placeholder="เช่น TRK-001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="ทะเบียนรถ"
                  name="licensePlate"
                  rules={[
                    { required: true, message: "กรุณากรอกทะเบียนรถ" },
                    { max: 100, message: "ทะเบียนต้องไม่เกิน 100 ตัวอักษร" },
                  ]}
                >
                  <Input size="large" placeholder="เช่น กข-1234" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="จังหวัด"
                  name="province"
                  rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
                >
                  <Input size="large" placeholder="เช่น สมุทรปราการ" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="ประเภทรถ" name="truckType">
                  <Select
                    allowClear
                    size="large"
                    placeholder="เลือกประเภท"
                    options={TRUCK_TYPE_OPTIONS}
                    styles={{ popup: SELECT_POPUP_STYLE }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="น้ำหนักรถเปล่า (กก.)"
                  name="tareWeightKg"
                  rules={[
                    {
                      type: "number",
                      min: 0,
                      message: "น้ำหนักต้องไม่ติดลบ",
                    },
                  ]}
                >
                  <InputNumber
                    size="large"
                    min={0}
                    step={0.001}
                    style={{ width: "100%" }}
                    placeholder="เช่น 8500.5"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="ชื่อคนขับ"
                  name="driverName"
                  rules={[{ max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" }]}
                >
                  <Input size="large" placeholder="เช่น สมชาย ใจดี" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="เบอร์โทรคนขับ"
                  name="driverPhone"
                  rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
                >
                  <Input size="large" placeholder="เช่น 0812345678" />
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
              <Button size="large" onClick={() => setTruckDrawerOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                type="primary"
                size="large"
                className={styles.submitButton}
                loading={createTruckMutation.isPending}
                onClick={handleCreateTruck}
              >
                บันทึกรถ
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
