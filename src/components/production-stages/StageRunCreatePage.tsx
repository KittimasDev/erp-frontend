"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Tooltip,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useCreateStageRunMutation } from "@/hooks/production-stages/useStageRunMutations";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import type { StageModuleConfig } from "./stage-modules";
import styles from "./StageRunPage.module.css";

function fmtQty(value?: string | number) {
  const num = Number(value ?? 0);
  return Number.isNaN(num)
    ? "-"
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function StageRunCreatePage({
  config,
}: {
  config: StageModuleConfig;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const actions = useScreenActionPermissions(config.screenCode);
  const createMutation = useCreateStageRunMutation(config);

  const [stageType, setStageType] = useState<string | undefined>();
  const [runDate, setRunDate] = useState<Dayjs>(dayjs());
  /* กุญแจของกระดานความคืบหน้า — เตรียมยางเกิดก่อนใบสั่งผลิตมีตัวตน
     ชี้ด้วย FK อย่างเดียวจึงตอบไม่ได้ว่า batch นี้เดินถึงขั้นไหนแล้ว */
  const [batchNo, setBatchNo] = useState("");
  const [remark, setRemark] = useState("");

  /*
    ฝั่ง input เลือกเป็น "Lot" ทีเดียว ไม่ทำ cascade คลัง→ตำแหน่ง→lot สี่ชั้น
    เพราะแถว lot คืนคลัง ตำแหน่ง หน่วย และยอดคงเหลือมาครบอยู่แล้ว
    เลือก lot จึงกรอกที่เหลือให้เองและ **ตัดเคสเลือกชุดที่ไม่มีของทิ้งไปเลย**
    ซึ่งเป็นสาเหตุที่ backend โยน "Lot มีสต๊อกไม่พอ" กลับมาบ่อยที่สุด
  */
  const [inputLotId, setInputLotId] = useState<string | undefined>();
  const [inputQty, setInputQty] = useState<number | null>(null);

  const [outputItemId, setOutputItemId] = useState<string | undefined>();
  const [outputWarehouseId, setOutputWarehouseId] = useState<string | undefined>();
  const [outputLocationId, setOutputLocationId] = useState<string | undefined>();
  const [outputUnitId, setOutputUnitId] = useState<string | undefined>();
  const [outputQty, setOutputQty] = useState<number | null>(null);
  const [byproductQty, setByproductQty] = useState<number | null>(null);

  const lotsQuery = useInventoryLotsQuery({ hasStock: true });
  const itemsQuery = useItemsQuery();
  const unitsQuery = useUnitsQuery();
  const warehousesQuery = useWarehousesQuery();
  const locationsQuery = useWarehouseLocationsQuery(
    outputWarehouseId ? { warehouseId: outputWarehouseId } : undefined,
  );

  const lots = useMemo(() => lotsQuery.data?.data ?? [], [lotsQuery.data]);
  const selectedLot = useMemo(
    () => lots.find((lot) => lot.lotId === inputLotId),
    [lots, inputLotId],
  );

  const unitCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of unitsQuery.data?.data ?? []) {
      map.set(unit.id, unit.code);
    }
    return map;
  }, [unitsQuery.data]);

  /*
    หน่วยต่างกันคือเรื่องปกติของขั้นตอนเตรียมยาง (ตัดยาง = เส้น → กิโล)
    จึงไม่ห้าม แต่ต้องบอกให้รู้ว่าเปอร์เซ็นต์ที่เห็นจะเทียบไม่ได้
  */
  const unitsMatch =
    Boolean(selectedLot?.unitId) &&
    Boolean(outputUnitId) &&
    selectedLot?.unitId === outputUnitId;

  const previewYield =
    unitsMatch && inputQty && inputQty > 0 && outputQty !== null
      ? Number(((outputQty / inputQty) * 100).toFixed(2))
      : null;

  const overLotStock =
    selectedLot && inputQty
      ? inputQty > Number(selectedLot.quantityAvailable)
      : false;

  const canSubmit =
    Boolean(stageType) &&
    Boolean(inputLotId) &&
    Boolean(inputQty && inputQty > 0) &&
    Boolean(outputItemId) &&
    Boolean(outputWarehouseId) &&
    Boolean(outputLocationId) &&
    Boolean(outputUnitId) &&
    outputQty !== null &&
    outputQty >= 0 &&
    !overLotStock;

  const submit = () => {
    if (!canSubmit || !selectedLot) {
      message.warning("กรุณากรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }
    createMutation.mutate(
      {
        stageType: stageType as string,
        runDate: runDate.format("YYYY-MM-DD"),
        batchNo: batchNo.trim() || undefined,
        inputItemId: selectedLot.itemId,
        inputWarehouseId: selectedLot.warehouseId,
        inputLocationId: selectedLot.locationId,
        inputLotId: selectedLot.lotId,
        inputUnitId: selectedLot.unitId,
        inputQty: inputQty as number,
        outputItemId: outputItemId as string,
        outputWarehouseId: outputWarehouseId as string,
        outputLocationId: outputLocationId as string,
        outputUnitId: outputUnitId as string,
        outputQty: outputQty as number,
        byproductQty: byproductQty ?? undefined,
        remark: remark.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          router.push(`${config.routeBase}/${res.data.id}`);
        },
      },
    );
  };

  return (
    <MasterPageGate isLoading={lotsQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>{config.headerAccent}</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>{config.eyebrow}</div>
            <h2 className={masterStyles.pageTitle}>สร้างรอบการทำงาน</h2>
            <span className={masterStyles.pageSubtitle}>
              บันทึกเป็นร่างก่อน — สต๊อกจะถูกตัดตอนกด &quot;เริ่มงาน&quot; ในหน้ารายละเอียด
            </span>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(config.routeBase)}
          >
            กลับ
          </Button>
        </div>

        {actions.canAdd ? null : (
          <Alert
            type="warning"
            showIcon
            title="ไม่มีสิทธิ์สร้างรอบการทำงานในหน้าจอนี้"
          />
        )}

        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <Select
              placeholder="เลือกขั้นตอน"
              value={stageType}
              onChange={setStageType}
              options={config.stageTypes.map((option) => ({
                value: option.value,
                label: `${option.order}. ${option.label}`,
              }))}
            />
            <DatePicker
              value={runDate}
              onChange={(value) => value && setRunDate(value)}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Input
              placeholder="Batch (ไม่บังคับ) — ใช้ร้อยรอบงานทั้งสายให้เป็นเส้นเดียวกัน"
              value={batchNo}
              maxLength={50}
              onChange={(e) => setBatchNo(e.target.value)}
            />
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionHead}>
              <h4>วัตถุดิบเข้า — ตัดออกจากคลัง</h4>
              <span className={styles.formSectionHint}>
                เลือก Lot แล้วระบบจะเติมคลัง ตำแหน่ง และหน่วยให้เอง
              </span>
            </div>
            <div className={styles.formGrid}>
              <Select
                showSearch
                allowClear
                style={{ gridColumn: "span 2" }}
                placeholder="เลือก Lot วัตถุดิบ"
                value={inputLotId}
                onChange={(value) => setInputLotId(value)}
                loading={lotsQuery.isFetching}
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={lots.map((lot) => ({
                  value: lot.lotId,
                  label:
                    `${lot.lotNo} · ${lot.itemCode} — ${lot.itemNameTh} · ` +
                    `${lot.warehouseCode}/${lot.locationCode} · ` +
                    `คงเหลือ ${fmtQty(lot.quantityAvailable)} ${lot.unitCode ?? ""}`,
                }))}
              />
              <InputNumber
                style={{ width: "100%" }}
                min={0.001}
                step={0.001}
                precision={3}
                placeholder="จำนวนที่จะใช้"
                value={inputQty}
                onChange={setInputQty}
                addonAfter={
                  selectedLot?.unitCode ??
                  (selectedLot ? unitCodeById.get(selectedLot.unitId) : "") ??
                  ""
                }
                status={overLotStock ? "error" : undefined}
              />
            </div>
            {overLotStock && selectedLot ? (
              <Alert
                type="error"
                showIcon
                title={`Lot นี้คงเหลือ ${fmtQty(selectedLot.quantityAvailable)} ${selectedLot.unitCode ?? ""} — ใส่จำนวนเกินของที่มีจริง`}
              />
            ) : null}
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionHead}>
              <h4>ผลผลิตออก — รับเข้าคลัง</h4>
              <span className={styles.formSectionHint}>
                จำนวนที่วางแผนว่าจะได้ · ของจะเข้าคลังจริงตอนกดยืนยันเสร็จงาน
              </span>
            </div>
            <div className={styles.formGrid}>
              <Select
                showSearch
                placeholder="สินค้าผลผลิต"
                value={outputItemId}
                onChange={setOutputItemId}
                loading={itemsQuery.isFetching}
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={(itemsQuery.data?.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.itemCode} — ${item.itemNameTh}`,
                }))}
              />
              <Select
                placeholder="คลังปลายทาง"
                value={outputWarehouseId}
                onChange={(value) => {
                  setOutputWarehouseId(value);
                  setOutputLocationId(undefined);
                }}
                loading={warehousesQuery.isFetching}
                options={(warehousesQuery.data?.data ?? []).map((wh) => ({
                  value: wh.id,
                  label: `${wh.warehouseCode} — ${wh.warehouseName}`,
                }))}
              />
              <Select
                placeholder="ตำแหน่งจัดเก็บ"
                value={outputLocationId}
                onChange={setOutputLocationId}
                disabled={!outputWarehouseId}
                loading={locationsQuery.isFetching}
                options={(locationsQuery.data?.data ?? []).map((loc) => ({
                  value: loc.id,
                  label: `${loc.locationCode} — ${loc.locationName}`,
                }))}
              />
              <Select
                placeholder="หน่วยนับ"
                value={outputUnitId}
                onChange={setOutputUnitId}
                loading={unitsQuery.isFetching}
                options={(unitsQuery.data?.data ?? []).map((unit) => ({
                  value: unit.id,
                  label: `${unit.code} — ${unit.nameTh ?? unit.code}`,
                }))}
              />
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={0.001}
                precision={3}
                placeholder="จำนวนผลผลิตตามแผน"
                value={outputQty}
                onChange={setOutputQty}
                addonAfter={outputUnitId ? unitCodeById.get(outputUnitId) : ""}
              />
              <Tooltip title="บันทึกไว้อ้างอิงเท่านั้น ระบบไม่รับเข้าสต๊อกให้อัตโนมัติ">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.001}
                  precision={3}
                  placeholder={config.byproductLabel}
                  value={byproductQty}
                  onChange={setByproductQty}
                />
              </Tooltip>
            </div>

            <div className={styles.yieldPreview}>
              <span>Yield ตามแผน</span>
              {previewYield !== null ? (
                <span className={styles.yieldPreviewValue}>{previewYield}%</span>
              ) : (
                <span>
                  {selectedLot && outputUnitId && !unitsMatch
                    ? "เทียบไม่ได้ — หน่วยวัตถุดิบกับผลผลิตต่างกัน"
                    : "กรอกจำนวนเข้าและออกเพื่อดูตัวเลข"}
                </span>
              )}
            </div>
          </div>

          <Input.TextArea
            rows={2}
            maxLength={500}
            placeholder="หมายเหตุ (ถ้ามี)"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />

          <div className={styles.formActions}>
            <Button onClick={() => router.push(config.routeBase)}>ยกเลิก</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!canSubmit || !actions.canAdd}
              loading={createMutation.isPending}
              onClick={submit}
            >
              บันทึกเป็นร่าง
            </Button>
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
