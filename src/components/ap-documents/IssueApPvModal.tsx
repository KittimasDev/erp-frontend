"use client";

import { useState } from "react";
import { Alert, App, DatePicker, Descriptions, InputNumber, Modal, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useRouter } from "next/navigation";

import { useApInvoicePvMutation } from "@/hooks/ap-documents/useApDocuments";
import type { ApInvoiceDetail } from "@/types/ap-documents";

import { money } from "./apDocumentConfig";

const PV_PATH = "/finance/payables/payment-vouchers";

/**
 * ออกใบสำคัญจ่ายจาก AP — สรุปยอดที่จ่ายได้ → ระบุจำนวน (บางส่วนได้) → ส่งเข้าคิว "รอสร้างใบสำคัญจ่าย"
 * แล้วพาไปหน้าใบสำคัญจ่ายเดิมเพื่อกด "สร้างใบสำคัญจ่าย" ตาม Flow เดิม · สถานะ AP ไม่เปลี่ยน
 */
export default function IssueApPvModal({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail: ApInvoiceDetail;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { issue } = useApInvoicePvMutation(detail.id);
  const [amountInput, setAmountInput] = useState<number | null | undefined>(undefined);
  const [dateInput, setDateInput] = useState<Dayjs | null | undefined>(undefined);

  const issuable = detail.issuablePvAmount;
  const amount = amountInput === undefined ? issuable : amountInput;
  const payDate = dateInput === undefined ? (detail.dueDate ? dayjs(detail.dueDate) : null) : dateInput;
  const invalid = !(amount && amount > 0) || amount > issuable + 0.004;

  const close = () => {
    setAmountInput(undefined);
    setDateInput(undefined);
    onClose();
  };

  const submit = async () => {
    try {
      await issue.mutateAsync({ amount: amount as number, desiredPayDate: payDate?.format("YYYY-MM-DD") });
      message.success("ส่งรายการเข้าคิวรอสร้างใบสำคัญจ่ายแล้ว");
      close();
      router.push(PV_PATH);
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : "ออกใบสำคัญจ่ายไม่สำเร็จ");
    }
  };

  return (
    <Modal
      open={open}
      title={`ออกใบสำคัญจ่าย ${detail.docNo}`}
      okText="ยืนยัน"
      cancelText="ปิด"
      okButtonProps={{ disabled: invalid }}
      confirmLoading={issue.isPending}
      onOk={() => void submit()}
      onCancel={close}
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="ยอดเจ้าหนี้คงเหลือ (หลังมัดจำ/ปรับหนี้/ชำระแล้ว)">
            {money.format(detail.remainingAmount)}
          </Descriptions.Item>
          <Descriptions.Item label="ยอดที่มี PV ค้างดำเนินการ">{money.format(detail.pvOpenAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ออกใบสำคัญจ่ายเพิ่มได้">
            <Typography.Text strong>{money.format(issuable)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
        <Space>
          <Typography.Text>จำนวนเงินที่ต้องการออก PV</Typography.Text>
          <InputNumber
            min={0}
            max={issuable}
            precision={2}
            style={{ width: 170 }}
            status={invalid ? "error" : undefined}
            value={amount}
            onChange={(v) => setAmountInput(v)}
          />
          <Typography.Text>บาท</Typography.Text>
        </Space>
        <Space>
          <Typography.Text>วันที่ต้องการจ่าย</Typography.Text>
          <DatePicker format="DD/MM/YYYY" value={payDate} onChange={(v) => setDateInput(v)} />
        </Space>
        <Alert
          type="info"
          showIcon
          title="ออกบางส่วนได้และออกได้หลายใบ — ระบบสร้างรายการ “รอสร้างใบสำคัญจ่าย” แล้วพาไปหน้าใบสำคัญจ่ายเดิมเพื่อกดสร้าง/อนุมัติ PV · สถานะ AP จะเป็น “ชำระแล้ว” เมื่อบันทึกจ่ายเงินจริงครบเท่านั้น"
        />
      </Space>
    </Modal>
  );
}
