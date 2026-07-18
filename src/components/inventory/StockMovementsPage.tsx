"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ClearOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useStockMovementsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type {
  StockMovementQueryParams,
  StockMovementRow,
} from "@/types/inventory";
import { STOCK_MOVEMENT_TYPE_LABEL } from "@/types/inventory";
import styles from "@/components/masters/shared/master-page.module.css";

type FilterForm = {
  warehouseId?: string;
  movementType?: string;
  q?: string;
  range?: [Dayjs, Dayjs];
};

const MOVEMENT_OPTIONS = Object.entries(STOCK_MOVEMENT_TYPE_LABEL).map(
  ([value, label]) => ({ value, label: `${value} — ${label}` }),
);

export default function StockMovementsPage() {
  const [form] = Form.useForm<FilterForm>();
  const [filters, setFilters] = useState<StockMovementQueryParams>({});

  const movementsQuery = useStockMovementsQuery(filters);
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const rows = movementsQuery.data?.data ?? [];

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );

  const columns: ColumnsType<StockMovementRow> = [
    {
      title: "วันเวลา",
      dataIndex: "movementDate",
      key: "movementDate",
      width: 170,
      render: (v: string) =>
        v ? new Date(v).toLocaleString("th-TH") : "-",
    },
    {
      title: "ประเภท",
      dataIndex: "movementType",
      key: "movementType",
      width: 130,
      render: (v: string) => (
        <Tag>{STOCK_MOVEMENT_TYPE_LABEL[v] ?? v}</Tag>
      ),
    },
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) => (
        <div className={styles.nameCell}>
          <span className={styles.codeBadge}>{row.itemCode}</span>
          <span>{row.itemNameTh}</span>
        </div>
      ),
    },
    {
      title: "คลัง / ตำแหน่ง",
      key: "place",
      width: 160,
      render: (_, row) => `${row.warehouseCode} / ${row.locationCode}`,
    },
    {
      title: "เข้า",
      dataIndex: "quantityIn",
      key: "quantityIn",
      align: "right",
      width: 100,
    },
    {
      title: "ออก",
      dataIndex: "quantityOut",
      key: "quantityOut",
      align: "right",
      width: 100,
    },
    {
      title: "คงเหลือหลังทำ",
      dataIndex: "balanceQuantityAfter",
      key: "balanceQuantityAfter",
      align: "right",
      width: 120,
    },
    {
      title: "Lot",
      dataIndex: "lotNo",
      key: "lotNo",
      width: 160,
      render: (v?: string) => v || "-",
    },
    {
      title: "เอกสารอ้างอิง",
      key: "ref",
      width: 200,
      render: (_, row) =>
        row.referenceDocNo
          ? `${row.referenceDocType ?? ""} ${row.referenceDocNo}`
          : row.referenceDocType || "-",
    },
    {
      title: "ผู้ทำรายการ",
      dataIndex: "createdByName",
      key: "createdByName",
      width: 140,
      render: (v?: string) => v || "-",
    },
  ];

  const handleSearch = (values: FilterForm) => {
    setFilters({
      warehouseId: values.warehouseId,
      movementType: values.movementType,
      q: values.q?.trim() || undefined,
      from: values.range?.[0]?.format("YYYY-MM-DD"),
      to: values.range?.[1]?.format("YYYY-MM-DD"),
    });
  };

  return (
    <MasterPageGate isLoading={movementsQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div />
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>INVENTORY · AUDIT</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              ประวัติความเคลื่อนไหวสต๊อก
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              ตรวจสอบ IN/OUT/ADJUST/TRANSFER และเอกสารต้นทางหลังรับเข้าจากใบรับซื้อยาง
            </Typography.Text>
          </div>
          <div />
        </div>

        <div className={styles.filterCard}>
          <Form form={form} layout="vertical" onFinish={handleSearch}>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={6}>
                <Form.Item name="warehouseId" label="คลัง">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="ทุกคลัง"
                    options={warehouseOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="movementType" label="ประเภท">
                  <Select
                    allowClear
                    placeholder="ทุกประเภท"
                    options={MOVEMENT_OPTIONS}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="range" label="ช่วงวันที่">
                  <DatePicker.RangePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="q" label="ค้นหา">
                  <Input
                    allowClear
                    placeholder="สินค้า / เลขเอกสาร / Lot"
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    className={styles.createButton}
                  >
                    ค้นหา
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => {
                      form.resetFields();
                      setFilters({});
                    }}
                  >
                    ล้าง
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </div>

        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={movementsQuery.isFetching}
            pagination={{
              pageSize: 20,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
            scroll={{ x: 1400 }}
            locale={{ emptyText: "ยังไม่มีการเคลื่อนไหวตามเงื่อนไข" }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
