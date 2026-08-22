"use client";

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
].map((value) => ({ label: value, value }));

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
      ? `เบอร์ออฟฟิศ : ${previewValues.phone.trim()}`
      : null,
    previewValues.taxId?.trim()
      ? `เลขประจำตัวผู้เสียภาษี ${formatTaxId(previewValues.taxId.trim())}`
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
      message.error("ไฟล์โลโก้ต้องไม่เกิน 2 MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await uploadCompanyLogo(getAccessToken(), file);
      invalidateCompanyInfo();
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      message.success(response.message || "อัปโหลดโลโก้บริษัทสำเร็จแล้ว");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "อัปโหลดโลโก้ไม่สำเร็จ",
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
      message.success(response.message || "ลบโลโก้บริษัทสำเร็จแล้ว");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "ลบโลโก้ไม่สำเร็จ",
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
      title: "ธนาคาร",
      dataIndex: "bankName",
      render: (value: string, record) => (
        <div className={styles.bankName}>
          <strong>{value}</strong>
          {record.branchName ? <span>{record.branchName}</span> : null}
        </div>
      ),
    },
    {
      title: "ชื่อบัญชี",
      dataIndex: "accountName",
    },
    {
      title: "เลขที่บัญชี",
      dataIndex: "accountNumber",
      render: (value: string) => (
        <span className={styles.accountNumber}>{value}</span>
      ),
    },
    {
      title: "บัญชีหลัก",
      dataIndex: "isDefault",
      align: "center",
      width: 110,
      render: (value: boolean) =>
        value ? <Tag color="gold">บัญชีหลัก</Tag> : <span>—</span>,
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      align: "center",
      width: 110,
      render: (value: boolean) => (
        <Tag color={value ? "success" : "default"}>
          {value ? "ใช้งาน" : "ปิดใช้งาน"}
        </Tag>
      ),
    },
    {
      title: "จัดการ",
      key: "actions",
      align: "right",
      width: 150,
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingAccount(record);
              setBankModalOpen(true);
            }}
          >
            แก้ไข
          </Button>

          <Popconfirm
            title="ลบบัญชีธนาคารนี้"
            description="เอกสารที่พิมพ์ไปแล้วไม่เปลี่ยน แต่เอกสารใหม่จะไม่มีบัญชีนี้"
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteBankAccount.mutate(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={profileQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.hero}>
          <span className={styles.heroIcon}>
            <ShopOutlined />
          </span>

          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>MASTER DATA</div>

            <Typography.Title level={2} className={styles.heroTitle}>
              ข้อมูลบริษัท
            </Typography.Title>

            <Typography.Text className={styles.heroSubtitle}>
              ข้อมูลชุดนี้ขึ้นหัวเอกสารทุกใบในระบบ — ใบสั่งซื้อ ใบชั่ง
              ใบรับสินค้า ใบสำคัญจ่าย และใบรับซื้อยาง แก้ที่นี่ที่เดียว
              เปลี่ยนพร้อมกันทุกใบ
            </Typography.Text>
          </div>
        </div>

        <div className={styles.previewCard}>
          <div className={styles.previewHead}>
            <div>
              <h3>ตัวอย่างหัวเอกสาร</h3>
              <p>อัปเดตตามที่พิมพ์ทันที — นี่คือสิ่งที่จะไปอยู่บนกระดาษ</p>
            </div>
          </div>

          <div>
            <div className={styles.previewPaper}>
              {logoUploadPreview ? (
                // ต้องใช้ <img> เพราะ path มาจากข้อมูลผู้ใช้ ไม่ผ่าน loader ของ next/image
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUploadPreview}
                  alt="โลโก้บริษัท"
                  className={styles.previewLogo}
                />
              ) : (
                <div className={styles.previewLogoEmpty}>
                  ไม่มี
                  <br />
                  โลโก้
                </div>
              )}

              <div className={styles.previewLines}>
                <p className={styles.previewName}>
                  {previewName || (
                    <span className={styles.previewPlaceholder}>
                      ยังไม่ได้กรอกชื่อบริษัท
                    </span>
                  )}
                </p>

                {previewAddress ? (
                  <p className={styles.previewAddress}>{previewAddress}</p>
                ) : (
                  <p
                    className={`${styles.previewAddress} ${styles.previewPlaceholder}`}
                  >
                    ยังไม่ได้กรอกที่อยู่
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
                  <h3>ข้อมูลบริษัท</h3>
                  <p>ชื่อและเลขประจำตัวผู้เสียภาษีที่ขึ้นหัวเอกสาร</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24}>
                  <Form.Item
                    name="nameTh"
                    label="ชื่อบริษัท (ไทย)"
                    rules={[
                      { required: true, message: "กรุณากรอกชื่อบริษัทภาษาไทย" },
                    ]}
                  >
                    <Input maxLength={255} size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16}>
                  <Form.Item name="nameEn" label="ชื่อบริษัท (อังกฤษ)">
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="shortName" label="ชื่อย่อ">
                    <Input maxLength={100} placeholder="เช่น SMT" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="taxId"
                    label="เลขประจำตัวผู้เสียภาษี"
                    extra="ตัวเลข 13 หลัก · พิมพ์เว้นวรรคหรือขีดมาได้ ระบบตัดให้เอง"
                  >
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="businessType" label="ประเภทธุรกิจ">
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="โลโก้บริษัท"
                    extra="ไฟล์รูป JPG PNG WEBP GIF ไม่เกิน 2 MB · โลโก้นี้จะขึ้นบนหัวเอกสาร PDF ทุกใบ"
                  >
                    <div className={styles.logoUploadRow}>
                      {logoUploadPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUploadPreview}
                          alt="โลโก้บริษัท"
                          className={styles.logoUploadPreview}
                        />
                      ) : (
                        <div className={styles.logoUploadEmpty}>ยังไม่มีโลโก้</div>
                      )}
                      <Space wrap>
                        <Upload {...logoUploadProps}>
                          <Button
                            icon={<UploadOutlined />}
                            loading={uploadingLogo}
                          >
                            {profile?.hasLogoFile
                              ? "เปลี่ยนโลโก้"
                              : "อัปโหลดโลโก้"}
                          </Button>
                        </Upload>
                        {profile?.hasLogoFile ? (
                          <Popconfirm
                            title="ลบโลโก้บริษัท"
                            description="เอกสารจะกลับไปใช้ path โลโก้ที่ตั้งไว้ด้านล่าง"
                            okText="ลบ"
                            cancelText="ยกเลิก"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => void handleRemoveLogo()}
                          >
                            <Button danger icon={<DeleteOutlined />}>
                              ลบโลโก้
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
                    label="path โลโก้ (ตัวเลือกสำรอง)"
                    extra="ใช้เมื่อไม่ได้อัปโหลดไฟล์ เช่น /logo.png — ถ้าอัปโหลดไฟล์ไว้ ระบบจะใช้ไฟล์ที่อัปโหลดก่อน"
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
                  <h3>ที่อยู่</h3>
                  <p>ทุกช่องจะถูกต่อเป็นบรรทัดเดียว ช่องที่ว่างจะถูกข้าม</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24}>
                  <Form.Item name="addressLine" label="ที่อยู่ (เลขที่ / ถนน)">
                    <Input maxLength={500} placeholder="เช่น 85 ถนนโยธา" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="subDistrict" label="ตำบล / แขวง">
                    <Input maxLength={150} placeholder="เช่น แขวงตลาดน้อย" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="district" label="อำเภอ / เขต">
                    <Input maxLength={150} placeholder="เช่น เขตสัมพันธวงศ์" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={10}>
                  <Form.Item name="province" label="จังหวัด">
                    <Input maxLength={150} />
                  </Form.Item>
                </Col>

                <Col xs={12} md={7}>
                  <Form.Item name="postalCode" label="รหัสไปรษณีย์">
                    <Input maxLength={10} />
                  </Form.Item>
                </Col>

                <Col xs={12} md={7}>
                  <Form.Item name="country" label="ประเทศ">
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
                  <h3>ข้อมูลติดต่อ</h3>
                  <p>เบอร์โทรขึ้นหัวเอกสารคู่กับเลขผู้เสียภาษี</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label="เบอร์โทร">
                    <Input maxLength={100} placeholder="เช่น 02-2359565-8" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="อีเมล"
                    rules={[
                      { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
                    ]}
                  >
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="website" label="เว็บไซต์">
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="lineId" label="LINE">
                    <Input maxLength={100} placeholder="เช่น @smtenergy" />
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
                  <h3>ภาษีและการตั้งค่าระบบ</h3>
                  <p>ค่าตั้งต้นที่เอกสารและรายงานใช้ร่วมกัน</p>
                </div>
              </div>

              <Row gutter={[14, 0]}>
                <Col xs={12} md={8}>
                  <Form.Item
                    name="isVatRegistered"
                    label="จดทะเบียน VAT"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="จด" unCheckedChildren="ไม่จด" />
                  </Form.Item>
                </Col>

                <Col xs={12} md={8}>
                  <Form.Item name="defaultVatRate" label="อัตรา VAT (%)">
                    <InputNumber
                      min={0}
                      max={100}
                      precision={2}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="currencyCode" label="สกุลเงินหลัก">
                    <Input maxLength={10} placeholder="THB" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="timezone" label="Timezone">
                    <Input maxLength={64} placeholder="Asia/Bangkok" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="dateFormat" label="รูปแบบวันที่">
                    <Select options={DATE_FORMAT_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="fiscalYearStartMonth"
                    label="ปีบัญชีเริ่มเดือน"
                  >
                    <Select options={MONTH_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="isActive"
                    label="สถานะ"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="ใช้งาน"
                      unCheckedChildren="ปิดใช้งาน"
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
              <h3>บัญชีธนาคารของบริษัท</h3>
              <p>รองรับหลายบัญชี — ตั้งบัญชีหลักได้บัญชีเดียว</p>
            </div>

            <div className={styles.sectionAction}>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingAccount(null);
                  setBankModalOpen(true);
                }}
              >
                เพิ่มบัญชี
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
                  ยังไม่มีบัญชีธนาคาร — กด &ldquo;เพิ่มบัญชี&rdquo;
                  เพื่อเพิ่มบัญชีแรก
                </div>
              ),
            }}
          />
        </div>

        <div className={styles.saveBar}>
          <span className={styles.saveHint}>
            การแก้ไขจะมีผลกับเอกสารที่พิมพ์ใหม่เท่านั้น
            เอกสารที่พิมพ์ไปแล้วไม่เปลี่ยน
          </span>

          <Button
            type="primary"
            size="large"
            className={styles.saveButton}
            icon={<SaveOutlined />}
            loading={updateProfile.isPending}
            onClick={() => form.submit()}
          >
            บันทึกข้อมูลบริษัท
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
