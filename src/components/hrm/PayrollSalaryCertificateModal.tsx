"use client";

import { useState } from "react";
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useSalaryCertificateEmployeesQuery } from "@/hooks/payroll/usePayroll";
import { getCompanyInfoSnapshot } from "@/lib/company/company-info";
import { ensureCompanyInfo, releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import { openSalaryCertificatePdf } from "@/utils/generateSalaryCertificatePdf";

type Props = { open: boolean; onClose: () => void };

type FormValues = {
  userId: string;
  addressedTo?: string;
  purpose?: string;
  issuedAt: Dayjs;
  otherIncome?: number;
  signerName?: string;
  signerTitle?: string;
};

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** หนังสือรับรองเงินเดือน — เลือกพนักงาน ใส่ผู้รับ/วัตถุประสงค์ แล้วพิมพ์เป็น PDF */
export default function PayrollSalaryCertificateModal({ open, onClose }: Props) {
  const { message } = App.useApp();
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
        certNo: `SAL-${values.issuedAt.format("YYYYMMDD")}-${emp.employeeCode ?? emp.userId.slice(0, 6)}`,
        issuedAt,
        addressedTo: values.addressedTo?.trim() ?? "",
        purpose: values.purpose,
        company: {
          name: company.nameTh,
          taxId: company.taxId || undefined,
          address: company.addressText || undefined,
          phone: company.phone || undefined,
        },
        employee: {
          name: emp.displayName,
          nationalId: emp.nationalId ?? undefined,
          employeeCode: emp.employeeCode ?? undefined,
          position: emp.position ?? undefined,
          departmentName: emp.departmentName ?? undefined,
          hireDate: emp.hireDate ?? undefined,
        },
        payType: emp.payType,
        basePay: emp.basePay,
        otherIncome: values.otherIncome,
        signerName: values.signerName,
        signerTitle: values.signerTitle,
      });
    } catch (error) {
      releasePdfWindow();
      message.error(error instanceof Error ? error.message : "สร้าง PDF ไม่สำเร็จ");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="หนังสือรับรองเงินเดือน"
      width={640}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          ปิด
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          loading={printing}
          onClick={() => void submit()}
        >
          พิมพ์ / ดู PDF
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title="ใช้ฐานค่าจ้างปัจจุบันของพนักงานจากข้อมูลพนักงาน — เลขประจำตัวประชาชน วันที่เริ่มงาน และตำแหน่งตั้งได้ที่ฟอร์มผู้ใช้งาน /users"
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ issuedAt: dayjs() }}
      >
        <Form.Item name="userId" label="พนักงาน" rules={[{ required: true, message: "เลือกพนักงาน" }]}>
          <Select
            showSearch
            loading={query.isLoading}
            placeholder="ค้นหาชื่อหรือรหัสพนักงาน"
            optionFilterProp="label"
            options={employees.map((e) => ({
              value: e.userId,
              label: [e.employeeCode, e.displayName].filter(Boolean).join(" · "),
            }))}
            notFoundContent="ไม่พบพนักงานที่มีฐานค่าจ้าง"
          />
        </Form.Item>
        {selected ? (
          <div style={{ marginBottom: 16, fontSize: 13, color: "#666" }}>
            {selected.payType === "MONTHLY" ? "เงินเดือน" : "ค่าจ้างรายวัน"}{" "}
            <b>{money(selected.basePay)}</b> บาท
            {selected.position ? ` · ${selected.position}` : ""}
            {selected.hireDate ? ` · เริ่มงาน ${dayjs(selected.hireDate).format("DD/MM/YYYY")}` : " · ยังไม่ระบุวันเริ่มงาน"}
            {selected.nationalId ? "" : " · ยังไม่มีเลขประจำตัวประชาชน"}
          </div>
        ) : null}
        <Form.Item name="addressedTo" label="เรียน (ผู้รับ)">
          <Input maxLength={200} placeholder="เช่น ผู้จัดการธนาคาร… (ว่าง = ผู้ที่เกี่ยวข้อง)" />
        </Form.Item>
        <Form.Item name="purpose" label="วัตถุประสงค์">
          <Input maxLength={200} placeholder="เช่น ยื่นขอสินเชื่อ / ขอวีซ่า" />
        </Form.Item>
        <Form.Item name="issuedAt" label="วันที่ออกหนังสือ" rules={[{ required: true, message: "เลือกวันที่" }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear={false} />
        </Form.Item>
        <Form.Item
          name="otherIncome"
          label="รายได้อื่นเฉลี่ยต่อเดือน (ถ้ามี เช่น ค่าตำแหน่ง เบี้ยขยัน)"
        >
          <InputNumber min={0} style={{ width: "100%" }} suffix="บาท" />
        </Form.Item>
        <Form.Item name="signerName" label="ชื่อผู้ลงนาม">
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="signerTitle" label="ตำแหน่งผู้ลงนาม">
          <Input maxLength={200} placeholder="เช่น ผู้จัดการฝ่ายบุคคล" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
