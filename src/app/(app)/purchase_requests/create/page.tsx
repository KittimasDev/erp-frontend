"use client";

import {
  Breadcrumb,
  Button,
  Input,
  Select,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import styles from "../purchase-request.module.css";

type EmptyRow = {
  key: string;
};

const emptyData: EmptyRow[] = [];

const fileColumns: ColumnsType<EmptyRow> = [
  { title: "ลำดับ", dataIndex: "no", key: "no", width: 70, align: "center" },
  { title: "ประเภทไฟล์", dataIndex: "fileType", key: "fileType", align: "center" },
  { title: "ชื่อเอกสาร", dataIndex: "fileName", key: "fileName", align: "center" },
  { title: "วันที่นำเข้า", dataIndex: "uploadDate", key: "uploadDate", width: 140, align: "center" },
  { title: "ดำเนินการ", dataIndex: "action", key: "action", width: 110, align: "center" },
];

const approverColumns: ColumnsType<EmptyRow> = [
  { title: "ลำดับ", dataIndex: "no", key: "no", width: 70, align: "center" },
  { title: "แผนก", dataIndex: "department", key: "department", align: "center" },
  { title: "ชื่อ - นามสกุล", dataIndex: "name", key: "name", align: "center" },
  { title: "สถานะ", dataIndex: "status", key: "status", width: 130, align: "center" },
  { title: "จัดการ", dataIndex: "action", key: "action", width: 110, align: "center" },
];

const itemColumns: ColumnsType<EmptyRow> = [
  { title: "ลำดับ", dataIndex: "no", key: "no", width: 70, align: "center" },
  { title: "รหัสสินค้า", dataIndex: "itemCode", key: "itemCode", width: 130, align: "center" },
  { title: "รายการ", dataIndex: "itemName", key: "itemName", align: "center" },
  { title: "จำนวน", dataIndex: "qty", key: "qty", width: 100, align: "center" },
  { title: "หน่วย", dataIndex: "unit", key: "unit", width: 90, align: "center" },
  { title: "ราคาต่อหน่วย", dataIndex: "price", key: "price", width: 140, align: "center" },
  { title: "ยอดเงิน (บาท)", dataIndex: "amount", key: "amount", width: 140, align: "center" },
];

export default function CreatePurchaseRequestPage() {
  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <span>หน้าหลัก</span> },
          { title: <span className={styles.breadcrumbActive}>ใบขอซื้อ</span> },
        ]}
      />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>สร้างใบขอซื้อ</h1>
        <div className={styles.titleLine} />
      </div>

      <div className={styles.formGrid3}>
        <div className={styles.formItem}>
          <label>ผู้ขอซื้อ <span className={styles.required}>*</span></label>
          <Input placeholder="ผู้ขอซื้อ" className={styles.inputControl} />
        </div>

        <div className={styles.formItem}>
          <label>เลขที่ใบขอซื้อ <span className={styles.required}>*</span></label>
          <Input className={styles.inputControl} />
        </div>

        <div className={styles.formItem}>
          <label>วันที่ขอซื้อ <span className={styles.required}>*</span></label>
          <Input
            className={styles.inputControl}
            suffix={<CalendarOutlined className={styles.calendarIcon} />}
          />
        </div>
      </div>

      <div className={styles.formGrid3}>
        <div className={styles.formItem}>
          <label>ต้องการภายในวันที่ <span className={styles.required}>*</span></label>
          <Input
            className={styles.inputControl}
            suffix={<CalendarOutlined className={styles.calendarIcon} />}
          />
        </div>

        <div className={styles.formItem}>
          <label>ประเภทใบขอซื้อ</label>
          <Select
            className={styles.selectControl}
            placeholder="โปรดเลือก"
            options={[
              { label: "โปรดเลือก", value: "default" },
            ]}
          />
        </div>

        <div className={styles.formItem}>
          <label>ส่วนงานที่ขอซื้อ</label>
          <Select
            className={styles.selectControl}
            placeholder="โปรดเลือก"
            options={[
              { label: "โปรดเลือก", value: "default" },
            ]}
          />
        </div>
      </div>

      <div className={styles.inlineActionHeader}>
        <div className={styles.sectionLabel}>เอกสารแนบ</div>
        <Button className={styles.smallGoldBtn}>แนบไฟล์</Button>
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={fileColumns}
          dataSource={emptyData}
          pagination={false}
          locale={{ emptyText: "No data!" }}
          className={styles.customTable}
        />
      </div>

      <div className={styles.spacer20} />

      <div className={styles.tableWrap}>
        <Table
          columns={approverColumns}
          dataSource={emptyData}
          pagination={false}
          locale={{ emptyText: "No data!" }}
          className={styles.customTable}
        />
      </div>

      <div className={styles.inlineActionRight}>
        <Button className={styles.smallGoldBtn} icon={<PlusOutlined />}>
          เพิ่มผู้อนุมัติ
        </Button>
      </div>

      <div className={styles.tableWrapScrollable}>
        <Table
          columns={itemColumns}
          dataSource={emptyData}
          pagination={false}
          locale={{ emptyText: "No data!" }}
          className={`${styles.customTable} ${styles.itemTable}`}
          scroll={{ x: 980 }}
        />
      </div>

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>รวม</span>
        <div className={styles.totalBox}>0.00</div>
      </div>

      <div className={styles.inlineActionRight}>
        <Button className={styles.smallGoldBtn} icon={<PlusOutlined />}>
          เพิ่ม
        </Button>
      </div>

      <div className={styles.remarkBlock}>
        <label className={styles.sectionLabel}>หมายเหตุ</label>
        <Input.TextArea rows={3} className={styles.textAreaControl} />
      </div>

      <div className={styles.bottomLine} />

      <div className={styles.bottomActions}>
        <Button className={styles.cancelBtn}>ยกเลิก</Button>
        <Button className={styles.saveBtn}>บันทึก</Button>
      </div>
    </div>
  );
}