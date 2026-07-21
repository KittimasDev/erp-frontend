"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ClearOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { isAdministrator } from "@/lib/auth/session";
import { useAuditLogsQuery } from "@/hooks/audit-logs/useAuditLogsQuery";
import type { AuditLog, AuditLogQueryParams } from "@/types/audit-logs";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./AuditLogsPage.module.css";

const { RangePicker } = DatePicker;

type FilterFormValues = {
  action?: string | null;
  moduleCode?: string;
  screenCode?: string;
  dateRange?: [Dayjs, Dayjs] | null;
};

const ACTION_OPTIONS = [
  { value: "CREATE", label: "CREATE" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
];

const LIMIT = 20;

export default function AuditLogsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [form] = Form.useForm<FilterFormValues>();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<
    Omit<AuditLogQueryParams, "page" | "limit">
  >({});
  const [detail, setDetail] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!isAdministrator()) {
      router.replace("/");
    }
  }, [router, pathname]);

  const auditLogsQuery = useAuditLogsQuery({ ...filters, page, limit: LIMIT });
  const data = auditLogsQuery.data?.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const hasFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );

  const applyFilters = (values: FilterFormValues) => {
    setFilters({
      action: values.action ?? undefined,
      moduleCode: values.moduleCode?.trim() || undefined,
      screenCode: values.screenCode?.trim() || undefined,
      dateFrom: values.dateRange?.[0]?.format("YYYY-MM-DD"),
      dateTo: values.dateRange?.[1]?.format("YYYY-MM-DD"),
    });
    setPage(1);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: "เวลา",
      dataIndex: "performedAt",
      key: "performedAt",
      width: 170,
      render: (value: string) => (
        <span className={masterStyles.updatedText}>
          {dayjs(value).format("DD/MM/YYYY HH:mm:ss")}
        </span>
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: 110,
      render: (value: string) => (
        <Tag className={styles.actionTag} data-action={value}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Module / Screen",
      key: "module",
      render: (_, record) => (
        <div className={styles.codeCell}>
          <span className={styles.moduleCode}>{record.moduleCode ?? "—"}</span>
          <span className={styles.screenCode}>{record.screenCode ?? "—"}</span>
        </div>
      ),
    },
    {
      title: "เอกสาร",
      key: "document",
      render: (_, record) => (
        <div className={styles.codeCell}>
          <span className={styles.moduleCode}>
            {record.documentType ?? record.documentNo ?? "—"}
          </span>
          {record.documentId ? (
            <span className={styles.screenCode}>{record.documentId}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "ผู้ทำรายการ",
      key: "performedBy",
      width: 200,
      render: (_, record) =>
        record.performedBy ? (
          <div className={styles.codeCell}>
            <span className={styles.moduleCode}>
              {record.performedBy.displayName}
            </span>
            <span className={styles.screenCode}>
              @{record.performedBy.username}
            </span>
          </div>
        ) : (
          <span className={masterStyles.updatedText}>ไม่ทราบผู้ใช้งาน</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Button
          className={masterStyles.editButton}
          icon={<EyeOutlined />}
          onClick={() => setDetail(record)}
        >
          ดูข้อมูล
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={auditLogsQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>
            <HistoryOutlined />
          </div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>SECURITY</div>
            <Typography.Title level={2} className={masterStyles.pageTitle}>
              Audit Log
            </Typography.Title>
            <Typography.Text className={masterStyles.pageSubtitle}>
              ประวัติการทำรายการสำคัญในระบบ — บันทึกอัตโนมัติทุกการสร้าง /
              แก้ไข / ลบข้อมูล
            </Typography.Text>
          </div>
          <div />
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>SEARCH</div>
              <h3>ค้นหา Audit Log</h3>
              <p>กรองด้วย action / module / screen / ช่วงวันที่</p>
            </div>
            {hasFilters ? (
              <Tag className={masterStyles.filterActiveTag} color="green">
                มีตัวกรอง
              </Tag>
            ) : null}
          </div>

          <Form
            form={form}
            layout="vertical"
            className={masterStyles.filterForm}
            onFinish={applyFilters}
            initialValues={{
              action: null,
              moduleCode: "",
              screenCode: "",
              dateRange: null,
            }}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} md={5}>
                <Form.Item name="action" label="Action">
                  <Select
                    allowClear
                    placeholder="ทั้งหมด"
                    options={ACTION_OPTIONS}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item name="moduleCode" label="Module">
                  <Input allowClear placeholder="เช่น USERS" />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item name="screenCode" label="Screen">
                  <Input allowClear placeholder="เช่น USERS" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="dateRange" label="ช่วงวันที่">
                  <RangePicker className={styles.rangePicker} />
                </Form.Item>
              </Col>
              <Col xs={24} md={3}>
                <Form.Item label=" ">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className={masterStyles.filterSearchButton}
                      icon={<SearchOutlined />}
                    />
                    <Button
                      icon={<ClearOutlined />}
                      onClick={() => {
                        form.resetFields();
                        setFilters({});
                        setPage(1);
                      }}
                    />
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>HISTORY</div>
              <h3>รายการ Audit Log</h3>
              <p>เรียงจากล่าสุดไปเก่าสุด</p>
            </div>
            <div className={masterStyles.tableCount}>{total} รายการ</div>
          </div>

          <Table
            rowKey="id"
            className={masterStyles.dataTable}
            columns={columns}
            dataSource={items}
            loading={auditLogsQuery.isFetching}
            pagination={{
              current: page,
              pageSize: LIMIT,
              total,
              onChange: setPage,
              showSizeChanger: false,
            }}
          />
        </div>

        <Modal
          open={Boolean(detail)}
          title="รายละเอียด Audit Log"
          onCancel={() => setDetail(null)}
          footer={null}
          width={640}
        >
          {detail ? (
            <pre className={styles.jsonPre}>
              {JSON.stringify(
                { oldValue: detail.oldValue, newValue: detail.newValue },
                null,
                2,
              )}
            </pre>
          ) : null}
        </Modal>
      </section>
    </MasterPageGate>
  );
}
