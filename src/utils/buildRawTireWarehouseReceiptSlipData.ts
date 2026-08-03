import type { InventoryLotBalanceRow } from "@/types/inventory";
import type { ReceiptDetail } from "@/types/raw-tire-purchase-receipt";
import type { StockPostingRequest } from "@/types/stock-posting-request";
import type { WarehouseReceiptSlipData } from "@/utils/generateRawTireWarehouseReceiptPdf";

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

export function resolveWarehouseReceiptLotNo(params: {
  receiptNo: string;
  sortOrder: number;
  itemId?: string;
  lots: InventoryLotBalanceRow[];
}) {
  const { receiptNo, sortOrder, itemId, lots } = params;
  const related = lots.filter(
    (lot) =>
      lot.sourceDocumentNo === receiptNo || lot.lotNo.includes(receiptNo),
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

export function buildRawTireWarehouseReceiptSlipData(params: {
  receipt: ReceiptDetail;
  request: StockPostingRequest;
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
    const lotNo = resolveWarehouseReceiptLotNo({
      receiptNo: receipt.receiptNo,
      sortOrder: item.sortOrder ?? index,
      itemId: fromRequest?.itemId,
      lots,
    });
    return {
      no: index + 1,
      productCode,
      productName,
      warehouse:
        [
          fromRequest?.warehouseName || fromRequest?.warehouseCode,
          fromRequest?.locationCode,
        ]
          .filter(Boolean)
          .join(" - ") || warehouse,
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
      receipt.truck?.licensePlate || receipt.ticket?.truckLicensePlate || "",
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
