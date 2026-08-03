"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Spin, Typography } from "antd";
import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";

import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useSellerQuery } from "@/hooks/sellers/useSellerQuery";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import type { InventoryLotBalanceRow } from "@/types/inventory";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";
import type { WarehouseReceiptSlipData } from "@/utils/generateRawTireWarehouseReceiptPdf";

import styles from "./RawTireWarehouseReceiptSlipPage.module.css";

type Props = { receiptId: string };

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "0.00");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "-");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("th-TH");
}

function resolveLotNo(params: {
  receiptNo: string;
  sortOrder: number;
  itemId?: string;
  lots: InventoryLotBalanceRow[];
}) {
  const { receiptNo, sortOrder, itemId, lots } = params;
  const related = lots.filter(
    (lot) =>
      lot.sourceDocumentNo === receiptNo ||
      lot.lotNo.includes(receiptNo),
  );

  if (itemId) {
    const byItem = related.filter((lot) => lot.itemId === itemId);
    if (byItem.length > 0) {
      return [...new Set(byItem.map((lot) => lot.lotNo))].join(", ");
    }
  }

  const suffix = String(sortOrder + 1).padStart(2, "0");
  const byOrder = related.find(
    (lot) =>
      lot.lotNo === `IL-${receiptNo}-${suffix}` ||
      lot.lotNo.startsWith(`IL-${receiptNo}-${suffix}-`),
  );
  if (byOrder) {
    return byOrder.lotNo;
  }

  return "";
}

function buildSlipData(params: {
  receipt: NonNullable<
    ReturnType<typeof useRawTirePurchaseReceiptQuery>["data"]
  >["data"];
  request: NonNullable<
    NonNullable<
      ReturnType<typeof useStockPostingRequestByReceiptQuery>["data"]
    >["data"]
  >;
  lots: InventoryLotBalanceRow[];
  sellerAddress?: string;
  sellerTaxId?: string;
}): WarehouseReceiptSlipData {
  const { receipt, request, lots, sellerAddress, sellerTaxId } = params;
  const warehouse =
    [request.warehouseName || request.warehouseCode, request.locationCode]
      .filter(Boolean)
      .join(" - ") || "-";

  const subtotal = Number(receipt.subtotalAmount) || 0;
  const discount = Number(receipt.deductionAmount) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const net = Number(receipt.totalAmount) || afterDiscount;

  const requestItemsById = new Map(
    (request.items ?? []).map((item) => [item.id, item]),
  );

  const items = receipt.items.map((item, index) => {
    const fromRequest = requestItemsById.get(item.id);
    const productCode =
      fromRequest?.itemCode ||
      fromRequest?.classificationCode ||
      item.classificationCode ||
      "-";
    const productName =
      fromRequest?.itemName ||
      fromRequest?.classificationName ||
      item.classificationName ||
      "-";
    const lotNo = resolveLotNo({
      receiptNo: receipt.receiptNo,
      sortOrder: item.sortOrder ?? index,
      itemId: fromRequest?.itemId,
      lots,
    });
    return {
      no: index + 1,
      productCode,
      productName,
      warehouse,
      lotNo,
      unit: "กก.",
      quantity: formatQty(fromRequest?.weightKg ?? item.weightKg),
      unitPrice: formatMoney(fromRequest?.pricePerKg ?? item.pricePerKg),
      amount: formatMoney(fromRequest?.amount ?? item.amount),
    };
  });

  const deliveryDate =
    receipt.ticket?.weighInAt ||
    receipt.ticket?.weighOutAt ||
    receipt.receiptDate;

  return {
    documentNo: request.requestNo,
    documentDate: formatDate(request.postingDate),
    receiptNo: receipt.receiptNo,
    deliveryDate: formatDate(deliveryDate),
    licensePlate:
      receipt.truck?.licensePlate ||
      receipt.ticket?.truckLicensePlate ||
      "",
    sellerCode: receipt.seller.sellerCode,
    sellerName: receipt.seller.sellerName,
    sellerAddress: sellerAddress || "",
    sellerTaxId: sellerTaxId || "",
    sellerPhone: receipt.seller.phone || "",
    remark: receipt.remark || "",
    items,
    subtotalAmount: formatMoney(subtotal),
    discountAmount: formatMoney(discount),
    afterDiscountAmount: formatMoney(afterDiscount),
    vatAmount: formatMoney(0),
    netAmount: formatMoney(net),
    netAmountRaw: net,
    preparedBy: request.requestedBy?.displayName || "",
    verifiedBy: request.approvedBy?.displayName || "",
    approvedBy: request.approvedBy?.displayName || "",
  };
}

export default function RawTireWarehouseReceiptSlipPage({
  receiptId,
}: Props) {
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const stockQuery = useStockPostingRequestByReceiptQuery(receiptId);
  const receipt = receiptQuery.data?.data;
  const request = stockQuery.data?.data ?? null;

  const sellerQuery = useSellerQuery(receipt?.seller?.id);
  const seller = sellerQuery.data?.data;

  const canView =
    Boolean(receipt) &&
    (receipt?.stockPostingStatus === "POSTED" ||
      request?.status === StockPostingRequestStatus.APPROVED) &&
    Boolean(request);

  const lotsQuery = useInventoryLotsQuery(
    { q: receipt?.receiptNo },
    { enabled: Boolean(canView && receipt?.receiptNo) },
  );
  const lots = lotsQuery.data?.data ?? [];

  const slipData = useMemo(() => {
    if (!receipt || !request || !canView) {
      return null;
    }
    return buildSlipData({
      receipt,
      request,
      lots,
      sellerAddress: seller?.address,
      sellerTaxId: seller?.taxId,
    });
  }, [canView, lots, receipt, request, seller?.address, seller?.taxId]);

  const loading =
    receiptQuery.isLoading ||
    stockQuery.isLoading ||
    (Boolean(canView && receipt?.receiptNo) && lotsQuery.isLoading) ||
    (Boolean(receipt?.seller?.id) && sellerQuery.isLoading);

  const handlePrint = async () => {
    if (!slipData) return;
    setIsPrinting(true);
    try {
      const { generateRawTireWarehouseReceiptPdf } = await import(
        "@/utils/generateRawTireWarehouseReceiptPdf"
      );
      await generateRawTireWarehouseReceiptPdf(slipData);
    } finally {
      setIsPrinting(false);
    }
  };

  const minRows = Math.max(8, slipData?.items.length ?? 0);
  const bahtText = slipData
    ? numberToThaiBahtText(slipData.netAmountRaw)
    : "";

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (receipt?.weighbridgeTicketId) {
              router.push(`/receiving/${receipt.weighbridgeTicketId}`);
              return;
            }
            router.push(`/receiving/receipts/${receiptId}`);
          }}
        >
          กลับ
        </Button>
        <div className={styles.toolbarActions}>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!slipData || isPrinting}
            loading={isPrinting}
            onClick={() => void handlePrint()}
          >
            พิมพ์ใบรับสินค้า
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateCard}>
          <Spin /> กำลังโหลดเอกสาร...
        </div>
      ) : receiptQuery.isError || stockQuery.isError ? (
        <div className={styles.emptyCard}>
          <Typography.Text type="danger">
            โหลดข้อมูลไม่สำเร็จ
          </Typography.Text>
          <Link href={`/receiving/receipts/${receiptId}`}>กลับใบรับซื้อ</Link>
        </div>
      ) : !canView || !slipData ? (
        <div className={styles.emptyCard}>
          <Alert
            type="warning"
            showIcon
            message="ยังไม่มีใบรับสินค้าเข้าคลัง"
            description="เอกสารนี้จะแสดงหลังอนุมัติรับยางดิบเข้าคลังแล้ว"
          />
          <Link href={`/receiving/receipts/${receiptId}`}>กลับใบรับซื้อ</Link>
        </div>
      ) : (
        <article className={styles.slipPaper}>
          <div className={styles.header}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="SMT Energy" className={styles.logo} />
            <div className={styles.company}>
              <p className={styles.companyName}>
                บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด
              </p>
              <p className={styles.companyAddress}>
                85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
              </p>
              <p className={styles.companyAddress}>
                เบอร์ติดต่อ : 02-2359565-8 เลขประจำตัวผู้เสียภาษี 0 1055
                63023 12 4
              </p>
            </div>
          </div>

          <h1 className={styles.docTitle}>ใบรับสินค้า</h1>

          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>รหัสผู้ขาย</span>
                <span className={styles.infoValue}>{slipData.sellerCode}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ชื่อผู้ขาย</span>
                <span className={styles.infoValue}>{slipData.sellerName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ที่อยู่</span>
                <span className={styles.infoValue}>
                  {slipData.sellerAddress || "\u00a0"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>เลขประจำตัวผู้เสียภาษี</span>
                <span className={styles.infoValue}>
                  {slipData.sellerTaxId || "\u00a0"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>โทร</span>
                <span className={styles.infoValue}>
                  {slipData.sellerPhone || "\u00a0"}
                </span>
              </div>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.metaGrid}>
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>เลขที่เอกสาร</span>
                  <span className={styles.metaValue}>{slipData.documentNo}</span>
                </div>
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>วันที่เอกสาร</span>
                  <span className={styles.metaValue}>
                    {slipData.documentDate || "\u00a0"}
                  </span>
                </div>
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>เลขที่ PO</span>
                  <span className={styles.metaValue}>{slipData.receiptNo}</span>
                </div>
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>วันที่รถมาส่งสินค้า</span>
                  <span className={styles.metaValue}>{slipData.deliveryDate}</span>
                </div>
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>เลขทะเบียนรถ</span>
                  <span className={styles.metaValue}>
                    {slipData.licensePlate || "\u00a0"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th style={{ width: 48 }}>ลำดับ</th>
                <th>รหัสสินค้า / รายละเอียด</th>
                <th style={{ width: 56 }}>หน่วย</th>
                <th style={{ width: 72 }}>จำนวน</th>
                <th style={{ width: 88 }}>ราคาต่อหน่วย</th>
                <th style={{ width: 100 }}>จำนวนเงินรวม</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: minRows }).map((_, index) => {
                const item = slipData.items[index];
                if (!item) {
                  return (
                    <tr key={`empty-${index}`}>
                      <td className={styles.empty} />
                      <td className={styles.empty} />
                      <td className={styles.empty} />
                      <td className={styles.empty} />
                      <td className={styles.empty} />
                      <td className={styles.empty} />
                    </tr>
                  );
                }
                return (
                  <tr key={item.no}>
                    <td className={styles.textCenter}>{item.no}</td>
                    <td>
                      <div>
                        {item.productCode} {item.productName}
                      </div>
                      <div className={styles.warehouseLine}>
                        คลัง : {item.warehouse}
                      </div>
                      {item.lotNo ? (
                        <div className={styles.lotLine}>Lot : {item.lotNo}</div>
                      ) : null}
                    </td>
                    <td className={styles.textCenter}>{item.unit}</td>
                    <td className={styles.textRight}>{item.quantity}</td>
                    <td className={styles.textRight}>{item.unitPrice}</td>
                    <td className={styles.textRight}>{item.amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={styles.footerBlock}>
            <div className={styles.remarkPane}>
              <div className={styles.remarkLabel}>หมายเหตุ</div>
              <div className={styles.remarkBody}>{slipData.remark}</div>
              <div className={styles.bahtText}>( {bahtText} )</div>
            </div>
            <table className={styles.summaryTable}>
              <tbody>
                <tr>
                  <td>รวมเป็นเงิน</td>
                  <td className={styles.textRight}>{slipData.subtotalAmount}</td>
                </tr>
                <tr>
                  <td>ส่วนลด</td>
                  <td className={styles.textRight}>{slipData.discountAmount}</td>
                </tr>
                <tr>
                  <td>มูลค่าหลังหักส่วนลด</td>
                  <td className={styles.textRight}>
                    {slipData.afterDiscountAmount}
                  </td>
                </tr>
                <tr>
                  <td>ภาษีมูลค่าเพิ่ม 7%</td>
                  <td className={styles.textRight}>{slipData.vatAmount}</td>
                </tr>
                <tr className={styles.netRow}>
                  <td>ยอดเงินสุทธิ</td>
                  <td className={styles.textRight}>{slipData.netAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.signatures}>
            <div className={styles.sig}>
              <div className={styles.sigLine} />
              <div className={styles.sigName}>{slipData.preparedBy}</div>
              <div className={styles.sigRole}>ผู้จัดทำ</div>
              <div className={styles.sigDate}>วันที่ ____/____/________</div>
            </div>
            <div className={styles.sig}>
              <div className={styles.sigLine} />
              <div className={styles.sigName}>{slipData.verifiedBy}</div>
              <div className={styles.sigRole}>ผู้ตรวจสอบ</div>
              <div className={styles.sigDate}>วันที่ ____/____/________</div>
            </div>
            <div className={styles.sig}>
              <div className={styles.sigLine} />
              <div className={styles.sigName}>{slipData.approvedBy}</div>
              <div className={styles.sigRole}>ผู้อนุมัติ</div>
              <div className={styles.sigDate}>วันที่ ____/____/________</div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
