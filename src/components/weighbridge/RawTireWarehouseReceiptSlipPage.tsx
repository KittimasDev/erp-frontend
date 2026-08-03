"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Spin, Typography } from "antd";
import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";

import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useSellerQuery } from "@/hooks/sellers/useSellerQuery";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
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

function buildSlipData(params: {
  receipt: NonNullable<
    ReturnType<typeof useRawTirePurchaseReceiptQuery>["data"]
  >["data"];
  request: NonNullable<
    NonNullable<
      ReturnType<typeof useStockPostingRequestByReceiptQuery>["data"]
    >["data"]
  >;
  sellerAddress?: string;
  sellerTaxId?: string;
}): WarehouseReceiptSlipData {
  const { receipt, request, sellerAddress, sellerTaxId } = params;
  const warehouseLabel = [request.warehouseCode, request.warehouseName]
    .filter(Boolean)
    .join(" - ");
  const locationPart = [request.locationCode, request.locationName]
    .filter(Boolean)
    .join(" ");
  const warehouse =
    [warehouseLabel, locationPart].filter(Boolean).join(" / ") || "-";

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
    return {
      no: index + 1,
      productCode,
      productName,
      warehouse,
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
      "-",
    sellerCode: receipt.seller.sellerCode,
    sellerName: receipt.seller.sellerName,
    sellerAddress: sellerAddress || "-",
    sellerTaxId: sellerTaxId || "-",
    sellerPhone: receipt.seller.phone || "-",
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

  const slipData = useMemo(() => {
    if (!receipt || !request || !canView) {
      return null;
    }
    return buildSlipData({
      receipt,
      request,
      sellerAddress: seller?.address,
      sellerTaxId: seller?.taxId,
    });
  }, [canView, receipt, request, seller?.address, seller?.taxId]);

  const loading =
    receiptQuery.isLoading ||
    stockQuery.isLoading ||
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
                เบอร์ออฟฟิศ : 02-2359565-8 · เลขประจำตัวผู้เสียภาษี 0 1055
                63023 12 4
              </p>
            </div>
          </div>

          <h1 className={styles.docTitle}>ใบรับสินค้า</h1>

          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>รหัสผู้ขาย</span>
                <span>{slipData.sellerCode}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ชื่อผู้ขาย</span>
                <span>{slipData.sellerName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ที่อยู่</span>
                <span>{slipData.sellerAddress}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>เลขประจำตัวผู้เสียภาษี</span>
                <span>{slipData.sellerTaxId}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>โทร.</span>
                <span>{slipData.sellerPhone}</span>
              </div>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>เลขที่เอกสาร</span>
                <span>{slipData.documentNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>วันที่เอกสาร</span>
                <span>{slipData.documentDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>เลขที่ใบรับซื้อ</span>
                <span>{slipData.receiptNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>วันที่รถมาส่งสินค้า</span>
                <span>{slipData.deliveryDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>เลขทะเบียนรถ</span>
                <span>{slipData.licensePlate}</span>
              </div>
            </div>
          </div>

          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th style={{ width: 52 }}>ลำดับ</th>
                <th>รหัสสินค้า / รายละเอียด</th>
                <th style={{ width: 110 }}>คลัง</th>
                <th style={{ width: 64 }}>หน่วย</th>
                <th style={{ width: 80 }}>จำนวน</th>
                <th style={{ width: 96 }}>ราคาต่อหน่วย</th>
                <th style={{ width: 110 }}>จำนวนเงินรวม</th>
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
                      <td className={styles.empty} />
                    </tr>
                  );
                }
                return (
                  <tr key={item.no}>
                    <td className={styles.textCenter}>{item.no}</td>
                    <td>
                      {item.productCode} {item.productName}
                    </td>
                    <td className={styles.textCenter}>{item.warehouse}</td>
                    <td className={styles.textCenter}>{item.unit}</td>
                    <td className={styles.textRight}>{item.quantity}</td>
                    <td className={styles.textRight}>{item.unitPrice}</td>
                    <td className={styles.textRight}>{item.amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={styles.summaryWrap}>
            <div className={styles.bahtText}>( {bahtText} )</div>
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
              <div className={styles.sigDate}>วันที่ ___/___/______</div>
            </div>
            <div className={styles.sig}>
              <div className={styles.sigLine} />
              <div className={styles.sigName}>{slipData.verifiedBy}</div>
              <div className={styles.sigRole}>ผู้ตรวจสอบ</div>
              <div className={styles.sigDate}>วันที่ ___/___/______</div>
            </div>
            <div className={styles.sig}>
              <div className={styles.sigLine} />
              <div className={styles.sigName}>{slipData.approvedBy}</div>
              <div className={styles.sigRole}>ผู้อนุมัติ</div>
              <div className={styles.sigDate}>วันที่ ___/___/______</div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
