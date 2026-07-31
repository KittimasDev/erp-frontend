"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCalculateReceiptMutation,
  useCancelReceiptMutation,
  useSaveClassificationMutation,
} from "@/hooks/raw-tire-classification/useClassificationMutations";
import { useTicketClassificationQuery } from "@/hooks/raw-tire-classification/useTicketClassificationQuery";
import { useRawTirePriceRulesQuery } from "@/hooks/raw-tire-price-rules/useRawTirePriceRulesQuery";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import type { ClassificationItemInput } from "@/types/raw-tire-classification";
import {
  DEDUCTION_TYPE_OPTIONS,
  RECEIPT_STATUS_LABELS,
} from "@/types/raw-tire-classification";
import { createClientId } from "@/utils/createClientId";

import styles from "./WeighbridgeDashboardPage.module.css";

type ItemRow = ClassificationItemInput & {
  key: string;
  pricePerKg?: string;
  amount?: string;
  classificationName?: string;
};

type DeductionRow = {
  key: string;
  deductionType: string;
  deductionWeightKg: number;
  deductionAmount?: number;
  description?: string;
};

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

function createItemRow(partial?: Partial<ItemRow>): ItemRow {
  return {
    key: partial?.key ?? createClientId(),
    tireClassificationId: partial?.tireClassificationId ?? "",
    weightKg: partial?.weightKg ?? 0,
    description: partial?.description,
    pricePerKg: partial?.pricePerKg,
    amount: partial?.amount,
    classificationName: partial?.classificationName,
  };
}

function createDeductionRow(
  partial?: Partial<Omit<DeductionRow, "deductionAmount">> & {
    deductionAmount?: string | number | null;
  },
): DeductionRow {
  const rawAmount = partial?.deductionAmount;
  const amountNum =
    rawAmount !== undefined && rawAmount !== null && rawAmount !== ""
      ? Number(rawAmount)
      : undefined;

  return {
    key: partial?.key ?? createClientId(),
    deductionType: partial?.deductionType ?? "WATER",
    deductionWeightKg: partial?.deductionWeightKg ?? 0,
    description: partial?.description,
    deductionAmount:
      amountNum !== undefined && !Number.isNaN(amountNum)
        ? amountNum
        : undefined,
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calcAmount(weightKg: number, pricePerKg?: string | number) {
  const price = Number(pricePerKg);
  if (!weightKg || Number.isNaN(price) || price < 0) {
    return undefined;
  }
  return String(roundMoney(weightKg * price));
}

function toDateOnly(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

type Props = {
  ticketId: string;
};

export default function RawTireClassificationPage({ ticketId }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const classificationQuery = useTicketClassificationQuery(ticketId);
  const classificationsQuery = useTireClassificationsQuery({ isActive: true });

  const context = classificationQuery.data?.data;
  const ticket = context?.ticket;
  const receipt = context?.receipt;
  const canEdit = context?.canEdit ?? false;
  const canClassify = context?.canClassify ?? false;
  const effectiveOn = toDateOnly(receipt?.receiptDate);

  const priceRulesQuery = useRawTirePriceRulesQuery({
    isActive: true,
    effectiveOn,
  });

  const [items, setItems] = useState<ItemRow[]>([createItemRow()]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [remark, setRemark] = useState("");

  const saveMutation = useSaveClassificationMutation(ticketId, receipt?.id);
  const calculateMutation = useCalculateReceiptMutation(ticketId, receipt?.id);
  const cancelMutation = useCancelReceiptMutation(ticketId, receipt?.id);

  useEffect(() => {
    if (!context) {
      return;
    }

    if (context.receipt?.items.length) {
      setItems(
        context.receipt.items.map((item) =>
          createItemRow({
            key: item.id,
            tireClassificationId: item.tireClassificationId,
            weightKg: Number(item.weightKg),
            description: item.description,
            pricePerKg: item.pricePerKg,
            amount: item.amount,
            classificationName: item.classificationName,
          }),
        ),
      );
    } else {
      setItems([createItemRow()]);
    }

    setDeductions(
      (context.receipt?.deductions ?? []).map((deduction) =>
        createDeductionRow({
          key: deduction.id,
          deductionType: deduction.deductionType,
          deductionWeightKg: Number(deduction.deductionWeightKg),
          description: deduction.description,
          deductionAmount: Number(deduction.deductionAmount),
        }),
      ),
    );
    setRemark(context.receipt?.remark ?? "");
  }, [context]);

  const classificationOptions = useMemo(
    () =>
      (classificationsQuery.data?.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.classificationCode} — ${item.classificationName}`,
      })),
    [classificationsQuery.data?.data],
  );

  const priceByClassificationId = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of priceRulesQuery.data?.data ?? []) {
      if (map.has(rule.tireClassificationId)) {
        continue;
      }
      map.set(rule.tireClassificationId, String(rule.pricePerKg));
    }
    return map;
  }, [priceRulesQuery.data?.data]);

  const resolvePrice = (tireClassificationId?: string) => {
    if (!tireClassificationId) {
      return undefined;
    }
    return priceByClassificationId.get(tireClassificationId);
  };

  useEffect(() => {
    if (priceByClassificationId.size === 0) {
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (!item.tireClassificationId) {
          return item;
        }
        const pricePerKg = priceByClassificationId.get(
          item.tireClassificationId,
        );
        if (!pricePerKg || pricePerKg === item.pricePerKg) {
          return item;
        }
        return {
          ...item,
          pricePerKg,
          amount: calcAmount(Number(item.weightKg) || 0, pricePerKg),
        };
      }),
    );
  }, [priceByClassificationId]);

  const summary = receipt?.summary;
  const classifiedWeightLocal = items.reduce(
    (sum, item) => sum + (Number(item.weightKg) || 0),
    0,
  );
  const deductionWeightLocal = deductions.reduce(
    (sum, item) => sum + (Number(item.deductionWeightKg) || 0),
    0,
  );
  const deductionAmountLocal = deductions.reduce(
    (sum, item) => sum + (Number(item.deductionAmount) || 0),
    0,
  );
  const subtotalLocal = items.reduce((sum, item) => {
    const amount = Number(item.amount);
    return sum + (Number.isNaN(amount) ? 0 : amount);
  }, 0);
  const netWeightTarget = Number(
    summary?.netWeightKg ?? ticket?.netWeightKg ?? 0,
  );
  const remainingWeight =
    Math.round((netWeightTarget - classifiedWeightLocal) * 1000) / 1000;
  const isOverClassifiedWeight =
    netWeightTarget > 0 && classifiedWeightLocal > netWeightTarget + 0.0005;

  const buildPayload = () => ({
    items: items
      .filter((item) => item.tireClassificationId && Number(item.weightKg) > 0)
      .map((item) => ({
        tireClassificationId: item.tireClassificationId,
        weightKg: Number(item.weightKg),
        description: item.description?.trim() || undefined,
      })),
    deductions: deductions
      .filter((item) => Number(item.deductionWeightKg) > 0)
      .map((item) => ({
        deductionType: item.deductionType,
        deductionWeightKg: Number(item.deductionWeightKg),
        deductionAmount:
          item.deductionAmount !== undefined && item.deductionAmount !== null
            ? Number(item.deductionAmount)
            : undefined,
        description: item.description?.trim() || undefined,
      })),
    remark: remark.trim() || undefined,
  });

  const validateDeductions = () => {
    const active = deductions.filter(
      (item) => Number(item.deductionWeightKg) > 0,
    );
    for (const item of active) {
      if (item.deductionType === "OTHER" && !item.description?.trim()) {
        message.error('ประเภทหัก «อื่นๆ» ต้องระบุรายละเอียดรายการหัก');
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload();
    if (!payload.items.length) {
      return;
    }
    if (!validateDeductions()) {
      return;
    }
    const response = await saveMutation.mutateAsync(payload);
    const saved = response.data;
    setItems(
      saved.items.map((item) =>
        createItemRow({
          key: item.id,
          tireClassificationId: item.tireClassificationId,
          weightKg: Number(item.weightKg),
          description: item.description,
          pricePerKg: item.pricePerKg,
          amount: item.amount,
          classificationName: item.classificationName,
        }),
      ),
    );
    setDeductions(
      saved.deductions.map((deduction) =>
        createDeductionRow({
          key: deduction.id,
          deductionType: deduction.deductionType,
          deductionWeightKg: Number(deduction.deductionWeightKg),
          description: deduction.description,
          deductionAmount: Number(deduction.deductionAmount),
        }),
      ),
    );
  };

  const itemColumns: ColumnsType<ItemRow> = [
    {
      title: "ประเภทสินค้า",
      key: "classification",
      width: 240,
      render: (_value, record, index) => (
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="เลือกประเภทสินค้า"
          options={classificationOptions}
          value={record.tireClassificationId || undefined}
          disabled={!canEdit}
          style={{ width: "100%" }}
          onChange={(value) => {
            const pricePerKg = resolvePrice(value);
            setItems((prev) => {
              const next = [...prev];
              const weightKg = Number(next[index].weightKg) || 0;
              next[index] = {
                ...next[index],
                tireClassificationId: value,
                pricePerKg,
                amount: calcAmount(weightKg, pricePerKg),
              };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: "น้ำหนัก (กก.)",
      key: "weightKg",
      width: 140,
      render: (_value, record, index) => {
        const otherWeight = items.reduce((sum, item, itemIndex) => {
          if (itemIndex === index) {
            return sum;
          }
          return sum + (Number(item.weightKg) || 0);
        }, 0);
        const maxForRow =
          netWeightTarget > 0
            ? Math.max(
                0,
                Math.round((netWeightTarget - otherWeight) * 1000) / 1000,
              )
            : undefined;

        return (
          <InputNumber
            min={0.001}
            max={maxForRow || undefined}
            step={0.001}
            precision={3}
            value={record.weightKg || undefined}
            disabled={!canEdit}
            style={{ width: "100%" }}
            placeholder={
              maxForRow !== undefined
                ? `ไม่เกิน ${formatWeight(maxForRow)}`
                : undefined
            }
            onChange={(value) => {
              const weightKg = Number(value) || 0;
              setItems((prev) => {
                const next = [...prev];
                const pricePerKg =
                  next[index].pricePerKg ??
                  resolvePrice(next[index].tireClassificationId);
                next[index] = {
                  ...next[index],
                  weightKg,
                  pricePerKg,
                  amount: calcAmount(weightKg, pricePerKg),
                };
                return next;
              });
            }}
          />
        );
      },
    },
    {
      title: "ราคา/กก.",
      key: "pricePerKg",
      width: 120,
      align: "right",
      render: (_value, record) =>
        record.pricePerKg
          ? formatMoney(record.pricePerKg)
          : record.tireClassificationId
            ? "ไม่มีราคา"
            : "-",
    },
    {
      title: "จำนวนเงิน",
      key: "amount",
      width: 130,
      align: "right",
      render: (_value, record) => formatMoney(record.amount),
    },
    {
      title: "หมายเหตุรายการ",
      key: "description",
      render: (_value, record, index) => (
        <Input
          placeholder="หมายเหตุรายการยาง"
          value={record.description}
          disabled={!canEdit}
          onChange={(event) => {
            setItems((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                description: event.target.value,
              };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_value, record) =>
        canEdit ? (
          <Button
            type="link"
            danger
            disabled={items.length <= 1}
            onClick={() =>
              setItems((prev) => prev.filter((item) => item.key !== record.key))
            }
          >
            ลบ
          </Button>
        ) : null,
    },
  ];

  const deductionColumns: ColumnsType<DeductionRow> = [
    {
      title: "ประเภทหัก",
      key: "deductionType",
      width: 140,
      render: (_value, record, index) => (
        <Select
          options={[...DEDUCTION_TYPE_OPTIONS]}
          value={record.deductionType}
          disabled={!canEdit}
          style={{ width: "100%" }}
          onChange={(value) => {
            setDeductions((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], deductionType: value };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: "น้ำหนักหัก (กก.)",
      key: "deductionWeightKg",
      width: 140,
      render: (_value, record, index) => (
        <InputNumber
          min={0.001}
          step={0.001}
          precision={3}
          value={record.deductionWeightKg || undefined}
          disabled={!canEdit}
          style={{ width: "100%" }}
          onChange={(value) => {
            setDeductions((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                deductionWeightKg: Number(value) || 0,
              };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: "จำนวนเงินหัก (บาท)",
      key: "deductionAmount",
      width: 150,
      align: "right",
      render: (_value, record, index) =>
        canEdit ? (
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            value={
              record.deductionAmount !== undefined
                ? record.deductionAmount
                : undefined
            }
            style={{ width: "100%" }}
            placeholder="กรอกจำนวนเงิน"
            onChange={(value) => {
              setDeductions((prev) => {
                const next = [...prev];
                next[index] = {
                  ...next[index],
                  deductionAmount:
                    value === null || value === undefined
                      ? undefined
                      : Number(value),
                };
                return next;
              });
            }}
          />
        ) : (
          formatMoney(record.deductionAmount)
        ),
    },
    {
      title: "เหตุผลการหัก",
      key: "description",
      render: (_value, record, index) => (
        <Input
          placeholder={
            record.deductionType === "OTHER"
              ? "ระบุรายการหัก (บังคับ)"
              : "เหตุผลการหัก"
          }
          value={record.description}
          disabled={!canEdit}
          status={
            record.deductionType === "OTHER" &&
            Number(record.deductionWeightKg) > 0 &&
            !record.description?.trim()
              ? "error"
              : undefined
          }
          onChange={(event) => {
            setDeductions((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                description: event.target.value,
              };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_value, record) =>
        canEdit ? (
          <Button
            type="link"
            danger
            onClick={() =>
              setDeductions((prev) =>
                prev.filter((item) => item.key !== record.key),
              )
            }
          >
            ลบ
          </Button>
        ) : null,
    },
  ];

  const isBusy =
    saveMutation.isPending ||
    calculateMutation.isPending ||
    cancelMutation.isPending;

  return (
    <MasterPageGate
      isLoading={
        classificationQuery.isLoading ||
        classificationsQuery.isLoading ||
        priceRulesQuery.isLoading
      }
    >
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/receiving/${ticketId}`)}
          >
            กลับชั่งน้ำหนัก
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={classificationQuery.isFetching}
            onClick={() => classificationQuery.refetch()}
          >
            รีเฟรช
          </Button>
        </div>

        {classificationQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {classificationQuery.error instanceof Error
                  ? classificationQuery.error.message
                  : "โหลดข้อมูลไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : ticket ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>คัดแยกประเภทสินค้า / สร้างรายการรับซื้อ</h3>
                    <p>
                      ตั๋ว {ticket.ticketNo}
                      {receipt
                        ? ` · ใบรับซื้อ ${receipt.receiptNo}`
                        : " · ยังไม่มีใบรับซื้อ"}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    {receipt ? (
                      <Tag className={styles.flowTag}>
                        {RECEIPT_STATUS_LABELS[receipt.status] ??
                          receipt.status}
                      </Tag>
                    ) : null}
                    {!canClassify ? (
                      <Tag color="warning">ต้องชั่งเข้า-ออกครบก่อน</Tag>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>ข้อมูลตั๋วชั่ง</h3>
                <p>ผู้ขาย รถ และน้ำหนักจากตั๋วชั่ง</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.ticketInfoLayout}>
                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>ผู้ขาย / รถ</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>ผู้ขาย</span>
                        <strong>{ticket.sellerName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>ทะเบียนรถ</span>
                        <strong>{ticket.truckLicensePlate || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>คนขับ</span>
                        <strong>{ticket.driverName || "-"}</strong>
                      </div>
                      {ticket.ticketNo ? (
                        <div className={styles.ticketInfoRow}>
                          <span>เลขที่ตั๋ว</span>
                          <strong>{ticket.ticketNo}</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>น้ำหนักชั่ง</div>
                    <div className={styles.ticketWeightCards}>
                      <div className={styles.ticketWeightCard}>
                        <span>น้ำหนักเข้า</span>
                        <strong>
                          {formatWeight(ticket.grossWeightKg)}
                          <em>กก.</em>
                        </strong>
                      </div>
                      <div className={styles.ticketWeightCard}>
                        <span>น้ำหนักออก</span>
                        <strong>
                          {formatWeight(ticket.tareWeightKg)}
                          <em>กก.</em>
                        </strong>
                      </div>
                      <div
                        className={`${styles.ticketWeightCard} ${styles.ticketWeightNet}`}
                      >
                        <span>น้ำหนักสุทธิ</span>
                        <strong>
                          {formatWeight(ticket.netWeightKg)}
                          <em>กก.</em>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.classificationLayout}>
              <div className={styles.classificationMain}>
            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการคัดแยกประเภทสินค้า</h3>
                  <p>
                    รวมน้ำหนักคัดแยกควรเท่ากับน้ำหนักสุทธิ{" "}
                    {formatWeight(netWeightTarget)} กก.
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() =>
                      setItems((prev) => [...prev, createItemRow()])
                    }
                  >
                    เพิ่มรายการ
                  </Button>
                ) : null}
              </div>

              <div className={styles.weightGuide}>
                <div className={styles.weightGuideItem}>
                  <span>น้ำหนักสุทธิทั้งหมด</span>
                  <strong>{formatWeight(netWeightTarget)} กก.</strong>
                </div>
                <div className={styles.weightGuideItem}>
                  <span>คัดแยกแล้ว</span>
                  <strong>{formatWeight(classifiedWeightLocal)} กก.</strong>
                </div>
                <div
                  className={
                    isOverClassifiedWeight
                      ? `${styles.weightGuideItem} ${styles.weightGuideOver}`
                      : remainingWeight === 0
                        ? `${styles.weightGuideItem} ${styles.weightGuideOk}`
                        : styles.weightGuideItem
                  }
                >
                  <span>
                    {isOverClassifiedWeight ? "เกินสุทธิ" : "คงเหลือให้กรอก"}
                  </span>
                  <strong>
                    {formatWeight(Math.abs(remainingWeight))} กก.
                    {isOverClassifiedWeight ? " (เกิน)" : ""}
                  </strong>
                </div>
              </div>

              {isOverClassifiedWeight ? (
                <Typography.Text type="danger" className={styles.weightGuideWarn}>
                  น้ำหนักคัดแยกรวมเกินน้ำหนักสุทธิแล้ว — ตรวจแก้ก่อนบันทึก
                </Typography.Text>
              ) : null}

              <Table
                rowKey="key"
                columns={itemColumns}
                dataSource={items}
                pagination={false}
                size="middle"
                scroll={{ x: 960 }}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการหักสิ่งปนเปื้อน</h3>
                  <p>ระบุประเภท น้ำหนัก จำนวนเงิน และเหตุผลการหัก</p>
                </div>
                {canEdit ? (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() =>
                      setDeductions((prev) => [...prev, createDeductionRow()])
                    }
                  >
                    เพิ่มรายการหัก
                  </Button>
                ) : null}
              </div>
              <Table
                rowKey="key"
                columns={deductionColumns}
                dataSource={deductions}
                pagination={false}
                size="middle"
                locale={{ emptyText: "ไม่มีรายการหัก" }}
                scroll={{ x: 820 }}
              />
            </div>
              </div>

              <aside className={styles.classificationSummarySticky}>
                <p className={styles.classificationSummaryEyebrow}>Summary</p>
                <h3 className={styles.classificationSummaryTitle}>สรุปยอด</h3>
                <p className={styles.classificationSummaryLead}>
                  อัปเดตตามรายการคัดแยกและรายการหัก
                </p>

                <div className={styles.classificationSummaryRows}>
                  <SummaryItem
                    label="น้ำหนักสุทธิตั๋ว (กก.)"
                    value={formatWeight(
                      summary?.netWeightKg ?? ticket.netWeightKg,
                    )}
                  />
                  <SummaryItem
                    label="น้ำหนักคัดแยกรวม (กก.)"
                    value={formatWeight(
                      summary?.classifiedWeightKg ?? classifiedWeightLocal,
                    )}
                  />
                  <SummaryItem
                    label="น้ำหนักหักรวม (กก.)"
                    value={formatWeight(
                      summary?.deductionWeightKg ?? deductionWeightLocal,
                    )}
                  />
                  <SummaryItem
                    label="น้ำหนักจ่าย (กก.)"
                    value={formatWeight(
                      summary?.payableWeightKg ??
                        Math.max(
                          0,
                          Math.round(
                            (classifiedWeightLocal - deductionWeightLocal) *
                              1000,
                          ) / 1000,
                        ),
                    )}
                  />
                  <SummaryItem
                    label="ยอดก่อนหัก (บาท)"
                    value={formatMoney(
                      summary?.subtotalAmount ??
                        (subtotalLocal > 0 ? subtotalLocal : undefined),
                    )}
                  />
                  <SummaryItem
                    label="ยอดหัก (บาท)"
                    value={formatMoney(
                      summary?.deductionAmount ??
                        (deductionAmountLocal > 0
                          ? deductionAmountLocal
                          : undefined),
                    )}
                  />
                  <SummaryItem
                    label="ยอดสุทธิ (บาท)"
                    value={formatMoney(
                      summary?.totalAmount ??
                        (subtotalLocal > 0
                          ? Math.max(0, subtotalLocal - deductionAmountLocal)
                          : undefined),
                    )}
                    highlight
                  />
                </div>

                <div className={styles.remarkField}>
                  <Typography.Text strong>หมายเหตุใบรับซื้อ</Typography.Text>
                  <Input.TextArea
                    rows={2}
                    value={remark}
                    disabled={!canEdit}
                    placeholder="หมายเหตุเพิ่มเติม"
                    onChange={(event) => setRemark(event.target.value)}
                  />
                </div>

                <div className={styles.classificationActions}>
                  <Button
                    type="primary"
                    disabled={!canEdit || isBusy}
                    loading={saveMutation.isPending}
                    onClick={() => void handleSaveDraft()}
                  >
                    บันทึกร่าง
                  </Button>
                  <Button
                    disabled={!canEdit || !receipt || isBusy}
                    loading={calculateMutation.isPending}
                    onClick={() => void calculateMutation.mutateAsync()}
                  >
                    คำนวณใหม่
                  </Button>
                  <Button
                    type="primary"
                    className={styles.submitButton}
                    disabled={!receipt || isBusy}
                    onClick={() => {
                      if (receipt) {
                        router.push(`/receiving/receipts/${receipt.id}`);
                      }
                    }}
                  >
                    ไปยืนยันใบรับซื้อ
                  </Button>
                  <Button
                    danger
                    disabled={
                      !receipt || receipt.status !== "DRAFT" || isBusy
                    }
                    loading={cancelMutation.isPending}
                    onClick={() => void cancelMutation.mutateAsync(undefined)}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? `${styles.summaryAmountItem} ${styles.summaryAmountHighlight}`
          : styles.summaryAmountItem
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
