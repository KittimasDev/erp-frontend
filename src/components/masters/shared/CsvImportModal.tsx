"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Modal, Statistic, Table, Tag, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { ApiError } from "@/lib/api/client";
import type { CsvImportResult, CsvImportRowError } from "@/types/csv-import";

export const ITEM_CSV_TEMPLATE = [
  "code,name,description,itemCategoryId,unitId,itemType,warehouseGroup,minimumStockQty,isFinishedGood,sellingPrice",
  "RM-001,ยางดิบตัวอย่าง,,ใส่-uuid-หมวดสินค้า,ใส่-uuid-หน่วยนับ,RAW_MATERIAL,RAW_MATERIAL,0,false,",
].join("\r\n");

export const ITEM_CSV_HINT =
  "คอลัมน์บังคับ: code, name, itemCategoryId, unitId, warehouseGroup · itemCategoryId และ unitId ต้องเป็น UUID ที่มีอยู่แล้ว · itemType = RAW_MATERIAL | FINISHED_GOODS | CHEMICAL | CONSUMABLE | SPARE_PART · warehouseGroup = RAW_MATERIAL | CHEMICAL | FINISHED_GOODS | OIL_TANK | SPARE_PART | HOLD | REJECT · แถวตัวอย่างในเทมเพลตต้องแก้ก่อนนำเข้า";

export const CUSTOMER_CSV_TEMPLATE = [
  "customerCode,nameTh,taxId,address,contactName,contactPhone,email,customerType,defaultCreditDays,creditLimit",
  "CUST-00001,บริษัทตัวอย่าง จำกัด,,,,,example@mail.com,DOMESTIC,30,100000",
].join("\r\n");

export const CUSTOMER_CSV_HINT =
  "คอลัมน์บังคับ: customerCode, nameTh · customerType = DOMESTIC | EXPORT | DEALER | GENERAL · แถวตัวอย่างในเทมเพลตต้องแก้รหัสให้ไม่ซ้ำก่อนนำเข้า";

type Props = {
  open: boolean;
  title: string;
  templateFileName: string;
  templateCsv: string;
  hint: string;
  importing: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<CsvImportResult>;
};

const DUPLICATE_MARK = "ถูกใช้งานแล้ว";

function downloadTemplate(fileName: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CsvImportModal({
  open,
  title,
  templateFileName,
  templateCsv,
  hint,
  importing,
  onClose,
  onImport,
}: Props) {
  const { message, notification } = App.useApp();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
    }
  }, [open]);

  const duplicateCount =
    result?.errors.filter((error) => error.message.includes(DUPLICATE_MARK))
      .length ?? 0;

  const columns: ColumnsType<CsvImportRowError> = [
    { title: "แถว", dataIndex: "row", width: 72 },
    {
      title: "รายละเอียด",
      dataIndex: "message",
      render: (text: string) =>
        text.includes(DUPLICATE_MARK) ? (
          <span>
            <Tag color="orange">รหัสซ้ำ</Tag>
            {text}
          </span>
        ) : (
          text
        ),
    },
  ];

  const handleImport = async () => {
    if (!file) {
      message.warning("เลือกไฟล์ CSV ก่อน");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      message.error("รองรับเฉพาะไฟล์ .csv");
      return;
    }
    try {
      const data = await onImport(file);
      setResult(data);
      if (data.errorCount === 0) {
        notification.success({
          title: "นำเข้าสำเร็จ",
          description: `บันทึก ${data.successCount.toLocaleString("th-TH")} รายการ`,
        });
        onClose();
        return;
      }
      if (data.successCount > 0) {
        notification.warning({
          title: "นำเข้าได้บางรายการ",
          description: `บันทึกแล้ว ${data.successCount.toLocaleString("th-TH")} รายการ · ไม่เข้า ${data.errorCount.toLocaleString("th-TH")} รายการ`,
        });
        return;
      }
      notification.error({
        title: "ไม่มีการบันทึก",
        description: `ทั้ง ${data.totalRows.toLocaleString("th-TH")} แถวไม่ผ่าน`,
      });
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "นำเข้าไม่สำเร็จ",
      );
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      destroyOnHidden
      okText="นำเข้า"
      cancelText="ปิด"
      confirmLoading={importing}
      onOk={() => void handleImport()}
      onCancel={onClose}
      width={720}
    >
      <p style={{ marginTop: 0, color: "#64748b" }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadTemplate(templateFileName, templateCsv)}
        >
          ดาวน์โหลดเทมเพลต
        </Button>
        <Upload
          accept=".csv,text/csv"
          maxCount={1}
          beforeUpload={(next) => {
            setFile(next);
            setResult(null);
            return false;
          }}
          onRemove={() => {
            setFile(null);
            return true;
          }}
          fileList={
            file
              ? [{ uid: file.name, name: file.name, status: "done" }]
              : []
          }
        >
          <Button icon={<UploadOutlined />}>เลือกไฟล์ CSV</Button>
        </Upload>
      </div>

      {result ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Statistic title="ทั้งหมด" value={result.totalRows} />
            <Statistic title="สำเร็จ" value={result.successCount} />
            <Statistic title="ผิดพลาด" value={result.errorCount} />
          </div>
          {result.successCount > 0 && result.errorCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title="นำเข้าได้บางรายการ"
              description={
                duplicateCount > 0
                  ? `แถวที่ผ่านถูกบันทึกแล้ว ${result.successCount.toLocaleString("th-TH")} รายการ แถวที่ผิดยังไม่เข้า ในนั้นมีรหัสซ้ำ ${duplicateCount.toLocaleString("th-TH")} แถว`
                  : `แถวที่ผ่านถูกบันทึกแล้ว ${result.successCount.toLocaleString("th-TH")} รายการ แถวที่ผิดยังไม่เข้า`
              }
            />
          ) : null}
          {result.successCount === 0 ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title="ไม่มีการบันทึก"
              description={
                duplicateCount > 0
                  ? `ไม่มีแถวที่เข้าได้ มีรหัสซ้ำ ${duplicateCount.toLocaleString("th-TH")} แถว`
                  : "ไม่มีแถวที่เข้าได้"
              }
            />
          ) : null}
          <Table
            rowKey={(row) => `${row.row}-${row.message}`}
            size="small"
            columns={columns}
            dataSource={result.errors}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            locale={{ emptyText: "ไม่มีแถวที่ผิดพลาด" }}
          />
        </>
      ) : null}
    </Modal>
  );
}
