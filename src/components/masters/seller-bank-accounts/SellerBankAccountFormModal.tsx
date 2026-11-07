"use client";

import { useT } from "@/lib/i18n/useT";
import { usePartyLabels } from "@/lib/i18n/partyLabels";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import type {
  CreateSellerBankAccountRequest,
  SellerBankAccount,
} from "@/types/seller-bank-accounts";
import styles from "@/components/masters/shared/master-page.module.css";

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
  const t = useT();
  const partyLabels = usePartyLabels();
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
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
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
              ? t("เพิ่มบัญชีธนาคารผู้ขาย")
              : t("แก้ไขบัญชีธนาคารผู้ขาย")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกบัญชีธนาคารใหม่ของผู้ขายยาง")
              : t("แก้ไขรายละเอียดบัญชีและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลบัญชี")}</strong>
            <span>{t("ระบุผู้ขาย ธนาคาร เลขบัญชี และชื่อบัญชี")}</span>
          </div>
        </div>

        <Form.Item
          label={t("ผู้ขาย")}
          name="sellerId"
          rules={[{ required: true, message: t("กรุณาเลือกผู้ขาย") }]}
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกผู้ขาย")}
            loading={sellersLoading}
            options={sellerOptions}
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อธนาคาร")}
          name="bankName"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อธนาคาร") },
            { max: 255, message: t("ชื่อธนาคารต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น ธนาคารกรุงเทพ")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("เลขที่บัญชี")}
          name="accountNo"
          rules={[
            { required: true, message: t("กรุณากรอกเลขที่บัญชี") },
            { max: 100, message: t("เลขที่บัญชีต้องไม่เกิน 100 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น 1234567890")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อบัญชี")}
          name="accountName"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อบัญชี") },
            { max: 255, message: t("ชื่อบัญชีต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น หจก. รับซื้อยาง ABC")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("บัญชีหลัก")}</strong>
              <span>{t("เปิดเมื่อต้องการใช้บัญชีนี้เป็นบัญชีหลักของผู้ขาย")}</span>
            </div>
          </div>

          <Form.Item name="isDefault" valuePropName="checked" noStyle>
            <Switch checkedChildren={partyLabels.primary} unCheckedChildren={partyLabels.secondary} />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("เปิดใช้งานเพื่อเลือกบัญชีนี้ในเอกสารได้")}</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={partyLabels.on} unCheckedChildren={partyLabels.off} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
