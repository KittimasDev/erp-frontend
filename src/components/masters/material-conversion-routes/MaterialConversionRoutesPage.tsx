"use client";
import { useT } from "@/lib/i18n/useT";

import { useMemo, useState } from "react";
import { Button, Input, Popconfirm, Table, Tag, Tooltip } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useMaterialConversionRoutesQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import {
  useCreateRouteMutation,
  useDeleteRouteMutation,
  useUpdateRouteMutation,
} from "@/hooks/material-conversions/useMaterialConversionMutations";
import type { MaterialConversionRoute } from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import RouteFormModal from "./RouteFormModal";
import RouteStepsDrawer from "./RouteStepsDrawer";
import PageHeader from "@/components/common/PageHeader";

export default function MaterialConversionRoutesPage() {
  const t = useT();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSION_ROUTES");
  const canWrite = actions.canAdd || actions.canEdit;

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialConversionRoute | undefined>();
  const [drawerRouteId, setDrawerRouteId] = useState<string | undefined>();

  const applyFilters = () => setSearch(draftSearch);
  const clearFilters = () => {
    setDraftSearch("");
    setSearch("");
  };

  const listQuery = useMaterialConversionRoutesQuery(
    search.trim() ? { search: search.trim() } : undefined,
  );
  const routes = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const drawerRoute = useMemo(
    () => routes.find((route) => route.id === drawerRouteId),
    [routes, drawerRouteId],
  );

  const createRoute = useCreateRouteMutation();
  const updateRoute = useUpdateRouteMutation();
  const deleteRoute = useDeleteRouteMutation();

  const columns: ColumnsType<MaterialConversionRoute> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("เส้นทาง"),
      key: "route",
      render: (_v, row) => (
        <div>
          <div>{row.nameTh}</div>
          <span className={masterStyles.codeBadge}>{row.routeCode}</span>
        </div>
      ),
    },
    {
      title: t("คำนำหน้าเลขที่"),
      dataIndex: "runNoPrefix",
      key: "runNoPrefix",
      width: 140,
    },
    {
      title: t("ขั้นตอน"),
      key: "steps",
      width: 120,
      align: "center",
      render: (_v, row) => {
        const active = row.steps.filter((step) => step.isActive).length;
        return (
          <span>
            {active} / {row.steps.length}
          </span>
        );
      },
    },
    {
      title: t("รอบงานที่บันทึกแล้ว"),
      key: "runs",
      width: 150,
      align: "center",
      render: (_v, row) =>
        row.steps.reduce((acc, step) => acc + step.runCount, 0),
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 160,
      render: (_v, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Tag color={row.isActive ? "success" : "default"}>
            {row.isActive ? t("ใช้งาน") : t("ปิดใช้งาน")}
          </Tag>
          {row.isSystem ? <Tag color="blue">{t("เส้นทางของระบบ")}</Tag> : null}
        </div>
      ),
    },
    {
      title: t("จัดการ"),
      key: "actions",
      width: 240,
      render: (_v, row) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => setDrawerRouteId(row.id)}
          >
            {t("ดูขั้นตอน")}
          </Button>
          {actions.canEdit ? (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            >
              {t("แก้ไข")}
            </Button>
          ) : null}
          {actions.canDelete ? (
            row.isSystem ? (
              <Tooltip title={t("เส้นทางตั้งต้นของระบบ ลบไม่ได้ — ปิดใช้งานแทนได้")}>
                <Button size="small" danger disabled icon={<DeleteOutlined />} />
              </Tooltip>
            ) : (
              <Popconfirm
                title={t("ลบเส้นทางนี้?")}
                description={t("ขั้นตอนและแม่แบบทั้งหมดในเส้นทางจะถูกลบไปด้วย")}
                okText={t("ลบ")}
                cancelText={t("ยกเลิก")}
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteRoute.mutate(row.id)}
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
        <PageHeader
          eyebrow="MASTER DATA · CONVERSION ROUTES"
          title={t("เส้นทางแปรสภาพวัตถุดิบ")}
          subtitle={t("ตั้งสายงานและขั้นตอนได้เอง — วัตถุดิบชนิดใหม่ที่ไม่ใช่ยางเพิ่มได้ที่นี่ ไม่ต้องแก้โค้ด · รหัสขั้นตอนไม่ซ้ำทั้งระบบและแก้ไม่ได้หลังมีเอกสารอ้างอิง")}
          actions={
            <>
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
              {t("สร้างเส้นทาง")}
            </Button>
          ) : null}
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
          <FilterField label={t("ค้นหา")} wide>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหาด้วยรหัสหรือชื่อเส้นทาง")}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
          </FilterField>
        </FilterCard>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t("เส้นทางแปรสภาพวัตถุดิบ")}</h3>
            </div>
            <span className={masterStyles.tableCount}>
              {t("{n} เส้นทาง", { n: routes.length })}
            </span>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={routes}
            loading={listQuery.isFetching}
            pagination={false}
            locale={{ emptyText: t("ยังไม่มีเส้นทางแปรสภาพวัตถุดิบ") }}
          />
        </div>

        <RouteFormModal
          open={formOpen}
          route={editing}
          loading={createRoute.isPending || updateRoute.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={(values) => {
            if (editing) {
              updateRoute.mutate(
                {
                  id: editing.id,
                  body: {
                    nameTh: values.nameTh,
                    description: values.description,
                    runNoPrefix: values.runNoPrefix,
                    isActive: values.isActive,
                    sortOrder: values.sortOrder,
                  },
                },
                { onSuccess: () => setFormOpen(false) },
              );
              return;
            }
            createRoute.mutate(values, {
              onSuccess: () => setFormOpen(false),
            });
          }}
        />

        <RouteStepsDrawer
          open={Boolean(drawerRouteId)}
          route={drawerRoute}
          canWrite={canWrite}
          onClose={() => setDrawerRouteId(undefined)}
        />
      </section>
    </MasterPageGate>
  );
}
