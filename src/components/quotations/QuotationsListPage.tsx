"use client";



import { useMemo, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {

  Button,

  DatePicker,

  Input,

  Select,

  Space,

  Table,

  Tag,

  Typography,

} from "antd";

import type { ColumnsType } from "antd/es/table";

import {

  CheckOutlined,

  EditOutlined,

  EyeOutlined,

  FileTextOutlined,

  PlusOutlined,

  SearchOutlined,

} from "@ant-design/icons";

import dayjs from "dayjs";



import AccessDenied from "@/components/auth/AccessDenied";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";

import { useQuotationsQuery } from "@/hooks/quotations/useQuotationsQuery";

import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";

import { isMatrixPermissionMode } from "@/lib/auth/permissions-access";

import {

  QUOTATION_MATRIX_ACTION_LABELS,

  QUOTATION_MATRIX_ACTION_ORDER,

} from "@/lib/auth/quotation-matrix-labels";

import { isAdministrator, userHasRole } from "@/lib/auth/session";

import { RoleCode } from "@/lib/auth/role-codes";

import type { Quotation } from "@/types/quotations";

import {

  QUOTATION_FLOW_STEPS,

  QUOTATION_STATUS_FILTER_LABEL,

  resolveQuotationFlow,

} from "@/utils/quotation-flow";

import styles from "./QuotationsListPage.module.css";



function formatDate(value?: string) {

  if (!value) return "—";

  return dayjs(value).format("DD/MM/YYYY");

}



function formatMoney(value?: string) {

  const n = Number(value ?? 0);

  if (Number.isNaN(n)) return value ?? "—";

  return n.toLocaleString("th-TH", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  });

}



function QuotationProgressCell({ row }: { row: Quotation }) {

  const flow = resolveQuotationFlow(row);

  return (

    <div

      className={`${styles.progressCell} ${styles[`progress_${flow.tone}`]}`}

    >

      <div className={styles.progressMeta}>

        <span className={styles.progressCount}>

          {flow.tone === "stopped" && flow.step === 0

            ? "—"

            : `${flow.step}/${flow.total}`}

        </span>

        <span className={styles.progressLabel}>{flow.shortLabel}</span>

      </div>

      <div className={styles.progressTrack} aria-hidden>

        {QUOTATION_FLOW_STEPS.map((step, index) => {

          const stepNo = index + 1;

          const filled = stepNo <= flow.step;

          const current = stepNo === flow.step && flow.tone !== "stopped";

          return (

            <span

              key={step.key}

              className={[

                styles.progressSeg,

                filled ? styles.progressSegOn : "",

                current ? styles.progressSegCurrent : "",

              ]

                .filter(Boolean)

                .join(" ")}

              title={step.label}

            />

          );

        })}

      </div>

      {row.salesOrderNo ? (

        <span className={styles.progressSo}>SO: {row.salesOrderNo}</span>

      ) : null}

    </div>

  );

}



function QuotationStatusCell({ row }: { row: Quotation }) {

  const flow = resolveQuotationFlow(row);

  return (

    <Tag color={flow.tagColor} className={styles.statusTag}>

      {flow.shortLabel}

    </Tag>

  );

}



function QuotationPermissionStrip({

  canView,

  canAdd,

  canEdit,

  canApprove,

}: {

  canView: boolean;

  canAdd: boolean;

  canEdit: boolean;

  canApprove: boolean;

}) {

  const flags = {

    VIEW: canView,

    ADD: canAdd,

    EDIT: canEdit,

    APPROVE: canApprove,

  };



  return (

    <div className={styles.permissionStrip}>

      <span className={styles.permissionStripLabel}>สิทธิ์ตาม Matrix</span>

      <div className={styles.permissionChips}>

        {QUOTATION_MATRIX_ACTION_ORDER.map((key) => {

          const allowed = flags[key];

          return (

            <span

              key={key}

              className={[

                styles.permissionChip,

                allowed ? styles.permissionChipOn : styles.permissionChipOff,

              ].join(" ")}

            >

              {QUOTATION_MATRIX_ACTION_LABELS[key]}

            </span>

          );

        })}

      </div>

      <Typography.Text type="secondary" className={styles.permissionHint}>

        ปุ่มและการดำเนินการบนหน้านี้แสดงตามติ๊กที่หน้า Permission Matrix —

        &quot;{QUOTATION_MATRIX_ACTION_LABELS.APPROVE}&quot; ใช้กับใบสถานะ

        รอลูกค้าตอบรับ

      </Typography.Text>

    </div>

  );

}



export default function QuotationsListPage() {

  const router = useRouter();

  const [quotationNo, setQuotationNo] = useState("");

  const [customerId, setCustomerId] = useState<string | undefined>();

  const [status, setStatus] = useState<string | undefined>();

  const [date, setDate] = useState<dayjs.Dayjs | null>(null);

  const [applied, setApplied] = useState<{

    quotationNo?: string;

    customerId?: string;

    status?: string;

    dateFrom?: string;

    dateTo?: string;

  }>({});



  const quotationActions = useScreenActionPermissions("QUOTATIONS");

  const legacyWrite =

    userHasRole(RoleCode.SALES_OFFICER) ||

    userHasRole(RoleCode.SALES_MANAGER) ||

    isAdministrator();

  const matrixMode = isMatrixPermissionMode();

  const canView = matrixMode ? quotationActions.canView : true;

  const canCreate = matrixMode ? quotationActions.canAdd : legacyWrite;

  const canEdit = matrixMode ? quotationActions.canEdit : legacyWrite;

  const canApprove = matrixMode ? quotationActions.canApprove : legacyWrite;



  const customersQuery = useCustomersQuery();

  const customers = customersQuery.data?.data ?? [];

  const query = useQuotationsQuery(applied, { enabled: canView });

  const rows = query.data?.data ?? [];



  const pendingCustomerResponseCount = useMemo(

    () => rows.filter((row) => row.status === "SENT").length,

    [rows],

  );



  const applyFilters = () => {

    setApplied({

      quotationNo: quotationNo.trim() || undefined,

      customerId,

      status,

      dateFrom: date ? date.format("YYYY-MM-DD") : undefined,

      dateTo: date ? date.format("YYYY-MM-DD") : undefined,

    });

  };



  const clearFilters = () => {

    setQuotationNo("");

    setCustomerId(undefined);

    setStatus(undefined);

    setDate(null);

    setApplied({});

  };



  const columns: ColumnsType<Quotation> = useMemo(

    () => [

      {

        title: "#",

        width: 56,

        align: "center",

        render: (_v, _r, index) => index + 1,

      },

      {

        title: "เลขที่",

        dataIndex: "quotationNo",

        render: (value: string) => (

          <span className={styles.prNo}>{value}</span>

        ),

      },

      {

        title: "วันที่",

        dataIndex: "quotationDate",

        width: 110,

        render: (value: string) => formatDate(value),

      },

      {

        title: "ลูกค้า",

        key: "customer",

        render: (_v, row) =>

          row.customer

            ? `${row.customer.customerCode} — ${row.customer.nameTh}`

            : "—",

      },

      {

        title: "ยอดสุทธิ",

        dataIndex: "totalAmount",

        align: "right",

        width: 120,

        render: (value: string) => formatMoney(value),

      },

      {

        title: "สถานะ / ขั้นตอน",

        key: "progress",

        width: 200,

        render: (_v, row) => <QuotationProgressCell row={row} />,

      },

      {

        title: "สถานะปัจจุบัน",

        key: "status",

        width: 150,

        render: (_v, row) => (

          <Space orientation="vertical" size={4}>

            <QuotationStatusCell row={row} />

            {row.status === "SENT" && canApprove ? (

              <Tag color="orange" className={styles.actionNeededTag}>

                {QUOTATION_MATRIX_ACTION_LABELS.APPROVE}

              </Tag>

            ) : null}

          </Space>

        ),

      },

      {

        title: "",

        key: "actions",

        width: 130,

        render: (_v, row) => (

          <Space size={6} onClick={(e) => e.stopPropagation()}>

            <Button

              size="small"

              icon={<EyeOutlined />}

              onClick={() => router.push(`/quotations/${row.id}`)}

            />

            {canEdit && row.status === "DRAFT" ? (

              <Button

                size="small"

                icon={<EditOutlined />}

                onClick={() => router.push(`/quotations/${row.id}/edit`)}

              />

            ) : null}

            {canApprove && row.status === "SENT" ? (

              <Button

                size="small"

                type="primary"

                icon={<CheckOutlined />}

                onClick={() => router.push(`/quotations/${row.id}`)}

              >

                ตอบรับ

              </Button>

            ) : null}

          </Space>

        ),

      },

    ],

    [canApprove, canEdit, router],

  );



  if (matrixMode && !canView) {

    return <AccessDenied screenCodes={["QUOTATIONS"]} />;

  }



  return (

    <div className={styles.page}>

      <header className={styles.pageHeader}>

        <div className={styles.headerAccent} aria-hidden>

          <FileTextOutlined />

        </div>

        <div className={styles.headerContent}>

          <p className={styles.eyebrow}>Sales · Quotation</p>

          <h1 className={styles.pageTitle}>ใบเสนอราคา</h1>

          <p className={styles.pageSubtitle}>

            ติดตาม 4 ขั้นตอน: ร่าง → รอลูกค้าตอบรับ → ลูกค้าตอบรับแล้ว → เปิด SO —

            ยังไม่ตัดสต๊อก

          </p>

        </div>

        <div className={styles.headerActions}>

          {canCreate ? (

            <Link href="/quotations/create">

              <Button

                className={styles.primaryBtn}

                type="primary"

                icon={<PlusOutlined />}

              >

                สร้างใบเสนอราคา

              </Button>

            </Link>

          ) : null}

        </div>

      </header>



      {matrixMode ? (

        <QuotationPermissionStrip

          canView={canView}

          canAdd={canCreate}

          canEdit={canEdit}

          canApprove={canApprove}

        />

      ) : null}



      {canApprove && pendingCustomerResponseCount > 0 ? (

        <div className={styles.approveAlert}>

          <strong>

            มี {pendingCustomerResponseCount.toLocaleString("th-TH")} ใบ

            รอ{QUOTATION_MATRIX_ACTION_LABELS.APPROVE}

          </strong>

          <span>

            ใบที่สถานะ &quot;รอลูกค้าตอบรับ&quot; — กดปุ่ม &quot;ตอบรับ&quot;

            หรือเปิดรายละเอียดเพื่อบันทึกผลลูกค้า

          </span>

        </div>

      ) : null}



      <section className={styles.filterCard}>

        <div className={styles.filterGrid}>

          <div className={styles.filterItem}>

            <label>เลขที่</label>

            <Input

              allowClear

              placeholder="QT-..."

              value={quotationNo}

              onChange={(e) => setQuotationNo(e.target.value)}

              onPressEnter={applyFilters}

            />

          </div>

          <div className={styles.filterItem}>

            <label>ลูกค้า</label>

            <Select

              allowClear

              showSearch

              optionFilterProp="label"

              placeholder="ทั้งหมด"

              value={customerId}

              onChange={setCustomerId}

              style={{ width: "100%" }}

              loading={customersQuery.isLoading}

              options={customers.map((c) => ({

                value: c.id,

                label: `${c.customerCode} — ${c.nameTh}`,

              }))}

            />

          </div>

          <div className={styles.filterItem}>

            <label>สถานะ</label>

            <Select

              allowClear

              placeholder="ทั้งหมด"

              value={status}

              onChange={setStatus}

              style={{ width: "100%" }}

              options={Object.entries(QUOTATION_STATUS_FILTER_LABEL).map(

                ([value, label]) => ({ value, label }),

              )}

            />

          </div>

          <div className={styles.filterItem}>

            <label>วันที่</label>

            <DatePicker

              value={date}

              onChange={setDate}

              format="DD/MM/YYYY"

              style={{ width: "100%" }}

              placeholder="เลือกวันที่"

            />

          </div>

        </div>

        <div className={styles.filterActions}>

          <Button onClick={clearFilters}>เคลียร์</Button>

          <Button

            type="primary"

            className={styles.primaryBtn}

            icon={<SearchOutlined />}

            onClick={applyFilters}

          >

            ค้นหา

          </Button>

        </div>

      </section>



      <section className={styles.tableCard}>

        <div className={styles.tableToolbar}>

          <div className={styles.toolbarLeft}>

            พบทั้งหมด <strong>{rows.length}</strong> รายการ

          </div>

        </div>

        <Table

          rowKey="id"

          loading={query.isLoading}

          columns={columns}

          dataSource={rows}

          pagination={{ pageSize: 10, showSizeChanger: false }}

          className={styles.table}

          scroll={{ x: 1040 }}

          rowClassName={(row) =>

            row.status === "SENT" && canApprove ? styles.rowNeedsApprove : ""

          }

          onRow={(row) => ({

            onClick: () => router.push(`/quotations/${row.id}`),

          })}

          locale={{ emptyText: "ยังไม่มีใบเสนอราคา" }}

        />

      </section>

    </div>

  );

}


