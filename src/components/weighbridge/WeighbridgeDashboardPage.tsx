"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CloseOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
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
import type { CreateSellerRequest } from "@/types/sellers";
import type { Truck } from "@/types/trucks";
import type { WeighbridgeTicketListItem } from "@/types/weighbridge-tickets";

import styles from "./WeighbridgeDashboardPage.module.css";

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
  | "paid";

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  STOCK_POSTED: "รับเข้าสต๊อกแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

const STAGE_FLOW_MAP: Record<Exclude<ReceivingStage, "all">, string[]> = {
  "weigh-in": ["WAITING_WEIGH_IN"],
  "weigh-out": ["WAITING_WEIGH_OUT"],
  classify: ["WAITING_SORT", "WAITING_APPROVAL"],
  payment: ["WAITING_PAYMENT"],
  paid: ["PAYMENT_PAID", "STOCK_POSTED"],
};

const STAGE_OPTIONS: {
  key: ReceivingStage;
  label: string;
  description: string;
}[] = [
  { key: "all", label: "ทั้งหมด", description: "ทุกรายการวันนี้" },
  { key: "weigh-in", label: "ชั่งเข้า", description: "รอชั่งน้ำหนักเข้า" },
  { key: "weigh-out", label: "ชั่งออก", description: "รอชั่งน้ำหนักออก" },
  { key: "classify", label: "คัดแยก", description: "รอคัดแยก / ใบรับซื้อ" },
  { key: "payment", label: "จ่ายเงิน", description: "รอจ่ายเงินผู้ขาย" },
  { key: "paid", label: "จ่ายแล้ว", description: "จ่ายเงินครบแล้ว" },
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
    value === "paid"
  ) {
    return value;
  }
  return "all";
}

function matchesStage(
  ticket: WeighbridgeTicketListItem,
  stage: ReceivingStage,
) {
  if (stage === "all") {
    return true;
  }

  const flow = ticket.flowState ?? "OTHER";

  if (stage === "classify") {
    if (STAGE_FLOW_MAP.classify.includes(flow)) {
      return true;
    }
    if (ticket.receiptStatus === "DRAFT") {
      return true;
    }
    return (
      flow === "OTHER" &&
      Boolean(ticket.weighOutAt) &&
      ticket.receiptStatus !== "CONFIRMED" &&
      ticket.receiptPaymentStatus !== "PAID"
    );
  }

  return STAGE_FLOW_MAP[stage].includes(flow);
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
  const dateParam = searchParams.get("date")?.trim() || undefined;

  const dashboardQuery = useWeighbridgeDashboardQuery(dateParam);
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

  const sellers = sellersQuery.data?.data ?? [];
  const sellerTypes = sellerTypesQuery.data?.data ?? [];
  const trucks = trucksQuery.data?.data ?? [];
  const scales = scalesQuery.data?.data ?? [];

  const updateParams = (patch: {
    q?: string | null;
    stage?: ReceivingStage | null;
    date?: string | null;
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

    if (patch.date !== undefined) {
      const value = patch.date?.trim() ?? "";
      if (value) {
        next.set("date", value);
      } else {
        next.delete("date");
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
    };
    for (const ticket of tickets) {
      for (const key of Object.keys(STAGE_FLOW_MAP) as Exclude<
        ReceivingStage,
        "all"
      >[]) {
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
      label: "รถเข้าวันนี้",
      value: summary?.trucksInToday ?? tickets.length,
    },
    {
      key: "weigh-in" as ReceivingStage,
      label: "รอชั่งเข้า",
      value: stageCounts["weigh-in"] || summary?.waitingWeighIn || 0,
    },
    {
      key: "weigh-out" as ReceivingStage,
      label: "รอชั่งออก",
      value: stageCounts["weigh-out"] || summary?.waitingWeighOut || 0,
    },
    {
      key: "classify" as ReceivingStage,
      label: "รอคัดแยก",
      value: stageCounts.classify || summary?.waitingSort || 0,
    },
    {
      key: "payment" as ReceivingStage,
      label: "รอจ่ายเงิน",
      value: stageCounts.payment || summary?.waitingPayment || 0,
    },
    {
      key: "paid" as ReceivingStage,
      label: "จ่ายแล้ว",
      value: stageCounts.paid,
    },
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
  const dateLabel = dateParam
    ? dayjs(dateParam).format("DD/MM/YYYY")
    : "วันนี้";

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
      title: "ชั่งน้ำหนัก",
      key: "weighActions",
      width: 320,
      fixed: "right",
      render: (_value, record) => {
        const locked =
          record.status === "CANCELLED" || record.status === "CLOSED";
        const isPaid =
          record.flowState === "PAYMENT_PAID" ||
          record.receiptPaymentStatus === "PAID";
        const receiptLocked =
          isPaid ||
          record.flowState === "WAITING_PAYMENT" ||
          record.flowState === "STOCK_POSTED" ||
          record.receiptStatus === "CONFIRMED";
        const canWeighIn =
          !locked && !isPaid && Number(record.grossWeightKg) <= 0;
        const canWeighOut =
          !locked &&
          !isPaid &&
          Number(record.grossWeightKg) > 0 &&
          !record.weighOutAt;
        const canClassify =
          !locked &&
          !receiptLocked &&
          Boolean(record.weighOutAt) &&
          Number(record.netWeightKg) > 0;
        const canPay =
          !locked &&
          !isPaid &&
          Boolean(record.receiptId) &&
          (record.flowState === "WAITING_PAYMENT" ||
            (record.receiptStatus === "CONFIRMED" &&
              record.receiptPaymentStatus !== "PAID"));

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
              คัดแยก
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
          </div>
        );
      },
    },
  ];

  return (
    <MasterPageGate isLoading={dashboardQuery.isLoading}>
      <section className={styles.page}>
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
                onClick={() =>
                  updateParams({
                    stage: card.key === stage ? "all" : card.key,
                  })
                }
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </button>
            );
          })}
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span>น้ำหนักรวม</span>
            <strong>
              {formatWeight(summary?.totalNetWeightKgToday ?? "0")} กก.
            </strong>
          </div>
          <div className={styles.metricItem}>
            <span>ยอดเงินรวม</span>
            <strong>
              {formatMoney(summary?.totalAmountToday ?? "0")} บาท
            </strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>รายการรับซื้อยาง</h3>
              <p>
                {dateLabel} · ดูรายการ{activeStageLabel}
                {searchQuery ? ` · ค้นหา “${searchQuery}”` : ""} · กดแถวเพื่อดูรายละเอียด
              </p>
            </div>

            <div className={styles.listHeaderActions}>
              <Button
                className={styles.dashboardButton}
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
          </div>

          <div className={styles.filterBar}>
            <Input
              allowClear
              value={searchDraft}
              prefix={<SearchOutlined />}
              placeholder="ค้นหาเลขตั๋ว ผู้ขาย ทะเบียนรถ คนขับ ใบรับซื้อ"
              className={styles.filterSearch}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <DatePicker
              allowClear
              value={dateParam ? dayjs(dateParam) : null}
              format="DD/MM/YYYY"
              placeholder="วันที่"
              className={styles.filterDate}
              onChange={(value) =>
                updateParams({
                  date: value ? value.format("YYYY-MM-DD") : null,
                })
              }
            />
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
                    onClick={() => updateParams({ stage: option.key })}
                    title={option.description}
                  >
                    <span>{option.label}</span>
                    <em>{stageCounts[option.key]}</em>
                  </button>
                );
              })}
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
                scroll={{ x: 1100 }}
                locale={{
                  emptyText:
                    searchQuery || stage !== "all"
                      ? "ไม่พบรายการตามเงื่อนไขที่เลือก"
                      : "ยังไม่มีตั๋วชั่งวันนี้",
                }}
                onRow={(record) => ({
                  onClick: () => router.push(`/receiving/${record.id}`),
                  className: styles.clickableRow,
                })}
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
