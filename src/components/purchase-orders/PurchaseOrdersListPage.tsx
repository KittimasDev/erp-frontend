"use client";

import { tStatus } from "@/types/purchase-orders";
import { useT } from "@/lib/i18n/useT";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useSubmitPurchaseOrderMutation } from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrdersQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { usePurchaseOrdersPendingFromPrQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import {
  getScreenActionPermissions,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { rememberPurchaseOrderListHref } from "@/lib/navigation/purchase-order-list-return";
import type { PurchaseOrder } from "@/types/purchase-orders";
import {
  listPurchaseRequests,
  purchaseOrderStatusLabel,
} from "@/types/purchase-orders";
import type {
  PurchaseRequest,
  PurchaseRequestItem,
} from "@/types/purchase-requests";
import {
  clearPurchaseOrderPrLineSelection,
  savePurchaseOrderPrLineSelection,
} from "@/types/purchase-order-pr-line-selection";
import PendingPrItemsPanel, {
  itemLabelOf,
  openItemsOf,
} from "./PendingPrItemsPanel";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import styles from "./PurchaseOrdersListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

/** จำนวนรายการที่ยังไม่ถูกสั่งซื้อในใบขอซื้อใบนั้น */
function countOpenItems(pr: PurchaseRequest) {
  return openItemsOf(pr).length;
}

/** บรรทัดใบขอซื้อที่ติ๊กไว้ — เก็บ snapshot เพราะตารางนี้มี pagination ของตัวเอง */
type SelectedPrLine = {
  prItemId: string;
  prId: string;
  prNo: string;
  itemLabel: string;
};

type CheckState = { checked: boolean; indeterminate: boolean };

/** สถานะติ๊กของกลุ่มบรรทัด — ครบ / บางส่วน / ไม่เลือก */
function lineCheckState(
  prItemIds: string[],
  selected: Record<string, SelectedPrLine>,
): CheckState {
  if (!prItemIds.length) {
    return { checked: false, indeterminate: false };
  }
  const picked = prItemIds.filter((id) => selected[id]).length;
  return {
    checked: picked === prItemIds.length,
    indeterminate: picked > 0 && picked < prItemIds.length,
  };
}

/** ร่าง กับ ที่ถูกส่งกลับแก้ไข ทำอย่างเดียวกันได้ทั้งคู่ — ให้ตรงกับ guard ฝั่ง backend */
const PO_EDITABLE_STATUSES: string[] = ["DRAFT", "REVISING"];

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
    case "CLOSED_PARTIAL":
      return "success";
    case "PENDING_APPROVAL":
      return "gold";
    // ส่งกลับแก้ไข = มีงานค้างต้องทำ ใช้สีส้มให้ต่างจากร่าง (processing)
    case "REVISING":
      return "orange";
    case "DRAFT":
    case "PARTIALLY_RECEIVED":
      return "processing";
    case "REJECTED":
    case "RECEIVE_CANCELLED":
      return "error";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}

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

export default function PurchaseOrdersListPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
    หน้า/ตัวกรอง/จำนวนต่อหน้าเก็บใน URL (?page=2&poNo=…) ไม่ใช่ state ในหน้า
    เพื่อให้กดเข้าไปดูรายละเอียดแล้วย้อนกลับ (ปุ่มเบราว์เซอร์หรือปุ่ม "กลับ") ได้หน้าเดิมและตัวกรองเดิม
    ไม่ reset ไปหน้า 1 — ใช้ replace เพื่อไม่ให้ทุกครั้งที่เปลี่ยนหน้าไปเพิ่มประวัติให้ต้องกดย้อนหลายที
  */
  const positiveInt = (key: string, fallback: number) => {
    const n = Number(searchParams.get(key));
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };
  const csvParam = (key: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean);

  const page = positiveInt("page", 1);
  const limitParam = positiveInt("limit", 10);
  const limit = [10, 25, 50].includes(limitParam) ? limitParam : 10;
  const pendingPage = positiveInt("prPage", 1);
  const prItemsParam = searchParams.get("prItems") ?? "";
  const pendingItemIds = useMemo(
    () => prItemsParam.split(",").filter(Boolean),
    [prItemsParam],
  );

  /** แก้เฉพาะคีย์ที่ส่งมา (undefined = ลบคีย์) ที่เหลือคงเดิม */
  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const setPage = (value: number) =>
    updateParams({ page: value > 1 ? String(value) : undefined });
  const setPendingPage = (value: number) =>
    updateParams({ prPage: value > 1 ? String(value) : undefined });
  const setPendingItemIds = (value: string[]) =>
    updateParams({
      prItems: value.length ? value.join(",") : undefined,
      prPage: undefined,
    });

  // ค่าในช่องกรอก (draft) เริ่มจาก URL — ใช้จริงเมื่อกด "ค้นหา" (applied อ่านจาก URL)
  const [poNo, setPoNo] = useState(() => searchParams.get("poNo") ?? "");
  const [status, setStatus] = useState<string | undefined>(
    () => searchParams.get("status") || undefined,
  );
  const [poDate, setPoDate] = useState<dayjs.Dayjs | null>(() => {
    const raw = searchParams.get("date");
    const parsed = raw ? dayjs(raw) : null;
    return parsed?.isValid() ? parsed : null;
  });
  const [itemIds, setItemIds] = useState<string[]>(() => csvParam("items"));
  const poNoParam = searchParams.get("poNo") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const dateParam = searchParams.get("date") ?? "";
  const itemsParam = searchParams.get("items") ?? "";
  const applied = useMemo(() => {
    const items = itemsParam.split(",").filter(Boolean);
    return {
      poNo: poNoParam || undefined,
      status: statusParam || undefined,
      poDateFrom: dateParam || undefined,
      poDateTo: dateParam || undefined,
      itemIds: items.length ? items : undefined,
    };
  }, [poNoParam, statusParam, dateParam, itemsParam]);

  // จำ URL ปัจจุบันไว้ให้ปุ่ม "กลับ" ในหน้ารายละเอียด/แก้ไขใช้
  const searchString = searchParams.toString();
  useEffect(() => {
    rememberPurchaseOrderListHref(
      searchString ? `${pathname}?${searchString}` : pathname,
    );
  }, [pathname, searchString]);
  const pendingLimit = 10;
  /*
    ติ๊กเป็นราย "บรรทัด" ไม่ใช่ราย "ใบ" — ใบขอซื้อใบเดียวแตกเป็นใบสั่งซื้อได้หลายใบ
    ตามเจ้าของสินค้า คีย์คือ purchaseRequestItemId และเก็บ snapshot ของชื่อ/เลขใบไว้ด้วย
    เพราะตารางนี้มี pagination ของตัวเอง เปลี่ยนหน้าแล้วแถวต้นทางหลุดจาก dataSource
    ส่วนรายการใบที่เลือกเป็นค่า derived ล้วน จึงไม่มีทาง desync กับบรรทัด
  */
  const [selectedLineById, setSelectedLineById] = useState<
    Record<string, SelectedPrLine>
  >({});
  /*
    การกางแถวคำนวณสด ไม่เก็บเป็น state ตัวเดียว — ใบที่สั่งไปบางส่วนกางให้เอง
    (ผู้ใช้ต้องเห็นว่าเหลืออะไร) เว้นแต่ผู้ใช้หุบเอง ซึ่งจำไว้ใน userCollapsed
    ทำแบบนี้เพื่อไม่ต้องมี effect คอยเขียน state ทับตอนข้อมูลมาใหม่
  */
  const [userExpandedPrIds, setUserExpandedPrIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [userCollapsedPrIds, setUserCollapsedPrIds] = useState<Set<string>>(
    () => new Set(),
  );

  const poActions = getScreenActionPermissions("PURCHASE_ORDERS");
  const legacyWrite =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const matrixMode = isMatrixPermissionMode();
  const canCreatePo = matrixMode ? poActions.canAdd : legacyWrite;
  const canEditPo = matrixMode ? poActions.canEdit : legacyWrite;

  const submitMutation = useSubmitPurchaseOrderMutation();

  const itemsQuery = useItemsQuery({ isActive: true, isPurchaseItem: true });
  const catalogItems = itemsQuery.data?.data ?? [];
  const itemOptions = catalogItems.map((item) => ({
    value: item.id,
    label: `${item.itemCode} — ${item.itemNameTh}`,
  }));

  const query = usePurchaseOrdersQuery({ ...applied, page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const pendingQuery = usePurchaseOrdersPendingFromPrQuery({
    page: pendingPage,
    limit: pendingLimit,
    itemIds: pendingItemIds.length ? pendingItemIds : undefined,
  });
  /* identity ต้องนิ่ง — ถูกใช้เป็น dep ของ memo/callback หลายตัวด้านล่าง */
  const pendingPrs = useMemo(
    () => pendingQuery.data?.data.items ?? [],
    [pendingQuery.data],
  );
  const pendingTotal = pendingQuery.data?.data.total ?? 0;

  /*
    บรรทัดที่ติ๊กไว้แล้วถูกคนอื่นสั่งไปก่อน ต้องหลุดจากที่เลือกเอง ไม่งั้นกดสร้าง
    แล้วเจอ 400 จาก backend โดยไม่รู้สาเหตุ — คำนวณสดแทนการเขียน state ทับใน effect
    (รู้ได้เฉพาะใบที่อยู่ในหน้าปัจจุบัน ใบหน้าอื่นพึ่งด่านฝั่ง backend)
  */
  const orderedItemIds = useMemo(
    () =>
      new Set(
        pendingPrs.flatMap((row) =>
          (row.items ?? [])
            .filter((item) => item.orderedPurchaseOrder)
            .map((item) => item.id),
        ),
      ),
    [pendingPrs],
  );

  const selectedLines = useMemo(
    () =>
      Object.values(selectedLineById).filter(
        (line) => !orderedItemIds.has(line.prItemId),
      ),
    [selectedLineById, orderedItemIds],
  );

  /** จัดกลุ่มกลับเป็นใบ — ใช้ทั้งนับใบและสร้าง ?ids= */
  const selectedLinesByPrId = useMemo(() => {
    const map = new Map<string, SelectedPrLine[]>();
    for (const line of selectedLines) {
      const bucket = map.get(line.prId);
      if (bucket) {
        bucket.push(line);
      } else {
        map.set(line.prId, [line]);
      }
    }
    return map;
  }, [selectedLines]);

  const selectedPrIds = useMemo(
    () => [...selectedLinesByPrId.keys()],
    [selectedLinesByPrId],
  );

  /** บรรทัดที่ยังสั่งได้ทั้งหมดของหน้าปัจจุบัน — ใช้กับ checkbox หัวตาราง */
  const pageOpenItemIds = useMemo(
    () => pendingPrs.flatMap((row) => openItemsOf(row).map((item) => item.id)),
    [pendingPrs],
  );

  const toggleLine = useCallback(
    (pr: PurchaseRequest, item: PurchaseRequestItem, next: boolean) => {
      setSelectedLineById((prev) => {
        const draft = { ...prev };
        if (next) {
          draft[item.id] = {
            prItemId: item.id,
            prId: pr.id,
            prNo: pr.prNo,
            itemLabel: itemLabelOf(item),
          };
        } else {
          delete draft[item.id];
        }
        return draft;
      });
    },
    [],
  );

  const setPrLines = useCallback((pr: PurchaseRequest, next: boolean) => {
    setSelectedLineById((prev) => {
      const draft = { ...prev };
      for (const item of openItemsOf(pr)) {
        if (next) {
          draft[item.id] = {
            prItemId: item.id,
            prId: pr.id,
            prNo: pr.prNo,
            itemLabel: itemLabelOf(item),
          };
        } else {
          delete draft[item.id];
        }
      }
      return draft;
    });
  }, []);

  const setPageLines = useCallback(
    (next: boolean) => {
      for (const row of pendingPrs) {
        setPrLines(row, next);
      }
    },
    [pendingPrs, setPrLines],
  );

  const expandedPrIds = useMemo(() => {
    const keys = new Set(userExpandedPrIds);
    for (const row of pendingPrs) {
      const partlyOrdered = countOpenItems(row) < (row.items?.length ?? 0);
      if (partlyOrdered && !userCollapsedPrIds.has(row.id)) {
        keys.add(row.id);
      }
    }
    return [...keys];
  }, [pendingPrs, userExpandedPrIds, userCollapsedPrIds]);

  const handleExpandedRowsChange = (keys: readonly React.Key[]) => {
    const next = new Set(keys.map(String));
    setUserExpandedPrIds(next);
    /* จำเฉพาะใบที่ "เคยกางอยู่แล้วถูกหุบ" ไม่ใช่ทุกใบที่ไม่ได้กาง */
    setUserCollapsedPrIds((prev) => {
      const draft = new Set(prev);
      for (const id of expandedPrIds) {
        if (!next.has(id)) {
          draft.add(id);
        }
      }
      for (const id of next) {
        draft.delete(id);
      }
      return draft;
    });
  };

  /** มีใบที่ติ๊กไม่ครบทุกบรรทัดไหม — ใช้เตือนว่าของที่เหลือไม่ได้หายไปไหน */
  const hasPartialPr = useMemo(
    () =>
      selectedPrIds.some((prId) => {
        const row = pendingPrs.find((item) => item.id === prId);
        return row
          ? (selectedLinesByPrId.get(prId)?.length ?? 0) < countOpenItems(row)
          : false;
      }),
    [selectedPrIds, selectedLinesByPrId, pendingPrs],
  );

  const handleCreateFromSelected = () => {
    if (!selectedLines.length) {
      return;
    }

    const allLinesSelected = selectedPrIds.every((prId) => {
      const row = pendingPrs.find((item) => item.id === prId);
      return row
        ? (selectedLinesByPrId.get(prId)?.length ?? 0) === countOpenItems(row)
        : false;
    });

    /* ใบเดียวและเลือกครบ = งานประจำวัน ให้เดินเส้นทางเดิมเป๊ะ URL ไม่เปลี่ยน */
    if (selectedPrIds.length === 1 && allLinesSelected) {
      clearPurchaseOrderPrLineSelection();
      router.push(`/purchase-orders/create-from-pr/${selectedPrIds[0]}`);
      return;
    }

    savePurchaseOrderPrLineSelection({
      purchaseRequestIds: selectedPrIds,
      purchaseRequestItemIds: selectedLines.map((line) => line.prItemId),
    });
    router.push(
      `/purchase-orders/create-from-prs?ids=${selectedPrIds.join(",")}`,
    );
  };

  /**
   * เปิดฟอร์มสำหรับใบนี้ใบเดียว — ปุ่มในแถวหมายถึง "ใบนี้เท่านั้น" เสมอ
   * ไม่ลากใบอื่นที่ติ๊กค้างไว้เข้ามา แต่ถ้าในใบนี้ติ๊กบางบรรทัดไว้ก็เคารพการติ๊กนั้น
   */
  const goCreateForPr = useCallback(
    (row: PurchaseRequest) => {
      const picked = selectedLinesByPrId.get(row.id) ?? [];
      if (!picked.length || picked.length === countOpenItems(row)) {
        clearPurchaseOrderPrLineSelection();
        router.push(`/purchase-orders/create-from-pr/${row.id}`);
        return;
      }

      savePurchaseOrderPrLineSelection({
        purchaseRequestIds: [row.id],
        purchaseRequestItemIds: picked.map((line) => line.prItemId),
      });
      router.push(`/purchase-orders/create-from-prs?ids=${row.id}`);
    },
    [selectedLinesByPrId, router],
  );

  const pendingColumns: ColumnsType<PurchaseRequest> = useMemo(
    () => [
      /* ไม่มีสิทธิ์สร้างใบสั่งซื้อก็ไม่ต้องมีช่องติ๊ก (แต่ยังกางดูสินค้าได้) */
      ...(canCreatePo
        ? [
            {
              key: "select",
              width: 48,
              align: "center" as const,
              title: (
                <Checkbox
                  {...lineCheckState(pageOpenItemIds, selectedLineById)}
                  disabled={!pageOpenItemIds.length}
                  onChange={(event) => setPageLines(event.target.checked)}
                  aria-label={t("เลือกทุกรายการในหน้านี้")}
                />
              ),
              render: (_v: unknown, row: PurchaseRequest) => {
                const openIds = openItemsOf(row).map((item) => item.id);
                return (
                  /* กันดับเบิลคลิกที่ช่องติ๊กไปเด้งเปิดหน้าสร้าง */
                  <span
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      {...lineCheckState(openIds, selectedLineById)}
                      disabled={!openIds.length}
                      onChange={(event) => setPrLines(row, event.target.checked)}
                      aria-label={t("เลือกทุกรายการของ {no}", { no: row.prNo })}
                    />
                  </span>
                );
              },
            },
          ]
        : []),
      {
        title: t("ลำดับ"),
        key: "no",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (pendingPage - 1) * pendingLimit + index + 1,
      },
      {
        title: t("เลขที่ใบขอซื้อ"),
        dataIndex: "prNo",
        key: "prNo",
        render: (value: string) => (
          <DocNoWithFlowBadge
            no={<span className={styles.prNo}>{value}</span>}
            source={{ kind: "pr", status: "APPROVED" }}
          />
        ),
      },
      {
        title: t("วันที่ขอซื้อ"),
        dataIndex: "prDate",
        key: "prDate",
        width: 120,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ประเภท"),
        key: "type",
        ellipsis: true,
        render: (_v, row) => row.purchaseRequestType?.nameTh ?? "—",
      },
      {
        title: t("ผู้ขอ"),
        key: "requestedBy",
        width: 140,
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: t("รายการ"),
        key: "itemCount",
        width: 120,
        align: "center",
        /*
          ใบขอซื้อใบเดียวแตกเป็นใบสั่งซื้อได้หลายใบตามเจ้าของสินค้า จึงต้องบอกว่า
          เหลือกี่รายการ ไม่ใช่แค่จำนวนรายการทั้งใบ
        */
        render: (_v, row) => {
          const total = row.items?.length ?? 0;
          const open = countOpenItems(row);
          const picked = selectedLinesByPrId.get(row.id)?.length ?? 0;
          return (
            <span className={styles.itemCountCell}>
              <span>
                {open === total
                  ? t("{n} รายการ", { n: total })
                  : t("เหลือ {open} / {total}", { open, total })}
              </span>
              {picked ? (
                <span className={styles.itemCountPicked}>
                  {t("เลือก {n}", { n: picked })}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 240,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: t("สถานะ"),
        key: "status",
        width: 140,
        render: (_v, row) =>
          countOpenItems(row) === (row.items?.length ?? 0) ? (
            <Tag color="success">{t("อนุมัติแล้ว")}</Tag>
          ) : (
            <Tag color="processing">{t("สั่งซื้อบางส่วนแล้ว")}</Tag>
          ),
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: canCreatePo ? 190 : 72,
        align: "center",
        fixed: "right",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={t("เมนูจัดการ {no}", { no: row.prNo })}
            primary={
              canCreatePo ? (
                <Button
                  type="primary"
                  size="small"
                  className={styles.createPoBtn}
                  icon={<ShoppingCartOutlined />}
                  onClick={() => goCreateForPr(row)}
                >
                  {t("สร้างใบสั่งซื้อ")}
                </Button>
              ) : null
            }
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: t("ดูใบขอซื้อ"),
                onClick: () => router.push(`/purchase-requests/${row.id}`),
              },
            ]}
          />
        ),
      },
    ],
    /*
      selectedLineById ต้องอยู่ใน deps — ไม่งั้นคอลัมน์ checkbox เป็นชุดเดิม
      แล้วติ๊กไปก็ไม่อัปเดตหน้าจอ
    */
    [
      canCreatePo,
      pendingPage,
      router,
      selectedLineById,
      selectedLinesByPrId,
      pageOpenItemIds,
      setPageLines,
      setPrLines,
      goCreateForPr,
      t,
    ],
  );

  const columns: ColumnsType<PurchaseOrder> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 72,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบสั่งซื้อ"),
        dataIndex: "poNo",
        key: "poNo",
        render: (value: string, row) => (
          <DocNoWithFlowBadge
            no={<span className={styles.prNo}>{value}</span>}
            source={{
              kind: "po",
              status: row.status,
              paymentStatus: row.paymentStatus,
            }}
          />
        ),
      },
      {
        title: t("วันที่"),
        dataIndex: "poDate",
        key: "poDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ผู้ขาย"),
        key: "creditor",
        ellipsis: true,
        render: (_v, row) => row.creditor?.nameTh ?? "—",
      },
      {
        title: t("อ้างอิง PR"),
        key: "pr",
        width: 150,
        render: (_v, row) => {
          const prNos = listPurchaseRequests(row).map((pr) => pr.prNo);
          return prNos.length ? prNos.join(", ") : "—";
        },
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 240,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: t("ยอดรวม"),
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: string, row) => (
          <Tag color={statusColor(value)}>{tStatus(purchaseOrderStatusLabel(row))}</Tag>
        ),
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 100,
        align: "center",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={t("เมนูจัดการ {no}", { no: row.poNo })}
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: t("ดูรายละเอียด"),
                onClick: () => router.push(`/purchase-orders/${row.id}`),
              },
              canEditPo &&
                PO_EDITABLE_STATUSES.includes(row.status) && {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: t("แก้ไข"),
                  onClick: () => router.push(`/purchase-orders/${row.id}/edit`),
                },
              canEditPo &&
                PO_EDITABLE_STATUSES.includes(row.status) && {
                  key: "submit",
                  icon: <SendOutlined />,
                  label: t("ส่งอนุมัติ"),
                  onClick: () => submitMutation.mutate(row.id),
                  confirm: {
                    title: t("ส่งใบสั่งซื้อ {no} ให้หัวหน้าอนุมัติ?", {
                      no: row.poNo,
                    }),
                    content:
                      t("ส่งแล้วจะแก้ไขไม่ได้จนกว่าหัวหน้าจะส่งกลับให้แก้ไข"),
                    okText: t("ส่งอนุมัติ"),
                  },
                },
            ]}
          />
        ),
      },
    ],
    [canEditPo, limit, page, router, submitMutation, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Purchase Order"
        icon={<FileTextOutlined />}
        title={t("รายการใบสั่งซื้อ")}
        subtitle={t("หลังอนุมัติใบขอซื้อ รายการจะขึ้นด้านบนเพื่อสร้างใบสั่งซื้อ")}
        actions={
          <>
<Link href="/purchase-requests">
            <Button className={styles.secondaryBtn}>{t("ไปที่ใบขอซื้อ")}</Button>
          </Link>
          </>
        }
      />

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <ShoppingCartOutlined className={styles.pendingIcon} />
            {t("ใบขอซื้อรอสร้างใบสั่งซื้อ")} <strong>{pendingTotal}</strong>{" "}
            {t("รายการ")}
          </div>
          <Select
            allowClear
            showSearch
            mode="multiple"
            maxTagCount="responsive"
            optionFilterProp="label"
            className={styles.toolbarItemSelect}
            placeholder={t("เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก")}
            aria-label={t("สินค้าในคิวใบขอซื้อ")}
            value={pendingItemIds}
            onChange={(value) => setPendingItemIds(value)}
            options={itemOptions}
          />
          {selectedLines.length ? (
            <div className={styles.selectionActions}>
              <span className={styles.selectionCount}>
                {t("เลือกไว้ {n} รายการ · จาก {m} ใบ", {
                  n: selectedLines.length,
                  m: selectedPrIds.length,
                })}
              </span>
              {hasPartialPr ? (
                <span className={styles.selectionHint}>
                  {t("(บางใบเลือกไม่ครบ — ที่เหลือยังอยู่ในคิว)")}
                </span>
              ) : null}
              <Button size="small" onClick={() => setSelectedLineById({})}>
                {t("ล้างที่เลือก")}
              </Button>
              <Tooltip title={t("สร้างใบสั่งซื้อจากรายการที่ติ๊กไว้")}>
                <Button
                  type="primary"
                  size="small"
                  icon={<ShoppingCartOutlined />}
                  disabled={!selectedLines.length}
                  onClick={handleCreateFromSelected}
                >
                  {t("สร้างใบสั่งซื้อจากที่เลือก ({n} รายการ)", {
                    n: selectedLines.length,
                  })}
                </Button>
              </Tooltip>
            </div>
          ) : null}
        </div>

        <Table
          rowKey="id"
          columns={pendingColumns}
          dataSource={pendingPrs}
          loading={pendingQuery.isLoading}
          pagination={false}
          className={`${styles.table} ${styles.pendingTable}`}
          scroll={{ x: 1180 }}
          expandable={{
            /* คนที่ดูอย่างเดียวก็ควรกางดูสินค้าได้ จึงไม่ผูกกับสิทธิ์ */
            expandedRowKeys: expandedPrIds,
            onExpandedRowsChange: handleExpandedRowsChange,
            rowExpandable: (row) => Boolean(row.items?.length),
            expandedRowRender: (row) => (
              <PendingPrItemsPanel
                pr={row}
                selectable={canCreatePo}
                selectedItemIds={selectedLineById}
                onToggleItem={toggleLine}
              />
            ),
          }}
          locale={{
            emptyText: t("ยังไม่มีใบขอซื้อที่อนุมัติแล้วรอสร้างใบสั่งซื้อ"),
          }}
          onRow={(row) =>
            canCreatePo
              ? {
                  onDoubleClick: () => goCreateForPr(row),
                  style: { cursor: "pointer" },
                  title: t("ดับเบิลคลิกเพื่อสร้างใบสั่งซื้อจากใบนี้"),
                }
              : {}
          }
        />

        {pendingTotal > pendingLimit ? (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              {t("แสดง {from}–{to} จาก {total}", {
                from:
                  pendingTotal === 0 ? 0 : (pendingPage - 1) * pendingLimit + 1,
                to: Math.min(pendingPage * pendingLimit, pendingTotal),
                total: pendingTotal,
              })}
            </div>
            <Pagination
              size="small"
              current={pendingPage}
              total={pendingTotal}
              pageSize={pendingLimit}
              showSizeChanger={false}
              onChange={setPendingPage}
            />
          </div>
        ) : null}
      </section>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่ใบสั่งซื้อ")}</label>
            <Input
              allowClear
              placeholder={t("เช่น PO-20260718-001")}
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่")}</label>
            <DatePicker
              style={{ width: "100%" }}
              value={poDate}
              onChange={setPoDate}
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สินค้า")}</label>
            <Select
              allowClear
              showSearch
              mode="multiple"
              maxTagCount="responsive"
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder={t("เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก")}
              aria-label={t("สินค้าในใบสั่งซื้อ")}
              value={itemIds}
              onChange={(value) => setItemIds(value)}
              options={itemOptions}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              options={[
                { value: "DRAFT", label: t("แบบร่างเอกสาร") },
                { value: "REVISING", label: tStatus("แก้ไข") },
                { value: "PENDING_APPROVAL", label: t("รออนุมัติ") },
                { value: "CONFIRMED", label: t("อนุมัติแล้ว · รอส่งสินค้า") },
                { value: "PARTIALLY_RECEIVED", label: t("รับของบางส่วน") },
                { value: "COMPLETED", label: t("รับครบแล้ว") },
                { value: "CLOSED_PARTIAL", label: t("ปิดรับบางส่วน") },
                { value: "RECEIVE_CANCELLED", label: t("ยกเลิกการรับ") },
                { value: "REJECTED", label: t("ไม่อนุมัติ") },
                { value: "CANCELLED", label: tStatus("ยกเลิก") },
              ]}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setPoNo("");
              setStatus(undefined);
              setPoDate(null);
              setItemIds([]);
              updateParams({
                poNo: undefined,
                status: undefined,
                date: undefined,
                items: undefined,
                page: undefined,
              });
            }}
          >
            {t("เคลียร์")}
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() => {
              updateParams({
                poNo: poNo.trim() || undefined,
                status,
                date: poDate ? poDate.format("YYYY-MM-DD") : undefined,
                items: itemIds.length ? itemIds.join(",") : undefined,
                page: undefined,
              });
            }}
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("ใบสั่งซื้อทั้งหมด")} <strong>{total}</strong> {t("รายการ")}
          </div>
          <div className={styles.entriesBox}>
            <span>{t("แสดง")}</span>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) =>
                updateParams({
                  limit: value === 10 ? undefined : String(value),
                  page: undefined,
                })
              }
            />
            <span>{t("รายการ/หน้า")}</span>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          locale={{ emptyText: t("ยังไม่มีใบสั่งซื้อ") }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดง {from}–{to} จาก {total}", {
              from: total === 0 ? 0 : (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
