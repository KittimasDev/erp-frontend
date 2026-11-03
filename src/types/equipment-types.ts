/** ประเภทเครื่องจักร (Master) — Equipment เลือกประเภทจากที่นี่ และ MO สลับเครื่องได้เฉพาะประเภทเดียวกัน */
export type EquipmentType = {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
  sortOrder: number;
};

export type EquipmentTypeQuery = { isActive?: boolean };

export type SaveEquipmentTypeRequest = {
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};
