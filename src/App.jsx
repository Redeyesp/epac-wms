import React, { useMemo, useState } from "react";
import {
  MapPinned,
  Package,
  Truck,
  Warehouse,
  Save,
  RotateCcw,
  Sparkles,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * =========================================================
 * ZONE CONFIG
 * =========================================================
 */
const ZONE_LAYOUTS = {
  A: { type: "multi_level_flat_lr", units: 125, levels: 5, usage: "storage" },
  B: { type: "multi_level_flat_lr", units: 392, levels: 5, usage: "storage" },
  C: { type: "multi_level_flat_lr", units: 202, levels: 5, usage: "storage" },

  G: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },
  H: { type: "multi_level_flat_lr", units: 40, levels: 5, usage: "storage" },
  I: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },
  J: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },
  K: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },
  L: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },
  M: { type: "multi_level_flat_lr", units: 100, levels: 5, usage: "storage" },

  E: { type: "row_14", rows: 64, cols: 14, usage: "storage", note: "FG / Repack FG" },
  F: { type: "row_14", rows: 56, cols: 14, usage: "storage", note: "FG / Repack FG" },

  Q: {
    type: "row_14_dispatch",
    usage: "dispatch_only",
    note: "Dispatch staging",
    lockedDrop: true,
    blocks: [
      { key: "Q1", label: "Q1", rows: 10, cols: 6 },
      { key: "Q2", label: "Q2", rows: 10, cols: 6 },
    ],
  },
  P: {
    type: "row_14_dispatch",
    usage: "dispatch_only",
    note: "Dispatch staging",
    lockedDrop: true,
    blocks: [{ key: "P", label: "P", rows: 14, cols: 6 }],
  },
};

const FG_FRIENDLY_ZONES = ["E", "F"];
const SEMI_FG_AVOID_ZONES = ["E", "F"];
const DISPATCH_STATUSES = [
  "Waiting to be Dispatch",
  "Loading",
  "Complete",
];

const WAREHOUSE_ZONES = [
  { id: "A", zoneKey: "A", label: "A", x: 120, y: 420, w: 420, h: 34, color: "#ead68d" },
  { id: "B", zoneKey: "B", label: "B", x: 260, y: 120, w: 350, h: 28, color: "#bcd0a5" },
  { id: "C", zoneKey: "C", label: "C", x: 20, y: 90, w: 590, h: 26, color: "#a9bfd7" },
  { id: "H", zoneKey: "H", label: "H", x: 380, y: 40, w: 230, h: 45, color: "#ef4444" },

  { id: "M", zoneKey: "M", label: "M", x: 120, y: 185, w: 36, h: 120, color: "#facc15" },
  { id: "L", zoneKey: "L", label: "L", x: 156, y: 185, w: 36, h: 120, color: "#2dd4bf" },
  { id: "K", zoneKey: "K", label: "K", x: 192, y: 185, w: 36, h: 120, color: "#fb923c" },
  { id: "J", zoneKey: "J", label: "J", x: 228, y: 185, w: 36, h: 120, color: "#f472b6" },
  { id: "I", zoneKey: "I", label: "I", x: 264, y: 185, w: 36, h: 120, color: "#60a5fa" },
  { id: "G", zoneKey: "G", label: "G", x: 300, y: 185, w: 36, h: 120, color: "#d6c3b3" },

  { id: "E", zoneKey: "E", label: "E", x: 390, y: 185, w: 120, h: 120, color: "#d946ef" },
  { id: "F", zoneKey: "F", label: "F", x: 510, y: 185, w: 130, h: 92, color: "#22d3ee" },

  { id: "Q1", zoneKey: "Q", label: "Q", x: 720, y: 40, w: 120, h: 110, color: "#86efac" },
  { id: "P", zoneKey: "P", label: "P", x: 720, y: 150, w: 120, h: 210, color: "#d8b4fe" },
  { id: "Q2", zoneKey: "Q", label: "Q", x: 510, y: 277, w: 130, h: 100, color: "#4ade80" },
];

/**
 * =========================================================
 * SAMPLE LOTS
 * =========================================================
 */
const initialLots = [
  { id: 1, sku: "BBLA047-1", lot: "17014", qty: 120, locationCode: "A1", slotId: "A-1-1-L", zone: "A", productType: "fg" },
  { id: 2, sku: "BBLA047-1", lot: "18014", qty: 80, locationCode: "A1", slotId: "A-1-1-R", zone: "A", productType: "fg" },
  { id: 3, sku: "BBLA052-2", lot: "21024", qty: 60, locationCode: "A2", slotId: "A-2-2-L", zone: "A", productType: "fg" },

  { id: 4, sku: "BBCA088-3", lot: "17024", qty: 40, locationCode: "B18", slotId: "B-3-18-R", zone: "B", productType: "fg" },
  { id: 5, sku: "BBLA061-1", lot: "02025", qty: 90, locationCode: "C7", slotId: "C-2-7-L", zone: "C", productType: "fg" },

  { id: 6, sku: "BBLA047-1", lot: "01025", qty: 35, locationCode: "E1", slotId: "E-1-1", zone: "E", productType: "fg" },
  { id: 7, sku: "BBCA088-3", lot: "02025", qty: 20, locationCode: "E2", slotId: "E-2-2", zone: "E", productType: "fg" },
  { id: 8, sku: "BBLA061-1", lot: "03025", qty: 50, locationCode: "F4", slotId: "F-4-10", zone: "F", productType: "fg" },

  { id: 9, sku: "UBLA047-1", lot: "15024", qty: 55, locationCode: "G1", slotId: "G-1-1-L", zone: "G", productType: "semi-fg" },
  { id: 10, sku: "UBLA047-1", lot: "16024", qty: 70, locationCode: "G1", slotId: "G-1-1-R", zone: "G", productType: "semi-fg" },
  { id: 11, sku: "UBCA088-3", lot: "05025", qty: 30, locationCode: "I6", slotId: "I-1-6-L", zone: "I", productType: "semi-fg" },
  { id: 12, sku: "UBCA091-2", lot: "06025", qty: 25, locationCode: "J10", slotId: "J-5-10-R", zone: "J", productType: "semi-fg" },
  { id: 13, sku: "BBHA001-1", lot: "01025", qty: 44, locationCode: "H1", slotId: "H-1-1-L", zone: "H", productType: "fg" },

  { id: 14, sku: "BBLA047-1", lot: "07025", qty: 100, locationCode: "Q1", slotId: "Q1-1-1", zone: "Q", status: "Waiting to be Dispatch", productType: "fg" },
  { id: 15, sku: "BBCA088-3", lot: "08025", qty: 65, locationCode: "Q2", slotId: "Q2-2-3", zone: "Q", status: "Loading", productType: "fg" },
  { id: 16, sku: "UBLA047-1", lot: "09025", qty: 85, locationCode: "P", slotId: "P-1-1", zone: "P", status: "Waiting to be Dispatch", productType: "semi-fg" },
];

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */
function makeSlotState(slotId, lots) {
  const relatedLots = lots.filter((l) => l.slotId === slotId && l.qty > 0);
  return {
    occupied: relatedLots.length > 0,
    lots: relatedLots,
  };
}

function buildLevelSequence(level, maxUnits, totalLevels = 5) {
  const result = [];
  for (let n = level; n <= maxUnits; n += totalLevels) {
    result.push(n);
  }
  return result;
}

function zoneTitle(zoneKey) {
  const cfg = ZONE_LAYOUTS[zoneKey];
  if (!cfg) return zoneKey;
  if (cfg.usage === "dispatch_only") return `Zone ${zoneKey} / Dispatch Only`;
  return `Zone ${zoneKey}`;
}

function getLotsByZone(zoneKey, lots) {
  return lots.filter((l) => l.zone === zoneKey);
}

function applyPendingMovesToLots(lots, pendingMoves) {
  const moveMap = new Map();
  pendingMoves.forEach((move) => {
    moveMap.set(move.lotId, move.toSlotId);
  });

  return lots.map((lot) => {
    const movedSlot = moveMap.get(lot.id);
    if (!movedSlot) return lot;

    const nextZone = deriveZoneFromSlot(movedSlot);
    return {
      ...lot,
      slotId: movedSlot,
      zone: nextZone,
      locationCode: deriveLocationCodeFromSlot(movedSlot, nextZone),
      status:
        nextZone === "P" || nextZone === "Q"
          ? lot.status || "Waiting to be Dispatch"
          : lot.status,
    };
  });
}

function deriveZoneFromSlot(slotId) {
  const prefix = String(slotId).split("-")[0];
  if (prefix === "Q1" || prefix === "Q2") return "Q";
  if (prefix === "P") return "P";
  return prefix;
}

function deriveLocationCodeFromSlot(slotId, zone) {
  if (ZONE_LAYOUTS[zone]?.type === "multi_level_flat_lr") {
    const [, , unitNo] = slotId.split("-");
    return `${zone}${unitNo}`;
  }

  if (ZONE_LAYOUTS[zone]?.type === "row_14") {
    const [, rowNo] = slotId.split("-");
    return `${zone}${rowNo}`;
  }

  if (ZONE_LAYOUTS[zone]?.type === "row_14_dispatch") {
    const [blockKey] = slotId.split("-");
    return blockKey;
  }

  return slotId;
}

function getPairPalette(unitNo) {
  const palettes = [
    { left: "#eaf2ff", right: "#d7e8ff" },
    { left: "#eef7f0", right: "#dff0e3" },
    { left: "#f4efff", right: "#e8ddff" },
    { left: "#fff3e8", right: "#ffe5cf" },
    { left: "#eef6ff", right: "#dcecff" },
  ];
  return palettes[(unitNo - 1) % palettes.length];
}

function getPendingMoveForLot(pendingMoves, lotId) {
  return pendingMoves.find((m) => m.lotId === lotId);
}

function pad2(v) {
  return String(v).padStart(2, "0");
}

function formatDateDisplay(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function parseMfgFromLot(lotNo) {
  if (!lotNo) return null;
  const digits = String(lotNo).replace(/\D/g, "");

  let dd;
  let mm;
  let yy;

  if (digits.length === 5) {
    dd = parseInt(digits.slice(0, 2), 10);
    mm = parseInt(digits.slice(2, 3), 10);
    yy = parseInt(digits.slice(3, 5), 10);
  } else if (digits.length >= 6) {
    dd = parseInt(digits.slice(0, 2), 10);
    mm = parseInt(digits.slice(2, 4), 10);
    yy = parseInt(digits.slice(4, 6), 10);
  } else {
    return null;
  }

  if (
    Number.isNaN(dd) ||
    Number.isNaN(mm) ||
    Number.isNaN(yy) ||
    dd < 1 ||
    dd > 31 ||
    mm < 1 ||
    mm > 12
  ) {
    return null;
  }

  const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;
  const date = new Date(fullYear, mm - 1, dd);

  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }

  return date;
}

function calcAgingDays(mfgDate, receivedDate) {
  if (!mfgDate || !receivedDate) return "";
  const mfg = new Date(mfgDate);
  const recv = new Date(receivedDate);

  if (Number.isNaN(mfg.getTime()) || Number.isNaN(recv.getTime())) return "";

  mfg.setHours(0, 0, 0, 0);
  recv.setHours(0, 0, 0, 0);

  return Math.floor((recv - mfg) / 86400000);
}

function makeAgingBuckets(days, qty) {
  const n = Number(qty) || 0;
  return {
    b0_30: days >= 0 && days <= 30 ? n : 0,
    b31_60: days >= 31 && days <= 60 ? n : 0,
    b61_90: days >= 61 && days <= 90 ? n : 0,
    b91_180: days >= 91 && days <= 180 ? n : 0,
    b181_364: days >= 181 && days <= 364 ? n : 0,
    b1_2: days >= 365 && days <= 730 ? n : 0,
    b2_3: days >= 731 && days <= 1095 ? n : 0,
    b3_4: days >= 1096 && days <= 1460 ? n : 0,
    b4plus: days >= 1461 ? n : 0,
  };
}

function getSkuFamily(sku) {
  if (!sku) return "";
  const normalized = String(sku).trim().toUpperCase();
  if (normalized.includes("-")) return normalized.split("-").slice(0, 1).join("-");
  return normalized.replace(/\d+$/, "");
}

function getZoneCapacity(zoneKey) {
  const cfg = ZONE_LAYOUTS[zoneKey];
  if (!cfg || cfg.usage !== "storage") return 0;

  if (cfg.type === "multi_level_flat_lr") return cfg.units * 2;
  if (cfg.type === "row_14") return cfg.rows * cfg.cols;
  return 0;
}

function getZoneUsedSlots(zoneKey, lots) {
  return new Set(
    lots.filter((l) => l.zone === zoneKey && l.qty > 0).map((l) => l.slotId)
  ).size;
}

function getZoneFreeSlots(zoneKey, lots) {
  return Math.max(0, getZoneCapacity(zoneKey) - getZoneUsedSlots(zoneKey, lots));
}

function getSlotLabel(slotId, zoneKey) {
  const cfg = ZONE_LAYOUTS[zoneKey];
  if (!cfg) return slotId;

  if (cfg.type === "multi_level_flat_lr") {
    const [z, , unitNo, side] = slotId.split("-");
    return `${z}${unitNo}${side}`;
  }

  if (cfg.type === "row_14") {
    const [z, rowNo, colNo] = slotId.split("-");
    return `${z}${rowNo}(${colNo})`;
  }

  if (slotId.startsWith("Q1") || slotId.startsWith("Q2") || slotId.startsWith("P")) {
    const [block, rowNo, colNo] = slotId.split("-");
    return `${block}${rowNo}(${colNo})`;
  }

  return slotId;
}

function getAllEmptySlotsInZone(zoneKey, lots) {
  const cfg = ZONE_LAYOUTS[zoneKey];
  if (!cfg) return [];

  const occupied = new Set(
    lots.filter((l) => l.zone === zoneKey && l.qty > 0).map((l) => l.slotId)
  );

  const slots = [];

  if (cfg.type === "multi_level_flat_lr") {
    for (let level = 1; level <= cfg.levels; level += 1) {
      for (let unitNo = 1; unitNo <= cfg.units; unitNo += 1) {
        const leftId = `${zoneKey}-${level}-${unitNo}-L`;
        const rightId = `${zoneKey}-${level}-${unitNo}-R`;
        if (!occupied.has(leftId)) slots.push(leftId);
        if (!occupied.has(rightId)) slots.push(rightId);
      }
    }
  }

  if (cfg.type === "row_14") {
    for (let rowNo = 1; rowNo <= cfg.rows; rowNo += 1) {
      for (let colNo = 1; colNo <= cfg.cols; colNo += 1) {
        const slotId = `${zoneKey}-${rowNo}-${colNo}`;
        if (!occupied.has(slotId)) slots.push(slotId);
      }
    }
  }

  return slots;
}

function getAllEmptyDispatchSlots(lots) {
  const occupied = new Set(
    lots
      .filter((l) => (l.zone === "P" || l.zone === "Q") && l.qty > 0)
      .map((l) => l.slotId)
  );

  const slots = [];

  const pCfg = ZONE_LAYOUTS.P.blocks[0];
  for (let rowNo = 1; rowNo <= pCfg.rows; rowNo += 1) {
    for (let colNo = 1; colNo <= pCfg.cols; colNo += 1) {
      const slotId = `P-${rowNo}-${colNo}`;
      if (!occupied.has(slotId)) slots.push(slotId);
    }
  }

  for (const block of ZONE_LAYOUTS.Q.blocks) {
    for (let rowNo = 1; rowNo <= block.rows; rowNo += 1) {
      for (let colNo = 1; colNo <= block.cols; colNo += 1) {
        const slotId = `${block.key}-${rowNo}-${colNo}`;
        if (!occupied.has(slotId)) slots.push(slotId);
      }
    }
  }

  return slots;
}

function findBestEmptySlotsNearSameSku(zoneKey, sku, lots, limit = 3) {
  const cfg = ZONE_LAYOUTS[zoneKey];
  if (!cfg) return [];

  const normalizedSku = String(sku || "").trim().toUpperCase();
  const zoneLots = lots.filter((l) => l.zone === zoneKey && l.qty > 0);
  const sameSkuLots = zoneLots.filter(
    (l) => String(l.sku).trim().toUpperCase() === normalizedSku
  );

  const occupied = new Set(zoneLots.map((l) => l.slotId));
  const candidates = [];

  if (cfg.type === "multi_level_flat_lr") {
    for (const lot of sameSkuLots) {
      const [z, level, unitNo, side] = lot.slotId.split("-");
      const otherSide = side === "L" ? "R" : "L";
      const pairedSlot = `${z}-${level}-${unitNo}-${otherSide}`;
      if (!occupied.has(pairedSlot) && !candidates.includes(pairedSlot)) {
        candidates.push(pairedSlot);
      }
    }
  }

  const fallback = getAllEmptySlotsInZone(zoneKey, lots);
  for (const slotId of fallback) {
    if (!candidates.includes(slotId)) candidates.push(slotId);
    if (candidates.length >= limit) break;
  }

  return candidates.slice(0, limit);
}

function findTopSuggestedPallets(inboundItem, lots) {
  const storageZones = Object.entries(ZONE_LAYOUTS)
    .filter(([, cfg]) => cfg.usage === "storage")
    .map(([zoneKey]) => zoneKey);

  const sku = String(inboundItem.sku || "").trim().toUpperCase();
  const skuFamily = getSkuFamily(sku);
  const productType = inboundItem.productType || "fg";

  const zoneStats = storageZones.map((zoneKey) => {
    const zoneLots = lots.filter((l) => l.zone === zoneKey && l.qty > 0);
    const sameSkuCount = zoneLots.filter(
      (l) => String(l.sku).trim().toUpperCase() === sku
    ).length;
    const familyCount = zoneLots.filter(
      (l) => getSkuFamily(l.sku) === skuFamily
    ).length;
    const freeSlots = getZoneFreeSlots(zoneKey, lots);

    let score =
      sameSkuCount > 0
        ? 1000 + sameSkuCount * 10 + freeSlots
        : familyCount > 0
          ? 500 + familyCount * 10 + freeSlots
          : freeSlots;

    if (productType === "semi-fg" && SEMI_FG_AVOID_ZONES.includes(zoneKey)) {
      score -= 500;
    }

    if (productType === "fg" && FG_FRIENDLY_ZONES.includes(zoneKey)) {
      score += 60;
    }

    return {
      zoneKey,
      sameSkuCount,
      familyCount,
      freeSlots,
      score,
    };
  });

  const rankedZones = zoneStats
    .filter((z) => z.freeSlots > 0)
    .sort((a, b) => b.score - a.score || a.zoneKey.localeCompare(b.zoneKey))
    .slice(0, 6);

  const slotCandidates = [];

  for (const zone of rankedZones) {
    const slots = findBestEmptySlotsNearSameSku(zone.zoneKey, sku, lots, 3);

    for (const slotId of slots) {
      let reason = `Zone ${zone.zoneKey} ยังมีช่องว่าง`;
      if (zone.sameSkuCount > 0) {
        reason = `ใกล้รหัสสินค้าเดียวกันมากที่สุดใน Zone ${zone.zoneKey}`;
      } else if (zone.familyCount > 0) {
        reason = `ใกล้กลุ่มรหัสสินค้าเดียวกันมากที่สุดใน Zone ${zone.zoneKey}`;
      }

      if (productType === "semi-fg" && SEMI_FG_AVOID_ZONES.includes(zone.zoneKey)) {
        reason += " และเป็น fallback หลังจากหลีกเลี่ยง E/F สำหรับ Semi-FG";
      }

      if (productType === "fg" && FG_FRIENDLY_ZONES.includes(zone.zoneKey)) {
        reason += " และเหมาะกับ FG";
      }

      slotCandidates.push({
        zone: zone.zoneKey,
        slotId,
        label: getSlotLabel(slotId, zone.zoneKey),
        sameSkuCount: zone.sameSkuCount,
        familyCount: zone.familyCount,
        freeSlots: zone.freeSlots,
        reason,
      });
    }
  }

  return slotCandidates.slice(0, 3);
}

function searchDispatchLots(lots, skuQuery, lotQuery, productType) {
  const skuQ = String(skuQuery || "").trim().toUpperCase();
  const lotQ = String(lotQuery || "").trim().toUpperCase();

  const filtered = lots.filter((l) => {
    if (l.qty <= 0) return false;
    if (l.status === "Complete") return false;
    if (skuQ && !String(l.sku).toUpperCase().includes(skuQ)) return false;
    if (lotQ && !String(l.lot).toUpperCase().includes(lotQ)) return false;
    if (productType && (l.productType || "fg") !== productType) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const zoneA = a.zone;
    const zoneB = b.zone;

    if (productType === "fg") {
      const aEF = FG_FRIENDLY_ZONES.includes(zoneA) ? 1 : 0;
      const bEF = FG_FRIENDLY_ZONES.includes(zoneB) ? 1 : 0;
      if (bEF !== aEF) return bEF - aEF;
    }

    if (productType === "semi-fg") {
      const aAvoid = SEMI_FG_AVOID_ZONES.includes(zoneA) ? 1 : 0;
      const bAvoid = SEMI_FG_AVOID_ZONES.includes(zoneB) ? 1 : 0;
      if (aAvoid !== bAvoid) return aAvoid - bAvoid;
    }

    return String(a.sku).localeCompare(String(b.sku));
  });
}

function suggestDispatchStageTarget(lot, lots) {
  const emptyStageSlots = getAllEmptyDispatchSlots(lots.filter((x) => x.id !== lot.id));
  const sameSkuStage = lots.filter(
    (x) =>
      x.id !== lot.id &&
      (x.zone === "P" || x.zone === "Q") &&
      x.qty > 0 &&
      x.status !== "Complete" &&
      String(x.sku).trim().toUpperCase() === String(lot.sku).trim().toUpperCase()
  );

  const candidates = [];

  for (const s of sameSkuStage) {
    const prefix = s.slotId.split("-")[0];
    const row = s.slotId.split("-")[1];
    const col = s.slotId.split("-")[2];

    const neighborIds = [
      `${prefix}-${row}-${Number(col) + 1}`,
      `${prefix}-${row}-${Number(col) - 1}`,
    ];

    for (const id of neighborIds) {
      if (emptyStageSlots.includes(id) && !candidates.includes(id)) {
        candidates.push(id);
      }
    }
  }

  for (const slotId of emptyStageSlots) {
    if (!candidates.includes(slotId)) candidates.push(slotId);
    if (candidates.length >= 3) break;
  }

  return candidates.slice(0, 3).map((slotId) => ({
    slotId,
    zone: deriveZoneFromSlot(slotId),
    label: getSlotLabel(slotId, deriveZoneFromSlot(slotId)),
    reason:
      sameSkuStage.length > 0
        ? "ใกล้รหัสสินค้าเดียวกันใน staging"
        : "ช่อง staging ว่าง",
  }));
}

/**
 * =========================================================
 * APP
 * =========================================================
 */
export default function App() {
  const [selectedZone, setSelectedZone] = useState("A");
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [lots, setLots] = useState(initialLots);
  const [pendingMoves, setPendingMoves] = useState([]);
  const [draggingLotId, setDraggingLotId] = useState(null);

  const [inboundForm, setInboundForm] = useState({
    sku: "",
    productType: "fg",
    receivedDate: "",
    lotNo: "",
    stockQty: "",
  });
  const [inboundResult, setInboundResult] = useState(null);
  const [selectedInboundCandidate, setSelectedInboundCandidate] = useState(null);

  const [dispatchForm, setDispatchForm] = useState({
    sku: "",
    lotNo: "",
    productType: "fg",
  });
  const [dispatchResults, setDispatchResults] = useState([]);
  const [selectedDispatchLot, setSelectedDispatchLot] = useState(null);
  const [dispatchPlan, setDispatchPlan] = useState(null);
  const [slotActionPlan, setSlotActionPlan] = useState(null);

  const displayLots = useMemo(
    () => applyPendingMovesToLots(lots, pendingMoves),
    [lots, pendingMoves]
  );

  const zoneCfg = ZONE_LAYOUTS[selectedZone];
  const zoneLots = useMemo(
    () => getLotsByZone(selectedZone, displayLots),
    [selectedZone, displayLots]
  );
  const selectedLots = zoneLots.filter((l) => l.slotId === selectedSlotId);

  const stats = useMemo(() => {
    const storageLots = displayLots.filter((l) => !["Q", "P"].includes(l.zone));
    const stagedLots = displayLots.filter(
      (l) => ["Q", "P"].includes(l.zone) && l.status !== "Complete"
    );
    return {
      totalLots: displayLots.filter((l) => l.status !== "Complete").length,
      storageLots: storageLots.length,
      stagedLots: stagedLots.length,
    };
  }, [displayLots]);

  function exportToExcel() {
    const rows = displayLots.map((lot, index) => ({
      ลำดับ: index + 1,
      รหัสสินค้า: lot.sku,
      ล็อตสินค้า: lot.lot,
      จำนวน: lot.qty,
      ประเภทสินค้า: lot.productType || "",
      โซน: lot.zone,
      ตำแหน่งจัดเก็บ: getSlotLabel(lot.slotId, lot.zone),
      SlotId: lot.slotId,
      รหัสตำแหน่ง: lot.locationCode,
      สถานะ: lot.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WMS_Stock");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(fileData, "EPAC_WMS_Stock.xlsx");
  }

  function addPendingMove(toSlotId) {
    if (!draggingLotId) return;

    const draggedLot = displayLots.find((l) => l.id === draggingLotId);
    if (!draggedLot) return;
    if (draggedLot.zone !== selectedZone) return;
    if (draggedLot.slotId === toSlotId) return;
    if (zoneCfg?.usage === "dispatch_only") return;

    setPendingMoves((prev) => {
      const others = prev.filter((m) => m.lotId !== draggingLotId);
      return [...others, { lotId: draggingLotId, toSlotId }];
    });
  }

  function savePendingMoves() {
    if (pendingMoves.length === 0) return;
    setLots((prev) => applyPendingMovesToLots(prev, pendingMoves));
    setPendingMoves([]);
    setDraggingLotId(null);
  }

  function resetPendingMoves() {
    setPendingMoves([]);
    setDraggingLotId(null);
  }

  function updateInboundField(field, value) {
    setInboundForm((prev) => ({ ...prev, [field]: value }));
  }

  function saveInbound() {
    if (
      !inboundForm.sku ||
      !inboundForm.receivedDate ||
      !inboundForm.lotNo ||
      !inboundForm.stockQty
    ) {
      return;
    }

    const mfgDate = parseMfgFromLot(inboundForm.lotNo);
    const agingDays = calcAgingDays(mfgDate, inboundForm.receivedDate);
    const stockQty = Number(inboundForm.stockQty) || 0;

    const buckets = makeAgingBuckets(agingDays, stockQty);
    const candidates = findTopSuggestedPallets(
      {
        sku: inboundForm.sku,
        productType: inboundForm.productType,
        stockQty,
      },
      displayLots
    );

    setSelectedInboundCandidate(null);

    setInboundResult({
      sku: inboundForm.sku,
      productType: inboundForm.productType,
      receivedDate: inboundForm.receivedDate,
      mfgDate,
      lotNo: inboundForm.lotNo,
      stockQty,
      agingDays,
      ...buckets,
      candidates,
    });
  }

  function chooseInboundCandidate(candidate) {
    setSelectedInboundCandidate(candidate);
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);
    setDraggingLotId(null);

    requestAnimationFrame(() => {
      const el = document.getElementById("warehouse-layout-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function confirmInboundToSelectedPallet() {
    if (!inboundResult || !selectedInboundCandidate) return;

    const newLot = {
      id: Date.now(),
      sku: inboundResult.sku,
      lot: inboundResult.lotNo,
      qty: inboundResult.stockQty,
      locationCode: deriveLocationCodeFromSlot(
        selectedInboundCandidate.slotId,
        selectedInboundCandidate.zone
      ),
      slotId: selectedInboundCandidate.slotId,
      zone: selectedInboundCandidate.zone,
      status: "stored",
      productType: inboundResult.productType,
    };

    setLots((prev) => [...prev, newLot]);

    setInboundForm({
      sku: "",
      productType: "fg",
      receivedDate: "",
      lotNo: "",
      stockQty: "",
    });

    setInboundResult(null);
    setSelectedInboundCandidate(null);
  }

  function updateDispatchField(field, value) {
    setDispatchForm((prev) => ({ ...prev, [field]: value }));
  }

  function runDispatchSearch() {
    const results = searchDispatchLots(
      displayLots,
      dispatchForm.sku,
      dispatchForm.lotNo,
      dispatchForm.productType
    );
    setDispatchResults(results);
    setSelectedDispatchLot(null);
    setDispatchPlan(null);
  }

  function selectDispatchLot(lot) {
    setSelectedDispatchLot(lot);
    setDispatchPlan(null);

    setSelectedZone(lot.zone);
    setSelectedSlotId(lot.slotId);

    requestAnimationFrame(() => {
      const el = document.getElementById("warehouse-layout-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function prepareDispatchAction(actionValue) {
    if (!selectedDispatchLot) return;

    const lot = selectedDispatchLot;

    setSelectedZone(lot.zone);
    setSelectedSlotId(lot.slotId);

    requestAnimationFrame(() => {
      const el = document.getElementById("warehouse-layout-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (actionValue === "dispatch_out") {
      setDispatchPlan({
        lotId: lot.id,
        sku: lot.sku,
        lotNo: lot.lot,
        currentZone: lot.zone,
        currentSlotId: lot.slotId,
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        action: "dispatch_out",
        candidates: [],
      });
      return;
    }

    if (actionValue === "move_to_stage") {
      const candidates = suggestDispatchStageTarget(lot, displayLots);
      setDispatchPlan({
        lotId: lot.id,
        sku: lot.sku,
        lotNo: lot.lot,
        currentZone: lot.zone,
        currentSlotId: lot.slotId,
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        action: "move_to_stage",
        candidates,
      });
    }
  }

  function pickDispatchCandidate(candidate) {
    setDispatchPlan((prev) => ({
      ...prev,
      selectedCandidate: candidate,
    }));
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);

    requestAnimationFrame(() => {
      const el = document.getElementById("warehouse-layout-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function confirmDispatchAction() {
    if (!dispatchPlan) return;

    if (dispatchPlan.action === "dispatch_out") {
      deleteLot(dispatchPlan.lotId);
      setDispatchPlan(null);
      setSelectedSlotId(null);
      return;
    }

    if (!dispatchPlan.selectedCandidate) return;

    const movedLots = lots.map((lot) => {
      if (lot.id !== dispatchPlan.lotId) return lot;
      const nextZone = deriveZoneFromSlot(dispatchPlan.selectedCandidate.slotId);
      return {
        ...lot,
        slotId: dispatchPlan.selectedCandidate.slotId,
        zone: nextZone,
        locationCode: deriveLocationCodeFromSlot(
          dispatchPlan.selectedCandidate.slotId,
          nextZone
        ),
        status:
          nextZone === "P" || nextZone === "Q"
            ? "Waiting to be Dispatch"
            : lot.status,
      };
    });

    setLots(movedLots);
    setSelectedZone(deriveZoneFromSlot(dispatchPlan.selectedCandidate.slotId));
    setSelectedSlotId(dispatchPlan.selectedCandidate.slotId);
    setSelectedDispatchLot(null);
    setDispatchPlan(null);

    const refreshedLots = applyPendingMovesToLots(movedLots, pendingMoves);
    setDispatchResults(
      searchDispatchLots(
        refreshedLots,
        dispatchForm.sku,
        dispatchForm.lotNo,
        dispatchForm.productType
      )
    );
  }

  function updateDispatchStatus(lotId, nextStatus) {
    if (nextStatus === "Complete") {
      deleteLot(lotId);
      return;
    }

    setLots((prev) =>
      prev.map((lot) =>
        lot.id === lotId ? { ...lot, status: nextStatus } : lot
      )
    );
    setDispatchResults((prev) =>
      prev.map((lot) =>
        lot.id === lotId ? { ...lot, status: nextStatus } : lot
      )
    );
    if (selectedDispatchLot?.id === lotId) {
      setSelectedDispatchLot((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
    }
  }

  function deleteLot(lotId) {
    setLots((prev) => prev.filter((lot) => lot.id !== lotId));
    setDispatchResults((prev) => prev.filter((lot) => lot.id !== lotId));
    if (selectedDispatchLot?.id === lotId) setSelectedDispatchLot(null);
    if (slotActionPlan?.lotId === lotId) setSlotActionPlan(null);

    const remainingSelected = selectedLots.filter((lot) => lot.id !== lotId);
    if (remainingSelected.length === 0) {
      setSelectedSlotId(null);
    }
  }

  function prepareSlotAction(lot, actionValue) {
    if (!lot) return;

    if (actionValue === "dispatch_out") {
      setSlotActionPlan({
        lotId: lot.id,
        action: "dispatch_out",
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        currentZone: lot.zone,
        candidates: [],
      });
      return;
    }

    if (actionValue === "move_to_fg") {
      const candidates = findTopSuggestedPallets(
        {
          sku: lot.sku,
          productType: "fg",
          stockQty: lot.qty,
        },
        displayLots.filter((x) => x.id !== lot.id)
      ).filter((c) => c.zone === "E" || c.zone === "F");

      setSlotActionPlan({
        lotId: lot.id,
        action: "move_to_fg",
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        currentZone: lot.zone,
        candidates,
      });
      return;
    }

    if (actionValue === "move_to_stage") {
      const candidates = suggestDispatchStageTarget(lot, displayLots);
      setSlotActionPlan({
        lotId: lot.id,
        action: "move_to_stage",
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        currentZone: lot.zone,
        candidates,
      });
    }
  }

  function pickSlotActionCandidate(candidate) {
    setSlotActionPlan((prev) => ({
      ...prev,
      selectedCandidate: candidate,
    }));
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);

    requestAnimationFrame(() => {
      const el = document.getElementById("warehouse-layout-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function confirmSlotAction() {
    if (!slotActionPlan) return;

    if (slotActionPlan.action === "dispatch_out") {
      deleteLot(slotActionPlan.lotId);
      setSlotActionPlan(null);
      return;
    }

    if (!slotActionPlan.selectedCandidate) return;

    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id !== slotActionPlan.lotId) return lot;
        const nextZone = deriveZoneFromSlot(slotActionPlan.selectedCandidate.slotId);
        return {
          ...lot,
          slotId: slotActionPlan.selectedCandidate.slotId,
          zone: nextZone,
          locationCode: deriveLocationCodeFromSlot(
            slotActionPlan.selectedCandidate.slotId,
            nextZone
          ),
          status:
            nextZone === "P" || nextZone === "Q"
              ? "Waiting to be Dispatch"
              : lot.status,
        };
      })
    );

    setSelectedZone(deriveZoneFromSlot(slotActionPlan.selectedCandidate.slotId));
    setSelectedSlotId(slotActionPlan.selectedCandidate.slotId);
    setSlotActionPlan(null);
  }

  return (
    <div style={pageStyle}>
      <div style={appContainerStyle}>
        <Header stats={stats} />

        <div style={dualTopGridStyle}>
          <InboundSection
            inboundForm={inboundForm}
            updateInboundField={updateInboundField}
            saveInbound={saveInbound}
            inboundResult={inboundResult}
            selectedInboundCandidate={selectedInboundCandidate}
            chooseInboundCandidate={chooseInboundCandidate}
            confirmInboundToSelectedPallet={confirmInboundToSelectedPallet}
          />

          <DispatchSection
            dispatchForm={dispatchForm}
            updateDispatchField={updateDispatchField}
            runDispatchSearch={runDispatchSearch}
            dispatchResults={dispatchResults}
            selectedDispatchLot={selectedDispatchLot}
            selectDispatchLot={selectDispatchLot}
            prepareDispatchAction={prepareDispatchAction}
            dispatchPlan={dispatchPlan}
            pickDispatchCandidate={pickDispatchCandidate}
            confirmDispatchAction={confirmDispatchAction}
          />
        </div>

        <div style={topSectionStyle}>
          <div style={mapSectionStyle}>
            <WarehouseMapPanel
              selectedZone={selectedZone}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setSelectedSlotId(null);
                setDraggingLotId(null);
                setSlotActionPlan(null);
              }}
            />
          </div>

          <div style={selectedDetailSectionStyle}>
            <SlotDetailPanel
              slotId={selectedSlotId}
              lots={selectedLots}
              updateDispatchStatus={updateDispatchStatus}
              prepareSlotAction={prepareSlotAction}
              slotActionPlan={slotActionPlan}
              pickSlotActionCandidate={pickSlotActionCandidate}
              confirmSlotAction={confirmSlotAction}
              deleteLot={deleteLot}
            />
          </div>
        </div>

        <div id="warehouse-layout-section" style={gridSectionStyle}>
          <div style={zoneTitleBarStyle}>
            <div>
              <h2 style={{ margin: 0 }}>{zoneTitle(selectedZone)}</h2>
              <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
                Type: <strong>{zoneCfg.type}</strong> · Usage: <strong>{zoneCfg.usage}</strong>
                {zoneCfg.note ? ` · ${zoneCfg.note}` : ""}
              </div>
            </div>

            <div style={actionBarStyle}>
              <div style={miniBadge}>Pending moves: {pendingMoves.length}</div>

              <button onClick={exportToExcel} style={secondaryBtnStyle}>
                Export Excel
              </button>

              <button
                onClick={resetPendingMoves}
                style={secondaryBtnStyle}
                disabled={pendingMoves.length === 0}
              >
                <RotateCcw size={14} />
                Reset
              </button>

              <button
                onClick={savePendingMoves}
                style={primaryBtnStyle}
                disabled={pendingMoves.length === 0}
              >
                <Save size={14} />
                Save Layout Changes
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            {zoneCfg.type === "multi_level_flat_lr" && (
              <MultiLevelFlatLRZoneInline
                zoneKey={selectedZone}
                cfg={zoneCfg}
                lots={zoneLots}
                selectedSlotId={selectedSlotId}
                setSelectedSlotId={setSelectedSlotId}
                draggingLotId={draggingLotId}
                setDraggingLotId={setDraggingLotId}
                onDropLot={addPendingMove}
                pendingMoves={pendingMoves}
              />
            )}

            {zoneCfg.type === "row_14" && (
              <Row14ZoneInline
                zoneKey={selectedZone}
                cfg={zoneCfg}
                lots={zoneLots}
                selectedSlotId={selectedSlotId}
                setSelectedSlotId={setSelectedSlotId}
                draggingLotId={draggingLotId}
                setDraggingLotId={setDraggingLotId}
                onDropLot={addPendingMove}
                pendingMoves={pendingMoves}
              />
            )}

            {zoneCfg.type === "row_14_dispatch" && (
              <DispatchZoneInline
                cfg={zoneCfg}
                lots={zoneLots}
                selectedSlotId={selectedSlotId}
                setSelectedSlotId={setSelectedSlotId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * HEADER
 * =========================================================
 */
function Header({ stats }) {
  return (
    <div style={heroStyle}>
      <div>
        <div style={heroEyebrowStyle}>Warehouse Management Prototype</div>
        <h1 style={{ margin: "8px 0 0 0", fontSize: 28 }}>EPAC WMS Demo</h1>
        <div style={{ color: "#475569", marginTop: 8 }}>
          Inbound suggestion, lot tracking, dispatch planning, and layout visualization
        </div>
      </div>

      <div style={heroStatsWrapStyle}>
        <StatCard icon={<Package size={18} />} label="Total Lots" value={stats.totalLots} />
        <StatCard icon={<Warehouse size={18} />} label="Storage Lots" value={stats.storageLots} />
        <StatCard icon={<Truck size={18} />} label="Staged Lots" value={stats.stagedLots} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={statCardStyle}>
      <div style={statIconStyle}>{icon}</div>
      <div>
        <div style={statLabelStyle}>{label}</div>
        <div style={statValueStyle}>{value}</div>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * INBOUND
 * =========================================================
 */
function InboundSection({
  inboundForm,
  updateInboundField,
  saveInbound,
  inboundResult,
  selectedInboundCandidate,
  chooseInboundCandidate,
  confirmInboundToSelectedPallet,
}) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Inbound</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            ใส่ข้อมูลรับเข้าแล้วระบบจะ suggest pallet ที่เหมาะสม
          </div>
        </div>
        <div style={headerIconBadgeStyle}>
          <Sparkles size={16} />
          Suggest
        </div>
      </div>

      <div style={inboundFormGridStyle}>
        <label style={fieldStyle}>
          <span>รหัสสินค้า</span>
          <input
            value={inboundForm.sku}
            onChange={(e) => updateInboundField("sku", e.target.value)}
            style={inputStyle}
            placeholder="เช่น BBLA047-1"
          />
        </label>

        <label style={fieldStyle}>
          <span>ประเภทสินค้า</span>
          <select
            value={inboundForm.productType}
            onChange={(e) => updateInboundField("productType", e.target.value)}
            style={inputStyle}
          >
            <option value="fg">FG</option>
            <option value="semi-fg">Semi-FG</option>
          </select>
        </label>

        <label style={fieldStyle}>
          <span>Received Date</span>
          <input
            type="date"
            value={inboundForm.receivedDate}
            onChange={(e) => updateInboundField("receivedDate", e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span>ล็อตสินค้า</span>
          <input
            value={inboundForm.lotNo}
            onChange={(e) => updateInboundField("lotNo", e.target.value)}
            style={inputStyle}
            placeholder="เช่น 17014"
          />
        </label>

        <label style={fieldStyle}>
          <span>Qty</span>
          <input
            type="number"
            value={inboundForm.stockQty}
            onChange={(e) => updateInboundField("stockQty", e.target.value)}
            style={inputStyle}
            placeholder="เช่น 120"
          />
        </label>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={saveInbound} style={primaryBtnStyle}>
            <Search size={14} />
            Suggest Pallet
          </button>
        </div>
      </div>

      {inboundResult && (
        <div style={{ marginTop: 18 }}>
          <div style={suggestMetaGridStyle}>
            <div style={suggestMetaItemStyle}>SKU: <strong>{inboundResult.sku}</strong></div>
            <div style={suggestMetaItemStyle}>Type: <strong>{inboundResult.productType}</strong></div>
            <div style={suggestMetaItemStyle}>ล็อตสินค้า: <strong>{inboundResult.lotNo}</strong></div>
            <div style={suggestMetaItemStyle}>MFG: <strong>{formatDateDisplay(inboundResult.mfgDate)}</strong></div>
            <div style={suggestMetaItemStyle}>Aging days: <strong>{inboundResult.agingDays}</strong></div>
            <div style={suggestMetaItemStyle}>Qty used: <strong>{inboundResult.stockQty}</strong></div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Choose 1 pallet</div>
            <div style={{ display: "grid", gap: 10 }}>
              {inboundResult.candidates?.length ? (
                inboundResult.candidates.map((candidate, idx) => (
                  <button
                    key={candidate.slotId}
                    onClick={() => chooseInboundCandidate(candidate)}
                    style={{
                      ...candidateBtnStyle,
                      border:
                        selectedInboundCandidate?.slotId === candidate.slotId
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      background:
                        selectedInboundCandidate?.slotId === candidate.slotId
                          ? "#eff6ff"
                          : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>#{idx + 1} · {candidate.label}</div>
                    <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                      Zone {candidate.zone} · same SKU {candidate.sameSkuCount} · family {candidate.familyCount} · free {candidate.freeSlots}
                    </div>
                    <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>
                      {candidate.reason}
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ color: "#64748b" }}>ไม่พบ pallet ที่เหมาะสม</div>
              )}
            </div>
          </div>

          {selectedInboundCandidate && (
            <div style={confirmBoxStyle}>
              <div style={{ fontWeight: 800 }}>
                ยืนยันที่ pallet นี้ไหม: {selectedInboundCandidate.label}
              </div>
              <div style={{ color: "#475569", marginTop: 6 }}>
                ระบบได้เด้งไปยังตำแหน่งจริงด้านล่างแล้ว
              </div>
              <div style={{ marginTop: 12 }}>
                <button onClick={confirmInboundToSelectedPallet} style={primaryBtnStyle}>
                  ยืนยันจัดเก็บที่พาเลตนี้
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * =========================================================
 * DISPATCH
 * =========================================================
 */
function DispatchSection({
  dispatchForm,
  updateDispatchField,
  runDispatchSearch,
  dispatchResults,
  selectedDispatchLot,
  selectDispatchLot,
  prepareDispatchAction,
  dispatchPlan,
  pickDispatchCandidate,
  confirmDispatchAction,
}) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Dispatch</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            ค้นหาจากรหัสสินค้าและล็อตสินค้า แล้วเลือก FG / Semi-FG เพื่อ suggest pallet ก่อน
          </div>
        </div>
      </div>

      <div style={inboundFormGridStyle}>
        <label style={fieldStyle}>
          <span>ค้นหารหัสสินค้า</span>
          <input
            value={dispatchForm.sku}
            onChange={(e) => updateDispatchField("sku", e.target.value)}
            style={inputStyle}
            placeholder="เช่น BBLA047-1"
          />
        </label>

        <label style={fieldStyle}>
          <span>ค้นหาล็อตสินค้า</span>
          <input
            value={dispatchForm.lotNo}
            onChange={(e) => updateDispatchField("lotNo", e.target.value)}
            style={inputStyle}
            placeholder="เช่น 17014"
          />
        </label>

        <label style={fieldStyle}>
          <span>ประเภทสินค้า</span>
          <select
            value={dispatchForm.productType}
            onChange={(e) => updateDispatchField("productType", e.target.value)}
            style={inputStyle}
          >
            <option value="fg">FG</option>
            <option value="semi-fg">Semi-FG</option>
          </select>
        </label>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={runDispatchSearch} style={primaryBtnStyle}>
            <Search size={14} />
            Search Dispatch
          </button>
        </div>
      </div>

      {dispatchResults.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>ผลการค้นหา</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dispatchResults.map((lot) => (
              <button
                key={lot.id}
                onClick={() => selectDispatchLot(lot)}
                style={{
                  ...dispatchLotCardStyle,
                  textAlign: "left",
                  border:
                    selectedDispatchLot?.id === lot.id
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
                  background:
                    selectedDispatchLot?.id === lot.id
                      ? "#eff6ff"
                      : "#fff",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{lot.sku}</div>
                    <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                      ล็อตสินค้า: {lot.lot} · Qty: {lot.qty}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {getSlotLabel(lot.slotId, lot.zone)} · Zone {lot.zone} · Type {lot.productType || "fg"}
                    </div>
                  </div>

                  {(lot.zone === "P" || lot.zone === "Q") && (
                    <div style={statusPillStyle}>{lot.status || "Waiting to be Dispatch"}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedDispatchLot && (
        <div style={confirmBoxStyle}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Dispatch Action</div>
          <div style={{ color: "#475569", marginTop: 8 }}>
            รหัสสินค้า: <strong>{selectedDispatchLot.sku}</strong> · ล็อตสินค้า: <strong>{selectedDispatchLot.lot}</strong>
          </div>
          <div style={{ color: "#475569", marginTop: 6 }}>
            จะทำรายการจาก pallet: <strong>{getSlotLabel(selectedDispatchLot.slotId, selectedDispatchLot.zone)}</strong>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => prepareDispatchAction("dispatch_out")} style={secondaryBtnStyle}>
              Dispatch Out
            </button>
            <button onClick={() => prepareDispatchAction("move_to_stage")} style={secondaryBtnStyle}>
              Move to P / Q1 / Q2
            </button>
          </div>

          {dispatchPlan?.action === "dispatch_out" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: "#475569" }}>
                ยืนยันการ Dispatch Out จาก <strong>{dispatchPlan.currentLabel}</strong>
              </div>
              <button onClick={confirmDispatchAction} style={{ ...primaryBtnStyle, marginTop: 10 }}>
                Confirm Dispatch Out
              </button>
            </div>
          )}

          {dispatchPlan?.action === "move_to_stage" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: "#475569", marginBottom: 10 }}>
                เลือกตำแหน่ง staging ปลายทาง
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {dispatchPlan.candidates?.length ? (
                  dispatchPlan.candidates.map((candidate) => (
                    <button
                      key={candidate.slotId}
                      onClick={() => pickDispatchCandidate(candidate)}
                      style={{
                        ...candidateBtnStyle,
                        justifyContent: "space-between",
                        border:
                          dispatchPlan.selectedCandidate?.slotId === candidate.slotId
                            ? "2px solid #2563eb"
                            : "1px solid #cbd5e1",
                        background:
                          dispatchPlan.selectedCandidate?.slotId === candidate.slotId
                            ? "#eff6ff"
                            : "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{candidate.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {candidate.reason}
                      </div>
                    </button>
                  ))
                ) : (
                  <div style={{ color: "#64748b" }}>ไม่พบช่อง staging ว่าง</div>
                )}
              </div>

              {dispatchPlan.selectedCandidate && (
                <button onClick={confirmDispatchAction} style={{ ...primaryBtnStyle, marginTop: 12 }}>
                  Confirm Move to {dispatchPlan.selectedCandidate.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * =========================================================
 * MAP PANEL
 * =========================================================
 */
function WarehouseMapPanel({ selectedZone, onSelectZone }) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Warehouse Map</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            คลิก zone เพื่อดู layout ด้านล่าง
          </div>
        </div>
        <div style={headerIconBadgeStyle}>
          <MapPinned size={16} />
          Map
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg width="880" height="500" viewBox="0 0 880 500" style={mapSvgStyle}>
          <rect x="8" y="8" width="864" height="484" rx="18" fill="#f8fafc" stroke="#cbd5e1" />
          {WAREHOUSE_ZONES.map((zone) => {
            const isSelected = zone.zoneKey === selectedZone;
            return (
              <g
                key={zone.id}
                onClick={() => onSelectZone(zone.zoneKey)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx="8"
                  fill={zone.color}
                  stroke={isSelected ? "#1d4ed8" : "#475569"}
                  strokeWidth={isSelected ? 3 : 1.2}
                  opacity={0.92}
                />
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {zone.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * SLOT DETAIL
 * =========================================================
 */
function SlotDetailPanel({
  slotId,
  lots,
  updateDispatchStatus,
  prepareSlotAction,
  slotActionPlan,
  pickSlotActionCandidate,
  confirmSlotAction,
  deleteLot,
}) {
  if (!slotId) {
    return (
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Selected Slot Detail</h2>
            <div style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>
              เลือก pallet จาก warehouse layout
            </div>
          </div>
        </div>
        <div style={{ color: "#64748b" }}>ยังไม่ได้เลือกตำแหน่ง</div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Selected Slot Detail</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            Slot: <strong>{slotId}</strong>
          </div>
        </div>
      </div>

      {lots.length === 0 ? (
        <div style={{ color: "#64748b" }}>ไม่มีสินค้าในตำแหน่งนี้</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {lots.map((lot) => {
            const isStorageNormal = !["E", "F", "Q", "P"].includes(lot.zone);
            const isEF = ["E", "F"].includes(lot.zone);
            const isStage = ["Q", "P"].includes(lot.zone);

            return (
              <div key={lot.id} style={miniLotCardStyle}>
                <div style={{ fontWeight: 800 }}>{lot.sku}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  ล็อตสินค้า: {lot.lot}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  Qty: {lot.qty}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  Zone: {lot.zone} · Location: {lot.locationCode}
                </div>

                {isStage && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Status</div>
                    <select
                      value={lot.status || "Waiting to be Dispatch"}
                      onChange={(e) => updateDispatchStatus?.(lot.id, e.target.value)}
                      style={inputStyle}
                    >
                      {DISPATCH_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => prepareSlotAction?.(lot, "dispatch_out")}
                    style={secondaryBtnStyle}
                  >
                    Dispatch Out
                  </button>

                  {isStorageNormal && (
                    <>
                      <button
                        onClick={() => prepareSlotAction?.(lot, "move_to_fg")}
                        style={secondaryBtnStyle}
                      >
                        Move to E / F
                      </button>
                      <button
                        onClick={() => prepareSlotAction?.(lot, "move_to_stage")}
                        style={secondaryBtnStyle}
                      >
                        Move to Q / P
                      </button>
                    </>
                  )}

                  {isEF && (
                    <button
                      onClick={() => prepareSlotAction?.(lot, "move_to_stage")}
                      style={secondaryBtnStyle}
                    >
                      Move to Q / P
                    </button>
                  )}

                  <button
                    onClick={() => deleteLot?.(lot.id)}
                    style={{
                      ...secondaryBtnStyle,
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                      background: "#fff5f5",
                    }}
                  >
                    Delete
                  </button>
                </div>

                {slotActionPlan?.lotId === lot.id && slotActionPlan.action === "dispatch_out" && (
                  <div style={confirmBoxStyle}>
                    <div style={{ color: "#475569" }}>
                      ยืนยันการ Dispatch Out จาก <strong>{slotActionPlan.currentLabel}</strong>
                    </div>
                    <button onClick={confirmSlotAction} style={{ ...primaryBtnStyle, marginTop: 10 }}>
                      Confirm Dispatch Out
                    </button>
                  </div>
                )}

                {slotActionPlan?.lotId === lot.id &&
                  (slotActionPlan.action === "move_to_fg" ||
                    slotActionPlan.action === "move_to_stage") && (
                    <div style={confirmBoxStyle}>
                      <div style={{ color: "#475569", marginBottom: 10 }}>
                        เลือกปลายทาง
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {slotActionPlan.candidates?.length ? (
                          slotActionPlan.candidates.map((candidate) => (
                            <button
                              key={candidate.slotId}
                              onClick={() => pickSlotActionCandidate?.(candidate)}
                              style={{
                                ...candidateBtnStyle,
                                border:
                                  slotActionPlan.selectedCandidate?.slotId === candidate.slotId
                                    ? "2px solid #2563eb"
                                    : "1px solid #cbd5e1",
                                background:
                                  slotActionPlan.selectedCandidate?.slotId === candidate.slotId
                                    ? "#eff6ff"
                                    : "#fff",
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{candidate.label}</div>
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                {candidate.reason}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div style={{ color: "#64748b" }}>ไม่พบช่องปลายทางว่าง</div>
                        )}
                      </div>

                      {slotActionPlan.selectedCandidate && (
                        <button onClick={confirmSlotAction} style={{ ...primaryBtnStyle, marginTop: 12 }}>
                          Confirm Move to {slotActionPlan.selectedCandidate.label}
                        </button>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * =========================================================
 * ZONE RENDERERS
 * =========================================================
 */
function MultiLevelFlatLRZoneInline({
  zoneKey,
  cfg,
  lots,
  selectedSlotId,
  setSelectedSlotId,
  draggingLotId,
  setDraggingLotId,
  onDropLot,
  pendingMoves,
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: cfg.levels }, (_, idx) => idx + 1).map((level) => {
        const unitNos = buildLevelSequence(level, cfg.units, cfg.levels);
        return (
          <div key={level}>
            <div style={levelHeaderStyle}>Level {level}</div>
            <div style={flatRowWrapStyle}>
              {unitNos.map((unitNo) => {
                const pairPalette = getPairPalette(unitNo);
                const leftId = `${zoneKey}-${level}-${unitNo}-L`;
                const rightId = `${zoneKey}-${level}-${unitNo}-R`;

                const leftState = makeSlotState(leftId, lots);
                const rightState = makeSlotState(rightId, lots);

                return (
                  <div key={`${zoneKey}-${unitNo}-${level}`} style={pairBlockStyle}>
                    <div style={pairLabelStyle}>{zoneKey}{unitNo}</div>

                    <SlotTile
                      slotId={leftId}
                      label={`${zoneKey}${unitNo}L`}
                      state={leftState}
                      selected={selectedSlotId === leftId}
                      onSelect={() => setSelectedSlotId(leftId)}
                      bg={pairPalette.left}
                      draggingLotId={draggingLotId}
                      setDraggingLotId={setDraggingLotId}
                      onDropLot={onDropLot}
                      pendingMove={getPendingMoveForLot(pendingMoves, leftState.lots[0]?.id)}
                      compact
                    />

                    <SlotTile
                      slotId={rightId}
                      label={`${zoneKey}${unitNo}R`}
                      state={rightState}
                      selected={selectedSlotId === rightId}
                      onSelect={() => setSelectedSlotId(rightId)}
                      bg={pairPalette.right}
                      draggingLotId={draggingLotId}
                      setDraggingLotId={setDraggingLotId}
                      onDropLot={onDropLot}
                      pendingMove={getPendingMoveForLot(pendingMoves, rightState.lots[0]?.id)}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row14ZoneInline({
  zoneKey,
  cfg,
  lots,
  selectedSlotId,
  setSelectedSlotId,
  draggingLotId,
  setDraggingLotId,
  onDropLot,
  pendingMoves,
}) {
  const rows = Array.from({ length: cfg.rows }, (_, idx) => idx + 1);
  const cols = Array.from({ length: cfg.cols }, (_, idx) => idx + 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={row14GridStyle(cfg.cols)}>
        {rows.map((rowNo) =>
          cols.map((colNo) => {
            const slotId = `${zoneKey}-${rowNo}-${colNo}`;
            const state = makeSlotState(slotId, lots);

            return (
              <SlotTile
                key={slotId}
                slotId={slotId}
                label={`${zoneKey}${rowNo}(${colNo})`}
                state={state}
                selected={selectedSlotId === slotId}
                onSelect={() => setSelectedSlotId(slotId)}
                bg="#f8fafc"
                draggingLotId={draggingLotId}
                setDraggingLotId={setDraggingLotId}
                onDropLot={onDropLot}
                pendingMove={getPendingMoveForLot(pendingMoves, state.lots[0]?.id)}
                compact
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function DispatchZoneInline({
  cfg,
  lots,
  selectedSlotId,
  setSelectedSlotId,
}) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {cfg.blocks.map((block) => {
        const rows = Array.from({ length: block.rows }, (_, idx) => idx + 1);
        const cols = Array.from({ length: block.cols }, (_, idx) => idx + 1);

        return (
          <div key={block.key}>
            <div style={levelHeaderStyle}>{block.label}</div>

            <div style={dispatchCompactGridStyle(block.cols)}>
              {rows.map((rowNo) =>
                cols.map((colNo) => {
                  const slotId = `${block.key}-${rowNo}-${colNo}`;
                  const state = makeSlotState(slotId, lots);
                  const isSelected = selectedSlotId === slotId;

                  return (
                    <button
                      key={slotId}
                      onClick={() => setSelectedSlotId(slotId)}
                      title={getSlotLabel(slotId, deriveZoneFromSlot(slotId))}
                      style={{
                        ...dispatchCompactCellStyle,
                        background: isSelected
                          ? "#dbeafe"
                          : state.occupied
                            ? "#0f172a"
                            : "#f8fafc",
                        color: state.occupied ? "#fff" : "#0f172a",
                        border: isSelected
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      }}
                    >
                      {`${block.key}${rowNo}(${colNo})`}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotTile({
  slotId,
  label,
  state,
  selected,
  onSelect,
  bg,
  draggingLotId,
  setDraggingLotId,
  onDropLot,
  pendingMove,
  compact = false,
}) {
  return (
    <button
      onClick={onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropLot?.(slotId)}
      title={label}
      style={{
        ...slotTileStyleBase,
        minHeight: compact ? 22 : 24,
        height: compact ? 22 : 24,
        background: selected ? "#dbeafe" : state.occupied ? "#0f172a" : bg,
        color: state.occupied ? "#fff" : "#0f172a",
        border: selected ? "2px solid #2563eb" : "1px solid #cbd5e1",
        padding: 1,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 7,
          lineHeight: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>

      {pendingMove && (
        <div
          style={{
            marginTop: 1,
            fontSize: 6,
            color: selected ? "#1d4ed8" : "#93c5fd",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          M
        </div>
      )}
    </button>
  );
}

/**
 * =========================================================
 * STYLES
 * =========================================================
 */
const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
  padding: 24,
  color: "#0f172a",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const appContainerStyle = {
  maxWidth: 1600,
  margin: "0 auto",
  display: "grid",
  gap: 20,
};

const heroStyle = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 16,
  padding: 22,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #dbeafe",
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
};

const heroEyebrowStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
};

const heroStatsWrapStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const statCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const statIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
};

const statLabelStyle = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
};

const statValueStyle = {
  fontSize: 22,
  fontWeight: 800,
  marginTop: 2,
};

const dualTopGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const topSectionStyle = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 20,
};

const mapSectionStyle = {};
const selectedDetailSectionStyle = {};
const gridSectionStyle = { display: "grid", gap: 12 };

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 12,
  marginBottom: 14,
};

const headerIconBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
};

const inboundFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const primaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const suggestMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const suggestMetaItemStyle = {
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 13,
};

const candidateBtnStyle = {
  display: "block",
  textAlign: "left",
  width: "100%",
  padding: 12,
  borderRadius: 14,
  background: "#fff",
  cursor: "pointer",
};

const confirmBoxStyle = {
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #dbeafe",
};

const dispatchLotCardStyle = {
  padding: 12,
  borderRadius: 14,
};

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4338ca",
  fontSize: 12,
  fontWeight: 700,
  height: "fit-content",
};

const mapSvgStyle = {
  width: "100%",
  minWidth: 880,
  height: "auto",
  display: "block",
};

const miniLotCardStyle = {
  padding: 12,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const zoneTitleBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const actionBarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const miniBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
};

const levelHeaderStyle = {
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 8,
  paddingBottom: 4,
  borderBottom: "1px dashed #cbd5e1",
  fontSize: 12,
};

const flatRowWrapStyle = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
};

const pairBlockStyle = {
  width: 64,
  borderRadius: 8,
  padding: 3,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  columnGap: 3,
  rowGap: 3,
  alignItems: "start",
};

const pairLabelStyle = {
  gridColumn: "1 / span 2",
  textAlign: "center",
  fontWeight: 800,
  fontSize: 8,
  marginBottom: 1,
  color: "#334155",
  lineHeight: 1,
};

const row14GridStyle = (cols) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 42px)`,
  gap: 4,
  width: "max-content",
});

const slotTileStyleBase = {
  width: "100%",
  borderRadius: 6,
  textAlign: "center",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const dispatchCompactGridStyle = (cols) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 42px)`,
  gap: 4,
  width: "max-content",
});

const dispatchCompactCellStyle = {
  width: 42,
  height: 24,
  padding: 0,
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 8,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  whiteSpace: "nowrap",
};