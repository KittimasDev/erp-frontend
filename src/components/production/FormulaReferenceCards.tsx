"use client";

import { useState } from "react";
import { Button, Empty, Modal, Tag, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ProductionFormula } from "@/types/production-formula";
import styles from "./FormulaReferenceCards.module.css";

/**
 * การ์ดสูตรอ้างอิงฝั่งซ้าย — ให้เห็นสูตรก่อนตัดสินใจ
 *
 * สูตรใบเดียว: การ์ดเต็ม (ผลผลิต / วัตถุดิบ / ของเสีย) คลิกแล้วเลือกทันที
 * สูตร ≥ 2 ใบ: รายการย่อในคอลัมน์แคบ กดแถวเปิด popup ดูสูตรเต็มแล้วกด “ใช้สูตรนี้”
 * ไม่เรียงการ์ดเต็มทุกใบ เพราะเทียบไม่ทันในที่สูงจำกัด และชื่อยาวจะดันกริดพัง
 *
 * ใช้ข้อมูลชุดเดียวกับ dropdown ในกล่องวางแผน (ส่งมาทาง prop) ไม่ยิง query เพิ่ม
 *
 * ปุ่มสร้างสูตรโชว์เฉพาะ PRODUCTION_FORMULAS.ADD — VIEW มีให้คนเปิดใบสั่งผลิต
 * อ่านสูตรอยู่แล้ว อย่าพาไปหน้ามาสเตอร์แล้วสร้างไม่ได้
 */

const CREATE_FORMULA_HREF = "/masters/production-formulas?create=1";

type Props = {
  formulas: ProductionFormula[];
  selectedId?: string;
  onSelect: (formulaId: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

function fmtQty(value: string | number) {
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function LineList({
  formula,
  role,
}: {
  formula: ProductionFormula;
  role: string;
}) {
  const lines = formula.lines.filter((line) => line.lineRole === role);
  if (lines.length === 0) {
    return <div className={styles.emptyLine}>-</div>;
  }
  return (
    <ul className={styles.lineList}>
      {lines.map((line) => (
        <li key={line.id}>
          <span className={styles.lineName}>
            {line.itemNameTh ?? line.itemCode}
          </span>
          <span className={styles.lineQty}>
            {fmtQty(line.quantity)} {line.unitCode ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FormulaHead({ formula }: { formula: ProductionFormula }) {
  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.cardName}>{formula.nameTh}</span>
        {formula.versionNo > 1 ? (
          <Tooltip title="เลขรุ่นบวกขึ้นทุกครั้งที่แก้บรรทัดในสูตร">
            <Tag>รุ่น {formula.versionNo}</Tag>
          </Tooltip>
        ) : null}
      </div>
      <div className={styles.cardCode}>{formula.formulaCode}</div>
      {formula.batchLabel ? (
        <div className={styles.batchLabel}>{formula.batchLabel}</div>
      ) : null}
    </>
  );
}

function FormulaRecipe({ formula }: { formula: ProductionFormula }) {
  return (
    <>
      <div className={styles.sectionLabel}>ผลผลิตที่ได้</div>
      <LineList formula={formula} role="OUTPUT" />

      <div className={styles.sectionLabel}>วัตถุดิบที่ต้องใช้</div>
      <LineList formula={formula} role="INPUT" />

      {formula.lines.some((line) => line.lineRole === "WASTE") ? (
        <>
          <div className={styles.sectionLabel}>ของเสีย</div>
          <LineList formula={formula} role="WASTE" />
        </>
      ) : null}
    </>
  );
}

function CreateFormulaButton({ compact }: { compact?: boolean }) {
  return (
    <Button
      size="small"
      type="primary"
      icon={<PlusOutlined />}
      href={CREATE_FORMULA_HREF}
    >
      {compact ? "สร้าง" : "สร้างสูตร"}
    </Button>
  );
}

function PanelHeader({ canAdd }: { canAdd: boolean }) {
  return (
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>สูตรการผลิตมาตรฐาน</div>
      {canAdd ? <CreateFormulaButton compact /> : null}
    </div>
  );
}

export default function FormulaReferenceCards({
  formulas,
  selectedId,
  onSelect,
  loading,
  disabled,
}: Props) {
  const formulaActions = useScreenActionPermissions("PRODUCTION_FORMULAS");
  const [previewId, setPreviewId] = useState<string | undefined>();
  const active = formulas.filter((formula) => formula.isActive);
  const compact = active.length >= 2;
  const preview = active.find((formula) => formula.id === previewId);

  if (!loading && active.length === 0) {
    return (
      <div className={styles.panel}>
        <PanelHeader canAdd={formulaActions.canAdd} />
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่มีสูตร — ตั้งได้ที่ ข้อมูลหลัก › สูตรการผลิต"
        />
        {formulaActions.canAdd ? (
          <div className={styles.emptyAction}>
            <CreateFormulaButton />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <PanelHeader canAdd={formulaActions.canAdd} />
      {compact ? (
        <p className={styles.compactHint}>กดแถวเพื่อดูสูตรเต็ม แล้วเลือกใช้</p>
      ) : null}
      <div className={styles.cardScroll}>
        {active.map((formula) => {
          const selected = formula.id === selectedId;
          return (
            <button
              key={formula.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
              onClick={() => {
                if (compact) {
                  setPreviewId(formula.id);
                  return;
                }
                onSelect(formula.id);
              }}
            >
              <FormulaHead formula={formula} />
              {compact ? null : <FormulaRecipe formula={formula} />}
            </button>
          );
        })}
      </div>

      <Modal
        open={Boolean(preview)}
        onCancel={() => setPreviewId(undefined)}
        title={
          preview
            ? `${preview.formulaCode} — ${preview.nameTh}`
            : "สูตรการผลิต"
        }
        destroyOnHidden
        width={760}
        footer={
          preview ? (
            <>
              <Button onClick={() => setPreviewId(undefined)}>ปิด</Button>
              <Button
                type="primary"
                disabled={disabled}
                onClick={() => {
                  onSelect(preview.id);
                  setPreviewId(undefined);
                }}
              >
                ใช้สูตรนี้
              </Button>
            </>
          ) : null
        }
      >
        {preview ? (
          <div className={styles.modalRecipe}>
            {preview.versionNo > 1 ? (
              <Tag style={{ marginBottom: 8 }}>รุ่น {preview.versionNo}</Tag>
            ) : null}
            {preview.batchLabel ? (
              <div className={styles.batchLabel}>{preview.batchLabel}</div>
            ) : null}
            <FormulaRecipe formula={preview} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
