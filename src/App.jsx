import React, { useMemo, useState } from "react";
import {
  Package,
  MapPinned,
  Search,
  Plus,
  Warehouse,
  TrendingUp,
  Clock3,
  Layers3,
  Truck,
} from "lucide-react";

const GRID_ROWS = 20;
const GRID_COLS = 20;

const initialSkus = [
  { code: "FG-PLATE-9", name: "Plate 9 inch", group: "FG", zone: "A", mode: "FEFO", usageCount: 22, pinned: true },
  { code: "FG-BOWL-500", name: "Bowl 500 ml", group: "FG", zone: "A", mode: "FEFO", usageCount: 18, pinned: true },
  { code: "FG-TRAY-3C", name: "Tray 3 Compartment", group: "FG", zone: "B", mode: "FIFO", usageCount: 11, pinned: false },
  { code: "PK-CARTON-L", name: "Carton Large", group: "PK", zone: "C", mode: "FIFO", usageCount: 9, pinned: false },
  { code: "FG-CUP-12", name: "Cup 12 oz", group: "FG", zone: "A", mode: "FEFO", usageCount: 14, pinned: false },
  { code: "RM-PULP-A", name: "Bagasse Pulp A", group: "RM", zone: "D", mode: "FIFO", usageCount: 6, pinned: false },
];

const initialLots = [
  { id: 1, sku: "FG-PLATE-9", lot: "L250301A", qty: 120, mfg: "2026-03-01", exp: "2026-09-01", receiveDate: "2026-03-16", location: "A-01-03", zone: "A" },
  { id: 2, sku: "FG-BOWL-500", lot: "L250315B", qty: 80, mfg: "2026-03-15", exp: "2026-08-15", receiveDate: "2026-03-17", location: "A-02-02", zone: "A" },
  { id: 3, sku: "PK-CARTON-L", lot: "PK250310", qty: 60, mfg: "2026-03-10", exp: "2027-03-10", receiveDate: "2026-03-14", location: "C-06-10", zone: "C" },
];

const ZONES = [
  { key: "A", label: "A / Fast Moving Front", rowStart: 1, rowEnd: 5, color: "#10b981" },
  { key: "B", label: "B / Medium Front-Mid", rowStart: 6, rowEnd: 10, color: "#3b82f6" },
  { key: "C", label: "C / Packaging / Mid", rowStart: 11, rowEnd: 15, color: "#f59e0b" },
  { key: "D", label: "D / Raw Material / Back", rowStart: 16, rowEnd: 20, color: "#8b5cf6" },
];

function zoneForRow(row) {
  return ZONES.find((z) => row >= z.rowStart && row <= z.rowEnd)?.key || "D";
}

function buildLocation(zone, row, col) {
  return `${zone}-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}

function locationParts(location) {
  const [zone, row, col] = location.split("-");
  return { zone, row: Number(row), col: Number(col) };
}

export default function App() {
  const [skus, setSkus] = useState(initialSkus);
  const [lots, setLots] = useState(initialLots);
  const [skuTab, setSkuTab] = useState("frequent");
  const [selectedSku, setSelectedSku] = useState(initialSkus[0].code);
  const [lotNo, setLotNo] = useState("");
  const [qty, setQty] = useState("");
  const [mfg, setMfg] = useState("2026-03-17");
  const [exp, setExp] = useState("2026-09-17");
  const [receiveDate, setReceiveDate] = useState("2026-03-17");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [selectedGridInfo, setSelectedGridInfo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [pickedLocation, setPickedLocation] = useState("");
  const [showAddSku, setShowAddSku] = useState(false);
  const [newSku, setNewSku] = useState({ code: "", name: "", group: "FG", zone: "A", mode: "FEFO" });
  const [message, setMessage] = useState("Ready for quick input.");
  const [dispatchSku, setDispatchSku] = useState(initialSkus[0].code);
  const [dispatchQty, setDispatchQty] = useState("");
  const [dispatchMode, setDispatchMode] = useState("FEFO");
  const [dispatchPlan, setDispatchPlan] = useState([]);

  const occupiedSet = useMemo(
    () => new Set(lots.filter((l) => l.qty > 0).map((l) => l.location)),
    [lots]
  );
  const selectedSkuObj = skus.find((s) => s.code === selectedSku);

  const skuGroups = useMemo(() => {
    const sorted = [...skus].sort((a, b) => b.usageCount - a.usageCount);
    const recentCodes = [...lots]
      .sort((a, b) => new Date(b.receiveDate) - new Date(a.receiveDate))
      .map((l) => l.sku)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 8);
    return {
      frequent: sorted.slice(0, 10),
      favorite: sorted.filter((s) => s.pinned),
      recent: recentCodes.map((c) => skus.find((s) => s.code === c)).filter(Boolean),
      all: sorted,
    };
  }, [skus, lots]);

  const filteredLots = useMemo(() => {
    if (!searchTerm.trim()) return lots.filter((l) => l.qty > 0);
    const q = searchTerm.toLowerCase();
    return lots.filter(
      (l) =>
        l.qty > 0 &&
        (l.sku.toLowerCase().includes(q) ||
          l.lot.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q))
    );
  }, [lots, searchTerm]);

  function scoreSku(code) {
    const sku = skus.find((s) => s.code === code);
    if (!sku) return 0;
    const recentIn = lots.filter((l) => l.sku === code).length;
    return sku.usageCount * 3 + recentIn * 2 + (sku.pinned ? 10 : 0);
  }

  function generateRecommendations(code) {
    const sku = skus.find((s) => s.code === code);
    if (!sku) return [];
    const popularity = scoreSku(code);
    const targetZone = sku.zone;
    const existingSameSku = lots.filter((l) => l.sku === code).map((l) => l.location);
    const preferredRows =
      popularity >= 45 ? [1, 2, 3, 4, 5] :
      popularity >= 30 ? [6, 7, 8, 9, 10] :
      popularity >= 15 ? [11, 12, 13, 14, 15] :
      [16, 17, 18, 19, 20];

    const zoneInfo = ZONES.find((z) => z.key === targetZone);
    const zoneRows = preferredRows.filter((r) => zoneForRow(r) === targetZone);
    const fallbackRows = zoneInfo
      ? Array.from({ length: zoneInfo.rowEnd - zoneInfo.rowStart + 1 }, (_, i) => zoneInfo.rowStart + i)
      : preferredRows;

    const candidateRows = [...new Set([...zoneRows, ...fallbackRows])];
    const results = [];

    for (const row of candidateRows) {
      for (let col = 1; col <= GRID_COLS; col++) {
        const loc = buildLocation(targetZone, row, col);
        if (!occupiedSet.has(loc)) {
          let reason = popularity >= 45 ? "Fast-moving SKU → front zone" : "Default zone match";
          if (existingSameSku.length > 0) reason += " · close to same SKU lots";
          results.push({ location: loc, reason });
          if (results.length === 3) return results;
        }
      }
    }
    return results;
  }

  function handleRecommend() {
    if (!selectedSku) return;
    const recs = generateRecommendations(selectedSku);
    setRecommendations(recs);
    setPickedLocation(recs[0]?.location || "");
    setMessage(recs.length ? `Suggested ${recs[0].location}` : "No empty location found.");
  }

  function handleSaveInbound() {
    if (!selectedSku || !lotNo || !qty || !pickedLocation) {
      setMessage("Please choose SKU, lot, quantity, and location.");
      return;
    }

    const zone = pickedLocation.split("-")[0];
    const newLot = {
      id: Date.now(),
      sku: selectedSku,
      lot: lotNo,
      qty: Number(qty),
      mfg,
      exp,
      receiveDate,
      location: pickedLocation,
      zone,
    };

    setLots((prev) => [newLot, ...prev]);
    setSkus((prev) => prev.map((s) => (s.code === selectedSku ? { ...s, usageCount: s.usageCount + 1 } : s)));
    setLotNo("");
    setQty("");
    setRecommendations([]);
    setPickedLocation("");
    setMessage(`Saved ${selectedSku} / ${newLot.lot} to ${newLot.location}`);
  }

  function handleAddSku() {
    if (!newSku.code.trim() || !newSku.name.trim()) return;
    const exists = skus.some((s) => s.code === newSku.code.trim());
    if (exists) {
      setMessage("SKU code already exists.");
      return;
    }
    const sku = { ...newSku, code: newSku.code.trim(), name: newSku.name.trim(), usageCount: 1, pinned: false };
    setSkus((prev) => [sku, ...prev]);
    setSelectedSku(sku.code);
    setDispatchSku(sku.code);
    setNewSku({ code: "", name: "", group: "FG", zone: "A", mode: "FEFO" });
    setShowAddSku(false);
    setMessage(`Added new SKU ${sku.code}`);
  }

  function handleFindLot(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchResult(null);
      return;
    }
    const result = lots.filter(
      (l) => l.qty > 0 && (l.lot.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q) || l.location.toLowerCase().includes(q))
    );
    setSearchResult(result);
  }

  function buildDispatchPlan() {
    const requestQty = Number(dispatchQty);
    if (!dispatchSku || !requestQty || requestQty <= 0) {
      setMessage("Please choose dispatch SKU and quantity.");
      return;
    }

    const candidates = lots
      .filter((l) => l.sku === dispatchSku && l.qty > 0)
      .sort((a, b) => {
        if (dispatchMode === "FEFO") {
          return new Date(a.exp) - new Date(b.exp);
        }
        return new Date(a.receiveDate) - new Date(b.receiveDate);
      });

    const totalAvailable = candidates.reduce((sum, item) => sum + item.qty, 0);
    if (totalAvailable < requestQty) {
      setDispatchPlan([]);
      setMessage(`Insufficient stock. Available ${totalAvailable}, requested ${requestQty}.`);
      return;
    }

    let remaining = requestQty;
    const plan = [];
    for (const item of candidates) {
      if (remaining <= 0) break;
      const pickQty = Math.min(item.qty, remaining);
      plan.push({
        id: item.id,
        sku: item.sku,
        lot: item.lot,
        location: item.location,
        available: item.qty,
        pickQty,
        exp: item.exp,
        receiveDate: item.receiveDate,
      });
      remaining -= pickQty;
    }

    setDispatchPlan(plan);
    setMessage(`Dispatch plan ready for ${dispatchSku}.`);
  }

  function confirmDispatch() {
    if (dispatchPlan.length === 0) {
      setMessage("No dispatch plan found.");
      return;
    }

    setLots((prev) =>
      prev
        .map((lot) => {
          const planItem = dispatchPlan.find((p) => p.id === lot.id);
          if (!planItem) return lot;
          return { ...lot, qty: lot.qty - planItem.pickQty };
        })
        .filter((lot) => lot.qty > 0)
    );

    const totalDispatched = dispatchPlan.reduce((sum, item) => sum + item.pickQty, 0);
    setDispatchPlan([]);
    setDispatchQty("");
    setMessage(`Dispatched ${totalDispatched} units of ${dispatchSku}.`);
  }

  const stats = useMemo(() => {
    const totalSlots = GRID_ROWS * GRID_COLS;
    const occupied = lots.filter((l) => l.qty > 0).length;
    const fastMovers = [...skus].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3);
    const nearFront = lots.filter((l) => l.qty > 0 && locationParts(l.location).row <= 5).length;
    return { totalSlots, occupied, occupancy: ((occupied / totalSlots) * 100).toFixed(1), fastMovers, nearFront };
  }, [lots, skus]);

  const highlightedLocations = new Set([
    ...recommendations.map((r) => r.location),
    ...(searchResult || []).map((r) => r.location),
    ...(dispatchPlan || []).map((r) => r.location),
    ...(pickedLocation ? [pickedLocation] : []),
    ...(selectedGridInfo?.location ? [selectedGridInfo.location] : []),
  ]);

  function handleGridClick(location) {
    const lotsInGrid = lots.filter((l) => l.location === location && l.qty > 0);
    const zone = location.split("-")[0];
    setSelectedGridInfo({ location, zone, lots: lotsInGrid });
    setMessage(lotsInGrid.length > 0 ? `Selected ${location}` : `Selected empty grid ${location}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>EPAC Smart Putaway & Lot Location Prototype</h1>
            <p style={{ color: "#475569", marginTop: 8 }}>
              Quick-input warehouse prototype without barcode. Designed for faster inbound, lot visibility, rule-based shelf recommendation, and dispatch planning.
            </p>
          </div>
          <div style={badgeStyle}>Prototype Web App</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard icon={<Warehouse size={20} />} title="Occupied Slots" value={`${stats.occupied} / ${stats.totalSlots}`} note={`${stats.occupancy}% occupancy`} />
          <StatCard icon={<Package size={20} />} title="Tracked Lots" value={String(lots.filter((l) => l.qty > 0).length)} note="Lot-level shelf visibility" />
          <StatCard icon={<TrendingUp size={20} />} title="Front Zone Usage" value={String(stats.nearFront)} note="Locations in rows 1-5" />
          <StatCard icon={<Clock3 size={20} />} title="System Status" value="Quick Input Ready" note={message} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}><Layers3 size={20} /> Quick Receive</h2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["frequent", "recent", "favorite", "all"].map((tab) => (
                <button key={tab} onClick={() => setSkuTab(tab)} style={skuTab === tab ? activeTabStyle : tabStyle}>
                  {tab}
                </button>
              ))}
              <button onClick={() => setShowAddSku((v) => !v)} style={outlineBtnStyle}>
                <Plus size={16} /> Add SKU
              </button>
            </div>

            {showAddSku && (
              <div style={{ ...panelStyle, marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Add New SKU</h3>
                <div style={grid2}>
                  <Field label="SKU Code">
                    <input style={inputStyle} value={newSku.code} onChange={(e) => setNewSku((p) => ({ ...p, code: e.target.value }))} />
                  </Field>
                  <Field label="SKU Name">
                    <input style={inputStyle} value={newSku.name} onChange={(e) => setNewSku((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                </div>
                <div style={grid3}>
                  <Field label="Group">
                    <select style={inputStyle} value={newSku.group} onChange={(e) => setNewSku((p) => ({ ...p, group: e.target.value }))}>
                      <option>FG</option>
                      <option>PK</option>
                      <option>RM</option>
                    </select>
                  </Field>
                  <Field label="Default Zone">
                    <select style={inputStyle} value={newSku.zone} onChange={(e) => setNewSku((p) => ({ ...p, zone: e.target.value }))}>
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>D</option>
                    </select>
                  </Field>
                  <Field label="Mode">
                    <select style={inputStyle} value={newSku.mode} onChange={(e) => setNewSku((p) => ({ ...p, mode: e.target.value }))}>
                      <option>FIFO</option>
                      <option>FEFO</option>
                    </select>
                  </Field>
                </div>
                <button onClick={handleAddSku} style={primaryBtnStyle}>Save SKU</button>
              </div>
            )}

            <div style={{ ...panelStyle, marginBottom: 16, minHeight: 100 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(skuGroups[skuTab] || []).map((sku) => (
                  <button
                    key={sku.code}
                    onClick={() => setSelectedSku(sku.code)}
                    style={selectedSku === sku.code ? activeSkuBtnStyle : skuBtnStyle}
                  >
                    {sku.code}
                  </button>
                ))}
              </div>
            </div>

            <div style={grid2}>
              <div style={panelStyle}>
                <div style={{ fontWeight: 700 }}>{selectedSkuObj?.code || "-"}</div>
                <div style={{ color: "#475569", marginTop: 4 }}>{selectedSkuObj?.name || "Select a SKU"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={miniBadge}>Zone {selectedSkuObj?.zone || "-"}</span>
                  <span style={miniBadge}>{selectedSkuObj?.mode || "-"}</span>
                  <span style={miniBadge}>Usage {selectedSkuObj?.usageCount || 0}</span>
                </div>
              </div>

              <div style={panelStyle}>
                <Field label="Quick Search SKU / Lot / Location">
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={inputStyle}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Try FG-PLATE-9 or L250301A"
                    />
                    <button onClick={() => handleFindLot(searchTerm)} style={outlineBtnStyle}>
                      <Search size={16} />
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            <div style={{ height: 1, background: "#e2e8f0", margin: "20px 0" }} />

            <div style={grid4}>
              <Field label="Lot No."><input style={inputStyle} value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="L250317A" /></Field>
              <Field label="Qty"><input style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="120" type="number" /></Field>
              <Field label="MFG"><input style={inputStyle} value={mfg} onChange={(e) => setMfg(e.target.value)} type="date" /></Field>
              <Field label="EXP"><input style={inputStyle} value={exp} onChange={(e) => setExp(e.target.value)} type="date" /></Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end", marginTop: 16 }}>
              <Field label="Receive Date"><input style={inputStyle} value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} type="date" /></Field>
              <button onClick={handleRecommend} style={primaryBtnStyle}>Recommend Shelf</button>
              <button onClick={handleSaveInbound} style={secondaryBtnStyle}>Save Inbound</button>
            </div>

            <div style={{ ...panelStyle, marginTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Recommended Locations</div>
              {recommendations.length === 0 ? (
                <div style={{ color: "#64748b" }}>No recommendation yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {recommendations.map((rec, idx) => (
                    <button
                      key={rec.location}
                      onClick={() => setPickedLocation(rec.location)}
                      style={{
                        textAlign: "left",
                        border: pickedLocation === rec.location ? "2px solid #0f172a" : "1px solid #cbd5e1",
                        background: "#fff",
                        borderRadius: 12,
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {idx === 0 ? "Suggested" : `Alternative ${idx}`}: {rec.location}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{rec.reason}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}><MapPinned size={20} /> Warehouse Grid Map</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {ZONES.map((z) => (
                <div key={z.key} style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 8, padding: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: z.color, display: "inline-block" }} />
                  <span style={{ fontSize: 13 }}>{z.label}</span>
                </div>
              ))}
            </div>

            <div style={{ ...panelStyle, overflow: "auto", marginBottom: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(24px, 1fr))`,
                  gap: 4,
                  minWidth: 560,
                }}
              >
                {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, idx) => {
                  const row = Math.floor(idx / GRID_COLS) + 1;
                  const col = (idx % GRID_COLS) + 1;
                  const zone = zoneForRow(row);
                  const loc = buildLocation(zone, row, col);
                  const occupied = occupiedSet.has(loc);
                  const highlighted = highlightedLocations.has(loc);
                  const isSelected = selectedGridInfo?.location === loc;
                  const zoneColor = ZONES.find((z) => z.key === zone)?.color || "#94a3b8";
                  return (
                    <button
                      key={loc}
                      title={loc}
                      onClick={() => handleGridClick(loc)}
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: 6,
                        border: isSelected ? "3px solid #ef4444" : highlighted ? "2px solid #0f172a" : "1px solid #cbd5e1",
                        background: occupied ? "#1e293b" : zoneColor,
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: occupied ? 1 : 0.75,
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 0 0 2px rgba(239,68,68,0.2)" : "none",
                      }}
                    >
                      {row}-{col}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Search / Dispatch Highlight</div>
              {!searchResult && dispatchPlan.length === 0 ? (
                <div style={{ color: "#64748b" }}>Search a SKU, lot, or location, or create a dispatch plan to highlight positions on the grid.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(searchResult || []).map((item) => (
                    <div key={`s-${item.id}`} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#fff" }}>
                      <div style={{ fontWeight: 700 }}>{item.sku} / {item.lot}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>Location: {item.location} · Qty: {item.qty}</div>
                    </div>
                  ))}
                  {dispatchPlan.map((item) => (
                    <div key={`d-${item.id}`} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#fff" }}>
                      <div style={{ fontWeight: 700 }}>Dispatch: {item.sku} / {item.lot}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>Pick {item.pickQty} from {item.location}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...panelStyle, marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Selected Grid Detail</div>
              {!selectedGridInfo ? (
                <div style={{ color: "#64748b" }}>Click any grid cell to inspect that location.</div>
              ) : selectedGridInfo.lots.length === 0 ? (
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedGridInfo.location}</div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>Zone {selectedGridInfo.zone} · This grid is empty.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{selectedGridInfo.location}</div>
                  {selectedGridInfo.lots.map((item) => (
                    <div key={`g-${item.id}`} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#fff" }}>
                      <div style={{ fontWeight: 700 }}>{item.sku} / {item.lot}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>Qty: {item.qty}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <span style={miniBadge}>MFG {item.mfg}</span>
                        <span style={miniBadge}>EXP {item.exp}</span>
                        <span style={miniBadge}>Receive {item.receiveDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}><Truck size={20} /> Dispatch / Picking</h2>
            <div style={grid3}>
              <Field label="Dispatch SKU">
                <select style={inputStyle} value={dispatchSku} onChange={(e) => setDispatchSku(e.target.value)}>
                  {skus.map((sku) => (
                    <option key={sku.code} value={sku.code}>{sku.code}</option>
                  ))}
                </select>
              </Field>
              <Field label="Qty Requested">
                <input style={inputStyle} value={dispatchQty} onChange={(e) => setDispatchQty(e.target.value)} type="number" placeholder="100" />
              </Field>
              <Field label="Dispatch Mode">
                <select style={inputStyle} value={dispatchMode} onChange={(e) => setDispatchMode(e.target.value)}>
                  <option value="FEFO">FEFO</option>
                  <option value="FIFO">FIFO</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16, marginBottom: 16 }}>
              <button onClick={buildDispatchPlan} style={primaryBtnStyle}>Find Lots</button>
              <button onClick={confirmDispatch} style={secondaryBtnStyle}>Confirm Dispatch</button>
            </div>

            <div style={panelStyle}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Picking Recommendation</div>
              {dispatchPlan.length === 0 ? (
                <div style={{ color: "#64748b" }}>No dispatch plan yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {dispatchPlan.map((item, index) => (
                    <div key={item.id} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#fff" }}>
                      <div style={{ fontWeight: 700 }}>#{index + 1} Pick {item.pickQty} from {item.location}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>{item.sku} / {item.lot}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        Available: {item.available} · Receive: {item.receiveDate} · EXP: {item.exp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Current Lot Records</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {filteredLots.slice(0, 10).map((item) => (
                <div key={item.id} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ fontWeight: 700 }}>{item.sku} · {item.lot}</div>
                  <div style={{ color: "#475569", marginTop: 4 }}>{item.location} · Qty {item.qty} · {item.zone}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <span style={miniBadge}>MFG {item.mfg}</span>
                    <span style={miniBadge}>EXP {item.exp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginTop: 24 }}>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Top Frequent SKUs</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {stats.fastMovers.map((sku, i) => (
                <div key={sku.code} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 16, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>#{i + 1} {sku.code}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>{sku.name}</div>
                    </div>
                    <span style={miniBadge}>Usage {sku.usageCount}</span>
                  </div>
                  <div style={{ color: "#475569", fontSize: 14, marginTop: 12 }}>
                    Suggested storage behavior: keep in Zone {sku.zone}, nearer the front when inbound frequency rises.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, title, value, note }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ background: "#e2e8f0", borderRadius: 16, padding: 12 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, color: "#64748b" }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{note}</div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 22,
  marginTop: 0,
  marginBottom: 16,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const primaryBtnStyle = {
  background: "#0f172a",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
};

const secondaryBtnStyle = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const outlineBtnStyle = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
};

const tabStyle = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  padding: "8px 12px",
  borderRadius: 12,
  cursor: "pointer",
  textTransform: "capitalize",
};

const activeTabStyle = {
  ...tabStyle,
  background: "#0f172a",
  color: "#fff",
  border: "1px solid #0f172a",
};

const skuBtnStyle = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  padding: "8px 12px",
  borderRadius: 999,
  cursor: "pointer",
};

const activeSkuBtnStyle = {
  ...skuBtnStyle,
  background: "#0f172a",
  color: "#fff",
  border: "1px solid #0f172a",
};

const badgeStyle = {
  background: "#e2e8f0",
  color: "#0f172a",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const miniBadge = {
  background: "#f1f5f9",
  color: "#334155",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  marginTop: 12,
  marginBottom: 12,
};

const grid4 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 12,
};

