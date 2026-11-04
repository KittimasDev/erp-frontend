"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Space, Switch, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import WarehouseTypeFields from "@/components/masters/warehouses/WarehouseTypeFields";
import { useCreateWarehouseMutation } from "@/hooks/warehouses/useCreateWarehouseMutation";
import { useUpdateWarehouseMutation } from "@/hooks/warehouses/useUpdateWarehouseMutation";
import { useWarehouseQuery } from "@/hooks/warehouses/useWarehouseQuery";
import type { CreateWarehouseRequest } from "@/types/warehouses";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type WarehouseFormValues = {
  code: string;
  name: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isDefaultReturnInspection?: boolean;
  isActive: boolean;
};

type WarehouseFormPageProps = {
  mode: "create" | "edit";
  warehouseId?: string;
};

export default function WarehouseFormPage({
  mode,
  warehouseId,
}: WarehouseFormPageProps) {
  const router = useRouter();
  const [form] = Form.useForm<WarehouseFormValues>();
  const warehouseQuery = useWarehouseQuery(
    mode === "edit" ? warehouseId : undefined,
  );
  const createMutation = useCreateWarehouseMutation();
  const updateMutation = useUpdateWarehouseMutation();

  const warehouse = warehouseQuery.data?.data;
  const isCreateMode = mode === "create";
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isCreateMode) {
      form.setFieldsValue({
        code: "",
        name: "",
        warehouseGroup: undefined,
        description: "",
        allowNegativeStock: false,
        isQcRequired: false,
        isDefaultReturnInspection: false,
        isActive: true,
      });
      return;
    }

    if (!warehouse) {
      return;
    }

    form.setFieldsValue({
      code: warehouse.warehouseCode,
      name: warehouse.warehouseName,
      warehouseGroup: warehouse.warehouseType ?? warehouse.warehouseGroup,
      description: warehouse.description,
      allowNegativeStock: warehouse.allowNegativeStock,
      isQcRequired: warehouse.isQcRequired,
      isDefaultReturnInspection: warehouse.isDefaultReturnInspection ?? false,
      isActive: warehouse.isActive,
    });
  }, [form, isCreateMode, warehouse]);

  const goBack = () => router.push("/warehouses");

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body: CreateWarehouseRequest = {
      code: values.code.trim(),
      name: values.name.trim(),
      warehouseGroup: values.warehouseGroup?.trim() || undefined,
      description: values.description?.trim() || undefined,
      allowNegativeStock: values.allowNegativeStock,
      isQcRequired: values.isQcRequired,
      isDefaultReturnInspection: form.getFieldValue("isDefaultReturnInspection"),
      isActive: values.isActive,
    };

    if (isCreateMode) {
      createMutation.mutate(body, { onSuccess: goBack });
      return;
    }

    if (!warehouseId) {
      return;
    }

    updateMutation.mutate(
      { id: warehouseId, body },
      { onSuccess: goBack },
    );
  };

  return (
    <MasterPageGate
      isLoading={!isCreateMode && warehouseQuery.isLoading}
    >
      <section className={styles.page}>
        <PageHeader
          eyebrow={isCreateMode ? "CREATE WAREHOUSE" : "EDIT WAREHOUSE"}
          title={isCreateMode ? "เพิ่มคลังสินค้า" : "แก้ไขคลังสินค้า"}
          subtitle={isCreateMode ? "กรอกข้อมูลคลังใหม่ รหัสคลังต้องไม่ซ้ำ" : "แก้ไขรายละเอียดคลังและสถานะการใช้งาน"}
          actions={
            <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
            className={styles.editButton}
          >
            กลับ
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
                <strong>ข้อมูลคลังสินค้า</strong>
                <span>ระบุรหัส ชื่อ กลุ่ม และรายละเอียด</span>
              </div>
            </div>

            <Form.Item
              label="รหัสคลัง"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสคลัง" },
                { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
              ]}
            >
              <Input size="large" placeholder="เช่น RAW_WH" autoComplete="off" />
            </Form.Item>

            <Form.Item
              label="ชื่อคลัง"
              name="name"
              rules={[
                { required: true, message: "กรุณากรอกชื่อคลัง" },
                { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น คลังวัตถุดิบ"
                autoComplete="off"
              />
            </Form.Item>

            <WarehouseTypeFields
              currentTypeCode={
                warehouse?.warehouseType ?? warehouse?.warehouseGroup
              }
            />

            <Form.Item
              label="รายละเอียด"
              name="description"
              rules={[
                { max: 500, message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="เช่น พื้นที่รับยางดิบด้านหน้าโรงงาน"
                autoComplete="off"
              />
            </Form.Item>

            <div className={styles.statusBox}>
              <div className={styles.statusContent}>
                <div className={styles.statusIcon}>●</div>
                <div>
                  <strong>อนุญาตยอดติดลบ</strong>
                  <span>เปิดเมื่อคลังนี้อนุญาตให้สต็อกติดลบได้</span>
                </div>
              </div>
              <Form.Item
                name="allowNegativeStock"
                valuePropName="checked"
                noStyle
              >
                <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
              </Form.Item>
            </div>

            <div className={styles.statusBox}>
              <div className={styles.statusContent}>
                <div className={styles.statusIcon}>●</div>
                <div>
                  <strong>ต้องผ่าน QC</strong>
                  <span>เปิดเมื่อสินค้าเข้าคลังนี้ต้องผ่านการตรวจคุณภาพ</span>
                </div>
              </div>
              <Form.Item name="isQcRequired" valuePropName="checked" noStyle>
                <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
              </Form.Item>
            </div>

            <div className={styles.statusBox}>
              <div className={styles.statusContent}>
                <div className={styles.statusIcon}>●</div>
                <div>
                  <strong>สถานะใช้งาน</strong>
                  <span>เปิดใช้งานเพื่อเลือกคลังนี้ในเอกสารได้</span>
                </div>
              </div>
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
              </Form.Item>
            </div>

            <Space style={{ marginTop: 24 }}>
              <Button onClick={goBack}>ยกเลิก</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                className={styles.createButton}
              >
                {isCreateMode ? "บันทึก" : "อัปเดต"}
              </Button>
            </Space>
          </Form>
        </div>
      </section>
    </MasterPageGate>
  );
}
