"use client";

import Link from "next/link";
import {
  Breadcrumb,
  Button,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Pagination,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import styles from "./purchase-request.module.css";
import { generatePurchaseRequestPdf } from "@/utils/generatePurchaseRequestPdf";

type RequestRow = {
  key: string;
  no: number;
  prNo: string;
  date: string;
  status: string;
};

const data: RequestRow[] = [
  { key: "1", no: 1, prNo: "PR-670214-001", date: "14-02-2567", status: "APPROVED" },
  { key: "2", no: 2, prNo: "PR-670205-001", date: "01-02-2567", status: "APPROVED" },
  { key: "3", no: 3, prNo: "PR-670201-006", date: "01-02-2567", status: "APPROVED" },
  { key: "4", no: 4, prNo: "PR-670201-005", date: "01-02-2567", status: "APPROVED" },
  { key: "5", no: 5, prNo: "PR-670201-003", date: "01-02-2567", status: "APPROVED" },
  { key: "6", no: 6, prNo: "PR-670201-002", date: "01-02-2567", status: "APPROVED" },
  { key: "7", no: 7, prNo: "PR-670201-004", date: "01-02-2567", status: "APPROVED" },
  { key: "8", no: 8, prNo: "PR-670201-001", date: "01-02-2567", status: "APPROVED" },
  { key: "9", no: 9, prNo: "PR-670131-001", date: "31-01-2567", status: "APPROVED" },
  { key: "10", no: 10, prNo: "PR-661227-001", date: "27-12-2566", status: "APPROVED" },
];

const columns: ColumnsType<RequestRow> = [
  {
    title: "ลำดับ",
    dataIndex: "no",
    key: "no",
    width: 70,
    align: "center",
  },
  {
    title: "เลขที่ใบขอซื้อ",
    dataIndex: "prNo",
    key: "prNo",
    width: 190,
    align: "center",
  },
  {
    title: "วันที่ขอซื้อ",
    dataIndex: "date",
    key: "date",
    width: 160,
    align: "center",
  },
  {
    title: "สถานะเอกสาร",
    dataIndex: "status",
    key: "status",
    width: 170,
    align: "center",
    render: (value: string) => <span className={styles.statusText}>{value}</span>,
  },
  {
    title: "จัดการ",
    key: "action",
    width: 120,
    align: "center",
    render: () => (
      <Space size={8}>
        <button
          className={`${styles.iconBtn} ${styles.iconBtnView}`}
          type="button"
          onClick={() =>
            generatePurchaseRequestPdf({
              prNo: "PR-670214-001",
              requestBy: "ตาล",
              department: "ประเภทที่ 1 : ขอซื้อวัตถุดิบ",
              requestDate: "14-02-2567",
              requiredDate: "14-02-2567",
              purchaseType: "ขอซื้อวัตถุดิบ",
              items: [
                {
                  no: 1,
                  itemCode: "001-1",
                  itemName: "ยางตัน",
                  unit: "ลิตร",
                  qty: 100,
                },
              ],
            })
          }
        >
          <EyeOutlined />
        </button>
        <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} type="button">
          <EditOutlined />
        </button>
        <button className={`${styles.iconBtn} ${styles.iconBtnDelete}`} type="button">
          <DeleteOutlined />
        </button>
      </Space>
    ),
  },
];

export default function PurchaseRequestListPage() {
  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <span>หน้าหลัก</span> },
          {
            title: <span className={styles.breadcrumbActive}>หน้ารายการใบขอซื้อ</span>,
          },
        ]}
      />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>หน้ารายการใบขอซื้อ</h1>
        <div className={styles.titleLine} />
      </div>

      <div className={styles.filterSection}>
        <div className={styles.formGrid3}>
          <div className={styles.formItem}>
            <label>เลขที่ใบขอซื้อ</label>
            <Input placeholder="กรุณากรอกเลขที่ใบขอซื้อ" className={styles.inputControl} />
          </div>

          <div className={styles.formItem}>
            <label>วันที่ขอซื้อ</label>
            <Input className={styles.inputControl} />
          </div>

          <div className={styles.formItem}>
            <label>สถานะเอกสาร</label>
            <Select
              className={styles.selectControl}
              options={[{ label: "", value: "" }]}
              placeholder=""
            />
          </div>
        </div>

        <div className={styles.searchButtonRow}>
          <Button className={`${styles.actionBtn} ${styles.searchBtn}`}>ค้นหา</Button>
          <Button className={`${styles.actionBtn} ${styles.clearBtn}`}>เคลียร์</Button>
        </div>

        <div className={styles.topActionBar}>
          <div />
          <Link href="/purchase_requests/create">
            <Button
              className={styles.addBtn}
              icon={<PlusOutlined />}
            >
              เพิ่มรายการ
            </Button>
          </Link>
        </div>
      </div>

      <div className={styles.tableToolbar}>
        <div className={styles.entriesBox}>
          <span>Show</span>
          <Select
            size="small"
            value={10}
            className={styles.entriesSelect}
            options={[
              { label: "10", value: 10 },
              { label: "25", value: 25 },
              { label: "50", value: 50 },
            ]}
          />
          <span>entries</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          rowClassName={() => styles.tableRow}
          className={styles.customTable}
        />
      </div>

      <div className={styles.tableFooter}>
        <div className={styles.footerText}>Showing 1 to 10 of 41 entries</div>

        <Pagination
          size="small"
          defaultCurrent={1}
          total={41}
          pageSize={10}
          showSizeChanger={false}
          className={styles.pagination}
        />
      </div>
    </div>
  );
}