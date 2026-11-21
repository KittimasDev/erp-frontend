export type AdvanceDeductionPdfLine = {
  docNo: string;
  baseAmount: number;
  vatAmount: number;
  amount: number;
};

/** ฐานภาษีหลังหักมัดจำ = ยอดก่อน VAT − Σ ฐาน (baseAmount) ของยอดหักมัดจำ — ต้องตรงกับฐานที่ใช้คิด VAT */
export function taxBaseAfterAdvance(
  beforeVat: number,
  lines: { baseAmount: number }[],
): number {
  const deducted = lines.reduce((sum, line) => sum + (Number(line.baseAmount) || 0), 0);
  return Math.round((beforeVat - deducted) * 100) / 100;
}

function moneyText(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** บรรทัดหักในท้ายบิล — ไม่รวม VAT ใช้ฐานเป็นมูลค่าบรรทัด, รวมในราคาใช้ยอดรวม */
export function advanceDeductionTotalLines(
  vatMode: string | undefined,
  lines: AdvanceDeductionPdfLine[],
): { label: string; value: number }[] {
  const inclusive = vatMode === "INCLUSIVE";
  return lines.map((line) => {
    const detail = `(ก่อน VAT ${moneyText(line.baseAmount)} / VAT ${moneyText(line.vatAmount)})`;
    return {
      label: `หักเงินล่วงหน้า ${line.docNo} ${detail}`,
      value: inclusive ? -line.amount : -line.baseAmount,
    };
  });
}
