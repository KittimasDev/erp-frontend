"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import type {
  CreateSellerBankAccountRequest,
  SellerBankAccount,
} from "@/types/seller-bank-accounts";
import styles from "./SellerBankAccountFormModal.module.css";

type SellerOption = {
  value: string;
  label: string;
};

type SellerBankAccountFormValues = {
  sellerId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
};

type SellerBankAccountFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialAccount?: SellerBankAccount | null;
  sellerOptions: SellerOption[];
  sellersLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSellerBankAccountRequest) => void;
};

export default function SellerBankAccountFormModal({
  open,
  mode,
  initialAccount,
  sellerOptions,
  sellersLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: SellerBankAccountFormModalProps) {
  const [form] = Form.useForm<SellerBankAccountFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialAccount) {
      form.setFieldsValue({
        sellerId: initialAccount.sellerId,
        bankName: initialAccount.bankName,
        accountNo: initialAccount.accountNo,
        accountName: initialAccount.accountName,
        isDefault: initialAccount.isDefault,
        isActive: initialAccount.isActive,
      });
      return;
    }

    form.setFieldsValue({
      sellerId: undefined,
      bankName: "",
      accountNo: "",
      accountName: "",
      isDefault: false,
      isActive: true,
    });
  }, [open, mode, initialAccount, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      sellerId: values.sellerId,
      bankName: values.bankName.trim(),
      accountNo: values.accountNo.trim(),
      accountName: values.accountName.trim(),
      isDefault: values.isDefault,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.unitModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode
              ? "CREATE BANK ACCOUNT"
              : "EDIT BANK ACCOUNT"}
          </div>

          <h2>
            {isCreateMode
              ? "เพิ่มบัญชีธนาคารผู้ขาย"
              : "แก้ไขบัญชีธนาคารผู้ขาย"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกบัญชีธนาคารใหม่ของผู้ขายยาง"
              : "แก้ไขรายละเอียดบัญชีและสถานะการใช้งาน"}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลบัญชี</strong>
            <span>ระบุผู้ขาย ธนาคาร เลขบัญชี และชื่อบัญชี</span>
          </div>
        </div>

        <Form.Item
          label="ผู้ขาย"
          name="sellerId"
          rules={[{ required: true, message: "กรุณาเลือกผู้ขาย" }]}
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder="เลือกผู้ขาย"
            loading={sellersLoading}
            options={sellerOptions}
          />
        </Form.Item>

        <Form.Item
          label="ชื่อธนาคาร"
          name="bankName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อธนาคาร" },
            { max: 255, message: "ชื่อธนาคารต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ธนาคารกรุงเทพ"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="เลขที่บัญชี"
          name="accountNo"
          rules={[
            { required: true, message: "กรุณากรอกเลขที่บัญชี" },
            { max: 100, message: "เลขที่บัญชีต้องไม่เกิน 100 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น 1234567890"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อบัญชี"
          name="accountName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อบัญชี" },
            { max: 255, message: "ชื่อบัญชีต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น หจก. รับซื้อยาง ABC"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>บัญชีหลัก</strong>
              <span>เปิดเมื่อต้องการใช้บัญชีนี้เป็นบัญชีหลักของผู้ขาย</span>
            </div>
          </div>

          <Form.Item name="isDefault" valuePropName="checked" noStyle>
            <Switch checkedChildren="หลัก" unCheckedChildren="รอง" />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกบัญชีนี้ในเอกสารได้</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
