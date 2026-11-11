"use client";

import { formatBuddhistIntl } from "@/lib/datetime/intl-be";
import { useEffect } from "react";
import {
  Alert,
  AutoComplete,
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Switch,
  Tag,
} from "antd";
import {
  ApiOutlined,
  DeleteOutlined,
  RobotOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useAiOcrSettingsQuery,
  useDeleteAiOcrApiKeyMutation,
  useTestAiOcrConnectionMutation,
  useUpdateAiOcrSettingsMutation,
} from "@/hooks/ai-ocr-settings/useAiOcrSettingsQueries";
import {
  AI_OCR_SUGGESTED_MODELS,
  type UpdateAiOcrSettingsRequest,
} from "@/types/ai-ocr-settings";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import styles from "./AiOcrSettingsPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type FormValues = {
  isEnabled: boolean;
  model: string;
  timeoutMs: number;
  apiKey?: string;
};

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  READY: { color: "green", label: "พร้อมใช้งาน" },
  DISABLED: { color: "default", label: "ปิดการใช้งานอยู่" },
  NO_API_KEY: { color: "orange", label: "ยังไม่ได้ใส่ API key" },
  MASTER_KEY_MISSING: { color: "red", label: "เซิร์ฟเวอร์ยังไม่พร้อม" },
  COOLDOWN: { color: "orange", label: "พักการเรียกชั่วคราว (โควต้าเต็ม)" },
};

function formatDateTime(value: string | null | undefined, lang: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : formatBuddhistIntl(date, lang === "en" ? "en" : "th", { dateStyle: "medium", timeStyle: "short" });
}

export default function AiOcrSettingsPage() {
  const t = useT();
  const lang = useLanguage();
  const [form] = Form.useForm<FormValues>();
  const settingsQuery = useAiOcrSettingsQuery();
  const updateSettings = useUpdateAiOcrSettingsMutation();
  const deleteApiKey = useDeleteAiOcrApiKeyMutation();
  const testConnection = useTestAiOcrConnectionMutation();

  const settings = settingsQuery.data?.data;

  useEffect(() => {
    if (!settings) {
      return;
    }
    form.setFieldsValue({
      isEnabled: settings.isEnabled,
      model: settings.model,
      timeoutMs: settings.timeoutMs,
      // ไม่เติมคีย์ลงช่อง — คีย์ที่บันทึกแล้วไม่เคยถูกส่งกลับมา
      apiKey: undefined,
    });
  }, [form, settings]);

  const masterKeyMissing = settings ? !settings.masterKeyConfigured : false;
  const hasApiKey = settings?.hasApiKey ?? false;
  const statusTag = settings ? STATUS_TAG[settings.status] : undefined;

  const handleSubmit = (values: FormValues) => {
    const body: UpdateAiOcrSettingsRequest = {
      isEnabled: values.isEnabled,
      model: values.model,
      timeoutMs: values.timeoutMs,
    };
    const apiKey = values.apiKey?.trim();
    if (apiKey) {
      body.apiKey = apiKey;
    }

    updateSettings.mutate(body, {
      onSuccess: () => form.setFieldValue("apiKey", undefined),
    });
  };

  return (
    <MasterPageGate isLoading={settingsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="SETTINGS · AI OCR"
          icon={<RobotOutlined />}
          title={t("ตั้งค่า AI อ่านเอกสาร")}
          subtitle={t("ให้ AI ช่วยอ่านค่าจากรูปใบชั่ง — อ่านไม่ได้เมื่อไหร่ระบบถอยไปใช้ตัวอ่านในเครื่องให้เอง")}
        />

        <Alert
          type="info"
          showIcon
          title={t("รูปใบชั่งจะถูกส่งออกไปนอกบริษัท")}
          description={t("เปิดสวิตช์นี้แล้ว รูปใบชั่งทุกใบที่สแกนจะถูกส่งไปยังบริการของ Google เพื่ออ่านค่า ซึ่งบนใบมีชื่อผู้ขาย ทะเบียนรถ ราคาต่อกิโล และยอดเงิน · เงื่อนไขของแพ็กเกจฟรีอนุญาตให้ผู้ให้บริการนำข้อมูลไปปรับปรุงผลิตภัณฑ์ได้ ต่างจากแพ็กเกจที่เสียเงิน — ถ้าข้อมูลชุดนี้ออกนอกบริษัทไม่ได้ ให้ปิดสวิตช์ไว้")}
        />

        {masterKeyMissing ? (
          <Alert
            type="error"
            showIcon
            title={t("เซิร์ฟเวอร์ยังตั้งค่ากุญแจสำหรับเข้ารหัสไม่ถูกต้อง")}
            description={t("ยังบันทึก API key ไม่ได้ จนกว่าผู้ดูแลระบบจะตั้ง SECRETS_ENCRYPTION_KEY ใน backend/.env แล้วรีสตาร์ท backend (แก้ .env อย่างเดียวไม่พอ ต้องรีสตาร์ท) · ค่านี้ต้องเป็นเลขฐานสิบหก 64 ตัว สร้างด้วยคำสั่ง openssl rand -hex 32 — ถ้าใส่ไว้แล้วยังขึ้นข้อความนี้ แปลว่ารูปแบบไม่ถูกต้อง · ย้ำว่า **นี่ไม่ใช่ API key ของ Gemini** แต่เป็นกุญแจของเซิร์ฟเวอร์ที่ใช้เข้ารหัสคีย์ก่อนเก็บ ส่วน API key ของ Gemini ให้วางในช่องด้านล่างหน้านี้ · ระหว่างนี้การอ่านใบชั่งยังใช้ตัวอ่านในเครื่องได้ตามปกติ")}
          />
        ) : null}

        {settingsQuery.isError ? (
          <Alert
            type="warning"
            showIcon
            title={t("โหลดการตั้งค่าไม่สำเร็จ")}
            description={t("ลองรีเฟรชหน้าอีกครั้ง")}
          />
        ) : null}

        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <h3>{t("การเชื่อมต่อ")}</h3>
            <p>{t("ใส่ API key ของ Gemini แล้วทดสอบก่อนเปิดใช้งานจริง")}</p>
          </div>

          <div className={styles.statusRow}>
            {statusTag ? (
              <Tag color={statusTag.color}>{t(statusTag.label)}</Tag>
            ) : null}
            {settings?.lastTestAt ? (
              <span className={styles.testResult}>
                {t("ทดสอบล่าสุด")} {formatDateTime(settings.lastTestAt, lang)} —{" "}
                {settings.lastTestMessage}
              </span>
            ) : null}
          </div>

          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmit}
            initialValues={{
              isEnabled: false,
              model: AI_OCR_SUGGESTED_MODELS[0],
              timeoutMs: 20000,
            }}
          >
            {/*
              ปุ่มลบอยู่นอก Form.Item — Form.Item ฉีด value/onChange ให้ลูกตัวเดียว
              ถ้าห่อทั้งคู่ไว้ข้างใน ช่องกรอกจะไม่ผูกกับฟอร์ม
            */}
            <div className={styles.keyRow}>
              <Form.Item
                label="API key"
                name="apiKey"
                extra={
                hasApiKey
                    ? t("บันทึกไว้แล้ว ({masked}) · เว้นว่างไว้ = ใช้คีย์เดิม · คีย์ที่บันทึกแล้วจะไม่ถูกส่งกลับมาแสดงอีก", { masked: settings?.apiKeyMasked ?? t("ปิดบัง") })
                    : t("วางคีย์ที่ได้จาก Google AI Studio · คีย์จะถูกเข้ารหัสก่อนเก็บ และไม่ถูกส่งกลับมาแสดงอีก")
                }
                rules={[
                  {
                    validator: (_rule, value: string | undefined) => {
                      const trimmed = value?.trim();
                      if (!trimmed || trimmed.length >= 20) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(
                          t("API key สั้นผิดปกติ — ถ้าต้องการล้างคีย์ให้กดปุ่มลบคีย์แทน"),
                        ),
                      );
                    },
                  },
                ]}
              >
                <Input.Password
                  placeholder={
                    settings?.apiKeyMasked ?? t("ยังไม่ได้ตั้งค่า API key")
                  }
                  autoComplete="off"
                  disabled={masterKeyMissing}
                />
              </Form.Item>

              <Popconfirm
                title={t("ลบ API key ที่บันทึกไว้?")}
                description={t("ลบแล้วระบบจะปิดการใช้งาน AI และกลับไปใช้ตัวอ่านในเครื่อง")}
                okText={t("ลบคีย์")}
                cancelText={t("ยกเลิก")}
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteApiKey.mutate()}
                disabled={!hasApiKey}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!hasApiKey}
                  loading={deleteApiKey.isPending}
                >
                  {t("ลบคีย์")}
                </Button>
              </Popconfirm>
            </div>

            <Form.Item
              label={t("โมเดล")}
              name="model"
              extra={t("เลือกจากรายการหรือพิมพ์ชื่อเองก็ได้ — ผู้ให้บริการเปลี่ยนชื่อและเลิกให้เรียกรุ่นเก่าเป็นระยะ ถ้าปุ่มทดสอบขึ้น HTTP 404 ให้เปลี่ยนมาใส่ชื่อรุ่นใหม่ตรงนี้ได้เลย ไม่ต้องรอแก้โปรแกรม")}
              rules={[
                {
                  pattern: /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/,
                  message: t("ใช้ได้เฉพาะตัวพิมพ์เล็ก ตัวเลข จุด และขีด เช่น gemini-3.6-flash"),
                },
              ]}
            >
              {/*
                filterOption=false = โชว์รายการแนะนำครบทุกตัวเสมอ
                ถ้าเปิดการกรองไว้ ช่องนี้ซึ่งมีค่าที่บันทึกไว้ค้างอยู่แล้ว
                จะกรองรายการด้วยค่านั้นจนเหลือตัวเดียว — คนใช้จะนึกว่าไม่มีรุ่นอื่นให้เลือก
              */}
              <AutoComplete
                options={AI_OCR_SUGGESTED_MODELS.map((model) => ({
                  value: model,
                }))}
                filterOption={false}
                placeholder="gemini-3.6-flash"
              />
            </Form.Item>

            <Form.Item
              label={t("เวลารอสูงสุด (มิลลิวินาที)")}
              name="timeoutMs"
              extra={t("เกินเวลานี้ระบบจะเลิกรอแล้วถอยไปใช้ตัวอ่านในเครื่อง — ตั้งสูงเกินไปคนหน้างานจะรอนาน")}
            >
              <InputNumber
                min={5000}
                max={60000}
                step={1000}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label={t("เปิดใช้ AI อ่านใบชั่ง")}
              name="isEnabled"
              valuePropName="checked"
              extra={
                hasApiKey
                  ? t("ปิดเมื่อไหร่ก็ได้ ระบบจะกลับไปใช้ตัวอ่านในเครื่องทันที")
                  : t("ต้องบันทึก API key ก่อนจึงจะเปิดได้")
              }
            >
              <Switch disabled={!hasApiKey || masterKeyMissing} />
            </Form.Item>

            <div className={styles.actions}>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => testConnection.mutate()}
                loading={testConnection.isPending}
                disabled={!hasApiKey || masterKeyMissing}
              >
                {t("ทดสอบการเชื่อมต่อ")}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={updateSettings.isPending}
              >
                {t("บันทึก")}
              </Button>
            </div>
          </Form>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <h3>
              <ApiOutlined /> {t("ทำงานยังไง")}
            </h3>
            <p>
              {t("ทุกครั้งที่สแกนรูปใบชั่ง ระบบจะให้ AI อ่านก่อน · ถ้าปิดอยู่ ไม่มีคีย์ โควต้าเต็ม รอนานเกิน หรือตอบกลับมาผิดรูปแบบ ระบบจะถอยไปใช้ตัวอ่านในเครื่อง (Tesseract) ให้เองโดยไม่ขัดจังหวะคนหน้างาน · หน้าต่างตรวจผลจะบอกทุกครั้งว่า ใบนั้นใครเป็นคนอ่าน และถ้าถอยเพราะอะไรก็จะขึ้นเหตุผลให้เห็น")}
            </p>
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
