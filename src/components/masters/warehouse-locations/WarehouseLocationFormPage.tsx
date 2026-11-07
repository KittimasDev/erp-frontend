"use client";
import { useT } from "@/lib/i18n/useT";
import { tLoc } from "@/types/warehouse-locations";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Select, Space, Switch, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateWarehouseLocationMutation } from "@/hooks/warehouse-locations/useCreateWarehouseLocationMutation";
import { useUpdateWarehouseLocationMutation } from "@/hooks/warehouse-locations/useUpdateWarehouseLocationMutation";
import { useWarehouseLocationQuery } from "@/hooks/warehouse-locations/useWarehouseLocationQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { CreateWarehouseLocationRequest } from "@/types/warehouse-locations";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type WarehouseLocationFormValues = {
  warehouseId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type WarehouseLocationFormPageProps = {
  mode: "create" | "edit";
  locationId?: string;
};

export default function WarehouseLocationFormPage({
  mode,
  locationId,
}: WarehouseLocationFormPageProps) {
  const t = useT();
  const router = useRouter();
  const [form] = Form.useForm<WarehouseLocationFormValues>();
  const locationQuery = useWarehouseLocationQuery(
    mode === "edit" ? locationId : undefined,
  );
  const warehousesQuery = useWarehousesQuery();
  const createMutation = useCreateWarehouseLocationMutation();
  const updateMutation = useUpdateWarehouseLocationMutation();

  const location = locationQuery.data?.data;
  const isCreateMode = mode === "create";
  const saving = createMutation.isPending || updateMutation.isPending;

  const warehouseOptions = (warehousesQuery.data?.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.warehouseCode} — ${item.warehouseName}`,
  }));

  useEffect(() => {
    if (isCreateMode) {
      form.setFieldsValue({
        warehouseId: undefined,
        code: "",
        name: "",
        description: "",
        isActive: true,
      });
      return;
    }

    if (!location) {
      return;
    }

    form.setFieldsValue({
      warehouseId: location.warehouseId,
      code: location.locationCode,
      name: location.locationName,
      description: location.description,
      isActive: location.isActive,
    });
  }, [form, isCreateMode, location]);

  const goBack = () => router.push("/warehouse-locations");

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body: CreateWarehouseLocationRequest = {
      warehouseId: values.warehouseId,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    if (isCreateMode) {
      createMutation.mutate(body, { onSuccess: goBack });
      return;
    }

    if (!locationId) {
      return;
    }

    updateMutation.mutate(
      { id: locationId, body },
      { onSuccess: goBack },
    );
  };

  return (
    <MasterPageGate
      isLoading={
        (!isCreateMode && locationQuery.isLoading) || warehousesQuery.isLoading
      }
    >
      <section className={styles.page}>
        <PageHeader
          eyebrow={isCreateMode ? "CREATE WAREHOUSE LOCATION" : "EDIT WAREHOUSE LOCATION"}
          title={isCreateMode ? t("เพิ่มตำแหน่งจัดเก็บ") : t("แก้ไขตำแหน่งจัดเก็บ")}
          subtitle={isCreateMode ? t("เลือกคลังก่อน แล้วกำหนดรหัสตำแหน่ง (ห้ามซ้ำในคลังเดียวกัน)") : t("แก้ไขรายละเอียดตำแหน่งจัดเก็บภายใต้คลังสินค้า")}
          actions={
            <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
            className={styles.editButton}
          >
            {t("กลับ")}
          </Button>
            </>
          }
        />

        <div className={styles.tableCard}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
            onFinish={handleSubmit}
          >
            <div className={styles.sectionTitle}>
              <span className={styles.sectionLine} />
              <div>
                <strong>{t("ข้อมูลตำแหน่งจัดเก็บ")}</strong>
                <span>{t("ตำแหน่งต้องอยู่ภายใต้คลังสินค้า")}</span>
              </div>
            </div>

            <Form.Item
              label={t("คลังสินค้า")}
              name="warehouseId"
              rules={[{ required: true, message: t("กรุณาเลือกคลังสินค้า") }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder={t("เลือกคลังสินค้า")}
                loading={warehousesQuery.isLoading}
                options={warehouseOptions}
              />
            </Form.Item>

            <Form.Item
              label={tLoc("รหัสตำแหน่ง")}
              name="code"
              rules={[
                { required: true, message: tLoc("กรุณากรอกรหัสตำแหน่ง") },
                { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
              ]}
            >
              <Input
                size="large"
                placeholder={t("เช่น RAW-A01")}
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label={tLoc("ชื่อตำแหน่ง")}
              name="name"
              rules={[
                { required: true, message: tLoc("กรุณากรอกชื่อตำแหน่ง") },
                { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
              ]}
            >
              <Input
                size="large"
                placeholder={t("เช่น โซน A ช่อง 01")}
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label={t("รายละเอียด")}
              name="description"
              rules={[
                { max: 500, message: t("รายละเอียดต้องไม่เกิน 500 ตัวอักษร") },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("เช่น พื้นที่จัดเก็บยางดิบโซน A")}
                autoComplete="off"
              />
            </Form.Item>

            <div className={styles.statusBox}>
              <div className={styles.statusContent}>
                <div className={styles.statusIcon}>●</div>
                <div>
                  <strong>{t("สถานะใช้งาน")}</strong>
                  <span>{t("เปิดใช้งานเพื่อเลือกตำแหน่งนี้ในเอกสารได้")}</span>
                </div>
              </div>
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
              </Form.Item>
            </div>

            <Space style={{ marginTop: 24 }}>
              <Button onClick={goBack}>{t("ยกเลิก")}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                className={styles.createButton}
              >
                {isCreateMode ? t("บันทึก") : t("อัปเดต")}
              </Button>
            </Space>
          </Form>
        </div>
      </section>
    </MasterPageGate>
  );
}
