"use client";

import { Modal, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useTempCaseSummaryQuery } from "@/hooks/temp-cases/useTempCaseSummaryQuery";
import type { TempCaseCategorySummary } from "@/types/temp-cases";
import styles from "@/components/masters/shared/master-page.module.css";

type CaseDashboardModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CaseDashboardModal({
  open,
  onClose,
}: CaseDashboardModalProps) {
  const summaryQuery = useTempCaseSummaryQuery(open);
  const summary = summaryQuery.data?.data;

  const columns: ColumnsType<TempCaseCategorySummary> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "หมวด",
      dataIndex: "categoryNameTh",
      key: "categoryNameTh",
    },
    {
      title: "ทั้งหมด",
      dataIndex: "total",
      key: "total",
      align: "center",
      width: 90,
    },
    {
      title: "ยังไม่ทำ",
      dataIndex: "open",
      key: "open",
      align: "center",
      width: 90,
      render: (value: number) => <Tag color="orange">{value}</Tag>,
    },
    {
      title: "ทำแล้ว",
      dataIndex: "done",
      key: "done",
      align: "center",
      width: 90,
      render: (value: number) => <Tag color="green">{value}</Tag>,
    },
  ];

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={720}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>Σ</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>CASE DASHBOARD</div>
          <h2>สรุปเคสทั้งหมด</h2>
          <p>ภาพรวมสถานะและจำนวนเคสแยกตามหมวด</p>
        </div>
      </div>

      <div className={styles.summaryRow} style={{ marginBottom: 20 }}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>ทั้งหมด</span>
            <strong>{summary?.total ?? 0}</strong>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>○</div>
          <div>
            <span className={styles.summaryLabel}>ยังไม่ทำ</span>
            <strong>{summary?.open ?? 0}</strong>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>ทำแล้ว</span>
            <strong>{summary?.done ?? 0}</strong>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>#</div>
          <div>
            <span className={styles.summaryLabel}>มีรูปแนบ</span>
            <strong>{summary?.withImages ?? 0}</strong>
          </div>
        </div>
      </div>

      <Typography.Title level={5} style={{ marginTop: 0 }}>
        แยกตามหมวด
      </Typography.Title>

      <Table<TempCaseCategorySummary>
        rowKey="categoryId"
        columns={columns}
        dataSource={summary?.byCategory ?? []}
        loading={summaryQuery.isLoading || summaryQuery.isFetching}
        pagination={false}
        size="middle"
        locale={{ emptyText: "ยังไม่มีข้อมูลเคส" }}
      />
    </Modal>
  );
}
