"use client";

import { useT } from "@/lib/i18n/useT";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  BankOutlined,
  CalculatorOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PhoneOutlined,
  PlusOutlined,
  SaveOutlined,
  ShopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import {
  useCreateCompanyBankAccountMutation,
  useDeleteCompanyBankAccountMutation,
  useUpdateCompanyBankAccountMutation,
} from "@/hooks/company-profile/useCompanyBankAccountMutations";
import {
  companyProfileQueryKey,
  useCompanyProfileQuery,
} from "@/hooks/company-profile/useCompanyProfileQuery";
import { useUpdateCompanyProfileMutation } from "@/hooks/company-profile/useUpdateCompanyProfileMutation";
import { ApiError } from "@/lib/api/client";
import {
  deleteCompanyLogo,
  downloadCompanyLogo,
  uploadCompanyLogo,
} from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";
import {
  formatTaxId,
  invalidateCompanyInfo,
} from "@/lib/company/company-info";
import type {
  CompanyBankAccount,
  CreateCompanyBankAccountRequest,
  UpdateCompanyProfileRequest,
} from "@/types/company-profile";

import CompanyBankAccountFormModal from "./CompanyBankAccountFormModal";
import styles from "./company-profile.module.css";
import PageHeader from "@/components/common/PageHeader";

/** ต้องตรงกับ MAX_LOGO_BYTES ฝั่ง backend (company-profile.controller.ts) */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const MONTH_OPTIONS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
].map((label, index) => ({ label, value: index + 1 }));

const DATE_FORMAT_OPTIONS = [
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "YYYY-MM-DD",
  "D MMM YYYY",
].map((value) => ({
  // ค่าที่เก็บ/ส่ง API คงเดิม (YYYY) — แค่ป้ายที่ผู้ใช้เห็นเป็น พ.ศ. (BBBB)
  label: `${value.replace("YYYY", "BBBB")} (${dayjs("2026-11-11").format(value.replace("YYYY", "BBBB"))})`,
  value,
}));

type ProfileFormValues = UpdateCompanyProfileRequest;

/** ต่อที่อยู่แบบเดียวกับที่ backend ทำ เพื่อให้ตัวอย่างตรงกับเอกสารจริง */
function joinAddress(values: ProfileFormValues) {
  return [
    values.addressLine,
    values.subDistrict,
    values.district,
    values.province,
    values.postalCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export default function CompanyProfilePage() {
  const t = useT();
  const [form] = Form.useForm<ProfileFormValues>();
  const profileQuery = useCompanyProfileQuery();
  const updateProfile = useUpdateCompanyProfileMutation();
  const createBankAccount = useCreateCompanyBankAccountMutation();
  const updateBankAccount = useUpdateCompanyBankAccountMutation();
  const deleteBankAccount = useDeleteCompanyBankAccountMutation();

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<CompanyBankAccount | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const profile = profileQuery.data?.data;
  const bankAccounts = useMemo(
    () => profile?.bankAccounts ?? [],
    [profile?.bankAccounts],
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    form.setFieldsValue({
      nameTh: profile.nameTh,
      nameEn: profile.nameEn ?? undefined,
      shortName: profile.shortName ?? undefined,
      taxId: profile.taxId ?? undefined,
      businessType: profile.businessType ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
      addressLine: profile.addressLine ?? undefined,
      subDistrict: profile.subDistrict ?? undefined,
      district: profile.district ?? undefined,
      province: profile.province ?? undefined,
      postalCode: profile.postalCode ?? undefined,
      country: profile.country,
      phone: profile.phone ?? undefined,
      email: profile.email ?? undefined,
      website: profile.website ?? undefined,
      lineId: profile.lineId ?? undefined,
      isVatRegistered: profile.isVatRegistered,
      defaultVatRate: profile.defaultVatRate,
      currencyCode: profile.currencyCode,
      timezone: profile.timezone,
      dateFormat: profile.dateFormat,
      fiscalYearStartMonth: profile.fiscalYearStartMonth,
      isActive: profile.isActive,
    });
  }, [form, profile]);

  /**
   * ตัวอย่างหัวเอกสารอ่านค่าจากฟอร์มสด ๆ
   * ผู้ใช้จะเห็นผลทันทีที่พิมพ์ ไม่ต้องกดบันทึกแล้วไปเปิด PDF ดู
   */
  const watched = Form.useWatch([], form) as ProfileFormValues | undefined;
  const previewValues = watched ?? {};
  const previewName = previewValues.nameTh?.trim();
  const previewAddress = joinAddress(previewValues);
  const previewLogo = previewValues.logoUrl?.trim();
  const previewContact = [
    previewValues.phone?.trim()
      ? t("เบอร์ออฟฟิศ : {phone}", { phone: previewValues.phone.trim() })
      : null,
    previewValues.taxId?.trim()
      ? t("เลขประจำตัวผู้เสียภาษี {taxId}", { taxId: formatTaxId(previewValues.taxId.trim()) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const handleSubmitProfile = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  /**
   * โลโก้ที่อัปโหลดต้องแนบ token จึงใส่ใน <img src> ตรง ๆ ไม่ได้
   * โหลดเป็น blob แล้วทำ object URL — ตัวเดียวกับที่หน้าเคสใช้กับรูปแนบ
   */
  useEffect(() => {
    if (!profile?.hasLogoFile) {
      // ไม่เคลียร์ state ตรงนี้ — ค่าที่ค้างถูกกันด้วย hasLogoFile ตอนคำนวณพรีวิว
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { blob } = await downloadCompanyLogo(getAccessToken());
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLogoPreview(objectUrl);
      } catch {
        if (!cancelled) {
          setLogoPreview(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // logoUpdatedAt เปลี่ยนทุกครั้งที่อัปโหลด — ใช้บังคับให้โหลดรูปใหม่
  }, [profile?.hasLogoFile, profile?.logoUpdatedAt]);

  const handlePickLogo = async (file: File) => {
    if (file.size > MAX_LOGO_BYTES) {
      message.error(t("ไฟล์โลโก้ต้องไม่เกิน 2 MB"));
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await uploadCompanyLogo(getAccessToken(), file);
      invalidateCompanyInfo();
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      message.success(response.message || t("อัปโหลดโลโก้บริษัทสำเร็จแล้ว"));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("อัปโหลดโลโก้ไม่สำเร็จ"),
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  /** antd ไม่ต้องยิงเอง — เราอัปโหลดผ่าน apiUpload ที่แนบ token ให้ */
  const logoUploadProps: UploadProps = {
    showUploadList: false,
    accept: "image/*,.jpg,.jpeg,.png,.webp,.gif",
    disabled: uploadingLogo,
    beforeUpload: (file) => {
      void handlePickLogo(file as unknown as File);
      return Upload.LIST_IGNORE;
    },
  };

  /**
   * พรีวิว: ไฟล์ที่อัปโหลด (blob) ก่อน ไม่งั้นใช้ path ที่พิมพ์ในฟอร์ม
   * เช็ค hasLogoFile ด้วย กัน blob เก่าที่ถูก revoke แล้วค้างอยู่หลังลบโลโก้
   */
  const logoUploadPreview =
    (profile?.hasLogoFile ? logoPreview : null) || previewLogo || "";

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      const response = await deleteCompanyLogo(getAccessToken());
      invalidateCompanyInfo();
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      message.success(response.message || t("ลบโลโก้บริษัทสำเร็จแล้ว"));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("ลบโลโก้ไม่สำเร็จ"),
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmitBankAccount = (values: CreateCompanyBankAccountRequest) => {
    if (editingAccount) {
      updateBankAccount.mutate(
        { id: editingAccount.id, body: values },
        {
          onSuccess: () => {
            setBankModalOpen(false);
            setEditingAccount(null);
          },
        },
      );
      return;
    }

    createBankAccount.mutate(values, {
      onSuccess: () => setBankModalOpen(false),
    });
  };

  const bankColumns: ColumnsType<CompanyBankAccount> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ธนาคาร"),
      dataIndex: "bankName",
      render: (value: string, record) => (
        <div className={styles.bankName}>
          <strong>{value}</strong>
          {record.branchName ? <span>{record.branchName}</span> : null}
        </div>
      ),
    },
    {
      title: t("ชื่อบัญชี"),
      dataIndex: "accountName",
    },
    {
      title: t("เลขที่บัญชี"),
      dataIndex: "accountNumber",
      render: (value: string) => (
        <span className={styles.accountNumber}>{value}</span>
      ),
    },
    {
      title: t("บัญชีหลัก"),
      dataIndex: "isDefault",
      align: "center",
      width: 110,
      render: (value: boolean) =>
        value ? <Tag color="gold">{t("บัญชีหลัก")}</Tag> : <span>—</span>,
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      align: "center",
      width: 110,
      render: (value: boolean) => (
        <Tag color={value ? "success" : "default"}>
          {value ? t("ใช้งาน") : t("ปิดใช้งาน")}
        </Tag>
      ),
    },
    {
      title: t("จัดการ"),
      key: "actions",
      align: "right",
      width: 90,
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={t("เมนูจัดการบัญชี {no}", { no: record.accountNumber })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () => {
                setEditingAccount(record);
                setBankModalOpen(true);
              },
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: t("ลบบัญชีธนาคาร"),
              danger: true,
              onClick: () => deleteBankAccount.mutate(record.id),
              confirm: {
                title: t("ลบบัญชีธนาคารนี้"),
                content:
                  t("เอกสารที่พิมพ์ไปแล้วไม่เปลี่ยน แต่เอกสารใหม่จะไม่มีบัญชีนี้"),
                okText: t("ลบ"),
                cancelText: t("ยกเลิก"),
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={profileQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MASTER DATA"
          icon={<ShopOutlined />}
          title={t("ข้อมูลบริษัท")}
          subtitle={t("ข้อมูลชุดนี้ขึ้นหัวเอกสารทุกใบในระบบ — ใบสั่งซื้อ ใบชั่ง ใบรับสินค้า ใบสำคัญจ่าย และใบรับซื้อยาง แก้ที่นี่ที่เดียว เปลี่ยนพร้อมกันทุกใบ")}
        />

        <div className={styles.previewCard}>
          <div className={styles.previewHead}>
            <div>
              <h3>{t("ตัวอย่างหัวเอกสาร")}</h3>
              <p>{t("อัปเดตตามที่พิมพ์ทันที — นี่คือสิ่งที่จะไปอยู่บนกระดาษ")}</p>
            </div>
          </div>

          <div>
            <div className={styles.previewPaper}>
              {logoUploadPreview ? (
                // ต้องใช้ <img> เพราะ path มาจากข้อมูลผู้ใช้ ไม่ผ่าน loader ของ next/image
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUploadPreview}
                  alt={t("โลโก้บริษัท")}
                  className={styles.previewLogo}
                />
              ) : (
                <div className={styles.previewLogoEmpty}>
                  {t("ไม่มี")}
                  <br />
                  {t("โลโก้")}
                </div>
              )}

              <div className={styles.previewLines}>
                <p className={styles.previewName}>
                  {previewName || (
                    <span className={styles.previewPlaceholder}>
                      {t("ยังไม่ได้กรอกชื่อบริษัท")}
                    </span>
                  )}
                </p>

                {previewAddress ? (
                  <p className={styles.previewAddress}>{previewAddress}</p>
                ) : (
                  <p
                    className={`${styles.previewAddress} ${styles.previewPlaceholder}`}
                  >
                    {t("ยังไม่ได้กรอกที่อยู่")}
                  </p>
                )}

                {previewContact ? (
                  <p className={styles.previewAddress}>{previewContact}</p>
                ) : null}
              </div>
            </div>

            <div className={styles.previewRule} />
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          className={styles.form}
          onFinish={handleSubmitProfile}
          requiredMark={false}
        >
          <div className={styles.sectionGrid}>
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>
                  <IdcardOutlined />
                </span>
                <div className={styles.sectionTitles}>
                  <h3>{t("ข้อมูลบริษัท")}</h3>
                  <p>{t("ชื่อและเลขประจำตัวผู้เสียภาษีที่ขึ้นหัวเอกสาร")}</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24}>
                  <Form.Item
                    name="nameTh"
                    label={t("ชื่อบริษัท (ไทย)")}
                    rules={[
                      { required: true, message: t("กรุณากรอกชื่อบริษัทภาษาไทย") },
                    ]}
                  >
                    <Input maxLength={255} size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16}>
                  <Form.Item name="nameEn" label={t("ชื่อบริษัท (อังกฤษ)")}>
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="shortName" label={t("ชื่อย่อ")}>
                    <Input maxLength={100} placeholder={t("เช่น SMT")} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="taxId"
                    label={t("เลขประจำตัวผู้เสียภาษี")}
                    extra={t("ตัวเลข 13 หลัก · พิมพ์เว้นวรรคหรือขีดมาได้ ระบบตัดให้เอง")}
                  >
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="businessType" label={t("ประเภทธุรกิจ")}>
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label={t("โลโก้บริษัท")}
                    extra={t("ไฟล์รูป JPG PNG WEBP GIF ไม่เกิน 2 MB · โลโก้นี้จะขึ้นบนหัวเอกสาร PDF ทุกใบ")}
                  >
                    <div className={styles.logoUploadRow}>
                      {logoUploadPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUploadPreview}
                          alt={t("โลโก้บริษัท")}
                          className={styles.logoUploadPreview}
                        />
                      ) : (
                        <div className={styles.logoUploadEmpty}>{t("ยังไม่มีโลโก้")}</div>
                      )}
                      <Space wrap>
                        <Upload {...logoUploadProps}>
                          <Button
                            icon={<UploadOutlined />}
                            loading={uploadingLogo}
                          >
                            {profile?.hasLogoFile
                              ? t("เปลี่ยนโลโก้")
                              : t("อัปโหลดโลโก้")}
                          </Button>
                        </Upload>
                        {profile?.hasLogoFile ? (
                          <Popconfirm
                            title={t("ลบโลโก้บริษัท")}
                            description={t("เอกสารจะกลับไปใช้ path โลโก้ที่ตั้งไว้ด้านล่าง")}
                            okText={t("ลบ")}
                            cancelText={t("ยกเลิก")}
                            okButtonProps={{ danger: true }}
                            onConfirm={() => void handleRemoveLogo()}
                          >
                            <Button danger icon={<DeleteOutlined />}>
                              {t("ลบโลโก้")}
                            </Button>
                          </Popconfirm>
                        ) : null}
                      </Space>
                    </div>
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    name="logoUrl"
                    label={t("path โลโก้ (ตัวเลือกสำรอง)")}
                    extra={t("ใช้เมื่อไม่ได้อัปโหลดไฟล์ เช่น /logo.png — ถ้าอัปโหลดไฟล์ไว้ ระบบจะใช้ไฟล์ที่อัปโหลดก่อน")}
                  >
                    <Input maxLength={500} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>
                  <EnvironmentOutlined />
                </span>
                <div className={styles.sectionTitles}>
                  <h3>{t("ที่อยู่")}</h3>
                  <p>{t("ทุกช่องจะถูกต่อเป็นบรรทัดเดียว ช่องที่ว่างจะถูกข้าม")}</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24}>
                  <Form.Item name="addressLine" label={t("ที่อยู่ (เลขที่ / ถนน)")}>
                    <Input maxLength={500} placeholder={t("เช่น 85 ถนนโยธา")} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="subDistrict" label={t("ตำบล / แขวง")}>
                    <Input maxLength={150} placeholder={t("เช่น แขวงตลาดน้อย")} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="district" label={t("อำเภอ / เขต")}>
                    <Input maxLength={150} placeholder={t("เช่น เขตสัมพันธวงศ์")} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={10}>
                  <Form.Item name="province" label={t("จังหวัด")}>
                    <Input maxLength={150} />
                  </Form.Item>
                </Col>

                <Col xs={12} md={7}>
                  <Form.Item name="postalCode" label={t("รหัสไปรษณีย์")}>
                    <Input maxLength={10} />
                  </Form.Item>
                </Col>

                <Col xs={12} md={7}>
                  <Form.Item name="country" label={t("ประเทศ")}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>
                  <PhoneOutlined />
                </span>
                <div className={styles.sectionTitles}>
                  <h3>{t("ข้อมูลติดต่อ")}</h3>
                  <p>{t("เบอร์โทรขึ้นหัวเอกสารคู่กับเลขผู้เสียภาษี")}</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label={t("เบอร์โทร")}>
                    <Input maxLength={100} placeholder={t("เช่น 02-2359565-8")} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label={t("อีเมล")}
                    rules={[
                      { type: "email", message: t("รูปแบบอีเมลไม่ถูกต้อง") },
                    ]}
                  >
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="website" label={t("เว็บไซต์")}>
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="lineId" label="LINE">
                    <Input maxLength={100} placeholder={t("เช่น @smtenergy")} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>
                  <CalculatorOutlined />
                </span>
                <div className={styles.sectionTitles}>
                  <h3>{t("ภาษีและการตั้งค่าระบบ")}</h3>
                  <p>{t("ค่าตั้งต้นที่เอกสารและรายงานใช้ร่วมกัน")}</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={12} md={8}>
                  <Form.Item
                    name="isVatRegistered"
                    label={t("จดทะเบียน VAT")}
                    valuePropName="checked"
                  >
                    <Switch checkedChildren={t("จด")} unCheckedChildren={t("ไม่จด")} />
                  </Form.Item>
                </Col>

                <Col xs={12} md={8}>
                  <Form.Item name="defaultVatRate" label={t("อัตรา VAT (%)")}>
                    <InputNumber
                      min={0}
                      max={100}
                      precision={2}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="currencyCode" label={t("สกุลเงินหลัก")}>
                    <Input maxLength={10} placeholder="THB" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="timezone" label="Timezone">
                    <Input maxLength={64} placeholder="Asia/Bangkok" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="dateFormat" label={t("รูปแบบวันที่")}>
                    <Select options={DATE_FORMAT_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="fiscalYearStartMonth"
                    label={t("ปีบัญชีเริ่มเดือน")}
                  >
                    <Select options={MONTH_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="isActive"
                    label={t("สถานะ")}
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={t("ใช้งาน")}
                      unCheckedChildren={t("ปิดใช้งาน")}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </div>
        </Form>

        <div className={`${styles.section} ${styles.sectionWide}`}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <BankOutlined />
            </span>
            <div className={styles.sectionTitles}>
              <h3>{t("บัญชีธนาคารของบริษัท")}</h3>
              <p>{t("รองรับหลายบัญชี — ตั้งบัญชีหลักได้บัญชีเดียว")}</p>
            </div>

            <div className={styles.sectionAction}>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingAccount(null);
                  setBankModalOpen(true);
                }}
              >
                {t("เพิ่มบัญชี")}
              </Button>
            </div>
          </div>

          <Table<CompanyBankAccount>
            rowKey="id"
            className={styles.bankTable}
            columns={bankColumns}
            dataSource={bankAccounts}
            pagination={false}
            locale={{
              emptyText: (
                <div className={styles.emptyBank}>
                  {t("ยังไม่มีบัญชีธนาคาร — กด “เพิ่มบัญชี” เพื่อเพิ่มบัญชีแรก")}
                </div>
              ),
            }}
          />
        </div>

        <div className={styles.saveBar}>
          <span className={styles.saveHint}>
            {t("การแก้ไขจะมีผลกับเอกสารที่พิมพ์ใหม่เท่านั้น เอกสารที่พิมพ์ไปแล้วไม่เปลี่ยน")}
          </span>

          <Button
            type="primary"
            size="large"
            className={styles.saveButton}
            icon={<SaveOutlined />}
            loading={updateProfile.isPending}
            onClick={() => form.submit()}
          >
            {t("บันทึกข้อมูลบริษัท")}
          </Button>
        </div>
      </section>

      <CompanyBankAccountFormModal
        open={bankModalOpen}
        account={editingAccount}
        saving={createBankAccount.isPending || updateBankAccount.isPending}
        onCancel={() => {
          setBankModalOpen(false);
          setEditingAccount(null);
        }}
        onSubmit={handleSubmitBankAccount}
      />
    </MasterPageGate>
  );
}
