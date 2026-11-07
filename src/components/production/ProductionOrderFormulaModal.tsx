"use client";

import { useState } from "react";
import { Alert, Descriptions, Empty, Modal, Select, Spin, Table, Tag } from "antd";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

import {
  useProductionFormulaQuery,
  useProductionFormulasQuery,
} from "@/hooks/production-formulas/useProductionFormulaQueries";
import type { ProductionFormulaLine } from "@/types/production-formula";
import { FORMULA_LINE_ROLE_LABEL } from "@/types/production-formula";
import { useT } from "@/lib/i18n/useT";
import { useLanguage, type Language } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";

/**
 * ดูสูตรจากหน้ารายละเอียดใบสั่งผลิต
 *
 * ## ขึ้นทุกใบ ไม่ใช่เฉพาะใบที่คิดจากสูตร
 *
 * ใบที่กรอกมือ (ซึ่งตอนนี้คือเกือบทุกใบในระบบ) ไม่มีสูตรผูกอยู่ แต่คนอ่านใบยังอยากเปิด
 * สูตรมาตรฐานมาเทียบว่ารอบนี้ใส่ต่างจากสูตรตรงไหน · ถ้าซ่อนปุ่มไว้เมื่อไม่มีสูตร
 * ปุ่มจะแทบไม่เคยโผล่ให้ใครเห็นเลย
 *
 * - ใบที่คิดจากสูตร → เปิดสูตรนั้นให้เลย พร้อมจำนวนที่ตั้งเป้าและเลขรุ่นที่ใช้
 * - ใบที่กรอกมือ → ให้เลือกสูตรที่อยากดูเอง (อ่านอย่างเดียว ไม่ผูกกลับเข้าใบ)
 *
 * ## ทำไมต้องเทียบเลขรุ่น
 *
 * สูตรเป็นข้อมูลหลักที่แก้ได้ตลอด แต่ `planned_qty` ถูกคิดและเก็บลงใบไปแล้วตั้งแต่
 * ตอนสร้าง · ถ้าสูตรถูกแก้ทีหลัง ตัวเลขในสูตรวันนี้จะไม่ตรงกับที่ใบนี้ใช้คิด
 * ต้องบอกให้ชัด ไม่งั้นคนอ่านจะสรุปผิดว่าใบนี้คำนวณพลาด
 */

type Props = {
  open: boolean;
  onClose: () => void;
  /** ไม่มี = ใบนี้ไม่ได้คิดจากสูตร ให้ผู้ใช้เลือกสูตรที่อยากดูเอง */
  formulaId?: string;
  /** เลขรุ่นที่ใบนี้ใช้ตอนวางแผน */
  versionUsed?: number;
  /** จำนวนที่ตั้งเป้าไว้ตอนคิด */
  targetQty?: string;
  /** สินค้าของบรรทัดที่ใช้เป็นตัวตั้ง */
  driverItemId?: string;
};

function fmtQty(value: string | number, lang: Language) {
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : formatNumber(num, lang, 3);
}

export default function ProductionOrderFormulaModal(props: Props) {
  const t = useT();
  return (
    <Modal
      open={props.open}
      onCancel={props.onClose}
      title={props.formulaId ? t("สูตรที่ใช้วางแผนใบนี้") : t("ดูสูตรการผลิต")}
      footer={null}
      destroyOnHidden
      width={760}
    >
      <FormulaBody {...props} />
    </Modal>
  );
}

function FormulaBody({
  formulaId,
  versionUsed,
  targetQty,
  driverItemId,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  const boundToOrder = Boolean(formulaId);

  /*
    ใบที่กรอกมือ — ตั้งค่าเริ่มต้นตอน mount (Modal เป็น destroyOnHidden จึง mount
    ใหม่ทุกครั้งที่เปิด) ไม่ใช้ effect ตามกฎ `react-hooks/set-state-in-effect`
  */
  const [pickedId, setPickedId] = useState<string | undefined>(formulaId);

  const listQuery = useProductionFormulasQuery({ isActive: true });
  const formulas = listQuery.data?.data ?? [];

  const detailQuery = useProductionFormulaQuery(pickedId);
  const formula = detailQuery.data?.data;

  const picker = boundToOrder ? null : (
    <div>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>{t("เลือกสูตรที่อยากดู")}</div>
      <Select
        style={{ width: "100%" }}
        showSearch
        allowClear
        optionFilterProp="label"
        placeholder={t("เลือกสูตรการผลิต")}
        loading={listQuery.isLoading}
        value={pickedId}
        onChange={setPickedId}
        options={formulas.map((item) => ({
          value: item.id,
          label: `${item.formulaCode} — ${item.nameTh}`,
        }))}
        notFoundContent={t("ยังไม่มีสูตรในระบบ")}
      />
      <Alert
        style={{ marginTop: 10 }}
        type="info"
        showIcon
        title={t("ใบนี้ไม่ได้คิดจากสูตร")}
        description={t("แผนบนใบถูกกรอกเอง — สูตรที่เปิดดูตรงนี้เป็นค่ามาตรฐานไว้เทียบเฉยๆ ไม่ได้ผูกกลับเข้าใบ")}
      />
    </div>
  );

  if (!pickedId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {picker}
        {formulas.length === 0 && !listQuery.isLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                {t("ยังไม่มีสูตรในระบบ — ตั้งได้ที่")}{" "}
                <Link href="/masters/production-formulas">
                  {t("ข้อมูลหลัก › สูตรการผลิต")}
                </Link>
              </span>
            }
          />
        ) : null}
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {picker}
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin />
        </div>
      </div>
    );
  }

  if (!formula) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {picker}
        <Alert
          type="warning"
          showIcon
          title={t("ดูสูตรไม่ได้")}
          description={t("สูตรที่อ้างอิงอาจถูกลบไปแล้ว — ตัวเลขแผนบนใบยังถูกต้อง เพราะถูกคิดและบันทึกลงใบตั้งแต่ตอนสร้าง")}
        />
      </div>
    );
  }

  const versionChanged =
    boundToOrder &&
    versionUsed !== undefined &&
    formula.versionNo !== versionUsed;

  const columns: ColumnsType<ProductionFormulaLine> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ประเภท"),
      dataIndex: "lineRole",
      key: "lineRole",
      width: 130,
      render: (role: string) => (
        <Tag
          color={
            role === "OUTPUT" ? "green" : role === "INPUT" ? "blue" : "default"
          }
        >
          {FORMULA_LINE_ROLE_LABEL[role] ? t(FORMULA_LINE_ROLE_LABEL[role]) : role}
        </Tag>
      ),
    },
    {
      title: t("สินค้า"),
      key: "item",
      render: (_v, row) => (
        <span>
          {row.itemNameTh ?? row.itemCode}
          {boundToOrder && row.itemId === driverItemId ? (
            <Tag style={{ marginLeft: 6 }}>{t("ตัวตั้ง")}</Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t("ต่อ 1 รอบ"),
      key: "quantity",
      width: 150,
      align: "right",
      render: (_v, row) => `${fmtQty(row.quantity, lang)} ${row.unitCode ?? ""}`,
    },
  ];

  // ผลผลิตขึ้นก่อน เพราะเป็นสิ่งที่คนดูมองหาเป็นอย่างแรก
  const roleOrder: Record<string, number> = { OUTPUT: 0, INPUT: 1, WASTE: 2 };
  const lines = [...formula.lines].sort(
    (a, b) =>
      (roleOrder[a.lineRole] ?? 9) - (roleOrder[b.lineRole] ?? 9) ||
      a.sortOrder - b.sortOrder,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {picker}

      {versionChanged ? (
        <Alert
          type="warning"
          showIcon
          title={t("สูตรถูกแก้หลังจากใบนี้ถูกวางแผน (ใบนี้ใช้รุ่น {used} · ตอนนี้เป็นรุ่น {current})", { used: versionUsed, current: formula.versionNo })}
          description={t("ตัวเลขด้านล่างคือสูตรรุ่นปัจจุบัน ไม่ใช่ชุดที่ใบนี้ใช้คิด — แผนบนใบยังถูกต้องเพราะถูกคิดและบันทึกไว้ตั้งแต่ตอนสร้าง")}
        />
      ) : null}

      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label={t("สูตร")} span={2}>
          {formula.formulaCode} — {formula.nameTh}
          {!formula.isActive ? (
            <Tag style={{ marginLeft: 6 }}>{t("ปิดใช้งานแล้ว")}</Tag>
          ) : null}
        </Descriptions.Item>
        <Descriptions.Item label={t("ขนาด 1 รอบ")}>
          {formula.batchLabel ?? t("ไม่ระบุ")}
        </Descriptions.Item>
        <Descriptions.Item label={boundToOrder ? t("รุ่นที่ใบนี้ใช้") : t("รุ่นปัจจุบัน")}>
          {boundToOrder ? (versionUsed ?? "-") : formula.versionNo}
          {versionChanged ? ` (${t("ปัจจุบัน {n}", { n: formula.versionNo })})` : ""}
        </Descriptions.Item>
        {boundToOrder ? (
          <Descriptions.Item label={t("ตั้งเป้าไว้")} span={2}>
            {targetQty ? fmtQty(targetQty, lang) : "-"}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={lines}
        columns={columns}
      />

      <div style={{ fontSize: 12 }}>
        {t("แก้สูตรได้ที่")}{" "}
        <Link href="/masters/production-formulas">{t("ข้อมูลหลัก › สูตรการผลิต")}</Link>{" "}
        {t("— การแก้จะไม่กระทบใบที่วางแผนไปแล้ว")}
      </div>
    </div>
  );
}
