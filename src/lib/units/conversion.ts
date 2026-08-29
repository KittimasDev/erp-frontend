import type { UnitConversion } from "@/types/unit-conversions";
import type { Unit } from "@/types/units";

/**
 * ตรรกะแปลงหน่วยฝั่ง frontend — ใช้ "แสดงผลสด" ในฟอร์มเท่านั้น
 * แหล่งความจริงยังเป็น backend เสมอ (ฟอร์มส่ง quantity + unitId ไป แล้ว backend แปลงเอง)
 * ตรรกะที่นี่จึงต้องเดินกราฟแบบเดียวกับ backend เป๊ะ ไม่งั้น preview จะไม่ตรงกับที่บันทึกจริง
 */

/** ต้องเท่ากับ MAX_PATH_DEPTH ฝั่ง backend */
export const MAX_PATH_DEPTH = 4;
/** ต้องเท่ากับ QUANTITY_SCALE ฝั่ง backend (numeric(18,3)) */
export const QUANTITY_PRECISION = 3;

const GLOBAL_SCOPE = "*";

type Edge = {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

type Graph = Map<string, Map<string, number>>;

export type ConversionIndex = {
  globalEdges: Edge[];
  itemEdges: Map<string, Edge[]>;
  /** memo ของกราฟที่ประกอบแล้ว key = itemId หรือ "*" */
  graphCache: Map<string, Graph>;
};

export const EMPTY_CONVERSION_INDEX: ConversionIndex = {
  globalEdges: [],
  itemEdges: new Map(),
  graphCache: new Map(),
};

/** ปัดครึ่งขึ้น พร้อมกัน float error แบบ 2.675 * 100 = 267.49999999999997 */
export function roundQty(value: number, precision = QUANTITY_PRECISION): number {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  const scale = 10 ** precision;
  const scaled = Number((value * scale).toPrecision(15));
  return Math.round(scaled) / scale;
}

export function buildConversionIndex(
  rules: UnitConversion[] | undefined,
): ConversionIndex {
  const globalEdges: Edge[] = [];
  const itemEdges = new Map<string, Edge[]>();

  for (const rule of rules ?? []) {
    if (!rule.isActive) {
      continue;
    }
    const factor = Number(rule.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      continue;
    }

    const edge: Edge = {
      fromUnitId: rule.fromUnitId,
      toUnitId: rule.toUnitId,
      factor,
    };

    if (rule.itemId) {
      const list = itemEdges.get(rule.itemId) ?? [];
      list.push(edge);
      itemEdges.set(rule.itemId, list);
    } else {
      globalEdges.push(edge);
    }
  }

  return { globalEdges, itemEdges, graphCache: new Map() };
}

function addEdge(graph: Graph, from: string, to: string, factor: number) {
  if (!Number.isFinite(factor) || factor <= 0) {
    return;
  }
  let neighbours = graph.get(from);
  if (!neighbours) {
    neighbours = new Map<string, number>();
    graph.set(from, neighbours);
  }
  neighbours.set(to, factor);
}

/** รวม edge กฎกลางกับกฎรายสินค้าเป็นกราฟเดียว — กฎรายสินค้าทับกฎกลางคู่หน่วยเดียวกัน */
function getGraph(index: ConversionIndex, itemId?: string): Graph {
  const key = itemId || GLOBAL_SCOPE;
  const cached = index.graphCache.get(key);
  if (cached) {
    return cached;
  }

  const graph: Graph = new Map();
  const edges = [
    ...index.globalEdges,
    ...(itemId ? (index.itemEdges.get(itemId) ?? []) : []),
  ];

  for (const edge of edges) {
    addEdge(graph, edge.fromUnitId, edge.toUnitId, edge.factor);
    addEdge(graph, edge.toUnitId, edge.fromUnitId, 1 / edge.factor);
  }

  index.graphCache.set(key, graph);
  return graph;
}

/**
 * ตัวคูณระหว่างสองหน่วยในบริบทสินค้า — คืน null ถ้าไม่มีเส้นทาง
 * ห้าม fallback เป็น 1 เด็ดขาด เพราะจะกลายเป็นยอดผิดแบบเงียบ
 */
export function findFactor(
  index: ConversionIndex,
  itemId: string | undefined,
  fromUnitId: string | undefined,
  toUnitId: string | undefined,
): number | null {
  if (!fromUnitId || !toUnitId) {
    return null;
  }
  if (fromUnitId === toUnitId) {
    return 1;
  }

  const graph = getGraph(index, itemId);
  const visited = new Set<string>([fromUnitId]);
  let queue: { unitId: string; factor: number }[] = [
    { unitId: fromUnitId, factor: 1 },
  ];

  for (let depth = 0; depth < MAX_PATH_DEPTH; depth += 1) {
    const next: typeof queue = [];

    for (const current of queue) {
      const neighbours = graph.get(current.unitId);
      if (!neighbours) {
        continue;
      }

      // เรียงเพื่อนบ้านให้ผลลัพธ์คงที่เมื่อมีหลายเส้นทางยาวเท่ากัน (ตรงกับ backend)
      for (const neighbour of [...neighbours.keys()].sort()) {
        if (visited.has(neighbour)) {
          continue;
        }
        const factor = current.factor * (neighbours.get(neighbour) as number);
        if (neighbour === toUnitId) {
          return factor;
        }
        visited.add(neighbour);
        next.push({ unitId: neighbour, factor });
      }
    }

    if (!next.length) {
      return null;
    }
    queue = next;
  }

  return null;
}

export type ConvertArgs = {
  qty: number | string | null | undefined;
  fromUnitId?: string;
  toUnitId?: string;
  itemId?: string;
};

/** แปลงจำนวนระหว่างสองหน่วย — คืน null ถ้าไม่มีกฎหรือจำนวนไม่ถูกต้อง */
export function convertQty(
  index: ConversionIndex,
  { qty, fromUnitId, toUnitId, itemId }: ConvertArgs,
): number | null {
  const value = Number(qty);
  if (qty === null || qty === undefined || qty === "" || !Number.isFinite(value)) {
    return null;
  }

  const factor = findFactor(index, itemId, fromUnitId, toUnitId);
  if (factor === null) {
    return null;
  }

  const converted = roundQty(value * factor);
  return Number.isFinite(converted) ? converted : null;
}

export function toBaseQty(
  index: ConversionIndex,
  args: {
    qty: number | string | null | undefined;
    unitId?: string;
    baseUnitId?: string;
    itemId?: string;
  },
): number | null {
  return convertQty(index, {
    qty: args.qty,
    fromUnitId: args.unitId,
    toUnitId: args.baseUnitId,
    itemId: args.itemId,
  });
}

export function fromBaseQty(
  index: ConversionIndex,
  args: {
    baseQty: number | string | null | undefined;
    unitId?: string;
    baseUnitId?: string;
    itemId?: string;
  },
): number | null {
  return convertQty(index, {
    qty: args.baseQty,
    fromUnitId: args.baseUnitId,
    toUnitId: args.unitId,
    itemId: args.itemId,
  });
}

/**
 * หน่วยที่กรอกได้ของสินค้า = หน่วยหลัก + หน่วยที่เดินกราฟถึงจริง
 * ใช้แทนการโชว์ทุกหน่วยในระบบ ซึ่งเป็นต้นเหตุให้ผู้ใช้เลือกหน่วยที่ระบบแปลงไม่ได้
 */
export function resolveUnitOptions(
  index: ConversionIndex,
  itemId: string | undefined,
  baseUnitId: string | undefined,
  units: Unit[],
): Unit[] {
  if (!baseUnitId) {
    return [];
  }

  const graph = getGraph(index, itemId);
  const reachable = new Set<string>([baseUnitId]);
  let frontier = [baseUnitId];

  for (let depth = 0; depth < MAX_PATH_DEPTH; depth += 1) {
    const next: string[] = [];
    for (const node of frontier) {
      const neighbours = graph.get(node);
      if (!neighbours) {
        continue;
      }
      for (const neighbour of neighbours.keys()) {
        if (!reachable.has(neighbour)) {
          reachable.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    if (!next.length) {
      break;
    }
    frontier = next;
  }

  const matched = units.filter((unit) => reachable.has(unit.id));
  // หน่วยหลักขึ้นก่อนเสมอ ฟอร์มจะได้ default ถูกตัวโดยไม่ต้องเรียงเอง
  return [
    ...matched.filter((unit) => unit.id === baseUnitId),
    ...matched.filter((unit) => unit.id !== baseUnitId),
  ];
}
