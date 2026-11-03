import type { Equipment } from "@/types/maintenance";
import type { ProductionRecordingConfig } from "@/types/production-formula";

/**
 * ตรวจส่วนเครื่องจักรของ recording_config ฝั่งหน้าจอ (ให้ผู้ใช้เห็นปัญหาก่อนกดบันทึก)
 * backend ตรวจซ้ำทั้งหมดและเป็นตัวตัดสินจริง — โดยเฉพาะหน่วยของฟิลด์ที่ไม่ผูก BOM
 * (เทียบรหัส/ชื่อหน่วยได้เฉพาะ backend) จึงเช็กหน่วยตรงนี้เฉพาะฟิลด์ที่ผูก BOM
 */
export function validateRecordingEquipmentConfig(
  config: ProductionRecordingConfig,
  equipment: Equipment[],
  /** itemId → unitId (หน่วยหลักของสินค้า) */
  itemUnitIdByItemId: ReadonlyMap<string, string>,
): string[] {
  const errors: string[] = [];
  const byId = new Map(equipment.map((e) => [e.id, e]));
  const selected = new Set(config.equipmentIds ?? []);
  const compareByEquipment = new Map<string, string>();

  for (const id of selected) {
    const eq = byId.get(id);
    if (eq?.status === "RETIRED") errors.push(`เครื่องจักร ${eq.equipmentCode} ปลดระวางแล้ว เลือกในสูตรไม่ได้`);
  }

  for (const field of config.fields) {
    const where = `ฟิลด์ ${field.code}`;
    if (field.equipmentId && !selected.has(field.equipmentId)) {
      errors.push(`${where} ผูกเครื่องจักรที่ไม่ได้เลือกไว้ในสูตร`);
    }
    if (field.dataSource === "AUTO") {
      if (!field.equipmentId) errors.push(`${where} แหล่งข้อมูล AUTO ต้องผูกเครื่องจักร`);
      if (!field.deviceTagCode?.trim()) errors.push(`${where} แหล่งข้อมูล AUTO ต้องระบุ Device Tag`);
    }
    if (!field.compareToCapacity) continue;

    const eq = field.equipmentId ? byId.get(field.equipmentId) : undefined;
    if (!field.equipmentId || !eq) {
      errors.push(`${where} ใช้เทียบกำลังผลิตได้เฉพาะฟิลด์ที่ผูกเครื่องจักร`);
      continue;
    }
    const earlier = compareByEquipment.get(field.equipmentId);
    if (earlier) {
      errors.push(
        `เครื่องจักร ${eq.equipmentCode} ตั้งฟิลด์ใช้เทียบกำลังผลิตได้ฟิลด์เดียว (มี ${earlier} และ ${field.code})`,
      );
      continue;
    }
    compareByEquipment.set(field.equipmentId, field.code);
    if (eq.capacity == null || !eq.capacityUnitId) {
      errors.push(`เครื่องจักร ${eq.equipmentCode} ยังไม่ได้ตั้ง Capacity และหน่วย — ใช้เทียบกำลังผลิตไม่ได้`);
    } else if (
      field.linkedItemId &&
      itemUnitIdByItemId.get(field.linkedItemId) !== eq.capacityUnitId
    ) {
      errors.push(
        `${where} หน่วยของสินค้าที่ผูกไม่ตรงกับหน่วยกำลังผลิตของ ${eq.equipmentCode} (${eq.capacityUnitLabel ?? ""}/ชั่วโมง)`,
      );
    }
  }
  return errors;
}
