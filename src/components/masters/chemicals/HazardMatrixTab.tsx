"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Checkbox, Form, Input, Modal, Switch, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";

import {
  useCreateHazardClassMutation,
  useHazardClassesQuery,
  useIncompatibilitiesQuery,
  useSetIncompatibilitiesMutation,
  useUpdateHazardClassMutation,
} from "@/hooks/chemicals/useChemicals";
import type { HazardClass, IncompatiblePair } from "@/types/chemicals";

const pairKey = (a: string, b: string) => (a <= b ? `${a}|${b}` : `${b}|${a}`);

type Props = { canEdit: boolean };

function MatrixEditor({
  classes,
  initial,
  canEdit,
}: {
  classes: HazardClass[];
  initial: IncompatiblePair[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState(
    () => new Set(initial.map((p) => pairKey(p.hazardClassAId, p.hazardClassBId))),
  );
  const [dirty, setDirty] = useState(false);
  const save = useSetIncompatibilitiesMutation();

  const toggle = (a: string, b: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(pairKey(a, b));
      else next.delete(pairKey(a, b));
      return next;
    });
    setDirty(true);
  };

  const submit = () =>
    save.mutate(
      [...selected].map((k) => {
        const [a, b] = k.split("|");
        return { hazardClassAId: a, hazardClassBId: b };
      }),
      { onSuccess: () => setDirty(false) },
    );

  return (
    <div>
      <p style={{ color: "#8a94a6", marginTop: 0 }}>
        ติ๊กคู่ที่ <strong>ห้ามเก็บในตำแหน่งจัดเก็บเดียวกัน</strong> — ตอนรับของ/โอนย้ายที่ทำให้สองกลุ่มนี้อยู่ตำแหน่งเดียวกัน
        ระบบจะเตือนให้ผู้ใช้รับทราบก่อน
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ padding: 6 }} />
              {classes.map((c) => (
                <th key={c.id} style={{ padding: 6, fontWeight: 500, textAlign: "center" }}>
                  {c.nameTh}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((row, i) => (
              <tr key={row.id}>
                <th style={{ padding: 6, fontWeight: 500, textAlign: "left", whiteSpace: "nowrap" }}>{row.nameTh}</th>
                {classes.map((col, j) => (
                  <td key={col.id} style={{ padding: 6, textAlign: "center", background: j <= i ? "#fafafa" : undefined }}>
                    {j > i ? (
                      <Checkbox
                        disabled={!canEdit}
                        checked={selected.has(pairKey(row.id, col.id))}
                        onChange={(e) => toggle(row.id, col.id, e.target.checked)}
                        aria-label={`${row.nameTh} กับ ${col.nameTh} ห้ามเก็บรวม`}
                      />
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <Button type="primary" style={{ marginTop: 12 }} disabled={!dirty} loading={save.isPending} onClick={submit}>
          บันทึกตารางห้ามเก็บรวม
        </Button>
      ) : null}
    </div>
  );
}

/** แท็บ Hazard Class + ตารางห้ามเก็บรวม (Incompatible) */
export default function HazardMatrixTab({ canEdit }: Props) {
  const classesQuery = useHazardClassesQuery();
  const pairsQuery = useIncompatibilitiesQuery();
  const create = useCreateHazardClassMutation();
  const update = useUpdateHazardClassMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm<{ code: string; nameTh: string }>();

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const activeClasses = useMemo(() => classes.filter((c) => c.isActive), [classes]);

  const columns: ColumnsType<HazardClass> = [
    { title: "รหัส", dataIndex: "code", width: 180 },
    { title: "ชื่อ Hazard Class", dataIndex: "nameTh" },
    {
      title: "ใช้งาน",
      key: "active",
      width: 100,
      render: (_v, c) => (
        <Switch
          checked={c.isActive}
          disabled={!canEdit}
          loading={update.isPending && update.variables?.id === c.id}
          onChange={(checked) => update.mutate({ id: c.id, body: { isActive: checked } })}
        />
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Alert
        type="info"
        showIcon
        title="ชุดเริ่มต้น (ไวไฟ/ออกซิไดซ์/กรด/ด่าง/พิษ/ทำปฏิกิริยากับน้ำ) เป็นแนวทางทั่วไป — ตรวจและปรับตามข้อกำหนดความปลอดภัยของโรงงานก่อนใช้งานจริง"
      />
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Hazard Class
          </Typography.Title>
          {canEdit ? (
            <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
              เพิ่ม Hazard Class
            </Button>
          ) : null}
        </div>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={classes}
          loading={classesQuery.isFetching}
          pagination={false}
        />
      </section>
      <section>
        <Typography.Title level={5}>ห้ามเก็บรวม (Incompatible)</Typography.Title>
        {pairsQuery.data ? (
          <MatrixEditor
            key={`${activeClasses.map((c) => c.id).join(",")}-${pairsQuery.dataUpdatedAt}`}
            classes={activeClasses}
            initial={pairsQuery.data.data}
            canEdit={canEdit}
          />
        ) : null}
      </section>
      <Modal
        open={addOpen}
        title="เพิ่ม Hazard Class"
        okText="เพิ่ม"
        cancelText="ยกเลิก"
        confirmLoading={create.isPending}
        onCancel={() => setAddOpen(false)}
        destroyOnHidden
        onOk={() =>
          void form.validateFields().then((v) =>
            create.mutate(
              { code: v.code.trim().toUpperCase(), nameTh: v.nameTh.trim() },
              {
                onSuccess: () => {
                  setAddOpen(false);
                  form.resetFields();
                },
              },
            ),
          )
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="code"
            label="รหัส"
            rules={[
              { required: true, message: "ใส่รหัส" },
              { pattern: /^[A-Za-z0-9_]{1,50}$/, message: "ใช้ A-Z 0-9 _ เท่านั้น" },
            ]}
          >
            <Input placeholder="เช่น CORROSIVE" maxLength={50} />
          </Form.Item>
          <Form.Item name="nameTh" label="ชื่อ" rules={[{ required: true, whitespace: true, message: "ใส่ชื่อ" }]}>
            <Input maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
