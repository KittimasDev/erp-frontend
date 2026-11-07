"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useAdvanceRequestQuery,
  useConfirmAdvanceRequestMutation,
  useCreateAdvanceRequestMutation,
  useEligiblePayablesQuery,
  useUpdateAdvanceRequestMutation,
  useUpdateAdvanceWhtMutation,
} from "@/hooks/advance-payment-requests/useAdvanceRequests";
import {
  ADVANCE_DOCUMENT_TYPE,
  WHT_TYPE_LABEL,
  type AdvanceCalcMode,
  type AdvanceRequest,
  type EligiblePayable,
} from "@/types/advance-payment-requests";
import { ADVANCE_BASE_PATH, ADVANCE_SCREEN } from "./AdvanceRequestsListPage";
import { tFin } from "@/components/payment-vouchers/paymentVoucherUtils";
import { useT } from "@/lib/i18n/useT";
import PageHeader from "@/components/common/PageHeader";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Values = {
  requestDate: Dayjs;
  calcMode: AdvanceCalcMode;
  percent?: number | null;
  amount?: number | null;
  desiredPayDate?: Dayjs | null;
  reason?: string;
};

type WhtValues = {
  whtApplicable: boolean;
  whtType: string;
  whtIncomeType?: string;
  whtBaseAmount?: number | null;
  whtRate?: number | null;
  whtVerified: boolean;
};

/**
 * ยอดตัวอย่างระหว่างกรอก — สูตรเดียวกับ backend (`advance-request-money.util.ts`)
 * ยอดจริงที่บันทึกคิดที่ backend เสมอ
 */
function preview(
  src: { poTotal: number; poBeforeVat: number; remaining: number },
  v: { mode: AdvanceCalcMode; percent?: number | null; amount?: number | null },
  wht: { applicable: boolean; rate: number; baseOverride?: number | null },
) {
  const requested = v.mode === "PERCENT" ? round2(((v.percent ?? 0) * src.poTotal) / 100) : round2(v.amount ?? 0);
  const defaultBase = src.poTotal > 0 ? round2((requested * src.poBeforeVat) / src.poTotal) : requested;
  const base = wht.applicable ? (wht.baseOverride ?? defaultBase) : 0;
  const whtAmount = wht.applicable ? round2((base * wht.rate) / 100) : 0;
  return { requested, base, whtAmount, net: round2(requested - whtAmount), over: requested > src.remaining + 0.005 };
}

type Props = { id?: string };

/** สร้าง/แก้ไขรายการขอจ่ายล่วงหน้า / มัดจำ — รวมการตรวจภาษีหัก ณ ที่จ่ายในฟอร์มเดียว */
export default function AdvanceRequestFormPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPoId = searchParams.get("poId");
  const { message } = App.useApp();
  const isEdit = Boolean(id);
  const perms = useScreenActionPermissions(ADVANCE_SCREEN);
  const detail = useAdvanceRequestQuery(id);
  const request = detail.data?.data;

  const [search, setSearch] = useState("");
  const eligible = useEligiblePayablesQuery(search, !isEdit);
  const [source, setSource] = useState<EligiblePayable | undefined>();
  const poPresetApplied = useRef(false);

  const create = useCreateAdvanceRequestMutation();
  const update = useUpdateAdvanceRequestMutation();
  const updateWht = useUpdateAdvanceWhtMutation();
  const confirm = useConfirmAdvanceRequestMutation();

  const [form] = Form.useForm<Values>();
  const [whtForm] = Form.useForm<WhtValues>();
  const mode = (Form.useWatch("calcMode", form) ?? request?.calcMode ?? "PERCENT") as AdvanceCalcMode;
  const percent = Form.useWatch("percent", form);
  const amount = Form.useWatch("amount", form);
  const wApplicable = Form.useWatch("whtApplicable", whtForm);
  const wRate = Form.useWatch("whtRate", whtForm);
  const wBase = Form.useWatch("whtBaseAmount", whtForm);

  useEffect(() => {
    if (isEdit || poPresetApplied.current || !presetPoId) return;
    const picked = (eligible.data?.data ?? []).find((p) => p.purchaseOrderId === presetPoId);
    if (!picked) return;
    poPresetApplied.current = true;
    setSource(picked);
  }, [isEdit, presetPoId, eligible.data?.data]);

  useEffect(() => {
    if (request) {
      form.setFieldsValue({
        requestDate: dayjs(request.requestDate),
        calcMode: request.calcMode as AdvanceCalcMode,
        percent: request.percent ?? null,
        amount: request.calcMode === "AMOUNT" ? request.requestedAmount : null,
        desiredPayDate: request.desiredPayDate ? dayjs(request.desiredPayDate) : null,
        reason: request.reason,
      });
      whtForm.setFieldsValue({
        whtApplicable: request.whtApplicable,
        whtType: request.whtType === "NONE" ? "PCT_3" : request.whtType,
        whtIncomeType: request.whtIncomeType,
        whtBaseAmount: request.whtBaseOverridden ? request.whtBaseAmount : null,
        whtRate: request.whtRate,
        whtVerified: request.whtVerified,
      });
    }
  }, [request, form, whtForm]);

  const src = useMemo(() => {
    if (request) {
      return { poTotal: request.poTotalAmount, poBeforeVat: request.poAmountBeforeVat, remaining: request.remainingLimitAmount };
    }
    if (source) return { poTotal: source.poTotalAmount, poBeforeVat: source.poAmountBeforeVat, remaining: source.remainingAmount };
    return undefined;
  }, [request, source]);

  const whtPreview = request
    ? { applicable: wApplicable ?? request.whtApplicable, rate: wRate ?? request.whtRate, baseOverride: wBase ?? null }
    : { applicable: Boolean(source && source.whtRate > 0), rate: source?.whtRate ?? 0, baseOverride: null };
  const calc = src ? preview(src, { mode, percent, amount }, whtPreview) : undefined;

  if (isEdit && detail.isLoading) return <Spin />;
  if (isEdit && !request) return <Alert type="error" showIcon title={t("ไม่พบรายการขอจ่าย")} />;
  if (request && request.status !== "DRAFT") {
    return (
      <Alert
        type="warning"
        showIcon
        title={t("แก้ไขไม่ได้")}
        description={t("รายการที่ยืนยันแล้วหรือยกเลิกแล้วแก้ไขข้อมูลสำคัญไม่ได้")}
        action={<Button onClick={() => router.push(`${ADVANCE_BASE_PATH}/${request.id}`)}>{t("ดูรายละเอียด")}</Button>}
      />
    );
  }

  const bodyOf = (v: Values) => ({
    requestDate: v.requestDate.format("YYYY-MM-DD"),
    calcMode: v.calcMode,
    percent: v.calcMode === "PERCENT" ? (v.percent ?? undefined) : undefined,
    amount: v.calcMode === "AMOUNT" ? (v.amount ?? undefined) : undefined,
    desiredPayDate: v.desiredPayDate ? v.desiredPayDate.format("YYYY-MM-DD") : undefined,
    reason: v.reason?.trim() || undefined,
  });

  const saveDraft = async (afterSave?: (saved: AdvanceRequest) => void) => {
    const v = await form.validateFields();
    if (request) {
      update.mutate({ id: request.id, body: bodyOf(v) }, { onSuccess: (res) => afterSave?.(res.data) });
    } else {
      if (!source) {
        message.warning(t("เลือกรายการจ่ายเงินต้นทางก่อน"));
        return;
      }
      create.mutate(
        { purchaseOrderId: source.purchaseOrderId, ...bodyOf(v) },
        {
          onSuccess: (res) => {
            // ไปหน้าแก้ไขเพื่อตรวจ WHT และแนบไฟล์ต่อ
            router.replace(`${ADVANCE_BASE_PATH}/${res.data.id}/edit`);
          },
        },
      );
    }
  };

  const saveWht = (verified: boolean) => {
    if (!request) return;
    const w = whtForm.getFieldsValue();
    updateWht.mutate({
      id: request.id,
      body: {
        whtApplicable: w.whtApplicable,
        whtType: w.whtApplicable ? w.whtType : undefined,
        whtIncomeType: w.whtApplicable ? w.whtIncomeType?.trim() || undefined : undefined,
        whtBaseAmount: w.whtApplicable && w.whtBaseAmount !== null && w.whtBaseAmount !== undefined ? w.whtBaseAmount : undefined,
        whtRate: w.whtApplicable ? (w.whtRate ?? 0) : undefined,
        whtVerified: verified,
      },
    });
  };

  const onConfirm = async () => {
    if (!request) return;
    const v = await form.validateFields();
    update.mutate(
      { id: request.id, body: bodyOf(v) },
      {
        onSuccess: (res) => {
          if (!res.data.whtVerified) {
            message.warning(t("ยอดหรือข้อมูลภาษีเปลี่ยน — ต้องตรวจสอบ WHT ใหม่ก่อนยืนยัน"));
            return;
          }
          confirm.mutate(request.id, { onSuccess: () => router.push(`${ADVANCE_BASE_PATH}/${request.id}`) });
        },
      },
    );
  };

  const busy = create.isPending || update.isPending || updateWht.isPending || confirm.isPending;
  const canWht = perms.canApprove && Boolean(request);

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{request ? t("แก้ไขรายการขอจ่าย {no}", { no: request.requestNo }) : t("สร้างรายการขอจ่ายล่วงหน้า / มัดจำ")}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(ADVANCE_BASE_PATH)}>{t("กลับ")}</Button>
          </>
        }
      />

      <Card title={t("รายการจ่ายเงินต้นทาง")}>
        {!isEdit ? (
          <Select
            showSearch
            filterOption={false}
            style={{ width: "100%", marginBottom: 12 }}
            placeholder={t("ค้นหาเลขที่ PO หรือชื่อผู้ขาย (เฉพาะรายการที่มีเงื่อนไขชำระล่วงหน้า / มัดจำ)")}
            loading={eligible.isFetching}
            onSearch={setSearch}
            value={source?.purchaseOrderId}
            onChange={(v) => setSource((eligible.data?.data ?? []).find((p) => p.purchaseOrderId === v))}
            notFoundContent={t("ไม่พบรายการจ่ายเงินที่มีเงื่อนไขชำระล่วงหน้า / มัดจำ")}
            options={(eligible.data?.data ?? [])
              .filter((p) => p.remainingAmount > 0)
              .map((p) => ({
                value: p.purchaseOrderId,
                label: `${p.poNo} — ${p.creditorName} · ${t("ยอดคงเหลือที่ต้องชำระ")} ${money.format(p.remainingAmount)}`,
              }))}
          />
        ) : null}
        {src && (request || source) ? (
          <Descriptions size="small" column={{ xs: 1, md: 2, xl: 3 }} bordered>
            <Descriptions.Item label={t("เลขที่ PO")}>{request?.poNo ?? source?.poNo}</Descriptions.Item>
            <Descriptions.Item label={t("ผู้ขาย")}>
              {request ? `${request.creditorCode} ${request.creditorName}` : `${source?.creditorCode} ${source?.creditorName}`}
            </Descriptions.Item>
            <Descriptions.Item label={t("ประเภทการจ่าย")}>{t("ชำระล่วงหน้า / มัดจำ")}</Descriptions.Item>
            <Descriptions.Item label={t("ยอดรวม PO")}>{money.format(src.poTotal)}</Descriptions.Item>
            <Descriptions.Item label={t("ยอดก่อน VAT")}>{money.format(src.poBeforeVat)}</Descriptions.Item>
            <Descriptions.Item label={t("เงื่อนไขชำระ")}>
              {request ? t("มัดจำ {p}%", { p: request.advancePercent }) : (source?.paymentTermName ?? "")}
            </Descriptions.Item>
            <Descriptions.Item label={t("วงเงินมัดจำ")}>{money.format(request?.advanceLimitAmount ?? source?.advanceLimitAmount ?? 0)}</Descriptions.Item>
            <Descriptions.Item label={t("วงเงินคงเหลือที่ขอได้")}>{money.format(src.remaining)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">{t("เลือกรายการจ่ายเงินต้นทาง — ระบบดึง PO / ผู้ขาย / ยอด / เงื่อนไข ให้อัตโนมัติ")}</Typography.Text>
        )}
      </Card>

      <Card title={t("ข้อมูลการขอจ่าย")}>
        <Form form={form} layout="vertical" initialValues={{ requestDate: dayjs(), calcMode: "PERCENT" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item name="requestDate" label={t("วันที่เอกสาร")} rules={[{ required: true }]} style={{ minWidth: 200 }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label={t("ผู้ขอจ่าย")} style={{ minWidth: 200 }}>
              <Input disabled value={request?.requestedByName ?? t("ผู้ใช้ที่เข้าสู่ระบบ")} />
            </Form.Item>
            <Form.Item name="desiredPayDate" label={t("วันที่ต้องการจ่าย")} style={{ minWidth: 200 }} extra={t("บังคับก่อนยืนยันรายการ")}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="calcMode" label={t("รูปแบบการคำนวณ")}>
            <Radio.Group
              options={[
                { value: "PERCENT", label: t("เปอร์เซ็นต์ (ของยอด PO)") },
                { value: "AMOUNT", label: t("จำนวนเงิน") },
              ]}
            />
          </Form.Item>
          {mode === "PERCENT" ? (
            <Form.Item
              label={t("เปอร์เซ็นต์ที่ขอจ่าย")}
              extra={src ? t("ยอดขอจ่าย = ยอด PO × % ÷ 100 · เปอร์เซ็นต์มัดจำตามเงื่อนไข {p}%", { p: request?.advancePercent ?? source?.advancePercent ?? "" }) : undefined}
            >
              <Space.Compact style={{ width: 220 }}>
                <Form.Item
                  name="percent"
                  noStyle
                  rules={[{ required: true, message: t("ใส่เปอร์เซ็นต์") }]}
                >
                  <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
                </Form.Item>
                <Input style={{ width: 40 }} value="%" disabled />
              </Space.Compact>
            </Form.Item>
          ) : (
            <Form.Item
              label={t("จำนวนเงินที่ขอจ่าย")}
              extra={src ? t("ไม่เกินวงเงินมัดจำคงเหลือ {amount}", { amount: money.format(src.remaining) }) : undefined}
            >
              <Space.Compact style={{ width: 220 }}>
                <Form.Item
                  name="amount"
                  noStyle
                  rules={[{ required: true, message: t("ใส่จำนวนเงิน") }]}
                >
                  <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                </Form.Item>
                <Input style={{ width: 52 }} value={t("บาท")} disabled />
              </Space.Compact>
            </Form.Item>
          )}
          {calc ? (
            <Alert
              type={calc.over ? "error" : "info"}
              showIcon
              style={{ marginBottom: 16 }}
              title={`${t("ยอดขอจ่าย {amount} บาท", { amount: money.format(calc.requested) })}${calc.over ? ` — ${t("เกินวงเงินมัดจำคงเหลือ")}` : ""}`}
            />
          ) : null}
          <Form.Item name="reason" label={t("รายละเอียด / เหตุผล")}>
            <Input.TextArea rows={3} maxLength={2000} showCount />
          </Form.Item>
        </Form>

        <Typography.Text strong>{t("เอกสารแนบจาก Supplier")}</Typography.Text>
        {request ? (
          <DocumentAttachmentsPanel
            documentType={ADVANCE_DOCUMENT_TYPE}
            documentId={request.id}
            canEdit={perms.canEdit || perms.canAdd}
            emptyText={t("ยังไม่มีเอกสารแนบ (ใบเสนอราคา/ใบแจ้งมัดจำจากผู้ขาย)")}
            uploadLabel={t("แนบเอกสาร")}
          />
        ) : (
          <p style={{ color: "#8a94a6" }}>{t("บันทึกร่างก่อน แล้วจึงแนบเอกสารได้")}</p>
        )}
      </Card>

      <Card title={t("ตรวจสอบภาษีหัก ณ ที่จ่าย (WHT)")}>
        {!request ? (
          <Alert
            type="info"
            showIcon
            title={
              whtPreview.applicable
                ? t("PO ระบุหักภาษี {rate}% — ตัวอย่าง: ภาษี {wht} · ยอดโอนจริง {net}", { rate: whtPreview.rate, wht: money.format(calc?.whtAmount ?? 0), net: money.format(calc?.net ?? 0) })
                : t("PO ไม่ได้ระบุภาษีหัก ณ ที่จ่าย")
            }
            description={t("บันทึกร่างก่อน แล้วฝ่ายการเงินตรวจ/แก้ข้อมูลภาษีและติ๊กตรวจสอบเรียบร้อยในหน้าถัดไป")}
          />
        ) : (
          <Form form={whtForm} layout="vertical" disabled={!canWht} initialValues={{ whtApplicable: false, whtType: "PCT_3", whtVerified: false }}>
            {!request.whtVerified ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                title={t("ยังไม่ได้ตรวจสอบข้อมูลภาษี — ยืนยันรายการไม่ได้จนกว่าจะตรวจ (รวมกรณีไม่มี WHT)")}
                description={t("ถ้าแก้ยอดขอจ่ายหรือข้อมูลภาษี ต้องตรวจสอบใหม่ทุกครั้ง")}
              />
            ) : (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 12 }}
                title={t("ตรวจสอบแล้วโดย {name} เมื่อ {at}", { name: request.whtVerifiedByName ?? "-", at: request.whtVerifiedAt ? dayjs(request.whtVerifiedAt).format("DD/MM/YYYY HH:mm") : "-" })}
              />
            )}
            <Form.Item name="whtApplicable" label={t("มีภาษีหัก ณ ที่จ่ายหรือไม่")}>
              <Radio.Group options={[{ value: true, label: tFin("มี") }, { value: false, label: t("ไม่มี") }]} />
            </Form.Item>
            {wApplicable ? (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <Form.Item name="whtType" label={t("ประเภทการหักภาษี")} style={{ minWidth: 200 }}>
                  <Select
                    options={["PCT_1", "PCT_3", "CUSTOM"].map((v) => ({ value: v, label: tFin(WHT_TYPE_LABEL[v]) }))}
                    onChange={(v) => {
                      if (v === "PCT_1") whtForm.setFieldValue("whtRate", 1);
                      if (v === "PCT_3") whtForm.setFieldValue("whtRate", 3);
                    }}
                  />
                </Form.Item>
                <Form.Item name="whtIncomeType" label={t("ประเภทเงินได้")} style={{ minWidth: 260 }}>
                  <Input maxLength={255} placeholder={t("เช่น ค่าบริการ / ค่าเช่า")} />
                </Form.Item>
                <Form.Item name="whtRate" label={t("อัตราภาษี (%)")} style={{ width: 160 }}>
                  <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="whtBaseAmount"
                  label={t("ฐานภาษีหัก ณ ที่จ่าย")}
                  style={{ width: 220 }}
                  extra={t("เว้นว่าง = สัดส่วนยอดก่อน VAT ของ PO")}
                >
                  <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                </Form.Item>
              </div>
            ) : null}
            <Descriptions size="small" bordered column={{ xs: 1, md: 3 }} style={{ marginBottom: 12 }}>
              <Descriptions.Item label={t("ฐานภาษี")}>{money.format(calc?.base ?? request.whtBaseAmount)}</Descriptions.Item>
              <Descriptions.Item label={t("ยอดภาษีหัก ณ ที่จ่าย")}>{money.format(calc?.whtAmount ?? request.whtAmount)}</Descriptions.Item>
              <Descriptions.Item label={t("ยอดโอนจริง")}>
                <Typography.Text strong>{money.format(calc?.net ?? request.netTransferAmount)}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              {t("ตัวเลขข้างบนเป็นตัวอย่างระหว่างกรอก — ยอดจริงคำนวณและบันทึกหลังกด \"บันทึกการตรวจ WHT\"")}
            </Typography.Paragraph>
            {canWht ? (
              <Space>
                <Button loading={updateWht.isPending} onClick={() => saveWht(false)}>{t("บันทึกข้อมูลภาษี (ยังไม่ตรวจ)")}</Button>
                <Button type="primary" ghost loading={updateWht.isPending} onClick={() => saveWht(true)}>
                  {t("บันทึกและติ๊ก \"ตรวจสอบข้อมูลภาษีเรียบร้อยแล้ว\"")}
                </Button>
              </Space>
            ) : (
              <Typography.Text type="secondary">{t("เฉพาะฝ่ายการเงิน (สิทธิ์อนุมัติ) ที่ตรวจ/แก้ข้อมูลภาษีได้")}</Typography.Text>
            )}
            <Form.Item name="whtVerified" valuePropName="checked" hidden>
              <Checkbox />
            </Form.Item>
          </Form>
        )}
      </Card>

      <Card>
        <Space>
          <Popconfirm title={t("ยกเลิก?")} description={t("กลับหน้ารายการโดยไม่บันทึกการแก้ไขที่ค้างอยู่")} okText={t("กลับ")} cancelText={t("อยู่ต่อ")} onConfirm={() => router.push(ADVANCE_BASE_PATH)}>
            <Button>{t("ยกเลิก")}</Button>
          </Popconfirm>
          <Button loading={create.isPending || update.isPending} disabled={busy && !(create.isPending || update.isPending)} onClick={() => void saveDraft()}>
            {t("บันทึกร่าง")}
          </Button>
          {request && perms.canApprove ? (
            <Popconfirm
              title={t("ยืนยันรายการขอจ่าย?")}
              description={t("ตรวจข้อมูลทั้งหมดรวมถึง WHT แล้วเปลี่ยนสถานะเป็น รอสร้างใบสำคัญจ่าย — ยืนยันแล้วแก้ไขไม่ได้")}
              okText={t("ยืนยันรายการ")}
              cancelText={t("ยกเลิก")}
              onConfirm={() => void onConfirm()}
            >
              <Button color="green" variant="solid" loading={confirm.isPending} disabled={busy && !confirm.isPending}>{t("ยืนยันรายการ")}</Button>
            </Popconfirm>
          ) : null}
        </Space>
        {request ? (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t("วันที่ต้องการจ่าย")}: {request.desiredPayDate ? formatThaiDate(request.desiredPayDate) : t("ยังไม่ระบุ")}
          </Typography.Paragraph>
        ) : null}
      </Card>
    </Space>
  );
}
