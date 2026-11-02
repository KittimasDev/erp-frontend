"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
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
  UploadOutlined,
  StopOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import CsvImportModal, {
  ITEM_CSV_HINT,
  ITEM_CSV_TEMPLATE,
} from "@/components/masters/shared/CsvImportModal";
import { downloadItemImportTemplate } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";
import { downloadBlob } from "@/utils/downloadTabularReport";
import { useCreateItemMutation } from "@/hooks/items/useCreateItemMutation";
import { useImportItemsCsvMutation } from "@/hooks/items/useImportItemsCsvMutation";
import { useDeleteItemMutation } from "@/hooks/items/useDeleteItemMutation";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useItemStockSummaryQuery } from "@/hooks/items/useItemStockSummaryQuery";
import { useUpdateItemMutation } from "@/hooks/items/useUpdateItemMutation";
import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import {
  canAccessScreen,
  getScreenActionPermissions,
} from "@/lib/auth/permissions-access";
import type {
  CreateItemRequest,
  Item,
  ItemQueryParams,
  ItemStockLevel,
} from "@/types/items";

import ItemFormModal from "./ItemFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type ItemFilterFormValues = {
  code?: string;
  name?: string;
  description?: string;
  itemCategoryId?: string;
  unitId?: string;
  isActive?: boolean | null;
  isPurchaseItem?: boolean | null;
  isStockItem?: boolean | null;
  isFinishedGood?: boolean | null;
  lowStock?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "name",
  "description",
  "itemCategoryId",
  "unitId",
  "isActive",
  "isPurchaseItem",
  "isStockItem",
  "isFinishedGood",
  "lowStock",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): ItemQueryParams {
  const params: ItemQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const description = searchParams.get("description")?.trim();
  if (description) {
    params.description = description;
  }

  const itemCategoryId = searchParams.get("itemCategoryId")?.trim();
  if (itemCategoryId) {
    params.itemCategoryId = itemCategoryId;
  }

  const unitId = searchParams.get("unitId")?.trim();
  if (unitId) {
    params.unitId = unitId;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  const isPurchaseItemRaw = searchParams.get("isPurchaseItem");
  if (isPurchaseItemRaw === "true") {
    params.isPurchaseItem = true;
  } else if (isPurchaseItemRaw === "false") {
    params.isPurchaseItem = false;
  }

  const isStockItemRaw = searchParams.get("isStockItem");
  if (isStockItemRaw === "true") {
    params.isStockItem = true;
  } else if (isStockItemRaw === "false") {
    params.isStockItem = false;
  }

  const isFinishedGoodRaw = searchParams.get("isFinishedGood");
  if (isFinishedGoodRaw === "true") {
    params.isFinishedGood = true;
  } else if (isFinishedGoodRaw === "false") {
    params.isFinishedGood = false;
  }

  if (searchParams.get("lowStock") === "true") {
    params.lowStock = true;
  }

  return params;
}

const qty = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 3 });

function toFormValues(params: ItemQueryParams): ItemFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    description: params.description,
    itemCategoryId: params.itemCategoryId,
    unitId: params.unitId,
    isActive: params.isActive,
    isPurchaseItem: params.isPurchaseItem,
    isStockItem: params.isStockItem,
    isFinishedGood: params.isFinishedGood,
    lowStock: params.lowStock,
  };
}

function buildSearchFromForm(values: ItemFilterFormValues): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.description?.trim()) {
    next.set("description", values.description.trim());
  }

  if (values.itemCategoryId) {
    next.set("itemCategoryId", values.itemCategoryId);
  }

  if (values.unitId) {
    next.set("unitId", values.unitId);
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  if (values.isPurchaseItem === true || values.isPurchaseItem === false) {
    next.set("isPurchaseItem", String(values.isPurchaseItem));
  }

  if (values.isStockItem === true || values.isStockItem === false) {
    next.set("isStockItem", String(values.isStockItem));
  }

  if (values.isFinishedGood === true || values.isFinishedGood === false) {
    next.set("isFinishedGood", String(values.isFinishedGood));
  }

  if (values.lowStock === true) {
    next.set("lowStock", "true");
  }

  return next;
}

export default function ItemsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<ItemFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
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

  const itemsQuery = useItemsQuery(filters);
  const categoriesQuery = useItemCategoriesQuery();
  const unitsQuery = useUnitsQuery();
  const createMutation = useCreateItemMutation();
  const importMutation = useImportItemsCsvMutation();
  const updateMutation = useUpdateItemMutation();
  const deleteMutation = useDeleteItemMutation();

  const items = itemsQuery.data?.data ?? [];
  // ยอดคงเหลือของสินค้าในหน้าที่แสดง (รวมทุกคลัง) + จำนวนที่ต่ำทั้งระบบสำหรับแบนเนอร์
  const pageItemIds = items.slice((page - 1) * pageSize, page * pageSize).map((i) => i.id);
  const stockQuery = useItemStockSummaryQuery(pageItemIds);
  const stockById = new Map((stockQuery.data?.items ?? []).map((r) => [r.itemId, r]));
  const lowCount = stockQuery.data?.summary.lowCount ?? 0;
  const outCount = stockQuery.data?.summary.outCount ?? 0;
  const categories = categoriesQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const activeItems = items.filter((item) => item.isActive).length;
  const inactiveItems = items.filter((item) => !item.isActive).length;

  const { canAdd, canEdit, canDelete } =
    getScreenActionPermissions("MASTERS_ITEMS");

  const applyFiltersToUrl = (values: ItemFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: ItemFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (values: CreateItemRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingItem) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingItem.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Item> = [
    {
      title: "ลำดับ",
      key: "rowNo",
      width: 80,
      align: "center",
      render: (_value, _record, index) => (
        <span className={styles.orderBadge}>
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "itemCode",
      key: "itemCode",
      width: 130,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อสินค้า",
      dataIndex: "itemNameTh",
      key: "itemNameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "คำอธิบาย",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "หมวดหมู่สินค้า",
      key: "itemCategory",
      width: 160,
      render: (_, record) => (
        <span className={styles.symbolText}>
          {record.itemCategory
            ? `${record.itemCategory.code}`
            : "-"}
        </span>
      ),
    },
    {
      title: "สำเร็จรูป",
      dataIndex: "isFinishedGood",
      key: "isFinishedGood",
      width: 110,
      align: "center",
      render: (isFinishedGood: boolean) =>
        isFinishedGood ? (
          <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
            สำเร็จรูป
          </Tag>
        ) : (
          <span className={styles.symbolText}>-</span>
        ),
    },
    {
      title: "หน่วย",
      key: "unit",
      width: 100,
      render: (_, record) => (
        <span className={styles.symbolText}>
          {record.unit?.code || "-"}
        </span>
      ),
    },
    {
      title: "คงเหลือ (ทุกคลัง)",
      key: "onHand",
      width: 150,
      align: "right",
      render: (_, record) => {
        const s = stockById.get(record.id);
        if (!s || (!record.isStockItem && s.level === "NONE")) {
          return <span className={styles.symbolText}>{stockQuery.isLoading ? "…" : "-"}</span>;
        }
        const low = s.level === "OUT" || s.level === "LOW";
        return <span className={low ? styles.stockQtyLow : undefined}>{qty.format(s.totalOnHand)}</span>;
      },
    },
    {
      title: "ขั้นต่ำ",
      key: "minimum",
      width: 110,
      align: "right",
      render: (_, record) => {
        const s = stockById.get(record.id);
        return s && s.minimumStockQty > 0 ? (
          qty.format(s.minimumStockQty)
        ) : (
          <span className={styles.symbolText}>-</span>
        );
      },
    },
    {
      title: "สถานะสต๊อก",
      key: "stockLevel",
      width: 190,
      align: "center",
      render: (_, record) => {
        const s = stockById.get(record.id);
        const level: ItemStockLevel | undefined = s?.level;
        if (!s || level === "NONE") {
          return <span className={styles.symbolText}>-</span>;
        }
        if (level === "OUT") {
          return <Tag className={`${styles.statusTag} ${styles.stockBadgeOut}`}>หมดสต๊อก · ขาด {qty.format(s.shortageQty)}</Tag>;
        }
        if (level === "LOW") {
          return <Tag className={`${styles.statusTag} ${styles.stockBadgeLow}`}>ต่ำกว่าขั้นต่ำ · ขาด {qty.format(s.shortageQty)}</Tag>;
        }
        return <Tag className={`${styles.statusTag} ${styles.stockBadgeOk}`}>ปกติ</Tag>;
      },
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
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
    ...(canEdit || canDelete
      ? ([
          {
            title: "จัดการ",
            key: "actions",
            width: 100,
            align: "center" as const,
            render: (_: unknown, record: Item) => (
              <RowActionsMenu
                ariaLabel={`เมนูจัดการ ${record.itemCode}`}
                actions={[
                  canEdit && {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: "แก้ไข",
                    onClick: () => openEditModal(record),
                  },
                  canAccessScreen("MASTERS_UNIT_CONVERSIONS") && {
                    key: "unit-conversions",
                    icon: <SwapOutlined />,
                    label: "กฎแปลงหน่วย",
                    onClick: () =>
                      router.push(
                        `/masters/unit-conversions?itemId=${record.id}`,
                      ),
                  },
                  ((canEdit && record.isActive) ||
                    (canDelete && !record.hasTransactions)) &&
                    "divider",
                  canEdit &&
                    record.isActive && {
                      key: "deactivate",
                      icon: <StopOutlined />,
                      label: "ปิดใช้งาน",
                      danger: true,
                      onClick: () =>
                        updateMutation.mutate({
                          id: record.id,
                          body: { isActive: false },
                        }),
                      confirm: {
                        title: "ปิดใช้งานสินค้า",
                        content: `ต้องการปิดการใช้งาน "${record.itemCode}" หรือไม่? ประวัติเอกสารและล็อตของสินค้านี้จะยังอยู่ รหัสสินค้านี้จะสร้างซ้ำไม่ได้`,
                        okText: "ปิดใช้งาน",
                        cancelText: "ยกเลิก",
                      },
                    },
                  canDelete &&
                    !record.hasTransactions && {
                      key: "delete",
                      icon: <DeleteOutlined />,
                      label: "ลบ",
                      danger: true,
                      onClick: () => deleteMutation.mutate(record.id),
                      confirm: {
                        title: "ลบสินค้า",
                        content: `ต้องการลบ "${record.itemCode}" ออกจากระบบหรือไม่? รหัสสินค้านี้จะใช้ซ้ำได้`,
                        okText: "ลบ",
                        cancelText: "ยกเลิก",
                      },
                    },
                ]}
              />
            ),
          },
        ] satisfies ColumnsType<Item>)
      : []),
  ];

  return (
    <MasterPageGate isLoading={itemsQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            สินค้า / วัตถุดิบ
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการข้อมูลสินค้า วัตถุดิบ อะไหล่ และสินค้าสำเร็จรูป
          </Typography.Text>
        </div>

        {canAdd ? (
          <div className={styles.headerActions}>
            <Button
              size="large"
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
            >
              นำเข้า Excel / CSV
            </Button>
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              เพิ่มสินค้า
            </Button>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "สินค้าทั้งหมด"}
            </span>
            <strong>{items.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeItems}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{inactiveItems}</strong>
          </div>
        </div>
      </div>

      {lowCount > 0 ? (
        <Alert
          className={styles.stockBanner}
          type="error"
          showIcon
          title={`มีสินค้า ${lowCount} รายการต่ำกว่าสต๊อกขั้นต่ำ${outCount > 0 ? ` (หมดสต๊อก ${outCount} รายการ)` : ""}`}
          description="ยอดนับรวมทุกคลังเทียบกับสต๊อกขั้นต่ำที่ตั้งไว้ที่สินค้า — ควรสั่งซื้อหรือผลิตเพิ่ม"
          action={
            <Space orientation="vertical" size={4}>
              {filters.lowStock ? (
                <Button size="small" onClick={handleClearFilters}>
                  แสดงสินค้าทั้งหมด
                </Button>
              ) : (
                <Button size="small" danger onClick={() => router.replace(`${pathname}?lowStock=true`)}>
                  ดูเฉพาะรายการที่ต่ำ
                </Button>
              )}
              <Link href="/inventory/stock-balances">ดูยอดคงเหลือสต๊อก</Link>
            </Space>
          }
        />
      ) : null}

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาสินค้า</h3>
            <p>กรองด้วยรหัส ชื่อ คำอธิบาย หมวดหมู่สินค้า หน่วย และสถานะ</p>
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
              <Form.Item name="code" label="รหัสสินค้า">
                <Input
                  allowClear
                  placeholder="เช่น RM-001"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อสินค้า">
                <Input allowClear placeholder="เช่น ยาง" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label="คำอธิบาย">
                <Input allowClear placeholder="เช่น pyrolysis" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="itemCategoryId" label="หมวดหมู่สินค้า">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  loading={categoriesQuery.isLoading}
                  options={categories.map((category) => ({
                    value: category.id,
                    label: `${category.code} — ${category.nameTh}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="unitId" label="หน่วยนับ">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  loading={unitsQuery.isLoading}
                  options={units.map((unit) => ({
                    value: unit.id,
                    label: `${unit.code} — ${unit.nameTh}`,
                  }))}
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
              <Form.Item name="isPurchaseItem" label="ใช้จัดซื้อ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ใช่" },
                    { value: false, label: "ไม่" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isStockItem" label="คุมสต๊อก">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ใช่" },
                    { value: false, label: "ไม่" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isFinishedGood" label="สินค้าสำเร็จรูป">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ใช่" },
                    { value: false, label: "ไม่" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="lowStock" label="สถานะสต๊อก">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[{ value: true, label: "ต่ำกว่าขั้นต่ำ" }]}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
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
            <div className={styles.tableEyebrow}>ITEM MANAGEMENT</div>
            <h3>รายการสินค้า</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลสินค้าทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{items.length} รายการ</div>
        </div>

        {itemsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {itemsQuery.error instanceof Error
                ? itemsQuery.error.message
                : "โหลดข้อมูลสินค้าไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={items}
            rowClassName={(record) => {
              const level = stockById.get(record.id)?.level;
              return level === "OUT" || level === "LOW" ? styles.lowStockRow : "";
            }}
            loading={itemsQuery.isLoading || itemsQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 1560 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบสินค้าตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลสินค้า",
            }}
          />
        )}
      </div>

      <CsvImportModal
        open={importOpen}
        title="นำเข้าสินค้าจาก Excel / CSV"
        acceptExtensions={[".csv", ".xlsx"]}
        onDownloadExcelTemplate={async () => {
          const { blob, filename } = await downloadItemImportTemplate(
            getAccessToken(),
          );
          downloadBlob(filename ?? "items-import-template.xlsx", blob);
        }}
        templateFileName="items-import-template.csv"
        templateCsv={ITEM_CSV_TEMPLATE}
        hint={ITEM_CSV_HINT}
        importing={importMutation.isPending}
        onClose={() => setImportOpen(false)}
        onImport={async (file) => {
          const response = await importMutation.mutateAsync(file);
          return response.data;
        }}
      />
      <ItemFormModal
        open={modalOpen}
        mode={modalMode}
        initialItem={editingItem}
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
