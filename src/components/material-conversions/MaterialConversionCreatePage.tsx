"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useMaterialConversionRoutesQuery,
  useStepSkipCheckQuery,
} from "@/hooks/material-conversions/useMaterialConversionQueries";
import { useCreateMaterialConversionMutation } from "@/hooks/material-conversions/useMaterialConversionMutations";
import type { MaterialConversionRouteStep } from "@/types/material-conversion";
import { useT } from "@/lib/i18n/useT";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import RunTeamFields from "./RunTeamFields";
import MaterialConversionRunLinesFields, {
  buildRunLinesPayload,
  EMPTY_INPUT,
  EMPTY_OUTPUT,
  useConversionLineData,
  type InputLineValues,
  type OutputLineValues,
} from "./MaterialConversionRunLinesFields";
import styles from "./MaterialConversionPage.module.css";

const ROUTE_BASE = "/production/material-conversions";

type FormValues = {
  routeId?: string;
  stepId?: string;
  runDate: Dayjs;
  batchNo?: string;
  equipmentId?: string;
  operatorIds?: string[];
  remark?: string;
  inputs: InputLineValues[];
  outputs: OutputLineValues[];
};

export default function MaterialConversionCreatePage() {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSIONS");
  const createMutation = useCreateMaterialConversionMutation();

  const [form] = Form.useForm<FormValues>();
  const routeId = Form.useWatch("routeId", form);
  const stepId = Form.useWatch("stepId", form);
  const batchNo = Form.useWatch("batchNo", form);
  const rawInputs = Form.useWatch("inputs", form);
  const rawOutputs = Form.useWatch("outputs", form);
  // ห่อด้วย useMemo ไม่ใช่ `?? []` เปล่า — array literal ใหม่ทุก render
  // จะทำให้ useMemo ที่รวมยอดด้านล่างคำนวณซ้ำฟรีทุกครั้ง
  const watchedInputs = useMemo(() => rawInputs ?? [], [rawInputs]);
  const watchedOutputs = useMemo(() => rawOutputs ?? [], [rawOutputs]);

  const routesQuery = useMaterialConversionRoutesQuery({ isActive: true });
  // เอกสารเดี่ยวก็ได้ประโยชน์เหมือนกัน — พิมพ์ Batch แล้ว Lot ของ Batch นั้นขึ้นบนสุด
  const lineData = useConversionLineData(batchNo);

  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === routeId),
    [routes, routeId],
  );
  const steps = useMemo(
    () => (selectedRoute?.steps ?? []).filter((step) => step.isActive),
    [selectedRoute],
  );
  const selectedStep = useMemo(
    () => steps.find((step) => step.id === stepId),
    [steps, stepId],
  );

  const skipQuery = useStepSkipCheckQuery({ routeId, stepId, batchNo });
  const skipWarning = skipQuery.data?.data.message;

  /**
   * เลือกขั้นตอนแล้วเติมบรรทัดผลผลิตจากแม่แบบให้เลย
   *
   * นี่คือผลตอบแทนของ master data — ถ้าไม่เติม ผู้ใช้จะเจอ repeater เปล่าทุกครั้ง
   * และแม่แบบที่ตั้งไว้จะไม่มีใครได้ใช้ · เติมเฉพาะตอนที่ผู้ใช้ยังไม่ได้กรอกอะไร
   * เพื่อไม่ทับงานที่ทำไว้แล้ว
   */
  useEffect(() => {
    if (!selectedStep) return;
    const template = selectedStep.lines.filter(
      (line) => line.lineRole === "OUTPUT",
    );
    if (template.length === 0) return;

    const current = form.getFieldValue("outputs") as
      | OutputLineValues[]
      | undefined;
    const untouched =
      !current ||
      current.length === 0 ||
      current.every((line) => !line?.itemId && !line?.plannedQty);
    if (!untouched) return;

    form.setFieldsValue({
      outputs: template.map((line) => ({
        outputType: line.outputType ?? "MAIN",
        itemId: line.itemId ?? undefined,
        unitId: line.itemId
          ? (lineData.itemById.get(line.itemId)?.unitId ??
            line.unitId ??
            undefined)
          : (line.unitId ?? undefined),
        plannedQty: null,
      })),
    });
  }, [selectedStep, form, lineData.itemById]);

  const submit = (values: FormValues) => {
    const payload = buildRunLinesPayload(values, lineData.lotById, lineData.itemById);
    if ("error" in payload) {
      message.warning(payload.error);
      return;
    }
    const { inputs, outputs } = payload;

    createMutation.mutate(
      {
        routeId: values.routeId as string,
        stepId: values.stepId as string,
        runDate: values.runDate.format("YYYY-MM-DD"),
        batchNo: values.batchNo?.trim() || undefined,
        equipmentId: values.equipmentId || undefined,
        operatorIds: values.operatorIds?.length ? values.operatorIds : undefined,
        inputs,
        outputs,
        remark: values.remark?.trim() || undefined,
      },
      {
        onSuccess: (res) => router.push(`${ROUTE_BASE}/${res.data.id}`),
      },
    );
  };

  return (
    <MasterPageGate isLoading={routesQuery.isLoading || lineData.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>MC</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              PRODUCTION · MATERIAL CONVERSION
            </div>
            <h2 className={masterStyles.pageTitle}>{t("สร้างใบแปรสภาพวัตถุดิบ")}</h2>
            <span className={masterStyles.pageSubtitle}>
              {t("บันทึกวัตถุดิบเข้าหลายตัวและผลผลิตออกหลายตัว — ยังไม่แตะสต๊อกจนกดเริ่มงาน")}
            </span>
          </div>
          <Button onClick={() => router.push(ROUTE_BASE)}>{t("กลับ")}</Button>
        </div>

        {!actions.canAdd ? (
          <Alert
            className={styles.notice}
            type="warning"
            showIcon
            title={t("ไม่มีสิทธิ์สร้างเอกสาร")}
            description={t("บัญชีนี้ยังไม่ได้รับสิทธิ์เพิ่มใบแปรสภาพวัตถุดิบ กรุณาติดต่อผู้ดูแลระบบ")}
          />
        ) : null}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            runDate: dayjs(),
            inputs: [{ ...EMPTY_INPUT }],
            outputs: [{ ...EMPTY_OUTPUT }],
          }}
          onFinish={submit}
          disabled={!actions.canAdd || createMutation.isPending}
        >
          <div className={styles.formCard}>
            <div className={styles.formSection}>
              <div className={styles.formSectionHead}>
                <h4>{t("ข้อมูลเอกสาร")}</h4>
                <span className={styles.formSectionHint}>
                  {t("ใส่ Batch ให้ตรงกันทุกขั้น แล้วแดชบอร์ดจะตอบได้ว่า Batch นี้เดินถึงไหน")}
                </span>
              </div>
              <div className={styles.formGrid}>
                <Form.Item
                  name="routeId"
                  label={t("เส้นทางแปรสภาพ")}
                  rules={[{ required: true, message: t("เลือกเส้นทาง") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("เลือกเส้นทาง")}
                    loading={routesQuery.isFetching}
                    onChange={() => form.setFieldsValue({ stepId: undefined })}
                    options={routes.map((route) => ({
                      value: route.id,
                      label: route.nameTh,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="stepId"
                  label={t("ขั้นตอน")}
                  rules={[{ required: true, message: t("เลือกขั้นตอน") }]}
                  extra={
                    selectedRoute
                      ? t("เลขที่เอกสารจะขึ้นต้นด้วย {prefix}", { prefix: selectedRoute.runNoPrefix })
                      : undefined
                  }
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder={routeId ? t("เลือกขั้นตอน") : t("เลือกเส้นทางก่อน")}
                    disabled={!routeId}
                    options={steps.map((step: MaterialConversionRouteStep) => ({
                      value: step.id,
                      label: `${step.stepOrder}. ${step.nameTh}`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="runDate"
                  label={t("วันที่ทำงาน")}
                  rules={[{ required: true, message: t("เลือกวันที่") }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item name="batchNo" label="Batch">
                  <Input placeholder={t("เช่น B-2609-01")} maxLength={50} allowClear />
                </Form.Item>
              </div>

              {skipWarning ? (
                <Alert
                  className={styles.notice}
                  type="warning"
                  showIcon
                  title={t("ข้ามขั้นตอนในเส้นทาง")}
                  description={skipWarning}
                />
              ) : null}
            </div>

            <MaterialConversionRunLinesFields
              form={form}
              data={lineData}
              selectedStep={selectedStep}
              inputValues={watchedInputs}
              outputValues={watchedOutputs}
            />

            <RunTeamFields />

            <div className={styles.formSection}>
              <Form.Item name="remark" label={t("หมายเหตุเอกสาร")}>
                <Input.TextArea
                  rows={2}
                  maxLength={2000}
                  showCount
                  placeholder={t("เช่น ยางล็อตนี้เปียก ต้องตากก่อน")}
                />
              </Form.Item>
            </div>

            <div className={styles.formActions}>
              <Button onClick={() => router.push(ROUTE_BASE)}>{t("ยกเลิก")}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending}
              >
                {t("บันทึกเอกสาร")}
              </Button>
            </div>
          </div>
        </Form>
      </section>
    </MasterPageGate>
  );
}
