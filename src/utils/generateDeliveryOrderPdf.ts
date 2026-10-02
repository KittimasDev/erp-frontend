import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type DeliveryOrderPdfData = {
  deliveryOrderNo: string;
  deliveryDate: string;
  salesOrderNo: string;
  /** ใบส่งที่รวมหลายใบบรรจุ → เลขที่ทุกใบคั่นด้วย ", " */
  packingNo: string;
  customerName: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  carrierName: string;
  vehiclePlate: string;
  driverName: string;
  remark: string;
  items: SalesLinePdfItem[];
};

export async function generateDeliveryOrderPdf(data: DeliveryOrderPdfData) {
  await generateSalesCommercialPdf({
    pageId: "delivery-order-pdf",
    titleTh: "ใบส่งสินค้า",
    titleEn: "DELIVERY ORDER",
    docNo: data.deliveryOrderNo,
    docDate: data.deliveryDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
      { label: "อ้างอิง Packing", value: data.packingNo },
      { label: "ผู้ติดต่อ", value: data.contactName },
      { label: "เบอร์โทร", value: data.contactPhone },
      { label: "ขนส่ง", value: data.carrierName },
      { label: "ทะเบียนรถ", value: data.vehiclePlate },
      { label: "คนขับ", value: data.driverName },
      {
        label: "ที่อยู่จัดส่ง",
        value: data.shippingAddress,
        full: true,
      },
    ],
    items: data.items,
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้ส่ง", "ผู้ขับ", "ผู้รับสินค้า"],
  });
}
