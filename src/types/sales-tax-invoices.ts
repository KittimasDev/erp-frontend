export type SalesTaxInvoiceStatus = "ISSUED" | "CANCELLED";

export type SalesTaxInvoiceAdvanceDeduction = {
  id: string;
  advanceReceiptId: string;
  docNo: string;
  baseAmount: string;
  vatAmount: string;
  amount: string;
};

export type SalesTaxInvoiceItem = {
  id: string;
  itemCode?: string;
  itemName: string;
  quantity: string;
  unitName?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  sortOrder: number;
};

export type SalesTaxInvoice = {
  id: string;
  taxInvoiceNo: string;
  sourceType?: "SALES_INVOICE" | "ADVANCE_RECEIPT" | string;
  salesInvoiceId?: string;
  advanceReceiptId?: string;
  invoiceNo: string;
  taxInvoiceDate: string;
  status: SalesTaxInvoiceStatus | string;
  sellerName: string;
  sellerTaxId: string;
  sellerBranch: string;
  buyerName: string;
  buyerTaxId: string;
  buyerBranch: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatMode: string;
  vatRate?: string;
  cancelReason?: string;
  createdById?: string;
  cancelledAt?: string;
  createdAt: string;
  items?: SalesTaxInvoiceItem[];
  advanceDeductions?: SalesTaxInvoiceAdvanceDeduction[];
};

export type SalesTaxInvoiceListResponse = {
  statusCode: number;
  message: string;
  data: {
    items: SalesTaxInvoice[];
    total: number;
    page: number;
    limit: number;
  };
};

export type SalesTaxInvoiceResponse = {
  statusCode: number;
  message: string;
  data: SalesTaxInvoice | null;
};
