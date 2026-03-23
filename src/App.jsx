import React, { useEffect, useMemo, useState } from "react";
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
import stockSeed from "./data/stockSeed.json";

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

  E: { type: "row_14", rows: 64, cols: 14, usage: "storage", note: "Semi-Finished Goods" },
  F: { type: "row_14", rows: 56, cols: 14, usage: "storage", note: "Semi-Finished Goods" },

  P: {
    type: "row_14_dispatch",
    usage: "storage",
    note: "Semi-Finished Goods",
    blocks: [{ key: "P", label: "P", rows: 14, cols: 6 }],
  },

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
};

const STORAGE_ZONES = ["A", "B", "C", "E", "F", "G", "H", "I", "J", "K", "L", "M", "P"];
const DISPATCH_ONLY_ZONES = ["Q"];
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

  { id: "P", zoneKey: "P", label: "P", x: 720, y: 155, w: 120, h: 210, color: "#d8b4fe" },
  { id: "Q1", zoneKey: "Q", label: "Q", x: 720, y: 40, w: 120, h: 110, color: "#86efac" },
  { id: "Q2", zoneKey: "Q", label: "Q", x: 510, y: 277, w: 130, h: 100, color: "#4ade80" },
];

/**
 * =========================================================
 * MOCK DATA
 * =========================================================
 * Loaded from ./data/stockSeed.json
 */

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

function parseNumberLike(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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
      status: nextZone === "Q" ? lot.status || "Waiting to be Dispatch" : lot.status,
    };
  });
}

function deriveZoneFromSlot(slotId) {
  const prefix = String(slotId).split("-")[0];
  if (prefix === "Q1" || prefix === "Q2") return "Q";
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

function deriveZoneFromRawRecord(raw) {
  const explicitZone = String(raw.zone || "").trim().toUpperCase();
  if (explicitZone) return explicitZone;

  const log = String(raw.log || raw.slotCode || raw.locationCode || "").trim().toUpperCase();
  if (log) {
    if (log.startsWith("Q1")) return "Q";
    if (log.startsWith("Q2")) return "Q";
    const match = log.match(/^[A-Z]+/);
    if (match) return match[0].charAt(0);
  }

  const existingSlotId = String(
    raw.slotId || raw.targetSlotId || raw.suggestedSlotId || ""
  )
    .trim()
    .toUpperCase();
  if (existingSlotId) {
    const prefix = existingSlotId.split("-")[0];
    if (prefix === "Q1" || prefix === "Q2") return "Q";
    return prefix.charAt(0);
  }

  return "";
}

function normalizeSlotIdFromRecord(raw) {
  const zone = deriveZoneFromRawRecord(raw);
  const log = String(raw.log || raw.slotCode || raw.locationCode || "")
    .trim()
    .toUpperCase();
  const existing = String(
    raw.slotId || raw.targetSlotId || raw.suggestedSlotId || ""
  )
    .trim()
    .toUpperCase();

  const rowIndex = Math.max(1, Number(raw.rowIndexInLog || 1));

  if (["A", "B", "C", "G", "H", "I", "J", "K", "L", "M"].includes(zone)) {
    const logNumber = Number.parseInt(log.replace(/^[A-Z]+/, ""), 10);
    if (Number.isFinite(logNumber)) {
      const level = ((logNumber - 1) % 5) + 1;
      const side = rowIndex % 2 === 0 ? "R" : "L";
      return `${zone}-${level}-${logNumber}-${side}`;
    }
  }

  if (["E", "F"].includes(zone)) {
    const logNumber = Number.parseInt(log.replace(/^[A-Z]+/, ""), 10);
    if (Number.isFinite(logNumber)) {
      const colNo = ((rowIndex - 1) % 14) + 1;
      return `${zone}-${logNumber}-${colNo}`;
    }
  }

  if (zone === "P") {
    if (existing.startsWith("P-")) return existing;
    const rowNo = Math.max(
      1,
      Number.parseInt(log.replace(/[^0-9]/g, ""), 10) || rowIndex
    );
    const colNo = Math.max(1, ((rowIndex - 1) % 6) + 1);
    return `P-${rowNo}-${colNo}`;
  }

  if (zone === "Q") {
    if (existing.startsWith("Q1-") || existing.startsWith("Q2-")) return existing;
    const blockKey = log.startsWith("Q2") ? "Q2" : "Q1";
    const rowNo = Math.max(
      1,
      Number.parseInt(log.replace(/[^0-9]/g, ""), 10) || rowIndex
    );
    return `${blockKey}-${rowNo}-1`;
  }

  return existing || "";
}

function normalizeLotRecord(raw, fallbackId) {
  const zone = deriveZoneFromRawRecord(raw);
  const slotId = normalizeSlotIdFromRecord({ ...raw, zone });
  const lotDates = resolveLotDates(raw);

  return {
    ...raw,
    ...lotDates,
    id: Number(raw.id ?? fallbackId),
    slotId,
    lot: raw.lot ?? raw.lotNo ?? "",
    qty: parseNumberLike(raw.qty ?? raw.stockQty ?? raw.Stock ?? 0),
    zone: zone || (slotId ? deriveZoneFromSlot(slotId) : ""),
    locationCode:
      raw.locationCode ||
      raw.slotCode ||
      raw.log ||
      (slotId ? deriveLocationCodeFromSlot(slotId, zone) : ""),
    productType: raw.productType || "semi-fg",
    status: raw.status || "",
  };
}

function getPairLocation(unitNo) {
  const locations = [
    { left: "#eaf2ff", right: "#d7e8ff" },
    { left: "#eef7f0", right: "#dff0e3" },
    { left: "#f4efff", right: "#e8ddff" },
    { left: "#fff3e8", right: "#ffe5cf" },
    { left: "#eef6ff", right: "#dcecff" },
  ];
  return locations[(unitNo - 1) % locations.length];
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

function calcAgingDays(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((end - start) / 86400000));
}

function calcCurrentAgingDays(mfgDate, receivedDate, referenceDate = getTodayIsoDate()) {
  const baseDate = mfgDate || receivedDate;
  if (!baseDate || !referenceDate) return "";
  return calcAgingDays(baseDate, referenceDate);
}

function toIsoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getTodayIsoDate() {
  return toIsoDate(new Date());
}

function resolveLotDates(raw) {
  const receivedDate =
    raw.receivedDate || raw.received_date || raw.recvDate || raw.receiptDate || "";

  const explicitMfg = raw.mfgDate || raw.mfg_date || raw.manufacturingDate || "";
  const parsedMfg = explicitMfg ? new Date(explicitMfg) : parseMfgFromLot(raw.lot ?? raw.lotNo ?? "");
  const safeMfg = parsedMfg && !Number.isNaN(parsedMfg.getTime()) ? toIsoDate(parsedMfg) : "";
  const safeReceived = toIsoDate(receivedDate) || getTodayIsoDate();

  const agingDays = calcCurrentAgingDays(safeMfg, safeReceived);

  return {
    receivedDate: safeReceived,
    mfgDate: safeMfg,
    agingDays,
  };
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

  if (slotId.startsWith("Q1") || slotId.startsWith("Q2")) {
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
    lots.filter((l) => l.zone === "Q" && l.qty > 0).map((l) => l.slotId)
  );

  const slots = [];

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

function findTopSuggestedLocations(inboundItem, lots) {
  const storageZones = STORAGE_ZONES;

  const sku = String(inboundItem.sku || "").trim().toUpperCase();
  const skuFamily = getSkuFamily(sku);

  const zoneStats = storageZones.map((zoneKey) => {
    const zoneLots = lots.filter((l) => l.zone === zoneKey && l.qty > 0);
    const sameSkuCount = zoneLots.filter(
      (l) => String(l.sku).trim().toUpperCase() === sku
    ).length;
    const familyCount = zoneLots.filter(
      (l) => getSkuFamily(l.sku) === skuFamily
    ).length;
    const freeSlots = getZoneFreeSlots(zoneKey, lots);

    const score =
      sameSkuCount > 0
        ? 1000 + sameSkuCount * 10 + freeSlots
        : familyCount > 0
          ? 500 + familyCount * 10 + freeSlots
          : freeSlots;

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


function findSuggestedOtherLocationsForLot(lot, lots) {
  if (!lot) return [];

  return findTopSuggestedLocations(
    {
      sku: lot.sku,
      productType: lot.productType || "semi-fg",
      stockQty: lot.qty,
    },
    lots.filter(
      (x) =>
        x.id !== lot.id &&
        !DISPATCH_ONLY_ZONES.includes(x.zone)
    )
  ).filter((candidate) => candidate.slotId !== lot.slotId);
}

function doesSlotExist(slotId) {
  const zone = deriveZoneFromSlot(slotId);
  const cfg = ZONE_LAYOUTS[zone];
  if (!cfg) return false;

  if (cfg.type === "multi_level_flat_lr") {
    const [z, level, unitNo, side] = String(slotId).split("-");
    return (
      z === zone &&
      Number(level) >= 1 &&
      Number(level) <= cfg.levels &&
      Number(unitNo) >= 1 &&
      Number(unitNo) <= cfg.units &&
      ["L", "R"].includes(String(side || "").toUpperCase())
    );
  }

  if (cfg.type === "row_14") {
    const [z, rowNo, colNo] = String(slotId).split("-");
    return (
      z === zone &&
      Number(rowNo) >= 1 &&
      Number(rowNo) <= cfg.rows &&
      Number(colNo) >= 1 &&
      Number(colNo) <= cfg.cols
    );
  }

  if (cfg.type === "row_14_dispatch") {
    const [block, rowNo, colNo] = String(slotId).split("-");
    const blockCfg = cfg.blocks.find((b) => b.key === block);
    return !!(
      blockCfg &&
      Number(rowNo) >= 1 &&
      Number(rowNo) <= blockCfg.rows &&
      Number(colNo) >= 1 &&
      Number(colNo) <= blockCfg.cols
    );
  }

  return false;
}

function normalizeLocationInputToSlotId(inputValue) {
  const raw = String(inputValue || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";

  if (/^Q[12]-\d+-\d+$/.test(raw) || /^[A-Z]-\d+-\d+(?:-[LR])?$/.test(raw)) {
    return raw;
  }

  const dispatchLabelMatch = raw.match(/^(Q[12])(\d+)\((\d+)\)$/);
  if (dispatchLabelMatch) {
    const [, block, rowNo, colNo] = dispatchLabelMatch;
    return `${block}-${rowNo}-${colNo}`;
  }

  const rowLabelMatch = raw.match(/^([EF])(\d+)\((\d+)\)$/);
  if (rowLabelMatch) {
    const [, zone, rowNo, colNo] = rowLabelMatch;
    return `${zone}-${rowNo}-${colNo}`;
  }

  const flatMatch = raw.match(/^([ABCGHIJKLM])(\d+)([LR])$/);
  if (flatMatch) {
    const [, zone, unitNoText, side] = flatMatch;
    const unitNo = Number(unitNoText);
    const level = ((unitNo - 1) % 5) + 1;
    return `${zone}-${level}-${unitNo}-${side}`;
  }

  return "";
}

function buildManualMoveCandidate(lot, rawInput, lots, action) {
  const slotId = normalizeLocationInputToSlotId(rawInput);
  if (!slotId) {
    return { error: "รูปแบบ location ไม่ถูกต้อง" };
  }

  if (!doesSlotExist(slotId)) {
    return { error: "ไม่พบ location นี้ในระบบ" };
  }

  const zone = deriveZoneFromSlot(slotId);
  if (action === "move_to_q" && zone !== "Q") {
    return { error: "Move to Q ต้องเลือก location ในโซน Q เท่านั้น" };
  }

  if (action === "move_to_other_location" && !STORAGE_ZONES.includes(zone)) {
    return { error: "Move to Other Location ต้องเลือก location ในโซนจัดเก็บเท่านั้น" };
  }

  if (slotId === lot.slotId) {
    return { error: "เลือก location เดิมอยู่แล้ว" };
  }

  const occupiedByOther = lots.some(
    (x) => x.id !== lot.id && x.slotId === slotId && parseNumberLike(x.qty) > 0
  );
  if (occupiedByOther) {
    return { error: "location นี้มีสินค้าอยู่แล้ว" };
  }

  return {
    slotId,
    zone,
    label: getSlotLabel(slotId, zone),
    reason: "เลือกเอง",
  };
}

function searchDispatchLots(lots, skuQuery, lotQuery, requestedQty) {
  const skuQ = String(skuQuery || "").trim().toUpperCase();
  const lotQ = String(lotQuery || "").trim().toUpperCase();
  const requested = parseNumberLike(requestedQty);
  const hasRequestedQty = requested > 0;

  const filtered = lots.filter((l) => {
    const qty = parseNumberLike(l.qty);
    if (qty <= 0) return false;
    if (l.status === "Complete") return false;
    if (l.zone === "Q") return false;
    if (skuQ && !String(l.sku).toUpperCase().includes(skuQ)) return false;
    if (lotQ && !String(l.lot).toUpperCase().includes(lotQ)) return false;
    if (hasRequestedQty && qty < requested) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const ageDiff = parseNumberLike(b.agingDays) - parseNumberLike(a.agingDays);
    if (ageDiff !== 0) return ageDiff;

    const recvA = a.receivedDate || "9999-12-31";
    const recvB = b.receivedDate || "9999-12-31";
    const recvDiff = recvA.localeCompare(recvB);
    if (recvDiff !== 0) return recvDiff;

    return String(a.sku).localeCompare(String(b.sku));
  });
}


function searchSkuViewLots(lots, skuQuery, lotQuery, limit = 10) {
  const skuQ = String(skuQuery || "").trim().toUpperCase();
  const lotQ = String(lotQuery || "").trim().toUpperCase();
  if (!skuQ && !lotQ) return [];

  return lots
    .filter((l) => {
      const qty = parseNumberLike(l.qty);
      if (qty <= 0) return false;
      if (skuQ && !String(l.sku || "").toUpperCase().includes(skuQ)) return false;
      if (lotQ && !String(l.lot || "").toUpperCase().includes(lotQ)) return false;
      return true;
    })
    .sort((a, b) => {
      const ageDiff = parseNumberLike(b.agingDays) - parseNumberLike(a.agingDays);
      if (ageDiff !== 0) return ageDiff;
      const recvA = a.receivedDate || "9999-12-31";
      const recvB = b.receivedDate || "9999-12-31";
      const recvDiff = recvA.localeCompare(recvB);
      if (recvDiff !== 0) return recvDiff;
      return String(a.slotId || "").localeCompare(String(b.slotId || ""));
    })
    .slice(0, limit);
}

function suggestDispatchStageTarget(lot, lots) {
  const emptyStageSlots = getAllEmptyDispatchSlots(lots.filter((x) => x.id !== lot.id));
  const sameSkuStage = lots.filter(
    (x) =>
      x.id !== lot.id &&
      x.zone === "Q" &&
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
        ? "ใกล้รหัสสินค้าเดียวกันในโซน Q"
        : "ช่องว่างในโซน Q",
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
  const [pendingScrollSlotId, setPendingScrollSlotId] = useState(null);
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [pendingMoves, setPendingMoves] = useState([]);
  const [draggingLotId, setDraggingLotId] = useState(null);

  const [inboundForm, setInboundForm] = useState({
    sku: "",
    productType: "semi-fg",
    receivedDate: "",
    lotNo: "",
    stockQty: "",
  });
  const [inboundResult, setInboundResult] = useState(null);
  const [selectedInboundCandidate, setSelectedInboundCandidate] = useState(null);
  const [inboundModalOpen, setInboundModalOpen] = useState(false);

  const [dispatchForm, setDispatchForm] = useState({
    sku: "",
    lotNo: "",
    dispatchQty: "",
    productType: "semi-fg",
  });
  const [skuLookupQuery, setSkuLookupQuery] = useState("");
  const [skuLookupLotQuery, setSkuLookupLotQuery] = useState("");
  const [skuLookupResults, setSkuLookupResults] = useState([]);
  const [dispatchResults, setDispatchResults] = useState([]);
  const [selectedDispatchLot, setSelectedDispatchLot] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
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

  useEffect(() => {
    if (!selectedZone || ZONE_LAYOUTS[selectedZone]) return;
    setSelectedZone("A");
    setSelectedSlotId(null);
  }, [selectedZone]);

  useEffect(() => {
    try {
      const nextLots = stockSeed
        .map((raw, index) => normalizeLotRecord(raw, index + 1))
        .filter((lot) => lot.slotId && lot.qty > 0);

      setLots(nextLots);
    } catch (error) {
      console.error("Mock data load error:", error);
    } finally {
      setLoadingLots(false);
    }
  }, []);

  useEffect(() => {
    if (!pendingScrollSlotId) return;

    const run = () => {
      const el = document.querySelector(`[data-slot-id="${pendingScrollSlotId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
      setPendingScrollSlotId(null);
    };

    const raf = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(raf);
  }, [pendingScrollSlotId, selectedZone]);

  const stats = useMemo(() => {
    const storageLots = displayLots.filter((l) => !DISPATCH_ONLY_ZONES.includes(l.zone));
    const stagedLots = displayLots.filter(
      (l) => DISPATCH_ONLY_ZONES.includes(l.zone) && l.status !== "Complete"
    );
    return {
      totalLots: displayLots.filter((l) => l.status !== "Complete").length,
      storageLots: storageLots.length,
      stagedLots: stagedLots.length,
    };
  }, [displayLots]);

  const zoneLotCounts = useMemo(() => {
    const counts = {};
    Object.keys(ZONE_LAYOUTS).forEach((zoneKey) => {
      counts[zoneKey] = displayLots.filter((lot) => lot.zone === zoneKey && lot.qty > 0).length;
    });
    return counts;
  }, [displayLots]);

  function safeScrollToSection(sectionId, callback) {
    const run = (attempt = 0) => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (callback) {
          window.setTimeout(callback, 260);
        }
        return;
      }

      if (attempt < 8) {
        window.setTimeout(() => run(attempt + 1), 80);
        return;
      }

      if (callback) callback();
    };

    requestAnimationFrame(() => run(0));
  }

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
      AgingDays: lot.agingDays ?? "",
      ReceivedDate: lot.receivedDate || "",
      MFGDate: lot.mfgDate || "",
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
    if (draggedLot.slotId === toSlotId) return;

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
    const agingDays = calcCurrentAgingDays(mfgDate, inboundForm.receivedDate || getTodayIsoDate());
    const stockQty = parseNumberLike(inboundForm.stockQty);

    const buckets = makeAgingBuckets(agingDays, stockQty);
    const candidates = findTopSuggestedLocations(
      {
        sku: inboundForm.sku,
        productType: inboundForm.productType,
        stockQty,
      },
      displayLots
    );

    setSelectedInboundCandidate(null);
    setInboundModalOpen(false);

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
    if (!candidate || !candidate.zone || !candidate.slotId) return;

    setSelectedInboundCandidate(candidate);
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);
    setPendingScrollSlotId(candidate.slotId);
    setDraggingLotId(null);
    setInboundModalOpen(true);
  }

  function closeInboundModal() {
    setInboundModalOpen(false);
    setSelectedInboundCandidate(null);
  }

  function confirmInboundToSelectedLocation() {
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
      receivedDate: inboundResult.receivedDate,
      mfgDate: toIsoDate(inboundResult.mfgDate),
      agingDays: inboundResult.agingDays,
    };

    setLots((prev) => [...prev, newLot]);

    setInboundForm({
      sku: "",
      productType: "semi-fg",
      receivedDate: "",
      lotNo: "",
      stockQty: "",
    });

    setInboundResult(null);
    setSelectedInboundCandidate(null);
    setInboundModalOpen(false);
  }

  function updateDispatchField(field, value) {
    setDispatchForm((prev) => ({ ...prev, [field]: value }));
  }

  function runSkuLookupSearch() {
    setSkuLookupResults(searchSkuViewLots(displayLots, skuLookupQuery, skuLookupLotQuery));
  }

  function closeSkuLookupResults() {
    setSkuLookupResults([]);
  }

  function selectSkuLookupLot(lot) {
    if (!lot || !lot.zone || !lot.slotId) return;
    setSelectedZone(lot.zone);
    setSelectedSlotId(lot.slotId);
    setPendingScrollSlotId(lot.slotId);
  }

  function runDispatchSearch() {
    const results = searchDispatchLots(
      displayLots,
      dispatchForm.sku,
      dispatchForm.lotNo,
      dispatchForm.dispatchQty
    );
    setDispatchResults(results);
    setSelectedDispatchLot(null);
    setDispatchModalOpen(false);
    setDispatchPlan(null);
  }

  function selectDispatchLot(lot) {
    if (!lot || !lot.zone || !lot.slotId) return;

    setSelectedDispatchLot(lot);
    setDispatchPlan(null);
    setDispatchModalOpen(false);
    setSelectedZone(lot.zone);
    setSelectedSlotId(lot.slotId);

    safeScrollToSection("warehouse-layout-section", () => {
      setDispatchModalOpen(true);
    });
  }

  function closeDispatchModal() {
    setDispatchModalOpen(false);
    setDispatchPlan(null);
    setSelectedDispatchLot(null);
  }

  function closeDispatchPlan() {
    setDispatchPlan(null);
  }

  function prepareDispatchAction(actionValue) {
    if (!selectedDispatchLot) return;

    const lot = selectedDispatchLot;

    setSelectedZone(lot.zone);
    setSelectedSlotId(lot.slotId);

    if (actionValue === "dispatch_out") {
      const requestedQty = parseNumberLike(dispatchForm.dispatchQty);
      const safeDispatchQty = requestedQty > 0
        ? Math.min(requestedQty, parseNumberLike(lot.qty))
        : parseNumberLike(lot.qty);

      setDispatchPlan({
        lotId: lot.id,
        sku: lot.sku,
        lotNo: lot.lot,
        currentZone: lot.zone,
        currentSlotId: lot.slotId,
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        action: "dispatch_out",
        dispatchQty: safeDispatchQty,
        requestedQty: dispatchForm.dispatchQty,
        maxQty: lot.qty,
        candidates: [],
      });
      return;
    }

    if (actionValue === "move_to_q") {
      const candidates = suggestDispatchStageTarget(lot, displayLots);
      setDispatchPlan({
        lotId: lot.id,
        sku: lot.sku,
        lotNo: lot.lot,
        currentZone: lot.zone,
        currentSlotId: lot.slotId,
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        action: "move_to_q",
        candidates,
        manualLocationInput: "",
        manualLocationError: "",
      });
      return;
    }

    if (actionValue === "move_to_other_location") {
      const candidates = findSuggestedOtherLocationsForLot(lot, displayLots);
      setDispatchPlan({
        lotId: lot.id,
        sku: lot.sku,
        lotNo: lot.lot,
        currentZone: lot.zone,
        currentSlotId: lot.slotId,
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        action: "move_to_other_location",
        candidates,
        manualLocationInput: "",
        manualLocationError: "",
      });
    }
  }

  function updateDispatchQty(value) {
    setDispatchPlan((prev) => {
      if (!prev || prev.action !== "dispatch_out") return prev;
      if (value === "") return { ...prev, dispatchQty: "" };

      const numericValue = parseNumberLike(value);
      if (numericValue <= 0) return { ...prev, dispatchQty: "" };

      return {
        ...prev,
        dispatchQty: Math.max(0, Math.min(parseNumberLike(prev.maxQty), numericValue)),
      };
    });
  }

  function pickDispatchCandidate(candidate) {
    setDispatchPlan((prev) => ({
      ...prev,
      selectedCandidate: candidate,
      manualLocationError: "",
    }));
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);
    setPendingScrollSlotId(candidate.slotId);
  }

  function updateDispatchManualLocationInput(value) {
    setDispatchPlan((prev) => (
      prev
        ? { ...prev, manualLocationInput: value, manualLocationError: "" }
        : prev
    ));
  }

  function applyDispatchManualLocation() {
    if (!dispatchPlan || !selectedDispatchLot) return;
    const candidate = buildManualMoveCandidate(
      selectedDispatchLot,
      dispatchPlan.manualLocationInput,
      displayLots,
      dispatchPlan.action
    );

    if (candidate.error) {
      setDispatchPlan((prev) => ({ ...prev, manualLocationError: candidate.error }));
      return;
    }

    pickDispatchCandidate(candidate);
  }

  function updateSlotManualLocationInput(value) {
    setSlotActionPlan((prev) => (
      prev
        ? { ...prev, manualLocationInput: value, manualLocationError: "" }
        : prev
    ));
  }

  function applySlotManualLocation(lot) {
    if (!slotActionPlan || !lot) return;
    const candidate = buildManualMoveCandidate(
      lot,
      slotActionPlan.manualLocationInput,
      displayLots,
      slotActionPlan.action
    );

    if (candidate.error) {
      setSlotActionPlan((prev) => ({ ...prev, manualLocationError: candidate.error }));
      return;
    }

    pickSlotActionCandidate(candidate);
  }

  function confirmDispatchAction() {
    if (!dispatchPlan) return;

    if (dispatchPlan.action === "dispatch_out") {
      const dispatchQty = parseNumberLike(dispatchPlan.dispatchQty);
      if (!dispatchQty || dispatchQty <= 0 || dispatchQty > parseNumberLike(dispatchPlan.maxQty)) return;

      const nextLots = lots
        .map((lot) => {
          if (lot.id !== dispatchPlan.lotId) return lot;

          const remainingQty = parseNumberLike(lot.qty) - dispatchQty;
          if (remainingQty <= 0) return null;

          return {
            ...lot,
            qty: remainingQty,
          };
        })
        .filter(Boolean);

      setLots(nextLots);
      setDispatchPlan(null);
      setSelectedDispatchLot(null);
      setDispatchModalOpen(false);

      const refreshedLots = applyPendingMovesToLots(nextLots, pendingMoves);
      setDispatchResults(
        searchDispatchLots(
          refreshedLots,
          dispatchForm.sku,
          dispatchForm.lotNo,
          dispatchForm.dispatchQty
        )
      );

      const updatedLot = nextLots.find((lot) => lot.id === dispatchPlan.lotId);
      if (updatedLot) {
        setSelectedZone(updatedLot.zone);
        setSelectedSlotId(updatedLot.slotId);
      } else {
        setSelectedSlotId(null);
      }
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
          nextZone === "Q"
            ? "Waiting to be Dispatch"
            : lot.status,
      };
    });

    setLots(movedLots);
    setSelectedZone(deriveZoneFromSlot(dispatchPlan.selectedCandidate.slotId));
    setSelectedSlotId(dispatchPlan.selectedCandidate.slotId);
    setSelectedDispatchLot(null);
    setDispatchPlan(null);
    setDispatchModalOpen(false);

    const refreshedLots = applyPendingMovesToLots(movedLots, pendingMoves);
    setDispatchResults(
      searchDispatchLots(
        refreshedLots,
        dispatchForm.sku,
        dispatchForm.lotNo,
        dispatchForm.dispatchQty
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

  function closeSlotActionPlan() {
    setSlotActionPlan(null);
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

    if (actionValue === "move_to_q") {
      const candidates = suggestDispatchStageTarget(lot, displayLots);
      setSlotActionPlan({
        lotId: lot.id,
        action: "move_to_q",
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        currentZone: lot.zone,
        candidates,
        manualLocationInput: "",
        manualLocationError: "",
      });
      return;
    }

    if (actionValue === "move_to_other_location") {
      const candidates = findSuggestedOtherLocationsForLot(lot, displayLots);
      setSlotActionPlan({
        lotId: lot.id,
        action: "move_to_other_location",
        currentLabel: getSlotLabel(lot.slotId, lot.zone),
        currentZone: lot.zone,
        candidates,
        manualLocationInput: "",
        manualLocationError: "",
      });
    }
  }

  function pickSlotActionCandidate(candidate) {
    setSlotActionPlan((prev) => ({
      ...prev,
      selectedCandidate: candidate,
      manualLocationError: "",
    }));
    setSelectedZone(candidate.zone);
    setSelectedSlotId(candidate.slotId);
    setPendingScrollSlotId(candidate.slotId);

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
            nextZone === "Q"
              ? "Waiting to be Dispatch"
              : lot.status,
        };
      })
    );

    setSelectedZone(deriveZoneFromSlot(slotActionPlan.selectedCandidate.slotId));
    setSelectedSlotId(slotActionPlan.selectedCandidate.slotId);
    setSlotActionPlan(null);
  }

  if (loadingLots) {
    return (
      <div style={pageStyle}>
        <div style={appContainerStyle}>
          <div style={cardStyle}>Loading mock stock data...</div>
        </div>
      </div>
    );
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
            inboundModalOpen={inboundModalOpen}
            chooseInboundCandidate={chooseInboundCandidate}
            closeInboundModal={closeInboundModal}
            confirmInboundToSelectedLocation={confirmInboundToSelectedLocation}
          />

          <DispatchSection
            dispatchForm={dispatchForm}
            updateDispatchField={updateDispatchField}
            skuLookupQuery={skuLookupQuery}
            setSkuLookupQuery={setSkuLookupQuery}
            skuLookupLotQuery={skuLookupLotQuery}
            setSkuLookupLotQuery={setSkuLookupLotQuery}
            skuLookupResults={skuLookupResults}
            runSkuLookupSearch={runSkuLookupSearch}
            closeSkuLookupResults={closeSkuLookupResults}
            selectSkuLookupLot={selectSkuLookupLot}
            runDispatchSearch={runDispatchSearch}
            dispatchResults={dispatchResults}
            selectedDispatchLot={selectedDispatchLot}
            dispatchModalOpen={dispatchModalOpen}
            selectDispatchLot={selectDispatchLot}
            closeDispatchModal={closeDispatchModal}
            closeDispatchPlan={closeDispatchPlan}
            prepareDispatchAction={prepareDispatchAction}
            dispatchPlan={dispatchPlan}
            pickDispatchCandidate={pickDispatchCandidate}
            updateDispatchManualLocationInput={updateDispatchManualLocationInput}
            applyDispatchManualLocation={applyDispatchManualLocation}
            confirmDispatchAction={confirmDispatchAction}
            updateDispatchQty={updateDispatchQty}
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
              updateSlotManualLocationInput={updateSlotManualLocationInput}
              applySlotManualLocation={applySlotManualLocation}
              closeSlotActionPlan={closeSlotActionPlan}
              confirmSlotAction={confirmSlotAction}
              deleteLot={deleteLot}
            />
          </div>
        </div>

        <div id="warehouse-layout-section" style={gridSectionStyle}>
          <div style={zoneTitleBarStyle}>
            <div>
              <h2 style={{ margin: 0 }}>{zoneTitle(selectedZone)} <span style={zoneCountBadgeStyle}>{zoneLotCounts[selectedZone] || 0} lots</span></h2>
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

          <div style={dragHintStyle}>
            <span>ลาก lot card ไปยัง location/slot ใหม่ได้เลย แล้วกด <strong>Save Layout Changes</strong> เพื่อยืนยันการเปลี่ยน layout</span>
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
                draggingLotId={draggingLotId}
                setDraggingLotId={setDraggingLotId}
                onDropLot={addPendingMove}
                pendingMoves={pendingMoves}
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
  inboundModalOpen,
  chooseInboundCandidate,
  closeInboundModal,
  confirmInboundToSelectedLocation,
}) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Inbound</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            ใส่ข้อมูลรับเข้าแล้วระบบจะ suggest location ที่เหมาะสม
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
            Suggest Location
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
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Choose 1 location</div>
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
                <div style={{ color: "#64748b" }}>ไม่พบ location ที่เหมาะสม</div>
              )}
            </div>
          </div>

        </div>
      )}

      {inboundModalOpen && selectedInboundCandidate && (
        <div style={modalOverlayStyle} onClick={closeInboundModal}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>INBOUND CONFIRM</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>ยืนยันจัดเก็บที่ location นี้</div>
              </div>

              <button onClick={closeInboundModal} style={modalCloseBtnStyle}>
                ✕
              </button>
            </div>

            <div style={modalInfoGridStyle}>
              <div style={modalInfoItemStyle}>
                <div style={modalInfoLabelStyle}>SKU</div>
                <div style={modalInfoValueStyle}>{inboundResult?.sku}</div>
              </div>
              <div style={modalInfoItemStyle}>
                <div style={modalInfoLabelStyle}>Lot</div>
                <div style={modalInfoValueStyle}>{inboundResult?.lotNo}</div>
              </div>
              <div style={modalInfoItemStyle}>
                <div style={modalInfoLabelStyle}>Type</div>
                <div style={modalInfoValueStyle}>{inboundResult?.productType}</div>
              </div>
              <div style={modalInfoItemStyle}>
                <div style={modalInfoLabelStyle}>Target location</div>
                <div style={modalInfoValueStyle}>{selectedInboundCandidate.label}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, color: "#475569", fontSize: 14 }}>
              ระบบเลือก location นี้ไว้แล้ว คุณกดดูโซนที่แนะนำได้จากแผนที่หรือยืนยันจัดเก็บได้ทันที
            </div>

            <div style={modalActionRowStyle}>
              <button onClick={closeInboundModal} style={secondaryBtnStyle}>
                ยกเลิก
              </button>
              <button onClick={confirmInboundToSelectedLocation} style={primaryBtnStyle}>
                ยืนยันจัดเก็บที่ location นี้
              </button>
            </div>
          </div>
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
  skuLookupQuery,
  setSkuLookupQuery,
  skuLookupLotQuery,
  setSkuLookupLotQuery,
  skuLookupResults,
  runSkuLookupSearch,
  closeSkuLookupResults,
  selectSkuLookupLot,
  runDispatchSearch,
  dispatchResults,
  selectedDispatchLot,
  dispatchModalOpen,
  selectDispatchLot,
  closeDispatchModal,
  closeDispatchPlan,
  prepareDispatchAction,
  dispatchPlan,
  pickDispatchCandidate,
  updateDispatchManualLocationInput,
  applyDispatchManualLocation,
  confirmDispatchAction,
  updateDispatchQty,
}) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Dispatch</h2>
          <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
            ค้นหาจากรหัสสินค้า ล็อตสินค้า และจำนวนที่ต้องการเบิก แล้วเลือกทำรายการได้ทันที
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
          <span>จำนวนที่ต้องการ Dispatch</span>
          <input
            type="number"
            min="1"
            value={dispatchForm.dispatchQty}
            onChange={(e) => updateDispatchField("dispatchQty", e.target.value)}
            style={inputStyle}
            placeholder="เช่น 30"
          />
        </label>


        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={runDispatchSearch} style={primaryBtnStyle}>
            <Search size={14} />
            Search Dispatch
          </button>
        </div>
      </div>


      <div
        style={{
          marginTop: 22,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Stock Lookup </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
          ใช้สำหรับค้นหาดูตำแหน่งสินค้า
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr)) auto", gap: 10, alignItems: "end" }}>
          <label style={fieldStyle}>
            <span>ค้นหา SKU</span>
            <input
              value={skuLookupQuery}
              onChange={(e) => setSkuLookupQuery(e.target.value)}
              style={inputStyle}
              placeholder="เช่น BBLA047-1"
            />
          </label>

          <label style={fieldStyle}>
            <span>ค้นหาล็อตสินค้า</span>
            <input
              value={skuLookupLotQuery}
              onChange={(e) => setSkuLookupLotQuery(e.target.value)}
              style={inputStyle}
              placeholder="เช่น 17014"
            />
          </label>

          <div style={{ fontSize: 12, color: "#64748b", paddingBottom: 8 }}>
            ใส่อย่างใดอย่างหนึ่งหรือใส่ทั้งสองช่องก็ได้
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "end", justifyContent: "flex-end" }}>
            <button onClick={runSkuLookupSearch} style={secondaryBtnStyle}>
              <Search size={14} />
              Search Stock
            </button>
            {skuLookupResults.length > 0 ? (
              <button onClick={closeSkuLookupResults} style={secondaryBtnStyle}>Close</button>
            ) : null}
          </div>
        </div>

        {skuLookupResults.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {skuLookupResults.map((lot) => (
              <button
                key={`sku-view-${lot.id}`}
                onClick={() => selectSkuLookupLot(lot)}
                style={{ ...dispatchLotCardStyle, textAlign: "left", width: "100%", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{lot.sku}</div>
                    <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                      ล็อตสินค้า: {lot.lot} · Qty: {lot.qty}
                    </div>
                    <div style={{ color: "#0f766e", fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                      Aging: {lot.agingDays || 0} days · FIFO แนะนำลำดับต้น ๆ
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {getSlotLabel(lot.slotId, lot.zone)} · Zone {lot.zone} · Received {formatDateDisplay(lot.receivedDate) || "-"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
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
                    {dispatchForm.dispatchQty ? (
                      <div style={{ color: "#0f766e", fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                        รองรับการเบิก: {dispatchForm.dispatchQty}
                      </div>
                    ) : null}
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {getSlotLabel(lot.slotId, lot.zone)} · Zone {lot.zone} · Type {lot.productType || "fg"}
                    </div>
                  </div>

                  {(lot.zone === "Q") && (
                    <div style={statusPillStyle}>{lot.status || "Waiting to be Dispatch"}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {dispatchModalOpen && selectedDispatchLot && (
        <div style={modalOverlayStyle} onClick={closeDispatchModal}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Dispatch Action</div>
                <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>
                  เลือกรายการจาก lot นี้ได้เลยโดยไม่ต้องเลื่อนกลับไปด้านบน
                </div>
              </div>
              <button onClick={closeDispatchModal} style={modalCloseBtnStyle}>
                ×
              </button>
            </div>

            <div style={confirmBoxStyle}>
              <div style={modalInfoGridStyle}>
                <div style={suggestMetaItemStyle}>รหัสสินค้า: <strong>{selectedDispatchLot.sku}</strong></div>
                <div style={suggestMetaItemStyle}>ล็อตสินค้า: <strong>{selectedDispatchLot.lot}</strong></div>
                <div style={suggestMetaItemStyle}>จำนวนคงเหลือ: <strong>{selectedDispatchLot.qty}</strong></div>
                <div style={suggestMetaItemStyle}>จำนวนที่ต้องการ Dispatch: <strong>{dispatchForm.dispatchQty || "-"}</strong></div>
              </div>

              <div style={{ color: "#475569", marginTop: 10 }}>
                ตำแหน่งปัจจุบัน: <strong>{getSlotLabel(selectedDispatchLot.slotId, selectedDispatchLot.zone)}</strong> · Zone <strong>{selectedDispatchLot.zone}</strong>
              </div>
            </div>

            <div style={modalActionRowStyle}>
              <button onClick={() => prepareDispatchAction("dispatch_out")} style={secondaryBtnStyle}>
                Dispatch Out
              </button>
              <button onClick={() => prepareDispatchAction("move_to_q")} style={secondaryBtnStyle}>
                Move to Q
              </button>
              <button onClick={() => prepareDispatchAction("move_to_other_location")} style={secondaryBtnStyle}>
                Move to Other Location
              </button>
            </div>

            {dispatchPlan?.action === "dispatch_out" && (
              <div style={confirmBoxStyle}>
                <div style={{ color: "#475569", marginBottom: 10 }}>
                  ระบุจำนวนที่จะ Dispatch Out จาก <strong>{dispatchPlan.currentLabel}</strong>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={modalInfoGridStyle}>
                    <div style={suggestMetaItemStyle}>จำนวนคงเหลือ: <strong>{dispatchPlan.maxQty}</strong></div>
                    <div style={suggestMetaItemStyle}>จำนวนคงเหลือหลังจ่าย: <strong>{Math.max(0, parseNumberLike(dispatchPlan.maxQty) - parseNumberLike(dispatchPlan.dispatchQty))}</strong></div>
                  </div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Dispatch Qty</span>
                    <input
                      type="number"
                      min="1"
                      max={dispatchPlan.maxQty}
                      value={dispatchPlan.dispatchQty}
                      onChange={(e) => updateDispatchQty(e.target.value)}
                      style={inputStyle}
                    />
                  </label>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => updateDispatchQty(dispatchPlan.maxQty)}
                      style={secondaryBtnStyle}
                    >
                      Dispatch All
                    </button>
                  </div>
                </div>

                <button
                  onClick={confirmDispatchAction}
                  disabled={
                    !dispatchPlan.dispatchQty ||
                    parseNumberLike(dispatchPlan.dispatchQty) <= 0 ||
                    parseNumberLike(dispatchPlan.dispatchQty) > parseNumberLike(dispatchPlan.maxQty)
                  }
                  style={{
                    ...primaryBtnStyle,
                    marginTop: 12,
                    opacity:
                      !dispatchPlan.dispatchQty ||
                      parseNumberLike(dispatchPlan.dispatchQty) <= 0 ||
                      parseNumberLike(dispatchPlan.dispatchQty) > parseNumberLike(dispatchPlan.maxQty)
                        ? 0.5
                        : 1,
                    cursor:
                      !dispatchPlan.dispatchQty ||
                      parseNumberLike(dispatchPlan.dispatchQty) <= 0 ||
                      parseNumberLike(dispatchPlan.dispatchQty) > parseNumberLike(dispatchPlan.maxQty)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Confirm Dispatch Out
                </button>
              </div>
            )}

            {(dispatchPlan?.action === "move_to_q" || dispatchPlan?.action === "move_to_other_location") && (
              <div style={confirmBoxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ color: "#475569" }}>
                    {dispatchPlan.action === "move_to_q" ? "เลือกตำแหน่งปลายทางใน Q" : "เลือก location ปลายทางตาม SKU ที่ใกล้เคียง"}
                  </div>
                  <button type="button" onClick={closeDispatchPlan} style={secondaryBtnStyle}>Close</button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {dispatchPlan.action === "move_to_other_location" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>กรอก Location เอง</span>
                        <input
                          value={dispatchPlan.manualLocationInput || ""}
                          onChange={(e) => updateDispatchManualLocationInput(e.target.value)}
                          placeholder="เช่น A125L หรือ E12(3)"
                          style={inputStyle}
                        />
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={applyDispatchManualLocation} style={secondaryBtnStyle}>
                          Go to Location
                        </button>
                      </div>
                      {dispatchPlan.manualLocationError ? (
                        <div style={{ color: "#b91c1c", fontSize: 12 }}>{dispatchPlan.manualLocationError}</div>
                      ) : null}
                    </div>
                  )}

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
                    <div style={{ color: "#64748b" }}>{dispatchPlan.action === "move_to_q" ? "ไม่พบช่องว่างใน Q" : "ไม่พบ location ปลายทางที่เหมาะสม"}</div>
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
  updateSlotManualLocationInput,
  applySlotManualLocation,
  closeSlotActionPlan,
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
              เลือก location จาก warehouse layout
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
            const isStage = ["Q"].includes(lot.zone);
            const canMoveLocation = !isStage;

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
                  Aging: <strong>{lot.agingDays ?? "-"}</strong> days
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  Received Date: {formatDateDisplay(lot.receivedDate) || "-"}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  MFG Date: {formatDateDisplay(lot.mfgDate) || "-"}
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

                  {canMoveLocation && (
                    <>
                      <button
                        onClick={() => prepareSlotAction?.(lot, "move_to_q")}
                        style={secondaryBtnStyle}
                      >
                        Move to Q
                      </button>
                      <button
                        onClick={() => prepareSlotAction?.(lot, "move_to_other_location")}
                        style={secondaryBtnStyle}
                      >
                        Move to Other Location
                      </button>
                    </>
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
                  (slotActionPlan.action === "move_to_q" ||
                    slotActionPlan.action === "move_to_other_location") && (
                    <div style={confirmBoxStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                        <div style={{ color: "#475569" }}>
                          {slotActionPlan.action === "move_to_q" ? "เลือกปลายทางใน Q" : "เลือก location ปลายทางตาม SKU ที่คล้ายกัน"}
                        </div>
                        <button type="button" onClick={() => closeSlotActionPlan?.()} style={secondaryBtnStyle}>Close</button>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {slotActionPlan.action === "move_to_other_location" && (
                          <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>กรอก Location เอง</span>
                              <input
                                value={slotActionPlan.manualLocationInput || ""}
                                onChange={(e) => updateSlotManualLocationInput?.(e.target.value)}
                                placeholder="เช่น A125L หรือ E12(3)"
                                style={inputStyle}
                              />
                            </label>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button type="button" onClick={() => applySlotManualLocation?.(lot)} style={secondaryBtnStyle}>
                                Go to Location
                              </button>
                            </div>
                            {slotActionPlan.manualLocationError ? (
                              <div style={{ color: "#b91c1c", fontSize: 12 }}>{slotActionPlan.manualLocationError}</div>
                            ) : null}
                          </div>
                        )}

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
      {Array.from({ length: cfg.levels }, (_, idx) => cfg.levels - idx).map((level) => {
        const unitNos = buildLevelSequence(level, cfg.units, cfg.levels);
        return (
          <div key={level}>
            <div style={levelHeaderStyle}>Level {level}</div>
            <div style={flatRowWrapStyle}>
              {unitNos.map((unitNo) => {
                const pairLocation = getPairLocation(unitNo);
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
                      bg={pairLocation.left}
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
                      bg={pairLocation.right}
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
  draggingLotId,
  setDraggingLotId,
  onDropLot,
  pendingMoves,
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

                  return (
                    <SlotTile
                      key={slotId}
                      slotId={slotId}
                      label={getSlotLabel(slotId, deriveZoneFromSlot(slotId))}
                      state={state}
                      selected={selectedSlotId === slotId}
                      onSelect={() => setSelectedSlotId(slotId)}
                      bg="#f8fafc"
                      draggingLotId={draggingLotId}
                      setDraggingLotId={setDraggingLotId}
                      onDropLot={onDropLot}
                      pendingMove={pendingMoves.find((m) => m.toSlotId === slotId)}
                      compact
                    />
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
  const lot = state.lots?.[0];

  return (
    <button
      type="button"
      data-slot-id={slotId}
      onClick={onSelect}
      draggable={!!lot}
      onDragStart={() => {
        if (!lot) return;
        setDraggingLotId?.(lot.id);
      }}
      onDragEnd={() => {
        setDraggingLotId?.(null);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropLot?.(slotId);
      }}
      title={lot ? `${label} | Lot ${lot.lot || lot.id}` : label}
      style={{
        ...slotTileStyleBase,
        minHeight: compact ? 30 : 34,
        height: compact ? 30 : 34,
        background: selected ? "#dbeafe" : state.occupied ? "#0f172a" : bg,
        color: state.occupied ? "#fff" : "#0f172a",
        border: selected ? "2px solid #2563eb" : pendingMove ? "2px dashed #2563eb" : "1px solid #cbd5e1",
        padding: 2,
        cursor: lot ? "grab" : "pointer",
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
    </button>
  );
}

/**
 * =========================================================
 * STYLES
 * =========================================================
 */
const zoneCountBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  marginLeft: 10,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
};

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

const dragHintStyle = {
  marginBottom: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px dashed #94a3b8",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 14,
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

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 50,
};

const modalCardStyle = {
  width: "min(720px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 20,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
  padding: 18,
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const modalCloseBtnStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 999,
  width: 36,
  height: 36,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const modalActionRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14,
};

const modalInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const modalInfoItemStyle = {
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  minHeight: 72,
};

const modalInfoLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const modalInfoValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
  wordBreak: "break-word",
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
