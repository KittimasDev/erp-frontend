"use client";

import { useState, type ReactNode } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  theme,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  PercentageOutlined,
  PlusOutlined,
  SaveOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import {
  useAccountSettingsQuery,
  useDeleteGlAccountMutation,
  useGlAccountsQuery,
  useSaveAccountSettingsMutation,
  useSaveGlAccountMutation,
} from "@/hooks/gl-accounts/useGlAccounts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { GlAccount } from "@/types/gl-accounts";
import PageHeader from "@/components/common/PageHeader";

const SCREEN_CODE = "MASTERS_GL_ACCOUNTS";

type FormValues = { code: string; name: string; isActive: boolean };

const SETTING_GROUPS: Array<{ title: string; icon: ReactNode; keys: string[] }> = [
  { title: "บัญชีหลัก (การซื้อ)", icon: <AppstoreOutlined />, keys: ["PURCHASE_DEFAULT", "AP_TRADE"] },
  { title: "ภาษี", icon: <PercentageOutlined />, keys: ["INPUT_VAT", "WHT_PAYABLE"] },
  {
    title: "ค่าใช้จ่ายเพิ่มเติม",
    icon: <DollarOutlined />,
    keys: ["CHARGE_FREIGHT", "CHARGE_SERVICE", "CHARGE_OTHER"],
  },
  { title: "เงินล่วงหน้า / มัดจำ", icon: <WalletOutlined />, keys: ["ADVANCE_PAID", "DEPOSIT_PAID"] },
  { title: "เงินสดและเช็คจ่าย", icon: <CreditCardOutlined />, keys: ["CASH_ON_HAND", "CHEQUE_PAYABLE"] },
];

/**
 * ผังบัญชีย่อ + การผูกบัญชีหลักของสมุดรายวันซื้อ
 * รหัสบัญชีต้องตรงกับ Express — สมุดรายวันซื้อใช้บัญชีเหล่านี้สร้างบรรทัดเดบิต/เครดิตและไฟล์ส่งออก
 */
export default function GlAccountsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GlAccount | "new" | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [draft, setDraft] = useState<Record<string, string | null>>({});

  const accountsQuery = useGlAccountsQuery({ search: keyword || undefined });
  const activeAccounts = useGlAccountsQuery({ isActive: true });
  const settingsQuery = useAccountSettingsQuery();
  const saveAccount = useSaveGlAccountMutation();
  const deleteAccount = useDeleteGlAccountMutation();
  const saveSettings = useSaveAccountSettingsMutation();

  const accountOptions = (activeAccounts.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.code} — ${a.nameTh}`,
  }));

  const settings = settingsQuery.data ?? [];
  const valueOf = (key: string, saved: string | null) => (key in draft ? draft[key] : saved);
  const dirty = Object.keys(draft).length > 0;

  // จัดกลุ่มตามประเภท — คีย์ที่ไม่อยู่ในกลุ่มใดจะตกไปกลุ่ม "อื่น ๆ" เพื่อไม่ให้ช่องหาย
  const settingGroups = (() => {
    const byKey = new Map<string, (typeof settings)[number]>(settings.map((s) => [s.settingKey, s]));
    const used = new Set<string>();
    const groups = SETTING_GROUPS.map((group) => ({
      title: group.title,
      icon: group.icon,
      items: group.keys.flatMap((key) => {
        const found = byKey.get(key);
        if (!found) return [];
        used.add(key);
        return [found];
      }),
    }));
    const rest = settings.filter((s) => !used.has(s.settingKey));
    if (rest.length > 0) groups.push({ title: "อื่น ๆ", icon: null, items: rest });
    return groups.filter((group) => group.items.length > 0);
  })();

  const handleSaveSettings = () => {
    const payload = settings.map((s) => ({
      settingKey: s.settingKey,
      glAccountId: valueOf(s.settingKey, s.glAccountId),
    }));
    saveSettings.mutate(payload, { onSuccess: () => setDraft({}) });
  };

  const openForm = (target: GlAccount | "new") => {
    form.setFieldsValue(
      target === "new"
        ? { code: "", name: "", isActive: true }
        : { code: target.code, name: target.nameTh, isActive: target.isActive },
    );
    setEditing(target);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const id = editing && editing !== "new" ? editing.id : undefined;
    saveAccount.mutate(
      { id, body: { code: values.code.trim(), name: values.name.trim(), isActive: values.isActive } },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: ColumnsType<GlAccount> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    { title: "รหัสบัญชี", dataIndex: "code", width: 160, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "ชื่อบัญชี", dataIndex: "nameTh" },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">ใช้งาน</Tag> : <Tag>ปิดใช้งาน</Tag>),
    },
    {
      title: "จัดการ",
      key: "action",
      width: 140,
      align: "center",
      render: (_, row) => (
        <Space>
          {perms.canEdit ? <Button size="small" icon={<EditOutlined />} onClick={() => openForm(row)} /> : null}
          {perms.canDelete ? (
            <Popconfirm
              title="ลบบัญชีนี้?"
              description="ลบไม่ได้ถ้าถูกผูกอยู่กับการตั้งค่าหรือหมวดสินค้า"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={() => deleteAccount.mutate(row.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title="ผังบัญชีและการผูกบัญชี"
        subtitle="ตั้งค่าบัญชีหลักของสมุดรายวันซื้อ และจัดการผังบัญชีสำหรับส่งออก Express"
      />

      <Card
        title="การผูกบัญชีหลักของสมุดรายวันซื้อ"
        extra={
          perms.canEdit ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!dirty}
              loading={saveSettings.isPending}
              onClick={handleSaveSettings}
            >
              บันทึกการผูกบัญชี
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary">
          ใช้สร้างบรรทัดเดบิต/เครดิตและไฟล์ส่งออก Express — บัญชีซื้อของหมวดสินค้าแต่ละหมวดตั้งได้ที่หน้าหมวดหมู่สินค้า
          (ไม่ตั้ง = ใช้บัญชีซื้อสินค้าค่าเริ่มต้น) · บัญชีค่าขนส่ง/ค่าบริการ/ค่าใช้จ่ายอื่นต้องผูกให้ครบ
          ค่าใช้จ่ายเพิ่มเติมจะแสดงเป็นบัญชีของตัวเองแยกบรรทัด ไม่รวมในซื้อสินค้า ·
          ถ้าบัญชีที่ใช้ยังไม่ผูก ระบบจะไม่ยอมส่งออกไป Express
        </Typography.Paragraph>
        <Form layout="vertical" requiredMark={false}>
          <Row gutter={[12, 12]}>
            {settingGroups.map((group) => (
              <Col key={group.title} xs={24} lg={12}>
                <div
                  style={{
                    background: token.colorPrimaryBg,
                    border: `1px solid ${token.colorPrimaryBorder}`,
                    borderRadius: token.borderRadiusLG,
                    padding: "10px 14px 2px",
                    height: "100%",
                  }}
                >
                  <Typography.Text strong style={{ display: "block", marginBottom: 8, color: token.colorPrimary }}>
                    {group.icon} {group.title}
                  </Typography.Text>
                  <Row gutter={12}>
                    {group.items.map((s) => (
                      <Col key={s.settingKey} xs={24} sm={12}>
                        <Form.Item label={s.label} style={{ marginBottom: 12 }}>
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="ยังไม่ผูกบัญชี"
                            disabled={!perms.canEdit}
                            value={valueOf(s.settingKey, s.glAccountId) ?? undefined}
                            options={accountOptions}
                            onChange={(value) => setDraft((prev) => ({ ...prev, [s.settingKey]: value ?? null }))}
                          />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Col>
            ))}
          </Row>
        </Form>
      </Card>

      <Card
        title="ผังบัญชี"
        extra={
          perms.canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm("new")}>
              เพิ่มบัญชี
            </Button>
          ) : null
        }
      >
        <Input.Search
          allowClear
          placeholder="ค้นรหัสหรือชื่อบัญชี"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
          style={{ width: "100%", maxWidth: 320, marginBottom: 12 }}
        />
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          loading={accountsQuery.isFetching}
          columns={columns}
          dataSource={accountsQuery.data ?? []}
          pagination={{ current: page, pageSize: 20, showSizeChanger: false, onChange: setPage }}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === "new" ? "เพิ่มบัญชี" : "แก้ไขบัญชี"}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={saveAccount.isPending}
        onOk={() => void handleOk().catch(() => message.warning("กรอกข้อมูลให้ครบ"))}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="รหัสบัญชี"
            name="code"
            rules={[
              { required: true, message: "กรุณากรอกรหัสบัญชี" },
              { max: 30, message: "รหัสต้องไม่เกิน 30 ตัวอักษร" },
            ]}
            extra="ต้องตรงกับรหัสในโปรแกรมบัญชี Express"
          >
            <Input placeholder="เช่น 51111.01" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="ชื่อบัญชี"
            name="name"
            rules={[
              { required: true, message: "กรุณากรอกชื่อบัญชี" },
              { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
            ]}
          >
            <Input placeholder="เช่น ซื้อสินค้า" autoComplete="off" />
          </Form.Item>
          <Form.Item label="ใช้งาน" name="isActive" valuePropName="checked">
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
