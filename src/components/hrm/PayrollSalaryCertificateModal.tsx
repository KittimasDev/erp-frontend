"use client";

import { useState } from "react";
import { Alert, App, Button, DatePicker, Form, Input, Modal, Select } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useSalaryCertificateEmployeesQuery } from "@/hooks/payroll/usePayroll";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { getCompanyInfoSnapshot } from "@/lib/company/company-info";
import { ensureCompanyInfo, releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import { openSalaryCertificatePdf } from "@/utils/generateSalaryCertificatePdf";

type Props = { open: boolean; onClose: () => void };

type FormValues = {
  userId: string;
  addressedTo?: string;
  purpose?: string;
  issuedAt: Dayjs;
  prefix?: string;
  endDate?: Dayjs | null;
  signerName?: string;
  signerTitle?: string;
};

/** หนังสือรับรองเงินเดือน — เลือกพนักงาน ใส่ผู้รับ/วัตถุประสงค์ แล้วพิมพ์เป็น PDF */
export default function PayrollSalaryCertificateModal({ open, onClose }: Props) {
  const { message } = App.useApp();
  const t = useT();
  const language = useLanguage();
  const [form] = Form.useForm<FormValues>();
  const [printing, setPrinting] = useState(false);
  const query = useSalaryCertificateEmployeesQuery(open);
  const employees = query.data?.data.items ?? [];
  const selectedId = Form.useWatch("userId", form);
  const selected = employees.find((e) => e.userId === selectedId);

  const submit = async () => {
    const values = await form.validateFields();
    const emp = employees.find((e) => e.userId === values.userId);
    if (!emp) return;
    setPrinting(true);
    reservePdfWindow();
    try {
      await ensureCompanyInfo();
      const company = getCompanyInfoSnapshot();
      const issuedAt = values.issuedAt.format("YYYY-MM-DD");
      await openSalaryCertificatePdf({
        issuedAt,
        addressedTo: values.addressedTo?.trim() ?? "",
        purpose: values.purpose,
        company: { name: company.nameTh },
        employee: {
          prefix: values.prefix,
          name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.displayName,
          sectionName: emp.sectionName ?? undefined,
          endDate: values.endDate ? values.endDate.format("YYYY-MM-DD") : undefined,
          employeeCode: emp.employeeCode ?? undefined,
          position: emp.position ?? undefined,
          departmentName: emp.departmentName ?? undefined,
          hireDate: emp.hireDate ?? undefined,
        },
        payType: emp.payType,
        basePay: emp.basePay,
        signerName: values.signerName,
        signerTitle: values.signerTitle,
      });
    } catch (error) {
      releasePdfWindow();
      message.error(error instanceof Error ? error.message : t("สร้าง PDF ไม่สำเร็จ"));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("หนังสือรับรองเงินเดือน")}
      width={640}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          {t("ปิด")}
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          loading={printing}
          onClick={() => void submit()}
        >
          {t("พิมพ์ / ดู PDF")}
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title={t("ดึงชื่อ-นามสกุล รหัส ตำแหน่ง แผนก ฝ่าย วันที่เริ่มงาน และฐานค่าจ้างปัจจุบันจากข้อมูลพนักงานอัตโนมัติ — แก้ข้อมูลได้ที่ฟอร์มผู้ใช้งาน /users")}
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ issuedAt: dayjs() }}
      >
        <Form.Item name="userId" label={t("พนักงาน")} rules={[{ required: true, message: t("เลือกพนักงาน") }]}>
          <Select
            showSearch
            loading={query.isLoading}
            placeholder={t("ค้นหาชื่อหรือรหัสพนักงาน")}
            optionFilterProp="label"
            options={employees.map((e) => ({
              value: e.userId,
              label: [e.employeeCode, e.displayName].filter(Boolean).join(" · "),
            }))}
            notFoundContent={t("ไม่พบพนักงานที่มีฐานค่าจ้าง")}
          />
        </Form.Item>
        {selected ? (
          <div style={{ marginBottom: 16, fontSize: 13, color: "#666" }}>
            {selected.payType === "MONTHLY" ? t("เงินเดือน") : t("ค่าจ้างรายวัน")}{" "}
            <b>{formatMoney(selected.basePay, language)}</b> {t("บาท")}
            {selected.position ? ` · ${selected.position}` : ""}
            {selected.hireDate ? ` · ${t("เริ่มงาน")} ${dayjs(selected.hireDate).format("DD/MM/BBBB")}` : ` · ${t("ยังไม่ระบุวันเริ่มงาน")}`}
            {selected.nationalId ? "" : ` · ${t("ยังไม่มีเลขประจำตัวประชาชน")}`}
          </div>
        ) : null}
        <Form.Item name="prefix" label={t("คำนำหน้า")}>
          <Select
            allowClear
            placeholder={t("เลือกคำนำหน้า")}
            options={["นาย", "นาง", "นางสาว"].map((v) => ({ value: v, label: v }))}
          />
        </Form.Item>
        <Form.Item name="addressedTo" label={t("เรียน (ผู้รับ)")}>
          <Input maxLength={200} placeholder={t("เช่น ผู้จัดการธนาคาร… (ว่าง = ผู้ที่เกี่ยวข้อง)")} />
        </Form.Item>
        <Form.Item name="purpose" label={t("วัตถุประสงค์")}>
          <Input maxLength={200} placeholder={t("เช่น ยื่นขอสินเชื่อ / ขอวีซ่า")} />
        </Form.Item>
        <Form.Item name="issuedAt" label={t("วันที่ออกหนังสือ")} rules={[{ required: true, message: t("เลือกวันที่") }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" allowClear={false} />
        </Form.Item>
        <Form.Item name="endDate" label={t("วันที่สิ้นสุดการทำงาน")} extra={t("เว้นว่าง = ยังปฏิบัติงานอยู่ (แสดงเป็น “ปัจจุบัน”)")}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
        </Form.Item>
        <Form.Item name="signerName" label={t("ชื่อผู้ลงนาม")}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="signerTitle" label={t("ตำแหน่งผู้ลงนาม")}>
          <Input maxLength={200} placeholder={t("เช่น ผู้จัดการฝ่ายบุคคล")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
