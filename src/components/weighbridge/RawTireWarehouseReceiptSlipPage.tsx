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
import { StockPostingRequestStatus } from "@/types/stock-posting-request";
import { buildRawTireWarehouseReceiptSlipData } from "@/utils/buildRawTireWarehouseReceiptSlipData";

import RawTireWarehouseReceiptSlipView from "./RawTireWarehouseReceiptSlipView";
import styles from "./RawTireWarehouseReceiptSlipPage.module.css";

type Props = { receiptId: string };

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
    return buildRawTireWarehouseReceiptSlipData({
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
            title="ยังไม่มีใบรับสินค้าเข้าคลัง"
            description="เอกสารนี้จะแสดงหลังอนุมัติรับยางดิบเข้าคลังแล้ว"
          />
          <Link href={`/receiving/receipts/${receiptId}`}>กลับใบรับซื้อ</Link>
        </div>
      ) : (
        <RawTireWarehouseReceiptSlipView data={slipData} />
      )}
    </section>
  );
}
