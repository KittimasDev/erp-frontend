"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateWeighbridgeScaleMutation } from "@/hooks/weighbridge-scales/useCreateWeighbridgeScaleMutation";
import { useDeleteWeighbridgeScaleMutation } from "@/hooks/weighbridge-scales/useDeleteWeighbridgeScaleMutation";
import { useUpdateWeighbridgeScaleMutation } from "@/hooks/weighbridge-scales/useUpdateWeighbridgeScaleMutation";
import { useWeighbridgeScalesQuery } from "@/hooks/weighbridge-scales/useWeighbridgeScalesQuery";
import type {
  CreateWeighbridgeScaleRequest,
  WeighbridgeScale,
  WeighbridgeScaleQueryParams,
} from "@/types/weighbridge-scales";

import WeighbridgeScaleFormModal from "./WeighbridgeScaleFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type ScaleFilterFormValues = {
  code?: string;
  name?: string;
  scaleType?: string;
  locationName?: string;
  connectionType?: string;
  isActive?: boolean | null;
  isAutoReadEnabled?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "name",
  "scaleType",
  "locationName",
  "connectionType",
  "isActive",
  "isAutoReadEnabled",
] as const;

const SCALE_TYPE_OPTIONS = [
  { value: "TRUCK_SCALE", label: "TRUCK_SCALE" },
  { value: "FLOOR_SCALE", label: "FLOOR_SCALE" },
];

const CONNECTION_TYPE_OPTIONS = [
  { value: "TCP_IP", label: "TCP_IP" },
  { value: "RS232", label: "RS232" },
  { value: "CSV", label: "CSV" },
  { value: "MANUAL", label: "MANUAL" },
];

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): WeighbridgeScaleQueryParams {
  const params: WeighbridgeScaleQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const scaleType = searchParams.get("scaleType")?.trim();
  if (scaleType) {
    params.scaleType = scaleType;
  }

  const locationName = searchParams.get("locationName")?.trim();
  if (locationName) {
    params.locationName = locationName;
  }

  const connectionType = searchParams.get("connectionType")?.trim();
  if (connectionType) {
    params.connectionType = connectionType;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  const isAutoReadEnabledRaw = searchParams.get("isAutoReadEnabled");
  if (isAutoReadEnabledRaw === "true") {
    params.isAutoReadEnabled = true;
  } else if (isAutoReadEnabledRaw === "false") {
    params.isAutoReadEnabled = false;
  }

  return params;
}

function toFormValues(
  params: WeighbridgeScaleQueryParams,
): ScaleFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    scaleType: params.scaleType,
    locationName: params.locationName,
    connectionType: params.connectionType,
    isActive: params.isActive,
    isAutoReadEnabled: params.isAutoReadEnabled,
  };
}

function buildSearchFromForm(values: ScaleFilterFormValues): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.scaleType?.trim()) {
    next.set("scaleType", values.scaleType.trim());
  }

  if (values.locationName?.trim()) {
    next.set("locationName", values.locationName.trim());
  }

  if (values.connectionType?.trim()) {
    next.set("connectionType", values.connectionType.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  if (
    values.isAutoReadEnabled === true ||
    values.isAutoReadEnabled === false
  ) {
    next.set("isAutoReadEnabled", String(values.isAutoReadEnabled));
  }

  return next;
}

export default function WeighbridgeScalesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<ScaleFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingScale, setEditingScale] = useState<WeighbridgeScale | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters = useMemo(
    () => parseFiltersFromSearch(searchParams),
    [searchParams],
  );

  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  // sync ฟอร์มจาก URL — antd Form เป็น external system การใช้ effect ถูกต้องแล้ว
  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
  }, [filters, form]);

  // ตัวกรองเปลี่ยน → กลับไปหน้า 1 · ปรับ state ตอน render ตามที่ React แนะนำ
  // ไม่ทำใน effect เพราะจะสั่ง render รอบสองทุกครั้งที่กรอง (cascading render)
  const [pagedFilters, setPagedFilters] = useState(filters);
  if (pagedFilters !== filters) {
    setPagedFilters(filters);
    setPage(1);
  }

  const scalesQuery = useWeighbridgeScalesQuery(filters);
  const createMutation = useCreateWeighbridgeScaleMutation();
  const updateMutation = useUpdateWeighbridgeScaleMutation();
  const deleteMutation = useDeleteWeighbridgeScaleMutation();

  const scales = scalesQuery.data?.data ?? [];
  const activeCount = scales.filter((item) => item.isActive).length;
  const inactiveCount = scales.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: ScaleFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: ScaleFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingScale(null);
    setModalOpen(true);
  };

  const openEditModal = (scale: WeighbridgeScale) => {
    setModalMode("edit");
    setEditingScale(scale);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingScale(null);
  };

  const handleSubmit = (values: CreateWeighbridgeScaleRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingScale) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingScale.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<WeighbridgeScale> = [
    {
      title: "ลำดับ",
      key: "rowNo",
      width: 90,
      align: "center",
      render: (_value, _record, index) => (
        <span className={styles.orderBadge}>
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "scaleCode",
      key: "scaleCode",
      width: 150,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อ",
      dataIndex: "scaleName",
      key: "scaleName",
      width: 200,
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ประเภท",
      dataIndex: "scaleType",
      key: "scaleType",
      width: 130,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "locationName",
      key: "locationName",
      width: 160,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "การเชื่อมต่อ",
      dataIndex: "connectionType",
      key: "connectionType",
      width: 120,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      align: "center",
      render: (isActive: boolean) =>
        isActive ? (
          <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
            <span className={styles.statusDot} />
            ใช้งาน
          </Tag>
        ) : (
          <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
            <span className={styles.statusDot} />
            ปิดใช้งาน
          </Tag>
        ),
    },
    {
      title: "อัปเดตล่าสุด",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value ? new Date(value).toLocaleString("th-TH") : "-"}
        </span>
      ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={`เมนูจัดการ ${record.scaleCode}`}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "แก้ไข",
              onClick: () => openEditModal(record),
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "ลบ",
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: "ลบเครื่องชั่ง",
                content: `ต้องการลบ "${record.scaleCode}" หรือไม่?`,
                okText: "ลบ",
                cancelText: "ยกเลิก",
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={scalesQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            เครื่องชั่ง
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการเครื่องชั่งน้ำหนักและการตั้งค่าการเชื่อมต่อ
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มเครื่องชั่ง
        </Button>
      </div>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "เครื่องชั่งทั้งหมด"}
            </span>
            <strong>{scales.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาเครื่องชั่ง</h3>
            <p>กรองด้วยรหัส ชื่อ ประเภท ตำแหน่ง และการเชื่อมต่อ</p>
          </div>

          {hasFilters ? (
            <Tag className={styles.filterActiveTag} color="success">
              กำลังกรอง
            </Tag>
          ) : null}
        </div>

        <Form
          form={form}
          layout="vertical"
          className={styles.filterForm}
          onFinish={handleSearch}
          initialValues={toFormValues(filters)}
        >
          <Row gutter={[16, 4]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="code" label="รหัสเครื่องชั่ง">
                <Input
                  allowClear
                  placeholder="เช่น TRUCK"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อเครื่องชั่ง">
                <Input allowClear placeholder="เช่น เครื่องชั่ง" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="scaleType" label="ประเภท">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={SCALE_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="connectionType" label="การเชื่อมต่อ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={CONNECTION_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="locationName" label="ตำแหน่ง">
                <Input allowClear placeholder="เช่น หน้าโรงงาน" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isAutoReadEnabled" label="อ่านอัตโนมัติ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "เปิด" },
                    { value: false, label: "ปิด" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isActive" label="สถานะ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ใช้งาน" },
                    { value: false, label: "ปิดใช้งาน" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item label=" " colon={false}>
                <Space wrap>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    className={styles.filterSearchButton}
                  >
                    ค้นหา
                  </Button>

                  <Button
                    icon={<ClearOutlined />}
                    onClick={handleClearFilters}
                    disabled={!hasFilters}
                  >
                    ล้างค่า
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableEyebrow}>SCALE MANAGEMENT</div>
            <h3>รายการเครื่องชั่ง</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลเครื่องชั่งน้ำหนักทั้งหมดในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{scales.length} รายการ</div>
        </div>

        {scalesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {scalesQuery.error instanceof Error
                ? scalesQuery.error.message
                : "โหลดข้อมูลเครื่องชั่งไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={scales}
            loading={scalesQuery.isLoading || scalesQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 1260 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบเครื่องชั่งตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลเครื่องชั่ง",
            }}
          />
        )}
      </div>

      <WeighbridgeScaleFormModal
        open={modalOpen}
        mode={modalMode}
        initialScale={editingScale}
        confirmLoading={
          createMutation.isPending || updateMutation.isPending
        }
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
      </section>
    </MasterPageGate>
  );
}
