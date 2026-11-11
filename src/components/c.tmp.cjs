require("./a.tmp.cjs");
rep("purchase-payments/PurchasePaymentsListPage.tsx",[
cut("function statusClass","function formatDate"),
["<span className={`${styles.statusPill} ${statusClass(value)}`}>\n            <span className={styles.statusDot} aria-hidden />\n            {tStatus(SUPPLIER_PAYMENT_STATUS_LABEL[value] ?? value)}\n          </span>","<Tag color={SUPPLIER_PAYMENT_STATUS_COLOR[value] ?? \"default\"}>\n            {tStatus(SUPPLIER_PAYMENT_STATUS_LABEL[value] ?? value)}\n          </Tag>"],
["  SUPPLIER_PAYMENT_STATUS_LABEL,\n} from","  SUPPLIER_PAYMENT_STATUS_COLOR,\n  SUPPLIER_PAYMENT_STATUS_LABEL,\n} from"],
s=>s.replace(/^("use client";\n)/,'$1import { Tag } from "antd";\n')]);
rep("goods-receipts/GoodsReceiptsListPage.tsx",[
s=>{const a=s.indexOf("function StatusPill"),b=s.indexOf("\n}\n",a)+3;return s.slice(0,a)+`function StatusPill({ status }: { status: string }) {
  useT(); /* subscribe to language changes (tStatus reads the current language) */
  return (
    <Tag color={GOODS_RECEIPT_STATUS_COLOR[status] ?? "default"}>
      {tStatus(GOODS_RECEIPT_STATUS_LABEL[status] ?? status)}
    </Tag>
  );
}
`+s.slice(b)},
["import { GOODS_RECEIPT_STATUS_LABEL } from","import { GOODS_RECEIPT_STATUS_COLOR, GOODS_RECEIPT_STATUS_LABEL } from"],
["  Table,\n} from \"antd\";","  Table,\n  Tag,\n} from \"antd\";"]]);
