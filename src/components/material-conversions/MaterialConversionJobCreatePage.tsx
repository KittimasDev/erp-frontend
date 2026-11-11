"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, DatePicker, Form, Input, Select, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCreateMaterialConversionJobMutation } from "@/hooks/material-conversions/useMaterialConversionJobs";
import { useMaterialConversionRoutesQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import { useT } from "@/lib/i18n/useT";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./MaterialConversionPage.module.css";

const ROUTE_BASE = "/production/material-conversions";

type FormValues = {
  routeId?: string;
  batchNo?: string;
  plannedStartDate: Dayjs;
  remark?: string;
};

/**
 * เปิดใบงานแปรสภาพตามเส้นทาง — ฟอร์มสั้น **ไม่มีบรรทัดสินค้า**
 *
 * ใบงานคือเปลือกที่บอกว่า "จะเดินเส้นทางนี้กับ Batch นี้" เท่านั้น
 * ข้อมูลจริงของแต่ละขั้นกรอกทีหลังในหน้าใบงาน ตามวันที่ทำงานจริงของขั้นนั้น
 */
export default function MaterialConversionJobCreatePage() {
  const t = useT();
  const router = useRouter();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSIONS");
  const createMutation = useCreateMaterialConversionJobMutation();

  const [form] = Form.useForm<FormValues>();
  const routeId = Form.useWatch("routeId", form);

  const routesQuery = useMaterialConversionRoutesQuery({ isActive: true });
  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === routeId),
    [routes, routeId],
  );
  const steps = useMemo(
    () =>
      [...(selectedRoute?.steps ?? [])]
        .filter((step) => step.isActive)
        .sort((a, b) => a.stepOrder - b.stepOrder),
    [selectedRoute],
  );

  const submit = (values: FormValues) => {
    createMutation.mutate(
      {
        routeId: values.routeId as string,
        batchNo: (values.batchNo ?? "").trim(),
        plannedStartDate: values.plannedStartDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
      },
      {
        onSuccess: (res) => router.push(`${ROUTE_BASE}/jobs/${res.data.id}`),
      },
    );
  };

  return (
    <MasterPageGate isLoading={routesQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>MCJ</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              PRODUCTION · MATERIAL CONVERSION JOB
            </div>
            <h2 className={masterStyles.pageTitle}>
              {t("เปิดใบงานแปรสภาพตามเส้นทาง")}
            </h2>
            <span className={masterStyles.pageSubtitle}>
              {t("เปิดใบเดียวคุมทั้งสาย แล้วทยอยกรอกทีละขั้นตามวันที่ทำงานจริง")}
            </span>
          </div>
          <Button onClick={() => router.push(ROUTE_BASE)}>{t("กลับ")}</Button>
        </div>

        {!actions.canAdd ? (
          <Alert
            className={styles.notice}
            type="warning"
            showIcon
            title={t("ไม่มีสิทธิ์เปิดใบงาน")}
            description={t("บัญชีนี้ยังไม่ได้รับสิทธิ์เพิ่มใบแปรสภาพวัตถุดิบ กรุณาติดต่อผู้ดูแลระบบ")}
          />
        ) : null}

        <Form
          form={form}
          layout="vertical"
          initialValues={{ plannedStartDate: dayjs() }}
          onFinish={submit}
          disabled={!actions.canAdd || createMutation.isPending}
        >
          <div className={styles.formCard}>
            <div className={styles.formSection}>
              <div className={styles.formSectionHead}>
                <h4>{t("ข้อมูลใบงาน")}</h4>
                <span className={styles.formSectionHint}>
                  {t("ยังไม่แตะสต๊อกและยังไม่สร้างเอกสารขั้นตอนใด ๆ")}
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
                    placeholder={t("เลือกเส้นทาง เช่น ขั้นตอนเตรียมยาง")}
                    loading={routesQuery.isFetching}
                    options={routes.map((route) => ({
                      value: route.id,
                      label: route.nameTh,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="batchNo"
                  label="Batch"
                  rules={[
                    { required: true, message: t("กรอกเลข Batch") },
                    {
                      validator: async (_, value) => {
                        if (typeof value === "string" && !value.trim()) {
                          return Promise.reject(new Error(t("กรอกเลข Batch")));
                        }
                      },
                    },
                  ]}
                  extra={t("ระบบจะใส่เลขนี้ให้ทุกขั้นตอนเอง ไม่ต้องพิมพ์ซ้ำ")}
                >
                  <Input placeholder={t("เช่น B-2609-01")} maxLength={50} />
                </Form.Item>
                <Form.Item
                  name="plannedStartDate"
                  label={t("วันที่เริ่มตามแผน")}
                  rules={[{ required: true, message: t("เลือกวันที่") }]}
                  extra={t("แต่ละขั้นยังบันทึกวันที่ทำงานของตัวเอง")}
                >
                  <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
                </Form.Item>
              </div>

              {/*
                พรีวิวขั้นตอน — ให้ผู้ใช้เห็นก่อนกดว่าใบนี้จะมีกี่ขั้นและขั้นอะไรบ้าง
                เพราะหลังเปิดใบแล้วแผนจะถูกถ่ายไว้ ไม่เปลี่ยนตามการแก้เส้นทางอีก
              */}
              {selectedRoute ? (
                <Alert
                  className={styles.notice}
                  type="info"
                  showIcon
                  title={t("ใบงานนี้จะมี {n} ขั้นตอน", { n: steps.length })}
                  description={
                    <div className={styles.outputChips}>
                      {steps.map((step) => (
                        <Tag key={step.id}>
                          {step.stepOrder}. {step.nameTh}
                        </Tag>
                      ))}
                    </div>
                  }
                />
              ) : null}
            </div>

            <div className={styles.formSection}>
              <Form.Item name="remark" label={t("หมายเหตุ")}>
                <Input.TextArea
                  rows={2}
                  maxLength={2000}
                  showCount
                  placeholder={t("เช่น ยางล็อตนี้เปียก ต้องตากก่อนย่อย")}
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
                {t("เปิดใบงาน")}
              </Button>
            </div>
          </div>
        </Form>
      </section>
    </MasterPageGate>
  );
}
