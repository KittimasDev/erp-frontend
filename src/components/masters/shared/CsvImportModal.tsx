"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Modal, Statistic, Table, Tag, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import type { CsvImportResult, CsvImportRowError } from "@/types/csv-import";

export const ITEM_CSV_TEMPLATE = [
  "code,name,description,itemCategoryId,unitId,itemType,warehouseGroup,minimumStockQty,isFinishedGood,sellingPrice",
  "RM-001,ยางดิบตัวอย่าง,,ใส่-uuid-หมวดสินค้า,ใส่-uuid-หน่วยนับ,RAW_MATERIAL,RAW_MATERIAL,0,false,",
].join("\r\n");

export const ITEM_CSV_HINT =
  "แนะนำ: ดาวน์โหลดเทมเพลต Excel (ตัวเลือกหมวดสินค้า/หน่วยนับดึงจาก Master Data ล่าสุด) แล้วเลือกจาก Dropdown ไม่ต้องกรอก UUID · ถ้า Master Data เปลี่ยน ให้ดาวน์โหลดเทมเพลตใหม่ · คอลัมน์บังคับ: code, name, itemCategoryId, unitId, warehouseGroup · itemCategoryId/unitId ใส่ UUID, \"รหัส — ชื่อ\" หรือรหัสก็ได้ (หมวด/หน่วยที่ถูกลบหรือปิดใช้งานแล้วจะไม่เข้า) · itemType = RAW_MATERIAL | FINISHED_GOODS | CHEMICAL | CONSUMABLE | SPARE_PART · warehouseGroup = RAW_MATERIAL | CHEMICAL | FINISHED_GOODS | OIL_TANK | SPARE_PART | HOLD | REJECT · isFinishedGood ต้องตรงกับ itemType · เทมเพลต CSV มีแถวตัวอย่างที่ต้องแก้ก่อนนำเข้า";

export const CUSTOMER_CSV_TEMPLATE = [
  "customerCode,nameTh,taxId,address,contactName,contactPhone,email,customerType,defaultCreditDays,creditLimit",
  "CUST-00001,บริษัทตัวอย่าง จำกัด,,,,,example@mail.com,DOMESTIC,30,100000",
].join("\r\n");

export const CUSTOMER_CSV_HINT =
  "แนะนำ: ดาวน์โหลดเทมเพลต Excel แล้วเลือก customerType จาก Dropdown · คอลัมน์บังคับ: customerCode, nameTh · customerType = DOMESTIC | EXPORT | DEALER | GENERAL (ค่าอื่นแถวนั้นจะไม่เข้า ทั้ง Excel และ CSV) · เทมเพลต CSV มีแถวตัวอย่างที่ต้องแก้รหัสให้ไม่ซ้ำก่อนนำเข้า";

type Props = {
  open: boolean;
  title: string;
  templateFileName: string;
  templateCsv: string;
  hint: string;
  importing: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<CsvImportResult>;
  /** นามสกุลไฟล์ที่เลือกได้ (พิมพ์เล็ก มีจุดนำหน้า) — ไม่ส่ง = เฉพาะ .csv เหมือนเดิม */
  acceptExtensions?: string[];
  /** ส่งมา = แสดงปุ่มดาวน์โหลดเทมเพลต Excel (โหลดจาก backend) เพิ่มจากปุ่ม CSV */
  onDownloadExcelTemplate?: () => Promise<void>;
};

const DEFAULT_ACCEPT_EXTENSIONS = [".csv"];

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
  acceptExtensions = DEFAULT_ACCEPT_EXTENSIONS,
  onDownloadExcelTemplate,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  const { message, notification } = App.useApp();
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const acceptsExcel = acceptExtensions.includes(".xlsx");
  const acceptAttr = acceptExtensions
    .flatMap((ext) =>
      ext === ".csv" ? [".csv", "text/csv"] : [ext],
    )
    .join(",");
  const fileKindLabel = acceptsExcel ? "CSV / Excel" : "CSV";
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
    { title: lang === "en" ? "Row" : "แถว", dataIndex: "row", width: 72 },
    {
      title: t("รายละเอียด"),
      dataIndex: "message",
      render: (text: string) =>
        text.includes(DUPLICATE_MARK) ? (
          <span>
            <Tag color="orange">{t("รหัสซ้ำ")}</Tag>
            {text}
          </span>
        ) : (
          text
        ),
    },
  ];

  const handleImport = async () => {
    if (!file) {
      message.warning(t("เลือกไฟล์ {kind} ก่อน", { kind: fileKindLabel }));
      return;
    }
    const fileName = file.name.toLowerCase();
    if (!acceptExtensions.some((ext) => fileName.endsWith(ext))) {
      message.error(
        t("รองรับเฉพาะไฟล์ {exts}", { exts: acceptExtensions.join(" / ") }),
      );
      return;
    }
    try {
      const data = await onImport(file);
      setResult(data);
      if (data.errorCount === 0) {
        notification.success({
          title: t("นำเข้าสำเร็จ"),
          description: t("บันทึก {n} รายการ", {
            n: data.successCount.toLocaleString("th-TH"),
          }),
        });
        onClose();
        return;
      }
      if (data.successCount > 0) {
        notification.warning({
          title: t("นำเข้าได้บางรายการ"),
          description: t("บันทึกแล้ว {ok} รายการ · ไม่เข้า {bad} รายการ", {
            ok: data.successCount.toLocaleString("th-TH"),
            bad: data.errorCount.toLocaleString("th-TH"),
          }),
        });
        return;
      }
      notification.error({
        title: t("ไม่มีการบันทึก"),
        description: t("ทั้ง {n} แถวไม่ผ่าน", {
          n: data.totalRows.toLocaleString("th-TH"),
        }),
      });
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("นำเข้าไม่สำเร็จ"),
      );
    }
  };

  const handleDownloadExcel = async () => {
    if (!onDownloadExcelTemplate) {
      return;
    }
    setDownloadingExcel(true);
    try {
      await onDownloadExcelTemplate();
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("ดาวน์โหลดเทมเพลตไม่สำเร็จ"),
      );
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      destroyOnHidden
      okText={t("นำเข้า")}
      cancelText={t("ปิด")}
      confirmLoading={importing}
      onOk={() => void handleImport()}
      onCancel={onClose}
      width={720}
    >
      <p style={{ marginTop: 0, color: "#64748b" }}>{t(hint)}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {onDownloadExcelTemplate ? (
          <Button
            type="primary"
            ghost
            icon={<DownloadOutlined />}
            loading={downloadingExcel}
            onClick={() => void handleDownloadExcel()}
          >
            {t("ดาวน์โหลดเทมเพลต Excel")}
          </Button>
        ) : null}
        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadTemplate(templateFileName, templateCsv)}
        >
          {onDownloadExcelTemplate
            ? t("ดาวน์โหลดเทมเพลต CSV")
            : t("ดาวน์โหลดเทมเพลต")}
        </Button>
        <Upload
          accept={acceptAttr}
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
          <Button icon={<UploadOutlined />}>
            {t("เลือกไฟล์ {kind}", { kind: fileKindLabel })}
          </Button>
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
            <Statistic title={t("ทั้งหมด")} value={result.totalRows} />
            <Statistic title={t("สำเร็จ")} value={result.successCount} />
            <Statistic title={t("ผิดพลาด")} value={result.errorCount} />
          </div>
          {result.successCount > 0 && result.errorCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={t("นำเข้าได้บางรายการ")}
              description={
                duplicateCount > 0
                  ? t("แถวที่ผ่านถูกบันทึกแล้ว {ok} รายการ แถวที่ผิดยังไม่เข้า ในนั้นมีรหัสซ้ำ {dup} แถว", {
                      ok: result.successCount.toLocaleString("th-TH"),
                      dup: duplicateCount.toLocaleString("th-TH"),
                    })
                  : t("แถวที่ผ่านถูกบันทึกแล้ว {ok} รายการ แถวที่ผิดยังไม่เข้า", {
                      ok: result.successCount.toLocaleString("th-TH"),
                    })
              }
            />
          ) : null}
          {result.successCount === 0 ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title={t("ไม่มีการบันทึก")}
              description={
                duplicateCount > 0
                  ? t("ไม่มีแถวที่เข้าได้ มีรหัสซ้ำ {dup} แถว", {
                      dup: duplicateCount.toLocaleString("th-TH"),
                    })
                  : t("ไม่มีแถวที่เข้าได้")
              }
            />
          ) : null}
          <Table
            rowKey={(row) => `${row.row}-${row.message}`}
            size="small"
            columns={columns}
            dataSource={result.errors}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            locale={{ emptyText: t("ไม่มีแถวที่ผิดพลาด") }}
          />
        </>
      ) : null}
    </Modal>
  );
}
