"use client";

import { useMemo, useState } from "react";
import {
  Checkbox,
  InputNumber,
  Modal,
  Radio,
  Select,
  Tag,
  Typography,
} from "antd";

import { DEDUCTION_TYPE_LABELS } from "@/types/raw-tire-purchase-receipt";
import type { TireClassification } from "@/types/tire-classifications";
import type {
  OcrApplySelection,
  WeighTicketOcrResult,
} from "@/types/weighbridge-ocr";

import {
  ConfidenceTag,
  CONFIDENCE_LOW,
  formatDateTime,
  formatMoney,
  formatWeight,
  OcrField,
  OcrModalHeader,
  OcrNotice,
  OcrPreviewPane,
  OcrSection,
} from "./ocrReviewShared";
import styles from "./ocr-capture.module.css";

type CurrentFormValues = {
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  itemCount: number;
  deductionCount: number;
};

type Props = {
  result: WeighTicketOcrResult;
  previewUrl: string | null;
  classifications: TireClassification[];
  current: CurrentFormValues;
  onApply: (selection: OcrApplySelection) => void;
  onClose: () => void;
};

type ItemRowState = {
  checked: boolean;
  tireClassificationId: string;
  weightKg: number | null;
  pricePerKg: number | null;
};

type DeductionRowState = {
  checked: boolean;
  deductionWeightKg: number | null;
};

/**
 * หน้าจอเทียบค่าที่ OCR อ่านได้กับค่าที่อยู่ในฟอร์มตอนนี้ แล้วให้ผู้ใช้ติ๊กเลือกว่าจะเอาอันไหน
 *
 * component นี้ไม่รู้จัก state ของฟอร์ม — คืนค่าที่เลือกกลับไปให้ panel จัดการเอง
 * ทะเบียน/คนขับ/เลขที่ใบ/วันเวลา แสดงเทียบให้ดูอย่างเดียว เพราะหน้าคัดแยกไม่ได้ถือ state พวกนั้น
 * (ต้องไปแก้ที่ตัวตั๋ว) แต่ยังมีประโยชน์มากในการจับว่าถ่ายผิดใบ
 */
export default function WeighTicketOcrReviewModal({
  result,
  previewUrl,
  classifications,
  current,
  onApply,
  onClose,
}: Props) {
  const [useGross, setUseGross] = useState(
    result.gross.value !== null && result.gross.confidence >= CONFIDENCE_LOW,
  );
  const [useTare, setUseTare] = useState(
    result.tare.value !== null && result.tare.confidence >= CONFIDENCE_LOW,
  );
  const [itemsMode, setItemsMode] = useState<"REPLACE" | "APPEND">(
    current.itemCount > 0 ? "APPEND" : "REPLACE",
  );
  const [deductionsMode, setDeductionsMode] = useState<"REPLACE" | "APPEND">(
    current.deductionCount > 0 ? "APPEND" : "REPLACE",
  );

  const [itemRows, setItemRows] = useState<ItemRowState[]>(() =>
    result.items.map((item) => ({
      checked:
        Boolean(item.match) &&
        item.weightKg !== null &&
        item.confidence >= CONFIDENCE_LOW,
      tireClassificationId: item.match?.tireClassificationId ?? "",
      weightKg: item.weightKg,
      pricePerKg: item.pricePerKg,
    })),
  );
  const [deductionRows, setDeductionRows] = useState<DeductionRowState[]>(() =>
    result.deductions.map((deduction) => ({
      checked:
        deduction.deductionWeightKg !== null &&
        deduction.confidence >= CONFIDENCE_LOW,
      deductionWeightKg: deduction.deductionWeightKg,
    })),
  );

  const classificationOptions = useMemo(
    () =>
      classifications.map((row) => ({
        value: row.id,
        label: `${row.classificationCode} · ${row.classificationName}`,
      })),
    [classifications],
  );

  const selectedItems = itemRows.filter(
    (row) => row.checked && row.tireClassificationId,
  );
  const selectedDeductions = deductionRows.filter((row) => row.checked);
  const selectedCount =
    (useGross ? 1 : 0) +
    (useTare ? 1 : 0) +
    selectedItems.length +
    selectedDeductions.length;

  const handleApply = () => {
    onApply({
      grossWeightKg: useGross ? result.gross.value : null,
      tareWeightKg: useTare ? result.tare.value : null,
      itemsMode,
      items: selectedItems.map((row) => ({
        tireClassificationId: row.tireClassificationId,
        weightKg: row.weightKg ?? undefined,
        pricePerKg: row.pricePerKg ?? undefined,
      })),
      deductionsMode,
      deductions: deductionRows
        .map((row, index) => ({ row, source: result.deductions[index] }))
        .filter((entry) => entry.row.checked)
        .map((entry) => ({
          deductionType: entry.source.deductionType,
          description: entry.source.description,
          deductionWeightKg: entry.row.deductionWeightKg ?? undefined,
          deductionAmount: entry.source.deductionAmount ?? undefined,
        })),
      count: selectedCount,
    });
  };

  const readOnlyRows: Array<{ label: string; value: string }> = [
    { label: "เลขที่ใบชั่ง", value: result.ticketNo.value ?? "—" },
    { label: "ทะเบียนรถ", value: result.licensePlate.value ?? "—" },
    { label: "คนขับ", value: result.driverName.value ?? "—" },
    { label: "ชั่งเข้า", value: formatDateTime(result.weighInAt.value) },
    { label: "ชั่งออก", value: formatDateTime(result.weighOutAt.value) },
    { label: "สินค้าบนใบ", value: result.productName.value ?? "—" },
    { label: "ราคาต่อ กก.", value: formatMoney(result.pricePerKg.value) },
    { label: "รวมเป็นเงิน", value: formatMoney(result.totalAmount.value) },
  ];

  const previewRows = [
    { label: "ความเชื่อมั่น", value: `${Math.round(result.meanConfidence)}%` },
    {
      label: "ใช้เวลาอ่าน",
      value: `${(result.durationMs / 1000).toFixed(1)} วินาที`,
    },
  ];

  const modeOptions = [
    { label: "แทนที่รายการเดิม", value: "REPLACE" },
    { label: "เพิ่มต่อท้าย", value: "APPEND" },
  ];

  return (
    <Modal
      open
      centered
      width={880}
      className={styles.ocrModal}
      title={null}
      okText={`เติมค่าที่เลือก (${selectedCount})`}
      cancelText="ยกเลิก"
      okButtonProps={{ disabled: selectedCount === 0 }}
      onOk={handleApply}
      onCancel={onClose}
    >
      <OcrModalHeader
        title="ตรวจค่าที่อ่านได้จากรูปใบชั่ง"
        subtitle="ติ๊กเฉพาะค่าที่จะเอาไปเติมลงฟอร์ม"
      />

      <div className={styles.ocrLayout}>
        <OcrPreviewPane previewUrl={previewUrl} rows={previewRows} />

        <div className={styles.ocrPanel}>
          <OcrNotice messages={result.warnings} />

          <OcrSection title="น้ำหนัก">
            <div className={styles.ocrField}>
              <OcrField
                label={
                  <>
                    <Checkbox
                      checked={useGross}
                      disabled={result.gross.value === null}
                      onChange={(event) => setUseGross(event.target.checked)}
                      aria-label="เลือกเติมน้ำหนักเข้า"
                    />
                    น้ำหนักเข้า
                  </>
                }
                confidence={result.gross.confidence}
              >
                <div className={styles.ocrCompare}>
                  <span className={styles.ocrCompareNew}>
                    {formatWeight(result.gross.value)}
                  </span>
                  {result.gross.source === "DERIVED" ? (
                    <Tag color="blue">คำนวณให้</Tag>
                  ) : null}
                  <span className={styles.ocrCompareOld}>
                    ในฟอร์มตอนนี้ {formatWeight(current.grossWeightKg)}
                  </span>
                </div>
              </OcrField>

              <OcrField
                label={
                  <>
                    <Checkbox
                      checked={useTare}
                      disabled={result.tare.value === null}
                      onChange={(event) => setUseTare(event.target.checked)}
                      aria-label="เลือกเติมน้ำหนักออก"
                    />
                    น้ำหนักออก
                  </>
                }
                confidence={result.tare.confidence}
              >
                <div className={styles.ocrCompare}>
                  <span className={styles.ocrCompareNew}>
                    {formatWeight(result.tare.value)}
                  </span>
                  {result.tare.source === "DERIVED" ? (
                    <Tag color="blue">คำนวณให้</Tag>
                  ) : null}
                  <span className={styles.ocrCompareOld}>
                    ในฟอร์มตอนนี้ {formatWeight(current.tareWeightKg)}
                  </span>
                </div>
              </OcrField>

              {result.deductWeight.value !== null ? (
                <OcrField
                  label="หักบนใบ"
                  confidence={result.deductWeight.confidence}
                >
                  <div className={styles.ocrCompare}>
                    <span className={styles.ocrCompareNew}>
                      {formatWeight(result.deductWeight.value)}
                    </span>
                    <Tag color="blue">อยู่ในรายการหักแล้ว</Tag>
                  </div>
                </OcrField>
              ) : null}

              <OcrField
                label="สุทธิบนใบ"
                confidence={result.net.confidence}
              >
                <div className={styles.ocrCompare}>
                  <span className={styles.ocrCompareNew}>
                    {formatWeight(result.net.value)}
                  </span>
                  <span className={styles.ocrCompareOld}>
                    ฟอร์มคำนวณจากเข้า − ออก อยู่แล้ว ค่านี้ใช้ตรวจทานเท่านั้น
                  </span>
                </div>
              </OcrField>
            </div>
          </OcrSection>

          <OcrSection title="ข้อมูลอื่นบนใบ">
            <Typography.Text
              type="secondary"
              style={{ display: "block", marginBottom: 10, fontSize: 12 }}
            >
              แสดงให้ดูอย่างเดียว ใช้ตรวจว่าถ่ายถูกใบหรือเปล่า
            </Typography.Text>
            <div className={styles.ocrField}>
              {readOnlyRows.map((row) => (
                <OcrField key={row.label} label={row.label}>
                  {row.value}
                </OcrField>
              ))}
            </div>
          </OcrSection>

          <OcrSection
            title="รายการยาง"
            extra={
              result.items.length > 0 ? (
                <Radio.Group
                  value={itemsMode}
                  onChange={(event) =>
                    setItemsMode(event.target.value as "REPLACE" | "APPEND")
                  }
                  options={modeOptions}
                  optionType="button"
                  size="small"
                />
              ) : null
            }
          >
            {result.items.length === 0 ? (
              <p className={styles.ocrEmpty}>ไม่พบรายการยางบนรูป</p>
            ) : (
              <>
                <div className={styles.ocrCheckHead}>
                  <span />
                  <span>ประเภทยาง</span>
                  <span>น้ำหนัก (กก.)</span>
                  <span className={styles.ocrCheckFlag}>มั่นใจ</span>
                </div>
                <div className={styles.ocrItemRows}>
                  {result.items.map((item, index) => (
                    <div
                      key={`${item.rawName}-${index}`}
                      className={styles.ocrCheckRow}
                    >
                      <Checkbox
                        checked={itemRows[index].checked}
                        onChange={(event) =>
                          setItemRows((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, checked: event.target.checked }
                                : row,
                            ),
                          )
                        }
                        aria-label={`เลือกรายการยาง ${index + 1}`}
                      />
                      <Select
                        showSearch
                        optionFilterProp="label"
                        style={{ width: "100%" }}
                        placeholder={`อ่านได้ว่า "${item.rawName}"`}
                        value={itemRows[index].tireClassificationId || undefined}
                        options={classificationOptions}
                        onChange={(value: string) =>
                          setItemRows((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, tireClassificationId: value }
                                : row,
                            ),
                          )
                        }
                      />
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={0.001}
                        value={itemRows[index].weightKg ?? undefined}
                        aria-label={`น้ำหนักรายการยาง ${index + 1}`}
                        onChange={(value) =>
                          setItemRows((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    weightKg:
                                      typeof value === "number" ? value : null,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      <span className={styles.ocrCheckFlag}>
                        <ConfidenceTag confidence={item.confidence} />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </OcrSection>

          <OcrSection
            title="รายการหัก"
            extra={
              result.deductions.length > 0 ? (
                <Radio.Group
                  value={deductionsMode}
                  onChange={(event) =>
                    setDeductionsMode(event.target.value as "REPLACE" | "APPEND")
                  }
                  options={modeOptions}
                  optionType="button"
                  size="small"
                />
              ) : null
            }
          >
            {result.deductions.length === 0 ? (
              <p className={styles.ocrEmpty}>ไม่พบรายการหักบนรูป</p>
            ) : (
              <>
                <div className={styles.ocrCheckHead}>
                  <span />
                  <span>ประเภท</span>
                  <span>น้ำหนัก (กก.)</span>
                  <span className={styles.ocrCheckFlag}>มั่นใจ</span>
                </div>
                <div className={styles.ocrItemRows}>
                  {result.deductions.map((deduction, index) => (
                    <div
                      key={`${deduction.rawText}-${index}`}
                      className={styles.ocrCheckRow}
                    >
                      <Checkbox
                        checked={deductionRows[index].checked}
                        onChange={(event) =>
                          setDeductionRows((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, checked: event.target.checked }
                                : row,
                            ),
                          )
                        }
                        aria-label={`เลือกรายการหัก ${index + 1}`}
                      />
                      <span>
                        {DEDUCTION_TYPE_LABELS[deduction.deductionType] ??
                          deduction.deductionType}
                        {deduction.description
                          ? ` · ${deduction.description}`
                          : ""}
                      </span>
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={0.001}
                        value={
                          deductionRows[index].deductionWeightKg ?? undefined
                        }
                        aria-label={`น้ำหนักหัก ${index + 1}`}
                        onChange={(value) =>
                          setDeductionRows((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    deductionWeightKg:
                                      typeof value === "number" ? value : null,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      <span className={styles.ocrCheckFlag}>
                        <ConfidenceTag confidence={deduction.confidence} />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </OcrSection>
        </div>
      </div>
    </Modal>
  );
}
