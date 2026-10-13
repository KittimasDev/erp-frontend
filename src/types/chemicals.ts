export type HazardClass = {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
  sortOrder: number;
};

export type IncompatiblePair = {
  hazardClassAId: string;
  hazardClassBId: string;
};

export type ChemicalRow = {
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  isActive: boolean;
  manufacturer?: string | null;
  casNo?: string | null;
  hazardClassId?: string | null;
  hazardClassName?: string | null;
  storageNote?: string | null;
  sdsCount: number;
};

export type UpsertChemicalProfileRequest = {
  manufacturer?: string;
  casNo?: string;
  hazardClassId?: string | null;
  storageNote?: string;
};

export type StorageConflict = {
  locationId: string;
  locationCode?: string;
  incomingItemId: string;
  incomingItemName: string;
  incomingHazard: string;
  existingItemId: string;
  existingItemName: string;
  existingHazard: string;
  source: "IN_STOCK" | "SAME_DOCUMENT";
};

type Envelope<T> = { statusCode?: number; message: string; data: T };
export type ChemicalListApiResponse = Envelope<ChemicalRow[]>;
export type ChemicalApiResponse = Envelope<ChemicalRow>;
export type HazardClassListApiResponse = Envelope<HazardClass[]>;
export type HazardClassApiResponse = Envelope<HazardClass>;
export type IncompatibilitiesApiResponse = Envelope<IncompatiblePair[]>;

/** documentType ของไฟล์แนบในระบบไฟล์แนบกลาง */
export const DOCUMENT_TYPE_CHEMICAL_SDS = "CHEMICAL_SDS";
export const DOCUMENT_TYPE_LOT_COA = "LOT_COA";

export type CoaStatus = "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED";

export const COA_STATUS_LABEL: Record<CoaStatus, string> = {
  NOT_REQUIRED: "ไม่ต้องตรวจ",
  PENDING: "รอตรวจ COA",
  VERIFIED: "COA ผ่าน",
  REJECTED: "COA ไม่ผ่าน",
};

export type ChemicalLot = {
  id: string;
  lotNo: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  sourceDocumentNo?: string;
  batchNo?: string;
  expiryDate?: string;
  receivedDate?: string;
  qcStatus: string;
  coaStatus: CoaStatus;
  coaVerifiedAt?: string;
  coaVerifiedByName?: string;
  coaRemark?: string;
  coaFileCount: number;
  remark?: string;
  balances: Array<{
    id: string;
    warehouseCode?: string;
    locationCode?: string;
    quantityOnHand: string;
    quantityAvailable: string;
    quantityOnHold: string;
    quantityBlocked: string;
  }>;
};
export type ChemicalLotListApiResponse = Envelope<ChemicalLot[]>;
export type ChemicalLotApiResponse = Envelope<ChemicalLot>;
