"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
} from "antd";
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
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateCompanyBankAccountMutation,
  useDeleteCompanyBankAccountMutation,
  useUpdateCompanyBankAccountMutation,
} from "@/hooks/company-profile/useCompanyBankAccountMutations";
import { useCompanyProfileQuery } from "@/hooks/company-profile/useCompanyProfileQuery";
import { useUpdateCompanyProfileMutation } from "@/hooks/company-profile/useUpdateCompanyProfileMutation";
import { formatTaxId } from "@/lib/company/company-info";
import type {
  CompanyBankAccount,
  CreateCompanyBankAccountRequest,
  UpdateCompanyProfileRequest,
} from "@/types/company-profile";

import CompanyBankAccountFormModal from "./CompanyBankAccountFormModal";
import styles from "./company-profile.module.css";

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
              {previewLogo ? (
                // ต้องใช้ <img> เพราะ path มาจากข้อมูลผู้ใช้ ไม่ผ่าน loader ของ next/image
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewLogo}
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
                    name="logoUrl"
                    label="โลโก้บริษัท"
                    extra="ที่อยู่ไฟล์รูป เช่น /logo.png · ปล่อยว่างจะใช้โลโก้เริ่มต้นของระบบ"
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
