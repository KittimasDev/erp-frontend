"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Switch,
  Tabs,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useEquipmentQuery } from "@/hooks/maintenance/useMaintenance";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { validateRecordingEquipmentConfig } from "@/utils/recordingEquipment";
import { validateRecordingBomLinks } from "@/utils/recordingBomLink";
import type {
  ProductionFormula,
  ProductionFormulaLineBody,
  ProductionRecordingConfig,
  UpdateProductionFormulaBody,
} from "@/types/production-formula";
import { FORMULA_LINE_ROLE_LABEL } from "@/types/production-formula";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import RecordingConfigEditor from "./RecordingConfigEditor";
import styles from "./production-formulas.module.css";

/** ผูกปุ่มบันทึกบน footer ของ Modal เข้ากับ <form> ที่อยู่ใน Body */
const FORM_ID = "production-formula-form";

type LineValues = {
  lineRole?: string;
  itemId?: string;
  quantity?: number | null;
  remark?: string;
};

type FormValues = {
  formulaCode?: string;
  nameTh?: string;
  description?: string;
  batchLabel?: string;
  isActive?: boolean;
  sortOrder?: number;
  remark?: string;
  linesINPUT?: LineValues[];
  linesOUTPUT?: LineValues[];
  linesWASTE?: LineValues[];
  /**
   * ตัวตั้งเริ่มต้นเก็บเป็น `"<บทบาท>:<ลำดับในกลุ่มนั้น>"` เช่น `"OUTPUT:0"`
   *
   * ไม่ใช้เลข index ของ array รวม เพราะพอแยกเป็นสามลิสต์แล้วลำดับรวมจะเลื่อน
   * ทุกครั้งที่เพิ่ม/ลบบรรทัดในกลุ่มก่อนหน้า แล้วตัวตั้งจะไปติดบรรทัดผิด
   */
  defaultDriverKey?: string;
};

/** ค่าที่ส่งออกไปให้หน้าแม่ยิง API */
export type FormulaSubmitValues = UpdateProductionFormulaBody & {
  formulaCode?: string;
  nameTh?: string;
};

const ROLES = ["INPUT", "OUTPUT", "WASTE"] as const;

const ROLE_HINT: Record<string, string> = {
  INPUT: "ต้องมีอย่างน้อย 1 รายการ",
  OUTPUT: "ต้องมีอย่างน้อย 1 รายการ เลือกได้ทุกสินค้าสต๊อก",
  WASTE: "ไม่บังคับ — ใส่ก๊าซหรือของที่ทิ้งเพื่อให้สมดุลมวลครบ",
};

/**
 * ฟอร์มตั้งสูตรการผลิต
 *
 * ## ทำไมแยกเป็น Modal + Body
 *
 * `destroyOnHidden` ทำให้ `<Form>` ข้างในถูก mount ใหม่ทุกครั้งที่เปิด · ถ้าเซ็ตค่า
 * ตั้งต้นด้วย `useEffect` + `form.setFieldsValue` มันจะ **ยิงก่อนที่ฟอร์มจะต่อกับ
 * instance ทัน แล้วเงียบ ๆ ไม่มีอะไรเกิดขึ้น** — อาการคือเปิดโมดัลมาแล้วบรรทัด
 * ตั้งต้นไม่ขึ้นเลย (เจอจริงตอนเทสหน้าจอ 2026-09-09)
 *
 * ทางที่ถูกคือใช้ `initialValues` ของ `<Form>` ในคอมโพเนนต์ที่ mount ตอนเปิด
 * เท่านั้น — ค่าตั้งต้นจึงมาพร้อมฟอร์มตั้งแต่เฟรมแรก ไม่ต้องพึ่ง effect
 *
 * ## กติกาอื่นในฟอร์มนี้
 *
 * แยกบรรทัดเป็น 3 กลุ่มตามบทบาทเพื่อให้กรอกง่าย แต่ส่งออกเป็น array เดียว
 * ตรงกับรูปตารางฝั่ง backend · **ตัวตั้งเริ่มต้นเป็น `Radio.Group` ระดับฟอร์ม**
 * ทำให้กฎ "ได้ไม่เกิน 1 บรรทัด" ผิดไม่ได้เชิงโครงสร้าง · **หน่วยนับไม่ให้เลือก**
 * เพราะฝั่งใบสั่งผลิตไม่แปลงหน่วยเลย ระบบเติมหน่วยหลักของสินค้าให้เอง
 */
export default function FormulaFormModal({
  open,
  formula,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /** ไม่ส่งมา = สร้างใหม่ */
  formula?: ProductionFormula;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: FormulaSubmitValues) => void;
}) {
  return (
    <Modal
      open={open}
      title={null}
      onCancel={onCancel}
      centered
      destroyOnHidden
      className={masterStyles.masterModal}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={loading}
      /*
        ปุ่มบันทึกอยู่บน footer ของ Modal (ไม่ใช่ footer ที่วาดเอง) เพื่อให้ได้
        `.masterModal .ant-modal-footer` ตามดีไซน์ของหน้ามาสเตอร์ทุกใบ ·
        ฟอร์มอยู่ใน Body ซึ่ง mount ใหม่ทุกครั้ง จึงยิงข้ามด้วย `form=` ของ HTML
        แทนการยก `Form.useForm()` ขึ้นมาไว้ข้างนอก (ซึ่งจะทำให้ initialValues
        ไม่ทำงานตอนเปิดซ้ำ)
      */
      okButtonProps={{ htmlType: "submit", form: FORM_ID }}
      width={1100}
    >
      <div className={masterStyles.modalHeader}>
        <div className={masterStyles.modalIcon}>{formula ? "✎" : "+"}</div>
        <div className={masterStyles.modalHeaderContent}>
          <div className={masterStyles.eyebrow}>
            {formula ? "EDIT FORMULA" : "CREATE FORMULA"}
          </div>
          <h2>{formula ? `แก้ไขสูตร ${formula.formulaCode}` : "สร้างสูตรการผลิต"}</h2>
          <p>
            ตั้งว่า 1 รอบใช้อะไรเท่าไหร่ แล้วได้อะไรออกมาเท่าไหร่ —
            และกำหนดรูปแบบบันทึกผลการผลิตตามสูตร
          </p>
        </div>
      </div>

      {/* mount ใหม่ทุกครั้งที่เปิด — ค่าตั้งต้นจึงมากับ initialValues ได้ */}
      <FormulaFormBody formula={formula} onSubmit={onSubmit} />
    </Modal>
  );
}

function FormulaFormBody({
  formula,
  onSubmit,
}: {
  formula?: ProductionFormula;
  onSubmit: (values: FormulaSubmitValues) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = Boolean(formula);
  const [recordingConfig, setRecordingConfig] =
    useState<ProductionRecordingConfig>(() => ({
      fields: formula?.recordingConfig?.fields ?? [],
      equipmentIds: formula?.recordingConfig?.equipmentIds ?? [],
      // โหลดรายการยกเว้น+เหตุผลเดิมกลับมา ไม่งั้นแก้สูตรแล้วเหตุผลหายและบันทึกทับเป็นว่าง
      bomExemptions: formula?.recordingConfig?.bomExemptions ?? [],
    }));

  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );

  /*
    แยกเป็นสามลิสต์ตามบทบาท **ไม่ใช่ลิสต์เดียวแล้วกรองด้วยค่าที่ watch มา**

    ตอนแรกทำเป็นลิสต์เดียวแล้วกรองด้วย `Form.useWatch("lines")` ผลคือเปิดโมดัลมา
    แล้วบรรทัดตั้งต้นไม่ขึ้นเลย เพราะ `useWatch` ยังไม่คืนค่าในเฟรมแรก ตัวกรอง
    จึงเห็น array ว่าง (เจอจริงตอนเทสหน้าจอ 2026-09-09) · แยกลิสต์แล้วไม่ต้อง
    กรองอะไรเลย `Form.List` เรนเดอร์จาก store ของตัวเองตรง ๆ
  */
  const watchedByRole = {
    INPUT: Form.useWatch("linesINPUT", form),
    OUTPUT: Form.useWatch("linesOUTPUT", form),
    WASTE: Form.useWatch("linesWASTE", form),
  };
  const linesByRole = useMemo(
    () => ({
      INPUT: watchedByRole.INPUT ?? [],
      OUTPUT: watchedByRole.OUTPUT ?? [],
      WASTE: watchedByRole.WASTE ?? [],
    }),
    [watchedByRole.INPUT, watchedByRole.OUTPUT, watchedByRole.WASTE],
  );
  const lines = useMemo(
    () => [
      ...linesByRole.INPUT.map((line) => ({ ...line, lineRole: "INPUT" })),
      ...linesByRole.OUTPUT.map((line) => ({ ...line, lineRole: "OUTPUT" })),
      ...linesByRole.WASTE.map((line) => ({ ...line, lineRole: "WASTE" })),
    ],
    [linesByRole],
  );

  /** ค่าตั้งต้นคิดครั้งเดียวตอน mount — ไม่ต้องมี effect */
  const initialValues = useMemo<FormValues>(() => {
    if (formula) {
      const sorted = [...formula.lines].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const driverIndex = sorted.findIndex((line) => line.isDefaultDriver);
      const pick = (role: string) =>
        sorted
          .filter((line) => line.lineRole === role)
          .map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity),
            remark: line.remark,
          }));
      const driver = sorted[driverIndex];
      return {
        formulaCode: formula.formulaCode,
        nameTh: formula.nameTh,
        description: formula.description,
        batchLabel: formula.batchLabel,
        isActive: formula.isActive,
        sortOrder: formula.sortOrder,
        remark: formula.remark,
        linesINPUT: pick("INPUT"),
        linesOUTPUT: pick("OUTPUT"),
        linesWASTE: pick("WASTE"),
        defaultDriverKey: driver
          ? `${driver.lineRole}:${sorted
              .filter((line) => line.lineRole === driver.lineRole)
              .findIndex((line) => line.id === driver.id)}`
          : undefined,
      };
    }
    return {
      isActive: true,
      sortOrder: 0,
      // เปิดมาให้มีบรรทัดวัตถุดิบและผลผลิตอย่างละแถวเลย ไม่ต้องกดเพิ่มเอง
      linesINPUT: [{}],
      linesOUTPUT: [{}],
      linesWASTE: [],
      defaultDriverKey: "OUTPUT:0",
    };
  }, [formula]);

  /**
   * สมดุลมวลคร่าว ๆ ตอนกำลังกรอก — เตือนก่อนบันทึกว่าสูตรปิดหรือไม่
   *
   * รวมได้เฉพาะเมื่อทุกบรรทัดใช้หน่วยเดียวกัน · กติกาเดียวกับฝั่ง backend
   * (เตาให้น้ำมันเป็นลิตร ผงคาร์บอนเป็นกิโล ตัวเลขรวมข้ามหน่วยไม่มีความหมาย)
   */
  const balance = useMemo(() => {
    const filled = lines.filter(
      (line) => line?.itemId && Number(line?.quantity) > 0,
    );
    const units = new Set(
      filled.map((line) => itemById.get(line.itemId as string)?.unitId),
    );
    const sumOf = (role: string) =>
      filled
        .filter((line) => line.lineRole === role)
        .reduce((acc, line) => acc + Number(line.quantity ?? 0), 0);
    const input = sumOf("INPUT");
    const output = sumOf("OUTPUT");
    const waste = sumOf("WASTE");
    return {
      comparable: units.size <= 1 && filled.length > 0,
      diff: Number((input - output - waste).toFixed(3)),
      input,
      output,
      waste,
    };
  }, [lines, itemById]);

  const { message } = App.useApp();
  const equipmentQuery = useEquipmentQuery({});

  const submit = (values: FormValues) => {
    // ตรวจส่วนเครื่องจักรก่อนส่ง (backend ตรวจซ้ำเป็นตัวตัดสิน)
    const equipmentErrors = validateRecordingEquipmentConfig(
      recordingConfig,
      equipmentQuery.data?.data ?? [],
      new Map(items.map((item) => [item.id, item.unitId as string])),
    );
    if (equipmentErrors.length > 0) {
      message.error(equipmentErrors[0]);
      return;
    }
    // ตัดรายการยกเว้นที่ค้าง: วัตถุดิบถูกลบจาก BOM แล้ว หรือภายหลังลิงก์ช่อง Input แล้ว
    const inputIds = new Set(
      bomLineOptions.filter((l) => l.lineRole === "INPUT").map((l) => l.itemId),
    );
    const linkedIds = new Set(
      recordingConfig.fields.flatMap((f) =>
        f.resultRole === "INPUT" && f.linkedItemId ? [f.linkedItemId] : [],
      ),
    );
    const cleanConfig = {
      ...recordingConfig,
      bomExemptions: (recordingConfig.bomExemptions ?? []).filter(
        (e) => inputIds.has(e.itemId) && !linkedIds.has(e.itemId),
      ),
    };
    // เปิดใช้งานอยู่ต้องลิงก์ BOM ครบ · ปิดใช้งาน (ฉบับร่าง) บันทึกได้
    if (values.isActive) {
      const bomErrors = validateRecordingBomLinks(
        cleanConfig,
        bomLineOptions
          .filter((l) => l.lineRole === "INPUT")
          .map((l) => ({ itemId: l.itemId, label: l.label.replace(/^INPUT · /, "") })),
      );
      if (bomErrors.length > 0) {
        message.error(
          `${bomErrors.join(" · ")} — ลิงก์ให้ครบที่แท็บ "การตั้งค่าบันทึกผลการผลิต" หรือปิดสถานะใช้งานเพื่อบันทึกเป็นฉบับร่าง`,
          8,
        );
        return;
      }
    }
    const collect = (role: string, rows?: LineValues[]) =>
      (rows ?? []).map((line, indexInRole) => ({
        lineRole: role,
        itemId: line?.itemId as string,
        quantity: Number(line?.quantity),
        // เทียบด้วยคีย์ "บทบาท:ลำดับในกลุ่ม" จึงไม่เลื่อนตามกลุ่มอื่น
        isDefaultDriver: values.defaultDriverKey === `${role}:${indexInRole}`,
        remark: line?.remark?.trim() || undefined,
      }));

    const allLines: ProductionFormulaLineBody[] = [
      ...collect("INPUT", values.linesINPUT),
      ...collect("OUTPUT", values.linesOUTPUT),
      ...collect("WASTE", values.linesWASTE),
    ]
      .filter((line) => line.itemId && line.quantity > 0)
      .map((line, index) => ({ ...line, sortOrder: index }));

    const shared = {
      nameTh: values.nameTh,
      description: values.description,
      batchLabel: values.batchLabel,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
      remark: values.remark,
      recordingConfig: {
        equipmentIds: recordingConfig.equipmentIds ?? [],
        bomExemptions: cleanConfig.bomExemptions,
        fields: recordingConfig.fields.map((f, i) => ({ ...f, sortOrder: i })),
      },
      lines: allLines,
    };

    onSubmit(isEdit ? shared : { ...shared, formulaCode: values.formulaCode });
  };

  const inputCount = linesByRole.INPUT.filter((l) => l?.itemId).length;
  const outputCount = linesByRole.OUTPUT.filter((l) => l?.itemId).length;

  const bomLineOptions = useMemo(
    () =>
      lines
        .filter(
          (line) =>
            line?.itemId &&
            (line.lineRole === "INPUT" || line.lineRole === "OUTPUT"),
        )
        .map((line) => {
          const item = itemById.get(line.itemId as string);
          return {
            itemId: line.itemId as string,
            lineRole: line.lineRole as "INPUT" | "OUTPUT",
            label: `${line.lineRole} · ${item?.itemCode ?? ""} ${item?.itemNameTh ?? line.itemId}`,
          };
        }),
    [lines, itemById],
  );

  return (
    <Form
      id={FORM_ID}
      form={form}
      layout="vertical"
      requiredMark="optional"
      className={masterStyles.form}
      initialValues={initialValues}
      onFinish={submit}
    >
      <Tabs
        items={[
          {
            key: "formula",
            label: "ข้อมูลสูตร (Input / Output / Waste)",
            children: (
              <>
      <div className={masterStyles.formGrid}>
        <Form.Item
          name="formulaCode"
          label="รหัสสูตร"
          rules={[
            { required: true, message: "กรอกรหัสสูตร" },
            {
              pattern: /^[A-Z][A-Z0-9_-]{2,29}$/,
              message: "ขึ้นต้นด้วยตัวพิมพ์ใหญ่ ใช้ได้เฉพาะ A-Z 0-9 - และ _",
            },
          ]}
          extra={
            isEdit
              ? "แก้ไม่ได้ เพราะใบสั่งผลิตอ้างอิงไว้"
              : "ตัวพิมพ์ใหญ่ ตัวเลข ขีด และขีดล่าง เช่น PYRO-STD-01"
          }
        >
          <Input disabled={isEdit} placeholder="PYRO-STD-01" maxLength={30} />
        </Form.Item>
        <Form.Item
          name="nameTh"
          label="ชื่อสูตร"
          rules={[{ required: true, message: "กรอกชื่อสูตร" }]}
        >
          <Input placeholder="สูตรการผลิต 1" maxLength={150} />
        </Form.Item>
        <Form.Item
          name="batchLabel"
          label="ขนาด 1 รอบ (ข้อความอธิบาย)"
          extra="แสดงให้คนอ่านเข้าใจเท่านั้น ไม่ถูกนำไปคำนวณ"
        >
          <Input placeholder="ยางสับ 1,000 กก. ต่อรอบ" maxLength={80} />
        </Form.Item>
        <Form.Item name="sortOrder" label="ลำดับการแสดง">
          <InputNumber style={{ width: "100%" }} min={0} />
        </Form.Item>
        <Form.Item name="isActive" label="สถานะใช้งาน" valuePropName="checked">
          <Switch checkedChildren="ใช้งาน" unCheckedChildren="ปิด" />
        </Form.Item>
      </div>

      <Form.Item name="description" label="คำอธิบายสูตร">
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>

      {/* ─── บรรทัดในสูตร แยกกลุ่มตามบทบาท ────────────────────────────── */}
      {/* สามลิสต์แยกกัน — ไม่มีการกรองด้วยค่าที่ watch มา จึงขึ้นตั้งแต่เฟรมแรก */}
      {ROLES.map((role) => (
        <Form.List key={role} name={`lines${role}`}>
          {(fields, { add, remove }) => (
            <div className={styles.lineGroup}>
              <div className={styles.lineGroupHead}>
                <span className={styles.lineGroupTitle}>
                  {FORMULA_LINE_ROLE_LABEL[role]}
                </span>
                <span className={styles.lineGroupHint}>{ROLE_HINT[role]}</span>
              </div>

              {fields.map((field) => {
                const line = linesByRole[role][field.name];
                const unitCode = line?.itemId
                  ? itemById.get(line.itemId)?.unit?.code
                  : undefined;
                return (
                  <div key={field.key} className={styles.lineRow}>
                    <Form.Item
                      name={[field.name, "itemId"]}
                      rules={[{ required: true, message: "เลือกสินค้า" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="เลือกสินค้า"
                        loading={itemsQuery.isFetching}
                        options={items.map((item) => ({
                          value: item.id,
                          label: `${item.itemCode} — ${item.itemNameTh}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "quantity"]}
                      rules={[{ required: true, message: "กรอกจำนวน" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0.001}
                        precision={3}
                        placeholder="จำนวนต่อ 1 รอบ"
                      />
                    </Form.Item>
                    <div className={styles.muted} style={{ paddingTop: 6 }}>
                      {unitCode ?? "หน่วย"}
                    </div>
                    <Form.Item
                      name={[field.name, "remark"]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="หมายเหตุ" maxLength={2000} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}

              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                style={{ marginTop: 8 }}
                onClick={() => add({})}
              >
                เพิ่ม{FORMULA_LINE_ROLE_LABEL[role]}
              </Button>
            </div>
          )}
        </Form.List>
      ))}

      {/*
        ตัวตั้งเริ่มต้น — Radio ระดับฟอร์มทำให้เลือกได้ทีเดียวเท่านั้น
        จึงผิดกฎ "ไม่เกิน 1 บรรทัด" ไม่ได้เลย
      */}
      <Form.Item
        name="defaultDriverKey"
        label="ตัวตั้งเริ่มต้นในหน้าสร้างใบสั่งผลิต"
        extra="บรรทัดที่ผู้ใช้จะพิมพ์จำนวนใส่เป็นค่าเริ่มต้น — ไม่เลือกก็ได้ ระบบจะใช้ผลผลิตบรรทัดแรก"
      >
        <Radio.Group>
          {ROLES.flatMap((role) =>
            linesByRole[role].map((line, indexInRole) =>
              line?.itemId ? (
                <Radio key={`${role}:${indexInRole}`} value={`${role}:${indexInRole}`}>
                  {itemById.get(line.itemId)?.itemNameTh ?? "-"}{" "}
                  <Tag>{FORMULA_LINE_ROLE_LABEL[role]}</Tag>
                </Radio>
              ) : null,
            ),
          )}
        </Radio.Group>
      </Form.Item>

      {/* พรีวิวสมดุลมวลตอนกรอก — จับสูตรที่ไม่ปิดก่อนกดบันทึก */}
      <div className={styles.previewBox}>
        <div className={styles.previewTitle}>ตรวจสูตรก่อนบันทึก</div>
        {!balance.comparable ? (
          <span className={styles.muted}>
            สูตรนี้ใช้หลายหน่วยนับ (หรือยังกรอกไม่ครบ) ระบบจึงตรวจสมดุลมวลให้ไม่ได้ —
            ตัวเลขประมาณการยังถูกต้อง เพราะระบบคูณแยกทีละบรรทัด
          </span>
        ) : (
          <div className={styles.previewGrid}>
            <Tag color="blue">วัตถุดิบเข้ารวม {balance.input}</Tag>
            <Tag color="green">ผลผลิตรวม {balance.output}</Tag>
            <Tag>ของเสียรวม {balance.waste}</Tag>
            {balance.diff === 0 ? (
              <Tag color="success">สมดุลมวลปิดพอดี</Tag>
            ) : (
              <Tag color="warning">
                {balance.diff > 0 ? "ขาด" : "เกิน"} {Math.abs(balance.diff)} —
                ใส่ของเสียให้ครบจะทำให้ Yield อ่านง่ายขึ้น
              </Tag>
            )}
          </div>
        )}
      </div>

      {inputCount === 0 || outputCount === 0 ? (
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          title="ยังกรอกไม่ครบทั้งสองฝั่ง"
          description="สูตรต้องมีวัตถุดิบอย่างน้อย 1 รายการ และผลผลิตอย่างน้อย 1 รายการ เพราะใบสั่งผลิตบังคับทั้งสองฝั่ง"
        />
      ) : null}

      <Form.Item name="remark" label="หมายเหตุ" style={{ marginTop: 12 }}>
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>
              </>
            ),
          },
          {
            key: "recording",
            label: "การตั้งค่าบันทึกผลการผลิต",
            children: (
              <RecordingConfigEditor
                value={recordingConfig}
                onChange={setRecordingConfig}
                bomLines={bomLineOptions}
              />
            ),
          },
        ]}
      />
    </Form>
  );
}
