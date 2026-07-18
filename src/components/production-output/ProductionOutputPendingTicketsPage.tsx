"use client";

import { useMemo, useState, type Key } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Table } from "antd";
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useProductionOutputPendingTicketsQuery } from "@/hooks/production-output/useProductionOutputQueries";
import { userHasRole, isAdministrator } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { ProductionOutputPendingTicket } from "@/types/production-output-pending-tickets";
import {
  clearProductionOutputTicketBatch,
  saveProductionOutputTicketBatch,
} from "@/types/production-output-pending-tickets";
import styles from "./ProductionOutputPendingTicketsPage.module.css";

type RangePreset = "yesterday" | "today" | "7d" | "custom";

function formatWeight(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function detectPreset(range: [Dayjs, Dayjs]): RangePreset {
  const [from, to] = range;
  const yesterday = dayjs().subtract(1, "day");
  if (from.isSame(yesterday, "day") && to.isSame(yesterday, "day")) {
    return "yesterday";
  }
  if (from.isSame(dayjs(), "day") && to.isSame(dayjs(), "day")) {
    return "today";
  }
  if (
    from.isSame(dayjs().subtract(7, "day"), "day") &&
    to.isSame(dayjs(), "day")
  ) {
    return "7d";
  }
  return "custom";
}

export default function ProductionOutputPendingTicketsPage() {
  const router = useRouter();
  const canRequest =
    userHasRole(RoleCode.WAREHOUSE_OFFICER) || isAdministrator();

  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [q, setQ] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const preset = detectPreset(range);

  const queryParams = useMemo(
    () => ({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
      q: q.trim() || undefined,
    }),
    [range, q],
  );

  const listQuery = useProductionOutputPendingTicketsQuery(queryParams);
  const rows = listQuery.data?.data ?? [];

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowKeys.includes(row.id)),
    [rows, selectedRowKeys],
  );

  const stats = useMemo(() => {
    const yesterday = dayjs().subtract(1, "day");
    let yesterdayCount = 0;
    let rejectedCount = 0;
    let totalWeight = 0;

    for (const row of rows) {
      if (dayjs(row.createdAt).isSame(yesterday, "day")) {
        yesterdayCount += 1;
      }
      if (row.productionOutputStatus === "REJECTED_ONLY") {
        rejectedCount += 1;
      }
      totalWeight += Number(row.netWeightKg || 0);
    }

    return {
      total: rows.length,
      yesterdayCount,
      rejectedCount,
      totalWeight,
    };
  }, [rows]);

  const openCreateSingle = (ticket: ProductionOutputPendingTicket) => {
    clearProductionOutputTicketBatch();
    router.push(
      `/receiving/production-output/stock-requests/create?ticketId=${encodeURIComponent(
        ticket.id,
      )}&ticketNo=${encodeURIComponent(ticket.ticketNo)}`,
    );
  };

  /** เปิดฟอร์มครั้งเดียว รวบทุกตั๋วในเอกสารอ้างอิง — จำนวนเป็นยอดรวม */
  const openCreateBatch = (tickets: ProductionOutputPendingTicket[]) => {
    if (tickets.length === 0) {
      return;
    }
    saveProductionOutputTicketBatch(
      tickets.map((ticket) => ({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
      })),
    );
    router.push(
      "/receiving/production-output/stock-requests/create?fromBatch=1",
    );
  };

  const applyPreset = (next: Exclude<RangePreset, "custom">) => {
    if (next === "yesterday") {
      const d = dayjs().subtract(1, "day");
      setRange([d, d]);
      return;
    }
    if (next === "today") {
      const d = dayjs();
      setRange([d, d]);
      return;
    }
    setRange([dayjs().subtract(7, "day"), dayjs()]);
  };

  const rangeLabel = `${range[0].format("DD/MM/YYYY")} – ${range[1].format(
    "DD/MM/YYYY",
  )}`;

  const presetLabel =
    preset === "yesterday"
      ? "เมื่อวาน"
      : preset === "today"
        ? "วันนี้"
        : preset === "7d"
          ? "7 วันล่าสุด"
          : rangeLabel;

  const columns: ColumnsType<ProductionOutputPendingTicket> = [
    {
      title: "เลขตั๋ว",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 160,
      render: (value: string, row) => (
        <button
          type="button"
          className={styles.ticketNoButton}
          onClick={() => router.push(`/receiving/${row.id}`)}
          title="เปิดตั๋วชั่ง"
        >
          <span className={styles.ticketNo}>{value}</span>
        </button>
      ),
    },
    {
      title: "วันที่เปิดตั๋ว",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value: string) => (
        <span className={styles.metaMuted}>{formatDateTime(value)}</span>
      ),
    },
    {
      title: "ผู้ขาย / รถ",
      key: "sellerTruck",
      render: (_, row) => (
        <div className={styles.sellerCell}>
          <span className={styles.sellerName}>{row.sellerName || "-"}</span>
          <span className={styles.metaMuted}>
            {row.truckLicensePlate || "-"}
            {row.driverName ? ` · ${row.driverName}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "น้ำหนักสุทธิ",
      dataIndex: "netWeightKg",
      key: "netWeightKg",
      align: "right",
      width: 140,
      render: (value: string) => (
        <span className={styles.weightCell}>{formatWeight(value)} กก.</span>
      ),
    },
    {
      title: "สถานะ",
      key: "productionOutputStatus",
      width: 170,
      render: (_, row) =>
        row.productionOutputStatus === "REJECTED_ONLY" ? (
          <span className={`${styles.statusPill} ${styles.statusRejected}`}>
            เคยถูกปฏิเสธ
          </span>
        ) : (
          <span className={`${styles.statusPill} ${styles.statusNone}`}>
            ยังไม่ส่งคำขอ
          </span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      align: "right",
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          className={styles.rowAction}
          disabled={!canRequest}
          onClick={() => {
            openCreateSingle(row);
          }}
        >
          ขอรับผลผลิต
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>รอรับผลผลิต</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ของเมื่อวานในรายการ</span>
            <strong>{stats.yesterdayCount}</strong>
          </div>
          <div
            className={`${styles.summaryCard} ${
              stats.rejectedCount > 0 ? styles.summaryCardWarn : ""
            }`}
          >
            <span>เคยถูกปฏิเสธ</span>
            <strong>{stats.rejectedCount}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>น้ำหนักสุทธิรวม</span>
            <strong className={styles.summaryWeight}>
              {formatWeight(String(stats.totalWeight))}
              <span className={styles.summaryUnit}>กก.</span>
            </strong>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>ตั๋วรอรับผลผลิตเข้าคลัง</h3>
              <p>
                กำลังดูช่วง <strong>{presetLabel}</strong>
                {q.trim() ? ` · ค้นหา “${q.trim()}”` : ""} · มี{" "}
                <strong>{stats.total} ใบ</strong> ที่ยังไม่ได้ขอรับผลผลิต —
                กด “เริ่มทำทั้งหมด” เพื่อเปิดฟอร์มครั้งเดียว รวบทุกตั๋วในเอกสารอ้างอิง
                (จำนวนที่กรอก = ยอดรวม)
              </p>
            </div>
            <div className={styles.listHeaderActions}>
              <Button
                icon={<ArrowLeftOutlined />}
                className={styles.backButton}
                onClick={() => router.push("/receiving")}
              >
                กลับรับซื้อยาง
              </Button>
              {canRequest ? (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  className={styles.primaryButton}
                  disabled={rows.length === 0}
                  onClick={() => openCreateBatch(rows)}
                >
                  เริ่มทำทั้งหมด {rows.length} ใบ
                </Button>
              ) : null}
            </div>
          </div>

          <div className={styles.filterBar}>
            <Input
              allowClear
              className={styles.filterSearch}
              prefix={<SearchOutlined />}
              placeholder="ค้นหาเลขตั๋ว ผู้ขาย ทะเบียน"
              defaultValue={q}
              onPressEnter={(e) =>
                setQ((e.target as HTMLInputElement).value.trim())
              }
              onBlur={(e) => setQ(e.target.value.trim())}
              onChange={(e) => {
                if (!e.target.value) {
                  setQ("");
                }
              }}
            />
            <DatePicker.RangePicker
              className={styles.filterRange}
              value={range}
              format="DD/MM/YYYY"
              allowClear={false}
              onChange={(values) => {
                if (values?.[0] && values[1]) {
                  setRange([values[0], values[1]]);
                }
              }}
            />
            <div className={styles.presetChips}>
              <button
                type="button"
                className={`${styles.presetChip} ${
                  preset === "yesterday" ? styles.presetChipActive : ""
                }`}
                onClick={() => applyPreset("yesterday")}
              >
                กรองเมื่อวาน
              </button>
              <button
                type="button"
                className={`${styles.presetChip} ${
                  preset === "today" ? styles.presetChipActive : ""
                }`}
                onClick={() => applyPreset("today")}
              >
                กรองวันนี้
              </button>
              <button
                type="button"
                className={`${styles.presetChip} ${
                  preset === "7d" ? styles.presetChipActive : ""
                }`}
                onClick={() => applyPreset("7d")}
              >
                กรอง 7 วัน
              </button>
            </div>
          </div>

          {canRequest ? (
            <div className={styles.queueBar}>
              <div className={styles.queueHint}>
                ปุ่มหลัก = เปิดฟอร์มครั้งเดียว รวบทุกตั๋วในเอกสารอ้างอิง ·
                ใส่น้ำมัน 70 ลิตร = ยอดรวมทั้งชุด ไม่ใช่ใบละ 70
              </div>
              <div className={styles.queueActions}>
                {selectedRows.length > 0 ? (
                  <Button
                    className={styles.secondaryButton}
                    onClick={() => openCreateBatch(selectedRows)}
                  >
                    รวบที่เลือก {selectedRows.length} ใบ
                  </Button>
                ) : (
                  <span className={styles.queueHint}>
                    (ถ้าต้องการรวบบางใบ ให้ติ๊กแถวก่อน แล้วปุ่มนี้จะโผล่)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.permissionNote}>
              ต้องมีสิทธิ์ WAREHOUSE_OFFICER เพื่อสร้างคำขอรับผลผลิต
            </div>
          )}

          <div className={styles.cardBody}>
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={rows}
              loading={listQuery.isFetching}
              rowSelection={
                canRequest
                  ? {
                      selectedRowKeys,
                      onChange: setSelectedRowKeys,
                    }
                  : undefined
              }
              pagination={{
                pageSize: 15,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                hideOnSinglePage: true,
              }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>ไม่มีตั๋วรอรับผลผลิต</strong>
                    <span>
                      ลองเปลี่ยนช่วงวันที่ หรือกลับไปตรวจตั๋วที่ชั่งออกแล้วที่หน้า
                      รับซื้อยาง
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
