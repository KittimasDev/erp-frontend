"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import {
  useBillingCreateInfoQuery,
  useBillingNoteDetailQuery,
  useConfirmBillingNoteMutation,
  usePendingBillingApsQuery,
  useSaveBillingNoteMutation,
} from "@/hooks/billing-notes/useBillingNotes";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { BILLING_NOTE_STATUS_COLOR, BILLING_NOTE_STATUS_LABEL, type PendingBillingAp } from "@/types/billing-notes";

const SCREEN_CODE = "FINANCE_BILLING_NOTES";
const BASE_PATH = "/finance/payables/billing-notes";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Row = {
  apId: string;
  docNo: string;
  purchaseOrderId?: string;
  poNo?: string;
  dueDate?: string;
  /** ยอดพร้อมวางบิลของ AP (เพดานของช่องกรอก) */
  billable: number;
  defaultAmount: number;
};

const fromPending = (a: PendingBillingAp): Row => ({
  apId: a.apId,
  docNo: a.docNo,
  purchaseOrderId: a.purchaseOrderId,
  poNo: a.poNo,
  dueDate: a.dueDate,
  billable: a.billableAmount,
  defaultAmount: a.billableAmount,
});

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Modal เลือก AP อื่นของผู้ขายเดียวกันเพิ่มเข้าใบวางบิล */
function AddApModal({
  creditorId,
  excludeIds,
  onClose,
  onAdd,
}: {
  creditorId: string;
  excludeIds: string[];
  onClose: () => void;
  onAdd: (rows: Row[]) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<PendingBillingAp[]>([]);
  const query = usePendingBillingApsQuery({ creditorId, page, limit: 5, search: keyword });
  const items = (query.data?.items ?? []).filter((a) => !excludeIds.includes(a.apId));

  return (
    <Modal
      open
      title="เพิ่มใบตั้งหนี้ของผู้ขายนี้"
      width={900}
      onCancel={onClose}
      okText={`เพิ่ม (${selected.length})`}
      cancelText="ปิด"
      okButtonProps={{ disabled: selected.length === 0 }}
      onOk={() => onAdd(selected.map(fromPending))}
    >
      <Input.Search
        allowClear
        style={{ width: 320, marginBottom: 12 }}
        placeholder="ค้นเลขที่ AP / PO"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onSearch={(v) => {
          setKeyword(v);
          setPage(1);
        }}
      />
      <Table<PendingBillingAp>
        rowKey="apId"
        size="small"
        loading={query.isLoading}
        dataSource={items}
        rowSelection={{
          selectedRowKeys: selected.map((s) => s.apId),
          preserveSelectedRowKeys: true,
          onChange: (_k, rows) => setSelected(rows),
        }}
        pagination={{
          current: page,
          pageSize: 5,
          total: query.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "วันที่ AP", dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
          { title: "เลขที่ AP", dataIndex: "docNo" },
          { title: "เลขที่ PO", dataIndex: "poNo", render: (v?: string) => v ?? "—" },
          { title: "วันครบกำหนด", dataIndex: "dueDate", width: 120, render: (v?: string) => formatThaiDate(v) },
          {
            title: "ยอดพร้อมวางบิล",
            dataIndex: "billableAmount",
            align: "right",
            width: 140,
            render: (v: number) => money.format(v),
          },
        ]}
        locale={{ emptyText: "ไม่มี AP อื่นของผู้ขายนี้ที่พร้อมวางบิล" }}
      />
    </Modal>
  );
}

/** สร้าง (จาก ?apIds=a,b) / แก้ไขใบวางบิลร่าง — ยืนยันแล้วแก้ยอดไม่ได้ */
export default function BillingNoteFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const allowed = id ? perms.canEdit : perms.canAdd;

  const apIds = id ? [] : (searchParams.get("apIds") ?? searchParams.get("apId") ?? "").split(",").filter(Boolean);
  const infoQuery = useBillingCreateInfoQuery(apIds);
  const detailQuery = useBillingNoteDetailQuery(id);
  const info = infoQuery.data;
  const detail = detailQuery.data;
  const creditor = detail ?? info;

  const saveMutation = useSaveBillingNoteMutation(id);
  const confirmMutation = useConfirmBillingNoteMutation();
  const busy = saveMutation.isPending || confirmMutation.isPending;

  // แถวตั้งต้นจากเซิร์ฟเวอร์ + ที่เพิ่มเอง − ที่ลบออก · ยอดวางบิลเริ่มต้นเต็มยอดพร้อมวางบิล (ร่างเดิมใช้ยอดที่บันทึกไว้)
  const baseRows = useMemo<Row[]>(
    () =>
      detail
        ? detail.items.map((i) => ({
            apId: i.apId,
            docNo: i.docNo,
            purchaseOrderId: i.purchaseOrderId,
            poNo: i.poNo,
            dueDate: i.dueDate,
            billable: i.billableAmount,
            defaultAmount: i.amount,
          }))
        : (info?.items ?? []).map(fromPending),
    [detail, info],
  );
  const [added, setAdded] = useState<Row[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number | null>>({});
  const rows = useMemo(() => {
    const ids = new Set(baseRows.map((r) => r.apId));
    return [...baseRows, ...added.filter((r) => !ids.has(r.apId))].filter((r) => !removed.includes(r.apId));
  }, [baseRows, added, removed]);
  const amountOf = (r: Row) => amounts[r.apId] ?? r.defaultAmount;

  const [billingDateInput, setBillingDateInput] = useState<Dayjs | null | undefined>(undefined);
  const [appointmentInput, setAppointmentInput] = useState<Dayjs | null | undefined>(undefined);
  const [remarkInput, setRemarkInput] = useState<string | undefined>(undefined);
  const billingDate = billingDateInput === undefined ? dayjs(detail?.billingDate) : billingDateInput;
  const appointment =
    appointmentInput === undefined ? (detail?.appointmentDate ? dayjs(detail.appointmentDate) : null) : appointmentInput;
  const remark = remarkInput ?? detail?.remark ?? "";
  const [addOpen, setAddOpen] = useState(false);

  const total = round2(rows.reduce((s, r) => s + (amountOf(r) || 0), 0));
  const issued = detail?.issuedPvAmount ?? 0;
  const invalid = (r: Row) => !(amountOf(r) > 0) || amountOf(r) > r.billable + 0.004;

  const buildBody = () => ({
    creditorId: (creditor?.creditorId ?? "") as string,
    billingDate: billingDate?.format("YYYY-MM-DD"),
    appointmentDate: appointment?.format("YYYY-MM-DD"),
    remark: remark.trim() || undefined,
    items: rows.map((r) => ({ apDocumentId: r.apId, amount: amountOf(r) })),
  });

  const submit = async (confirmAfter: boolean) => {
    if (rows.length === 0) return message.error("ต้องมีใบตั้งหนี้อย่างน้อย 1 ใบ");
    const bad = rows.find(invalid);
    if (bad) return message.error(`ยอดวางบิลของ ${bad.docNo} ต้องมากกว่า 0 และไม่เกินยอดพร้อมวางบิล`);
    let savedId = id;
    try {
      savedId = (await saveMutation.mutateAsync(buildBody())).id;
      if (!confirmAfter) {
        message.success("บันทึกร่างใบวางบิลแล้ว");
        // สร้างใหม่ → ไปหน้าแก้ร่างเพื่อแนบไฟล์ได้ต่อ
        if (!id) router.replace(`${BASE_PATH}/${savedId}/edit`);
        return;
      }
      await confirmMutation.mutateAsync(savedId);
      message.success("ยืนยันใบวางบิลแล้ว");
      router.push(`${BASE_PATH}/${savedId}`);
    } catch (e) {
      message.error(errText(e, "บันทึกใบวางบิลไม่สำเร็จ"));
      // บันทึกร่างได้แต่ยืนยันไม่ผ่าน → พาไปหน้าแก้ร่างที่เพิ่งสร้าง
      if (!id && savedId) router.replace(`${BASE_PATH}/${savedId}/edit`);
    }
  };

  const columns: ColumnsType<Row> = [
    {
      title: "เลขที่ AP",
      dataIndex: "docNo",
      width: 170,
      render: (v: string, r) => <Link href={`/finance/payables/ap-invoices/${r.apId}`}>{v}</Link>,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      width: 140,
      render: (v: string | undefined, r) =>
        v && r.purchaseOrderId ? <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> : "—",
    },
    { title: "วันครบกำหนด", dataIndex: "dueDate", width: 120, render: (v?: string) => formatThaiDate(v) },
    {
      title: "ยอดคงเหลือ (พร้อมวางบิล)",
      dataIndex: "billable",
      align: "right",
      width: 190,
      render: (v: number) => money.format(v),
    },
    {
      title: "ยอดที่ต้องการวางบิล",
      key: "amount",
      align: "right",
      width: 200,
      render: (_v, r) => (
        <Space>
          <InputNumber
            min={0}
            max={r.billable}
            precision={2}
            style={{ width: 130 }}
            status={invalid(r) ? "error" : undefined}
            value={amountOf(r)}
            disabled={!allowed}
            onChange={(v) => setAmounts((prev) => ({ ...prev, [r.apId]: v }))}
          />
          <Button
            size="small"
            disabled={!allowed}
            onClick={() => setAmounts((prev) => ({ ...prev, [r.apId]: r.billable }))}
          >
            เต็มยอด
          </Button>
        </Space>
      ),
    },
    {
      title: "",
      key: "remove",
      width: 60,
      render: (_v, r) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={!allowed}
          aria-label={`เอา ${r.docNo} ออก`}
          onClick={() => setRemoved((prev) => [...prev, r.apId])}
        />
      ),
    },
  ];

  const loadError = infoQuery.error ?? detailQuery.error;
  if (loadError) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert type="error" showIcon message={errText(loadError, "โหลดข้อมูลไม่สำเร็จ")} />
        <Button onClick={() => router.push(BASE_PATH)}>กลับไปหน้ารายการ</Button>
      </Space>
    );
  }
  if (!id && apIds.length === 0) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert type="info" showIcon message="เลือก AP ที่ต้องการวางบิลจากหน้ารายการรอวางบิลก่อน" />
        <Button onClick={() => router.push(BASE_PATH)}>ไปหน้ารายการรอวางบิล</Button>
      </Space>
    );
  }
  if (!creditor) return <Card loading />;
  if (detail && detail.status !== "DRAFT") {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert type="warning" showIcon message="ใบวางบิลนี้ยืนยันหรือยกเลิกแล้ว แก้ไขยอดไม่ได้" />
        <Button onClick={() => router.push(`${BASE_PATH}/${detail.id}`)}>ดูรายละเอียด</Button>
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(BASE_PATH)}>
          กลับ
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {id ? `แก้ไขใบวางบิล ${detail?.billingNo ?? ""}` : "สร้างใบวางบิล"}
        </Typography.Title>
      </Space>
      {!allowed ? <Alert type="warning" showIcon message="คุณไม่มีสิทธิ์บันทึกใบวางบิล" /> : null}

      <Card title="ข้อมูลเอกสาร">
        <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
          <Descriptions.Item label="เลขที่ใบวางบิล">{detail?.billingNo ?? "สร้างอัตโนมัติเมื่อบันทึก"}</Descriptions.Item>
          <Descriptions.Item label="วันที่">
            <DatePicker
              allowClear={false}
              format="DD/MM/YYYY"
              value={billingDate}
              disabled={!allowed}
              onChange={(v) => setBillingDateInput(v)}
            />
          </Descriptions.Item>
          <Descriptions.Item label="สถานะ">
            <Tag color={BILLING_NOTE_STATUS_COLOR.DRAFT}>{BILLING_NOTE_STATUS_LABEL.DRAFT}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">
            {creditor.creditorCode} {creditor.creditorName}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="รายการใบตั้งหนี้ (AP)"
        extra={
          <Button icon={<PlusOutlined />} disabled={!allowed} onClick={() => setAddOpen(true)}>
            เพิ่มใบตั้งหนี้
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          ยอดคงเหลือคิดจากยอด AP หลังหักมัดจำและปรับหนี้แล้ว — วางบิลเต็มยอดหรือบางส่วนได้ แต่ต้องไม่เกินยอดคงเหลือ
        </Typography.Paragraph>
        <Table<Row>
          rowKey="apId"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "ยังไม่มีใบตั้งหนี้ — กด “เพิ่มใบตั้งหนี้”" }}
        />
      </Card>

      <Card title="สรุปยอด">
        <Descriptions column={{ xs: 1, md: 3 }} bordered size="small">
          <Descriptions.Item label="ยอดวางบิลรวม">{money.format(total)}</Descriptions.Item>
          <Descriptions.Item label="ยอดออก PV แล้ว">{money.format(issued)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ออก PV เพิ่มได้">{money.format(Math.max(total - issued, 0))}</Descriptions.Item>
        </Descriptions>
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
          ออกใบสำคัญจ่ายได้หลังยืนยันใบวางบิล (จากหน้ารายละเอียด)
        </Typography.Text>
      </Card>

      <Card title="ข้อมูลเพิ่มเติม">
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Space>
            <Typography.Text>วันที่นัดชำระ</Typography.Text>
            <DatePicker
              format="DD/MM/YYYY"
              value={appointment}
              disabled={!allowed}
              onChange={(v) => setAppointmentInput(v)}
            />
          </Space>
          <Input.TextArea
            rows={3}
            maxLength={5000}
            placeholder="หมายเหตุ"
            value={remark}
            disabled={!allowed}
            onChange={(e) => setRemarkInput(e.target.value)}
          />
          {id ? (
            <DocumentAttachmentsPanel documentType="BILLING_NOTE" documentId={id} canEdit={allowed} emptyText="ยังไม่มีเอกสารแนบ" />
          ) : (
            <Typography.Text type="secondary">แนบเอกสารได้หลังกด “บันทึกร่าง” ครั้งแรก</Typography.Text>
          )}
        </Space>
      </Card>

      <Card title="ผู้ดำเนินการ">
        <Descriptions column={{ xs: 1, md: 3 }} size="small">
          <Descriptions.Item label="ผู้สร้าง">{detail?.createdByName ?? "ผู้ใช้ปัจจุบัน (เมื่อบันทึก)"}</Descriptions.Item>
          <Descriptions.Item label="ผู้ยืนยัน">—</Descriptions.Item>
          <Descriptions.Item label="วันที่ดำเนินการ">
            {detail ? dayjs(detail.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Space>
        <Button disabled={!allowed || busy} loading={saveMutation.isPending && !confirmMutation.isPending} onClick={() => void submit(false)}>
          บันทึกร่าง
        </Button>
        <Popconfirm
          title="ยืนยันใบวางบิล?"
          description="ยืนยันแล้วระบบจะจองยอดของ AP และแก้ไขยอดโดยตรงไม่ได้"
          okText="ยืนยัน"
          cancelText="ยกเลิก"
          disabled={!allowed || busy}
          onConfirm={() => void submit(true)}
        >
          <Button type="primary" disabled={!allowed || busy} loading={confirmMutation.isPending}>
            ยืนยันใบวางบิล
          </Button>
        </Popconfirm>
      </Space>

      {addOpen && creditor ? (
        <AddApModal
          creditorId={creditor.creditorId}
          excludeIds={rows.map((r) => r.apId)}
          onClose={() => setAddOpen(false)}
          onAdd={(list) => {
            setAdded((prev) => [...prev, ...list]);
            setRemoved((prev) => prev.filter((x) => !list.some((r) => r.apId === x)));
            setAddOpen(false);
          }}
        />
      ) : null}
    </Space>
  );
}
