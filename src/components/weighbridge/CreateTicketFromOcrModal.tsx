"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useWeighbridgeScalesQuery } from "@/hooks/weighbridge-scales/useWeighbridgeScalesQuery";
import { useCreateTicketFromOcrMutation } from "@/hooks/weighbridge-tickets/useCreateTicketFromOcrMutation";
import { DEDUCTION_TYPE_LABELS } from "@/types/raw-tire-purchase-receipt";
import type {
  CreateTicketFromOcrRequest,
  WeighTicketOcrResult,
} from "@/types/weighbridge-ocr";
import type { WeighbridgeTicketDetail } from "@/types/weighbridge-tickets";
import { createClientId } from "@/utils/createClientId";
import { matchTruckByPlate } from "@/utils/licensePlate";

import {
  formatMoney,
  isoToDayjsInErpTz,
  dayjsInErpTzToIso,
  OcrField,
  OcrModalHeader,
  OcrNotice,
  OcrPreviewPane,
  OcrSection,
} from "./ocrReviewShared";
import styles from "./ocr-capture.module.css";

type ItemRow = {
  key: string;
  tireClassificationId: string;
  weightKg: number | null;
  pricePerKg: number | null;
};

type DeductionRow = {
  key: string;
  deductionType: string;
  description?: string;
  deductionWeightKg: number | null;
};

type Props = {
  result: WeighTicketOcrResult;
  previewUrl: string | null;
  onClose: () => void;
  onCreated: (ticket: WeighbridgeTicketDetail) => void;
};

function round3(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** สุทธิ = เข้า − ออก − หัก — ต้องเช็ค null ตรง ๆ เพราะ 0 เป็นค่าที่กรอกได้ ใช้ && จะกลายเป็น 0 ตลอด */
function netFromInOut(
  grossKg: number | null,
  tareKg: number | null,
  deductKg = 0,
): number | null {
  if (grossKg == null || tareKg == null) {
    return null;
  }
  return Math.max(0, round3(grossKg - tareKg - deductKg));
}

/**
 * เปิดตั๋วใหม่จากรูปใบชั่ง
 *
 * ต่างจาก `WeighTicketOcrReviewModal` ตรงที่ตัวนั้นเอาค่าไปเติมฟอร์มที่เปิดอยู่แล้ว
 * ส่วนตัวนี้เป็นฟอร์ม "สร้าง" ที่ต้องมีผู้ขาย/รถ/เครื่องชั่งครบก่อนถึงจะเปิดตั๋วได้
 * จึงแยกไฟล์กัน แต่ใช้ชิ้นส่วนหน้าตาเดียวกันจาก `ocrReviewShared`
 */
export default function CreateTicketFromOcrModal({
  result,
  previewUrl,
  onClose,
  onCreated,
}: Props) {
  const createMutation = useCreateTicketFromOcrMutation();

  const sellersQuery = useSellersQuery({ isActive: true });
  // โหลดรถทั้งหมด ไม่กรองด้วยผู้ขาย — เพราะต้องหาจากทะเบียนก่อนถึงจะรู้ว่าผู้ขายคือใคร
  // (หน้ารายการปกติกรองด้วย sellerId ได้ เพราะผู้ใช้เลือกผู้ขายก่อนเสมอ)
  const trucksQuery = useTrucksQuery({ isActive: true });
  const scalesQuery = useWeighbridgeScalesQuery({ isActive: true });
  const classificationsQuery = useTireClassificationsQuery({ isActive: true });

  const sellers = useMemo(
    () => sellersQuery.data?.data ?? [],
    [sellersQuery.data],
  );
  const trucks = useMemo(() => trucksQuery.data?.data ?? [], [trucksQuery.data]);
  const scales = useMemo(() => scalesQuery.data?.data ?? [], [scalesQuery.data]);
  const classifications = useMemo(
    () => classificationsQuery.data?.data ?? [],
    [classificationsQuery.data],
  );

  const [truckMode, setTruckMode] = useState<"EXISTING" | "CREATE">("CREATE");
  const [sellerId, setSellerId] = useState<string | undefined>();
  const [truckId, setTruckId] = useState<string | undefined>();
  const [plateDraft, setPlateDraft] = useState(result.licensePlate.value ?? "");
  const [sellerNameDraft, setSellerNameDraft] = useState(
    result.sellerName.value ?? "",
  );
  const [driverName, setDriverName] = useState(result.driverName.value ?? "");
  const [scaleId, setScaleId] = useState<string | undefined>();
  const [grossWeightKg, setGrossWeightKg] = useState<number | null>(
    result.gross.value,
  );
  const [tareWeightKg, setTareWeightKg] = useState<number | null>(
    result.tare.value,
  );
  const [weighInAt, setWeighInAt] = useState<string | null>(
    result.weighInAt.value,
  );
  const [weighOutAt, setWeighOutAt] = useState<string | null>(
    result.weighOutAt.value,
  );
  const [remark, setRemark] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [items, setItems] = useState<ItemRow[]>(() => {
    const deductKg = result.deductions.reduce(
      (sum, row) => sum + Number(row.deductionWeightKg ?? 0),
      0,
    );
    const netKg =
      netFromInOut(result.gross.value, result.tare.value, deductKg) ??
      result.net.value;
    if (result.items.length > 0) {
      return result.items.map((item) => ({
        key: createClientId(),
        tireClassificationId: item.match?.tireClassificationId ?? "",
        weightKg: item.weightKg ?? netKg,
        pricePerKg: item.pricePerKg,
      }));
    }
    // ไม่มีตารางรายการ แต่ใบบอกชนิดสินค้ากับราคาไว้ → เสนอหนึ่งแถว น้ำหนัก = สุทธิ
    if (result.productName.value) {
      return [
        {
          key: createClientId(),
          tireClassificationId: "",
          weightKg: netKg,
          pricePerKg: result.pricePerKg.value,
        },
      ];
    }
    return [];
  });
  const [deductions, setDeductions] = useState<DeductionRow[]>(() =>
    result.deductions.map((deduction) => ({
      key: createClientId(),
      deductionType: deduction.deductionType,
      description: deduction.description,
      deductionWeightKg: deduction.deductionWeightKg,
    })),
  );

  /**
   * จับทะเบียนกับ master ครั้งเดียวตอนรายการรถโหลดเสร็จ แล้วปล่อยให้เป็นของผู้ใช้
   * ปรับ state ตอน render แทน effect — จะได้ไม่เห็นฟอร์มเปล่าหนึ่งเฟรมก่อนค่าจะเด้งขึ้นมา
   * และไม่ไปทับค่าที่ผู้ใช้แก้ไว้เมื่อรายการรถถูก refetch
   */
  const [hasPrefilled, setHasPrefilled] = useState(false);
  if (!hasPrefilled && trucksQuery.isSuccess) {
    setHasPrefilled(true);
    const { best } = matchTruckByPlate(result.licensePlate.value, trucks);
    if (best) {
      setTruckMode("EXISTING");
      setTruckId(best.id);
      setSellerId(best.sellerId);
      if (!driverName && best.driverName) {
        setDriverName(best.driverName);
      }
    }
  }

  // มีเครื่องชั่งเดียวก็ไม่ต้องให้เลือก — คิดตอน render ไม่ต้อง sync ผ่าน state
  const effectiveScaleId = scaleId ?? scales[0]?.id;

  const plateCandidates = useMemo(
    () => matchTruckByPlate(plateDraft, trucks).candidates,
    [plateDraft, trucks],
  );
  const plateExactMatch = useMemo(
    () => matchTruckByPlate(plateDraft, trucks).best,
    [plateDraft, trucks],
  );

  const truckOptions = useMemo(
    () =>
      trucks
        .filter((truck) => !sellerId || truck.sellerId === sellerId)
        .map((truck) => ({
          value: truck.id,
          label: `${truck.licensePlate} (${truck.truckCode})`,
        })),
    [trucks, sellerId],
  );

  const deductionWeight = deductions.reduce(
    (sum, row) => sum + Number(row.deductionWeightKg ?? 0),
    0,
  );
  const computedNetKg = netFromInOut(
    grossWeightKg,
    tareWeightKg,
    deductionWeight,
  );
  const netWeightKg = computedNetKg ?? result.net.value;

  const itemsWithoutType = items.filter(
    (row) => !row.tireClassificationId && Number(row.weightKg ?? 0) > 0,
  ).length;

  const canSubmit =
    Boolean(effectiveScaleId) &&
    (truckMode === "EXISTING"
      ? Boolean(truckId)
      : plateDraft.trim().length > 0) &&
    itemsWithoutType === 0;

  /**
   * รวมทุกเรื่องที่ต้องตรวจไว้ในกล่องเดียวบนสุด แทนที่จะเป็น Alert สามใบซ้อนกัน
   * ถ้ามีเรื่องที่บล็อกการกดยืนยัน ให้ทั้งกล่องเป็นสีแดง เพราะนั่นคือเรื่องที่ต้องแก้ก่อน
   */
  const blocking = itemsWithoutType > 0;
  const notices = [
    ...result.warnings,
    ...(truckMode === "CREATE"
      ? [
          plateDraft.trim()
            ? `ไม่พบรถทะเบียน ${plateDraft} ในระบบ — กดยืนยันแล้วระบบจะสร้างรถและผู้ขายใหม่ให้ ตรวจทะเบียนให้ตรงกับใบก่อน`
            : "ยังไม่รู้ทะเบียนรถ กรุณากรอกทะเบียนก่อนเปิดตั๋ว",
        ]
      : []),
    ...(blocking
      ? [
          "มีรายการยางที่ยังไม่ได้เลือกประเภท — ต้องเลือกก่อน ไม่งั้นน้ำหนักที่กรอกไว้จะหาย",
        ]
      : []),
  ];

  const previewRows = [
    { label: "ความเชื่อมั่น", value: `${Math.round(result.meanConfidence)}%` },
    {
      label: "ใช้เวลาอ่าน",
      value: `${(result.durationMs / 1000).toFixed(1)} วินาที`,
    },
    ...(result.ticketNo.value
      ? [{ label: "เลขที่บัตร", value: result.ticketNo.value }]
      : []),
    ...(result.totalAmount.value !== null
      ? [{ label: "ยอดบนใบ", value: formatMoney(result.totalAmount.value) }]
      : []),
  ];

  const handleSubmit = () => {
    const payload: CreateTicketFromOcrRequest = {
      ocrAttachmentId: result.attachmentId,
      scaleId: effectiveScaleId,
      driverName: driverName.trim() || undefined,
      grossWeightKg: grossWeightKg ?? undefined,
      tareWeightKg: tareWeightKg ?? undefined,
      weighInAt: weighInAt ?? undefined,
      weighOutAt: weighOutAt ?? undefined,
      referenceDocNo: result.ticketNo.value ?? undefined,
      remark: remark.trim() || undefined,
      allowDuplicateReference: allowDuplicate || undefined,
      items: items
        .filter((row) => row.tireClassificationId)
        .map((row) => ({
          tireClassificationId: row.tireClassificationId,
          weightKg: row.weightKg ?? netWeightKg ?? undefined,
          pricePerKg: row.pricePerKg ?? undefined,
        })),
      deductions: deductions
        .filter((row) => Number(row.deductionWeightKg ?? 0) > 0)
        .map((row) => ({
          deductionType: row.deductionType,
          description: row.description,
          deductionWeightKg: row.deductionWeightKg ?? undefined,
        })),
    };

    if (truckMode === "EXISTING") {
      payload.truckId = truckId;
      payload.sellerId = sellerId;
    } else {
      payload.licensePlate = plateDraft.trim();
      payload.sellerId = sellerId;
      payload.sellerName = sellerNameDraft.trim() || undefined;
    }

    void (async () => {
      try {
        const ticket = await createMutation.mutateAsync(payload);
        onCreated(ticket);
      } catch {
        // hook แจ้ง error ให้แล้ว — เปิด modal ค้างไว้ให้ผู้ใช้แก้ค่าต่อ
        setAllowDuplicate(true);
      }
    })();
  };

  const loading =
    trucksQuery.isLoading || sellersQuery.isLoading || scalesQuery.isLoading;

  return (
    <Modal
      open
      centered
      width={880}
      className={styles.ocrModal}
      title={null}
      okText="สร้างตั๋วและไปคัดแยก"
      cancelText="ยกเลิก"
      mask={{ closable: !createMutation.isPending }}
      closable={!createMutation.isPending}
      okButtonProps={{
        disabled: !canSubmit,
        loading: createMutation.isPending,
      }}
      cancelButtonProps={{ disabled: createMutation.isPending }}
      onOk={handleSubmit}
      onCancel={onClose}
    >
      <OcrModalHeader
        title="เปิดตั๋วรับซื้อจากรูปใบชั่ง"
        subtitle="ตรวจค่าที่อ่านมาให้ตรงกับใบจริง แล้วกดสร้างตั๋ว"
      />

      <div className={styles.ocrLayout}>
        <OcrPreviewPane previewUrl={previewUrl} rows={previewRows} />

        <div className={styles.ocrPanel}>
          <OcrNotice messages={notices} type={blocking ? "error" : "warning"} />

          <OcrSection
            title="รถและผู้ขาย"
            extra={loading ? <Spin size="small" /> : null}
          >
            <div className={styles.ocrField}>
              <OcrField
                label="ทะเบียนรถ"
                confidence={result.licensePlate.confidence}
              >
                {truckMode === "EXISTING" ? (
                  <Space.Compact style={{ width: "100%" }}>
                    <Select
                      showSearch
                      allowClear
                      style={{ width: "100%" }}
                      optionFilterProp="label"
                      placeholder="เลือกรถ"
                      value={truckId}
                      options={truckOptions}
                      onChange={(value: string | undefined) => {
                        setTruckId(value);
                        const picked = trucks.find(
                          (truck) => truck.id === value,
                        );
                        if (picked?.sellerId) {
                          setSellerId(picked.sellerId);
                        }
                      }}
                    />
                    <Button onClick={() => setTruckMode("CREATE")}>
                      สร้างใหม่
                    </Button>
                  </Space.Compact>
                ) : (
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      value={plateDraft}
                      placeholder="เช่น บต-5752"
                      onChange={(event) => setPlateDraft(event.target.value)}
                    />
                    {plateExactMatch ? (
                      <Button
                        type="primary"
                        onClick={() => {
                          setTruckMode("EXISTING");
                          setTruckId(plateExactMatch.id);
                          setSellerId(plateExactMatch.sellerId);
                        }}
                      >
                        ใช้รถที่มีอยู่
                      </Button>
                    ) : (
                      <Button onClick={() => setTruckMode("EXISTING")}>
                        เลือกรถที่มีอยู่
                      </Button>
                    )}
                  </Space.Compact>
                )}
              </OcrField>

              {/*
                รถที่ทะเบียนใกล้เคียง — อยู่ใต้ช่องทะเบียนเพราะเป็นทางเลือกของช่องนี้โดยตรง
                ของเดิมซ่อนอยู่ใน Alert บนสุด ห่างจากช่องที่มันเกี่ยวข้องไปหลายแถว
              */}
              {truckMode === "CREATE" && plateCandidates.length > 0 ? (
                <div className={styles.ocrFieldNote}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    หมายถึงคันนี้หรือเปล่า?
                  </Typography.Text>
                  <Space wrap style={{ marginTop: 4 }}>
                    {plateCandidates.map((candidate) => (
                      <Button
                        key={candidate.truck.id}
                        size="small"
                        onClick={() => {
                          setTruckMode("EXISTING");
                          setTruckId(candidate.truck.id);
                          setSellerId(candidate.truck.sellerId);
                        }}
                      >
                        {candidate.truck.licensePlate}
                        <Tag color="blue" style={{ marginLeft: 6 }}>
                          {Math.round(candidate.score * 100)}%
                        </Tag>
                      </Button>
                    ))}
                  </Space>
                </div>
              ) : null}

              <OcrField label="ผู้ขาย">
                {truckMode === "EXISTING" ? (
                  <Select
                    showSearch
                    allowClear
                    style={{ width: "100%" }}
                    optionFilterProp="label"
                    placeholder="เลือกผู้ขาย"
                    value={sellerId}
                    options={sellers.map((seller) => ({
                      value: seller.id,
                      label: `${seller.sellerCode} — ${seller.sellerName}`,
                    }))}
                    onChange={(value: string | undefined) => {
                      setSellerId(value);
                      setTruckId(undefined);
                    }}
                  />
                ) : (
                  <Input
                    value={sellerNameDraft}
                    placeholder="ชื่อผู้ขายที่จะสร้างใหม่ (เว้นว่างได้)"
                    onChange={(event) => setSellerNameDraft(event.target.value)}
                  />
                )}
              </OcrField>

              <OcrField label="คนขับ">
                <Input
                  value={driverName}
                  placeholder="ไม่ระบุก็ได้"
                  onChange={(event) => setDriverName(event.target.value)}
                />
              </OcrField>

              <OcrField label="เครื่องชั่ง">
                <Select
                  style={{ width: "100%" }}
                  placeholder="เลือกเครื่องชั่ง"
                  value={effectiveScaleId}
                  options={scales.map((scale) => ({
                    value: scale.id,
                    label: `${scale.scaleCode} — ${scale.scaleName}`,
                  }))}
                  onChange={setScaleId}
                />
              </OcrField>
            </div>
          </OcrSection>

          <OcrSection title="น้ำหนักและเวลา">
            <div className={styles.ocrField}>
              <OcrField label="น้ำหนักเข้า" confidence={result.gross.confidence}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.001}
                  value={grossWeightKg ?? undefined}
                  onChange={(value) =>
                    setGrossWeightKg(typeof value === "number" ? value : null)
                  }
                />
              </OcrField>

              <OcrField label="วันเวลาชั่งเข้า">
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY HH:mm"
                  value={isoToDayjsInErpTz(weighInAt)}
                  onChange={(value) => setWeighInAt(dayjsInErpTzToIso(value))}
                />
              </OcrField>

              <OcrField label="น้ำหนักออก" confidence={result.tare.confidence}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.001}
                  value={tareWeightKg ?? undefined}
                  onChange={(value) =>
                    setTareWeightKg(typeof value === "number" ? value : null)
                  }
                />
              </OcrField>

              <OcrField label="วันเวลาชั่งออก">
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY HH:mm"
                  value={isoToDayjsInErpTz(weighOutAt)}
                  onChange={(value) => setWeighOutAt(dayjsInErpTzToIso(value))}
                />
              </OcrField>

              {/* ตัวเลขที่ทุกคนมองหาก่อนเพื่อน จึงให้เด่นกว่าช่องกรอก ไม่ใช่เป็นอีกแถวหนึ่งในตาราง */}
              <div className={styles.ocrNetCard}>
                <span className={styles.ocrNetLabel}>น้ำหนักสุทธิ</span>
                <span className={styles.ocrNetValue}>
                  {netWeightKg != null
                    ? netWeightKg.toLocaleString("th-TH", {
                        maximumFractionDigits: 3,
                      })
                    : "—"}
                </span>
                <span className={styles.ocrNetUnit}>กก.</span>
                {computedNetKg != null &&
                result.net.value !== null &&
                Math.abs(result.net.value - computedNetKg) > 1 ? (
                  <Tag color="orange">
                    บนใบระบุ{" "}
                    {result.net.value.toLocaleString("th-TH", {
                      maximumFractionDigits: 3,
                    })}
                  </Tag>
                ) : null}
              </div>
            </div>
          </OcrSection>

          <OcrSection title="รายการยาง">
            {items.length === 0 ? (
              <p className={styles.ocrEmpty}>
                ยังไม่มีรายการ — กดเพิ่มรายการด้านล่างได้เลย
              </p>
            ) : (
              <>
                <div className={styles.ocrItemHead}>
                  <span>ประเภทยาง</span>
                  <span>น้ำหนัก (กก.)</span>
                  <span className={styles.ocrItemHeadPrice}>ราคา/กก.</span>
                  <span />
                </div>
                <div className={styles.ocrItemRows}>
                  {items.map((row, index) => (
                    <div key={row.key} className={styles.ocrItemRow}>
                      <Select
                        showSearch
                        style={{ width: "100%" }}
                        optionFilterProp="label"
                        placeholder={
                          result.items[index]?.rawName
                            ? `อ่านได้ว่า "${result.items[index].rawName}"`
                            : "เลือกประเภทยาง"
                        }
                        value={row.tireClassificationId || undefined}
                        options={classifications.map((classification) => ({
                          value: classification.id,
                          label: `${classification.classificationCode} · ${classification.classificationName}`,
                        }))}
                        onChange={(value: string) =>
                          setItems((rows) =>
                            rows.map((item, i) =>
                              i === index
                                ? { ...item, tireClassificationId: value }
                                : item,
                            ),
                          )
                        }
                      />
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        placeholder="กก."
                        aria-label={`น้ำหนักรายการยาง ${index + 1}`}
                        value={
                          row.weightKg ??
                          (items.length === 1 ? netWeightKg : null) ??
                          undefined
                        }
                        onChange={(value) =>
                          setItems((rows) =>
                            rows.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    weightKg:
                                      typeof value === "number" ? value : null,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <InputNumber
                        className={styles.ocrItemPrice}
                        style={{ width: "100%" }}
                        min={0}
                        placeholder="ราคา/กก."
                        aria-label={`ราคาต่อกิโลรายการยาง ${index + 1}`}
                        value={row.pricePerKg ?? undefined}
                        onChange={(value) =>
                          setItems((rows) =>
                            rows.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    pricePerKg:
                                      typeof value === "number" ? value : null,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        aria-label={`ลบรายการยาง ${index + 1}`}
                        onClick={() =>
                          setItems((rows) => rows.filter((_, i) => i !== index))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className={styles.ocrItemFooter}>
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  setItems((rows) => [
                    ...rows,
                    {
                      key: createClientId(),
                      tireClassificationId: "",
                      weightKg: null,
                      pricePerKg: null,
                    },
                  ])
                }
              >
                เพิ่มรายการ
              </Button>
            </div>
          </OcrSection>

          {deductions.length > 0 ? (
            <OcrSection title="รายการหัก">
              <div className={styles.ocrDeductionHead}>
                <span>ประเภท</span>
                <span>น้ำหนัก (กก.)</span>
                <span />
              </div>
              <div className={styles.ocrItemRows}>
                {deductions.map((row, index) => (
                  <div key={row.key} className={styles.ocrDeductionRow}>
                    <span>
                      {DEDUCTION_TYPE_LABELS[row.deductionType] ??
                        row.deductionType}
                      {row.description ? ` · ${row.description}` : ""}
                    </span>
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      aria-label={`น้ำหนักหัก ${index + 1}`}
                      value={row.deductionWeightKg ?? undefined}
                      onChange={(value) =>
                        setDeductions((rows) =>
                          rows.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  deductionWeightKg:
                                    typeof value === "number" ? value : null,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label={`ลบรายการหัก ${index + 1}`}
                      onClick={() =>
                        setDeductions((rows) =>
                          rows.filter((_, i) => i !== index),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </OcrSection>
          ) : null}

          <OcrSection title="หมายเหตุ">
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={remark}
              placeholder="ไม่ระบุก็ได้"
              onChange={(event) => setRemark(event.target.value)}
            />
          </OcrSection>
        </div>
      </div>
    </Modal>
  );
}
