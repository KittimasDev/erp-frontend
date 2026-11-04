"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  Button,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
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
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCreateProductionFormulaMutation,
  useDeleteProductionFormulaMutation,
  useUpdateProductionFormulaMutation,
} from "@/hooks/production-formulas/useProductionFormulaMutations";
import { useProductionFormulasQuery } from "@/hooks/production-formulas/useProductionFormulaQueries";
import type { ProductionFormula } from "@/types/production-formula";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./production-formulas.module.css";
import FormulaFormModal from "./FormulaFormModal";

type FilterValues = {
  search?: string;
  isActive?: boolean;
};

function fmtQty(value: string | number) {
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

/** ชิปรายการสินค้าในกลุ่มหนึ่ง — ยาวเกินสามตัวยุบเป็น +N */
function LineChips({
  formula,
  role,
}: {
  formula: ProductionFormula;
  role: string;
}) {
  const lines = formula.lines.filter((line) => line.lineRole === role);
  if (lines.length === 0) {
    return <span className={styles.muted}>-</span>;
  }
  const shown = lines.slice(0, 3);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {shown.map((line) => (
        <Tag key={line.id}>
          {line.itemNameTh ?? line.itemCode} {fmtQty(line.quantity)}{" "}
          {line.unitCode ?? ""}
        </Tag>
      ))}
      {lines.length > shown.length ? (
        <Tooltip
          title={lines
            .slice(3)
            .map((line) => `${line.itemNameTh ?? line.itemCode} ${fmtQty(line.quantity)}`)
            .join(", ")}
        >
          <Tag>+{lines.length - shown.length}</Tag>
        </Tooltip>
      ) : null}
    </div>
  );
}

export default function ProductionFormulasPage() {
  const actions = useScreenActionPermissions("PRODUCTION_FORMULAS");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  /*
    ตัวกรองแยกเป็นสองชุดตามแบบหน้ามาสเตอร์อื่น — ช่องที่ผู้ใช้พิมพ์อยู่ (`Form`)
    กับชุดที่ยิง query จริง (`filters`) · ยิงตอนกดค้นหา ไม่ใช่ทุกคีย์สโตรก
  */
  const [filterForm] = Form.useForm<FilterValues>();
  const [filters, setFilters] = useState<FilterValues>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [formOpen, setFormOpen] = useState(
    () => searchParams.get("create") === "1" && actions.canAdd,
  );
  const [editing, setEditing] = useState<ProductionFormula | undefined>();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(undefined);
    if (searchParams.get("create") !== "1") {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  };

  const hasFilters = Boolean(
    filters.search?.trim() || filters.isActive !== undefined,
  );
  const listQuery = useProductionFormulasQuery(
    hasFilters
      ? {
          search: filters.search?.trim() || undefined,
          isActive: filters.isActive,
        }
      : undefined,
  );
  const formulas = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    return [...rows].sort(
      (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
    );
  }, [listQuery.data]);

  const createFormula = useCreateProductionFormulaMutation();
  const updateFormula = useUpdateProductionFormulaMutation();
  const deleteFormula = useDeleteProductionFormulaMutation();

  const columns: ColumnsType<ProductionFormula> = [
    {
      /* ลำดับต่อเนื่องข้ามหน้า — แบบเดียวกับหน้ามาสเตอร์อื่นทุกใบในระบบ */
      title: "ลำดับ",
      key: "rowNo",
      width: 80,
      align: "center",
      render: (_value, _record, index) => (
        <span className={masterStyles.orderBadge}>
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "สูตร",
      key: "formula",
      render: (_v, row) => (
        <div>
          <div>{row.nameTh}</div>
          <div>
            <span className={masterStyles.codeBadge}>{row.formulaCode}</span>
            {row.versionNo > 1 ? (
              <Tooltip title="เลขรุ่นบวกขึ้นทุกครั้งที่แก้บรรทัดในสูตร — ใบสั่งผลิตเก็บเลขรุ่นที่ใช้ไว้">
                <Tag style={{ marginLeft: 6 }}>รุ่น {row.versionNo}</Tag>
              </Tooltip>
            ) : null}
          </div>
          <div className={styles.muted}>
            สร้าง {dayjs(row.createdAt).format("DD/MM/YYYY HH:mm")}
          </div>
        </div>
      ),
    },
    {
      title: "ขนาด 1 รอบ",
      dataIndex: "batchLabel",
      key: "batchLabel",
      width: 170,
      render: (value?: string) =>
        value ?? <span className={styles.muted}>ไม่ระบุ</span>,
    },
    {
      title: "วัตถุดิบที่ต้องใช้",
      key: "inputs",
      render: (_v, row) => <LineChips formula={row} role="INPUT" />,
    },
    {
      title: "ผลผลิตที่ได้",
      key: "outputs",
      render: (_v, row) => <LineChips formula={row} role="OUTPUT" />,
    },
    {
      title: "ของเสีย",
      key: "wastes",
      render: (_v, row) => <LineChips formula={row} role="WASTE" />,
    },
    {
      /*
        สมดุลมวลบอกว่าสูตรปิดหรือไม่ — สูตรที่ไม่ปิดยังใช้ได้ แต่ Yield ของทุกใบ
        ที่ใช้สูตรนี้จะดูเพี้ยน จึงต้องเห็นตั้งแต่หน้ารายการ
      */
      title: "สมดุลมวล",
      key: "balance",
      width: 160,
      render: (_v, row) => {
        if (!row.massBalance.comparable) {
          return (
            <Tooltip title="สูตรนี้ใช้หลายหน่วยนับ ระบบจึงตรวจสมดุลมวลให้ไม่ได้ — ตัวเลขประมาณการยังถูกต้องเพราะคูณแยกทีละบรรทัด">
              <Tag>เทียบไม่ได้</Tag>
            </Tooltip>
          );
        }
        if (row.massBalance.diff === 0) {
          return <Tag color="success">ปิดพอดี</Tag>;
        }
        const word = row.massBalance.diff > 0 ? "ขาด" : "เกิน";
        return (
          <Tooltip title="ใส่ของเสีย (เช่น ก๊าซ) ให้ครบจะทำให้ Yield อ่านง่ายขึ้น">
            <Tag color="warning">
              {word} {fmtQty(Math.abs(row.massBalance.diff))}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "ใช้ในใบสั่งผลิต",
      dataIndex: "usedByOrderCount",
      key: "usedByOrderCount",
      width: 130,
      align: "center",
    },
    {
      title: "สถานะ",
      key: "status",
      width: 120,
      render: (_v, row) => (
        <Tag color={row.isActive ? "success" : "default"}>
          {row.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
        </Tag>
      ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 160,
      render: (_v, row) => (
        <div style={{ display: "flex", gap: 6 }}>
          {actions.canEdit ? (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            >
              แก้ไข
            </Button>
          ) : null}
          {actions.canDelete ? (
            row.usedByOrderCount > 0 ? (
              <Tooltip title="สูตรนี้ถูกใช้ในใบสั่งผลิตแล้ว ลบไม่ได้ — ปิดใช้งานแทนเพื่อไม่ให้โผล่ในหน้าสร้างใบใหม่">
                <Button size="small" danger disabled icon={<DeleteOutlined />} />
              </Tooltip>
            ) : (
              <Popconfirm
                title="ลบสูตรนี้?"
                description="บรรทัดทั้งหมดในสูตรจะถูกลบไปด้วย"
                okText="ลบ"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteFormula.mutate(row.id)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>สูตร</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              MASTER DATA · PRODUCTION FORMULAS
            </div>
            <h2 className={masterStyles.pageTitle}>สูตรการผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              ตั้งไว้ว่า 1 รอบใช้อะไรเท่าไหร่ แล้วได้อะไรออกมาเท่าไหร่ —
              หน้าสร้างใบสั่งผลิตจะคิดประมาณการให้ตามจำนวนที่ต้องการ
              ตั้งจากผลผลิตหรือจากวัตถุดิบก็ได้
            </span>
          </div>
          {actions.canAdd ? (
            <Button
              type="primary"
              className={masterStyles.createButton}
              icon={<PlusOutlined className={masterStyles.plusIcon} />}
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              สร้างสูตร
            </Button>
          ) : null}
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหาและกรอง</div>
              <h3>ตัวกรองรายการสูตร</h3>
              <p>กรองด้วยรหัส ชื่อสูตร และสถานะการใช้งาน</p>
            </div>
            {hasFilters ? (
              <Tag className={masterStyles.filterActiveTag} color="success">
                กำลังกรอง
              </Tag>
            ) : null}
          </div>

          <Form
            form={filterForm}
            layout="vertical"
            className={masterStyles.filterForm}
            onFinish={(values) => {
              setFilters(values);
              setPage(1);
            }}
          >
            <Row gutter={[16, 4]}>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="search" label="รหัสหรือชื่อสูตร">
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="เช่น PYRO หรือ ยางรถบรรทุก"
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

              <Col xs={24}>
                <Form.Item label=" " colon={false}>
                  <Space wrap>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      className={masterStyles.filterSearchButton}
                    >
                      ค้นหา
                    </Button>
                    <Button
                      icon={<ClearOutlined />}
                      disabled={!hasFilters}
                      onClick={() => {
                        filterForm.resetFields();
                        setFilters({});
                        setPage(1);
                      }}
                    >
                      ล้างค่า
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>FORMULA MANAGEMENT</div>
              <h3>รายการสูตรการผลิต</h3>
              <p>
                {hasFilters
                  ? "ผลลัพธ์ตามเงื่อนไขการค้นหา เรียงจากวันที่สร้างล่าสุด"
                  : "เรียงจากสูตรที่สร้างล่าสุด"}
              </p>
            </div>
            <div className={masterStyles.tableCount}>{formulas.length} สูตร</div>
          </div>

          {listQuery.isError ? (
            <div className={masterStyles.errorBox}>
              <Typography.Text type="danger">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "โหลดรายการสูตรการผลิตไม่สำเร็จ"}
              </Typography.Text>
            </div>
          ) : (
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={formulas}
            loading={listQuery.isLoading || listQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} สูตร`,
              onChange: setPage,
            }}
            /*
              ตารางนี้กว้างกว่าหน้ามาสเตอร์อื่นเพราะมีชิปรายการสินค้าสามกลุ่ม —
              ให้เลื่อนแนวนอนแทนที่จะบีบคอลัมน์จนอ่านไม่ออก
            */
            scroll={{ x: 1180 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบสูตรตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีสูตรการผลิต — สร้างสูตรแรกแล้วหน้าสร้างใบสั่งผลิตจะคิดประมาณการให้เอง",
            }}
            />
          )}
        </div>

        {/* destroyOnHidden + Body ที่ตั้งค่าตอน mount — ตามแบบของรีโปนี้ */}
        <FormulaFormModal
          open={formOpen}
          formula={editing}
          loading={createFormula.isPending || updateFormula.isPending}
          onCancel={closeForm}
          onSubmit={(values) => {
            if (editing) {
              updateFormula.mutate(
                { id: editing.id, body: values },
                { onSuccess: closeForm },
              );
              return;
            }
            createFormula.mutate(
              {
                formulaCode: values.formulaCode as string,
                nameTh: values.nameTh as string,
                description: values.description,
                batchLabel: values.batchLabel,
                isActive: values.isActive,
                sortOrder: values.sortOrder,
                remark: values.remark,
                recordingConfig: values.recordingConfig,
                lines: values.lines ?? [],
              },
              { onSuccess: closeForm },
            );
          }}
        />
      </section>
    </MasterPageGate>
  );
}
