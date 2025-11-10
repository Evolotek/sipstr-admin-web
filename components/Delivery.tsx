"use client";

import { useEffect, useState } from "react";
import { deliveryZoneService } from "../services/deliveryZone";
import { apiService } from "../services/apiService"; // <-- new: used to fetch stores
import { DeliveryZone, CreateDeliveryZoneRequest } from "../services/types";

function parseKmlToPlacemarks(kmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "application/xml");

  let placemarkNodes: Element[] = [];
  try {
    placemarkNodes = Array.from(doc.getElementsByTagNameNS?.("*", "Placemark") || []);
  } catch (e) {
    placemarkNodes = [];
  }
  if (placemarkNodes.length === 0) {
    placemarkNodes = Array.from(doc.getElementsByTagName("Placemark") || []);
  }

  const canonicalKey = (rawKey: string) => {
    const k = rawKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    const map: Record<string, string> = {
      zonename: "zoneName",
      "zone": "zoneName",
      name: "zoneName",

      basefee: "baseDeliveryFee",
      "base delivery fee": "baseDeliveryFee",
      basedeliveryfee: "baseDeliveryFee",

      permilefee: "perMileFee",
      "per mile fee": "perMileFee",
      permile: "perMileFee",

      minorder: "minOrderAmount",
      "min order": "minOrderAmount",
      minorderamount: "minOrderAmount",

      estpreptime: "estimatedPreparationTime",
      estprep: "estimatedPreparationTime",
      "est prep": "estimatedPreparationTime",
      "estimated preparation time": "estimatedPreparationTime",

      restricted: "isRestricted",
      isrestricted: "isRestricted",
      allow: "isRestricted",
    };
    return map[k] ?? rawKey;
  };

  const parseValue = (val: string) => {
    const v = String(val).trim();
    if (!v) return v;

    const low = v.toLowerCase();
    if (low === "yes" || low === "true") return true;
    if (low === "no" || low === "false") return false;

    const withoutUnits = v.replace(/\b(mins?|minutes?)\b/gi, "").trim();

    const numCandidate = withoutUnits.match(/-?\d+(\.\d+)?/);
    if (numCandidate) {
      const n = Number(numCandidate[0]);
      if (!Number.isNaN(n)) return n;
    }

    return v;
  };

  const parsed = placemarkNodes.map((pm) => {
    const nameEl = pm.getElementsByTagName("name")[0];
    const descEl = pm.getElementsByTagName("description")[0];

    let coordsEl = pm.getElementsByTagName("coordinates")[0];
    if (!coordsEl) {
      const allCoords = Array.from(pm.getElementsByTagNameNS?.("*", "coordinates") || []);
      if (allCoords.length > 0) coordsEl = allCoords[0];
    }

    const name = nameEl ? nameEl.textContent?.trim() ?? "" : "";
    const rawDescription = descEl ? descEl.textContent ?? "" : "";

    let coordinates: number[][] = [];
    if (coordsEl && coordsEl.textContent) {
      const coordsText = coordsEl.textContent.trim();
      const tokens = coordsText.split(/\s+/).map((t) => t.trim()).filter(Boolean);
      coordinates = tokens.map((tok) => {
        const parts = tok.split(",").map((p) => p.trim());
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        return [lat, lon];
      }).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    }

    let descData: Record<string, any> = {};
    const cleaned = (rawDescription || "").trim();
    const withNewlines = cleaned.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "\n").trim();

    try {
      if (cleaned.startsWith("{")) {
        const maybeJson = JSON.parse(cleaned);
        if (maybeJson && typeof maybeJson === "object") {
          descData = maybeJson;
        }
      } else {
        const lines = withNewlines.split("\n").map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const sepIndex = line.indexOf(":");
          if (sepIndex > -1) {
            const keyRaw = line.slice(0, sepIndex).trim();
            const valueRaw = line.slice(sepIndex + 1).trim();
            const key = canonicalKey(keyRaw);
            descData[key] = parseValue(valueRaw);
          } else {
            const dashIndex = line.indexOf(" - ");
            if (dashIndex > -1) {
              const keyRaw = line.slice(0, dashIndex).trim();
              const valueRaw = line.slice(dashIndex + 3).trim();
              const key = canonicalKey(keyRaw);
              descData[key] = parseValue(valueRaw);
            } else {
              if (!descData.notes) descData.notes = [];
              descData.notes.push(line);
            }
          }
        }
      }
    } catch (err) {
      const lines = withNewlines.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const sepIndex = line.indexOf(":");
        if (sepIndex > -1) {
          const keyRaw = line.slice(0, sepIndex).trim();
          const valueRaw = line.slice(sepIndex + 1).trim();
          const key = canonicalKey(keyRaw);
          descData[key] = parseValue(valueRaw);
        } else {
          if (!descData.notes) descData.notes = [];
          descData.notes.push(line);
        }
      }
    }

    return {
      name,
      rawDescription,
      parsedDescription: descData,
      coordinates,
    };
  });

  return parsed;
}


export default function DeliveryZonesPage() {
  // storeName (user-friendly) + resolved selected store
  const [storeName, setStoreName] = useState(""); // <-- user types the store name
  const [stores, setStores] = useState<{ uuid: string; storeName: string }[]>([]); // fetched stores list
  const [selectedStoreUuid, setSelectedStoreUuid] = useState<string | null>(null); // resolved uuid

  // control dropdown visibility
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editZone, setEditZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState<CreateDeliveryZoneRequest>({
    zoneName: "",
    baseDeliveryFee: 0,
    perMileFee: 0,
    minOrderAmount: 0,
    estimatedPreparationTime: 0,
    isRestricted: false,
    coordinates: [[0, 0]],
    storeUuid: "",
  });

  // Parsed KML placemarks from uploaded file
  const [parsedPlacemarks, setParsedPlacemarks] = useState<any[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null); // index being created

  // --- Styles (kept same) ---
  const styles = {
    container: { maxWidth: "900px", margin: "0 auto", padding: "16px", fontFamily: "'Segoe UI', sans-serif" },
    input: { padding: "8px", borderRadius: "4px", border: "1px solid #FF6600" },
    button: { padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#FF6600", color: "#fff", cursor: "pointer" },
    table: { width: "100%", borderCollapse: "collapse" }, // Removed unnecessary 'as const'
    th: { border: "1px solid #FF6600", padding: "8px", backgroundColor: "#FF6600", color: "#fff" },
    td: { border: "1px solid #FF6600", padding: "8px", backgroundColor: "#fff", color: "#333" },
    modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }, // Removed unnecessary 'as const'
    modalContent: { backgroundColor: "#fff", padding: "24px", borderRadius: "8px", width: "550px", maxHeight: "80vh", overflowY: "auto", overflowX:"hidden" },
    modalInput: { padding: "8px", borderRadius: "4px", border: "1px solid #FF6600" },
    modalButton: { padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#FF6600", color: "#fff", cursor: "pointer" },
    coordinateRow: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" },
    coordinateInput: { width: "100px", padding: "6px", borderRadius: "4px", border: "1px solid #FF6600" },
    removeCoordBtn: { padding: "4px 8px", borderRadius: "4px", border: "none", backgroundColor: "#FF6600", color: "#fff", cursor: "pointer" , marginRight: "8px"},
    label: { display: "flex", flexDirection: "column", marginBottom: "8px", fontWeight: "bold" }
} as const; // <-- The fix is here!

  // Fetch stores list once (for resolving storeName -> storeUuid)
  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      try {
        const res = await apiService.getStores(); // uses your existing api client
        // res likely is Store[]; map to { uuid, storeName } shape
        if (!mounted) return;
        const mapped = (res as any[]).map((s) => ({ uuid: s.uuid ?? s.storeUuid ?? s.storeId ?? s.id, storeName: s.storeName ?? s.name ?? s.store_name ?? s.name }));
        setStores(mapped);
      } catch (err) {
        console.warn("Failed to fetch stores for name resolution", err);
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, []);

  // Resolve selected store UUID when user picks/enters a storeName
  useEffect(() => {
    if (!storeName.trim()) {
      setSelectedStoreUuid(null);
      return;
    }
    // try exact match first, case-insensitive
    const exact = stores.find((s) => s.storeName?.toLowerCase() === storeName.trim().toLowerCase());
    if (exact) {
      setSelectedStoreUuid(exact.uuid);
      return;
    }
    // try prefix match
    const prefix = stores.find((s) => s.storeName?.toLowerCase().startsWith(storeName.trim().toLowerCase()));
    if (prefix) {
      setSelectedStoreUuid(prefix.uuid);
      return;
    }
    // no match
    setSelectedStoreUuid(null);
  }, [storeName, stores]);

  // Fetch zones - same as before but uses selectedStoreUuid now
  const fetchZones = async () => {
    if (!selectedStoreUuid) {
      setError("Please select a store (by name) before fetching zones");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await deliveryZoneService.getDeliveryZones(selectedStoreUuid);
      console.log(data);
      setZones(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch zones");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditZone(null);
    setForm({
      zoneName: "",
      baseDeliveryFee: 0,
      perMileFee: 0,
      minOrderAmount: 0,
      estimatedPreparationTime: 0,
      isRestricted: false,
      coordinates: [[0, 0]],
      storeUuid: selectedStoreUuid ?? "",
    });
    setShowModal(true);
  };

  const openEditModal = (zone: DeliveryZone) => {
    setEditZone(zone);
    setForm({
      zoneName: zone.zoneName,
      baseDeliveryFee: zone.baseDeliveryFee,
      perMileFee: zone.perMileFee,
      minOrderAmount: zone.minOrderAmount,
      estimatedPreparationTime: zone.estimatedPreparationTime ?? 0,
      isRestricted: zone.isRestricted,
      coordinates:zone.coordinates as [number, number][],
      storeUuid: zone.storeUuid,
    });

    // Also pre-fill the top store input (if we know the store name)
    if (zone.storeUuid) {
      setSelectedStoreUuid(zone.storeUuid);
      const matched = stores.find((s) => s.uuid === zone.storeUuid);
      if (matched) {
        setStoreName(matched.storeName);
      }
    }

    // hide suggestions when editing
    setShowSuggestions(false);

    setShowModal(true);
  };

  const handleDelete = async (zone: DeliveryZone) => {
    console.log("Full zone object:", zone);
    if (!zone.zoneId) return;
    if (!confirm(`Delete zone "${zone.zoneName}"?`)) return;
    try {
      setLoading(true);
      await deliveryZoneService.deleteDeliveryZone(zone.zoneId.toString());
      await fetchZones();
    } catch (err) {
      console.error(err);
      setError("Failed to delete zone");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // ensure form.storeUuid is set (prefer form, else selectedStoreUuid)
      const payload = { ...form, storeUuid: form.storeUuid || selectedStoreUuid || "" };
      if (!payload.storeUuid) {
        alert("Store UUID is missing. Please select a store name first.");
        setLoading(false);
        return;
      }
      if (editZone?.zoneId) {
        await deliveryZoneService.updateDeliveryZone(editZone.zoneId.toString(), payload);
      } else {
        await deliveryZoneService.createDeliveryZone(payload);
      }
      setShowModal(false);
      await fetchZones();
    } catch (err) {
      console.error(err);
      setError("Failed to save zone");
    } finally {
      setLoading(false);
    }
  };

  const handleCoordinateChange = (index: number, latOrLng: 0 | 1, value: number) => {
    const newCoords = [...form.coordinates];
    newCoords[index][latOrLng] = value;
    setForm({ ...form, coordinates: newCoords });
  };

  const addCoordinate = () => {
    setForm({ ...form, coordinates: [...form.coordinates, [0, 0]] });
  };

  const removeCoordinate = (index: number) => {
    const newCoords = form.coordinates.filter((_, i) => i !== index);
    setForm({ ...form, coordinates: newCoords });
  };

  // --- KML Upload handler ---
  const handleFileUpload = async (file: File | null) => {
    setParsingError(null);
    setParsedPlacemarks([]);
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseKmlToPlacemarks(text);
      if (parsed.length === 0) setParsingError("No placemarks found in KML");
      setParsedPlacemarks(parsed);
    } catch (err) {
      console.error(err);
      setParsingError("Failed to parse KML");
    }
  };

  // Populate modal form from parsed placemark (and open modal)
  const reviewPlacemark = (pm: any) => {
    const coords = pm.coordinates.length ? pm.coordinates : [[0, 0]];
    const createReq: CreateDeliveryZoneRequest = {
      zoneName: pm.parsedDescription?.zoneName ?? pm.name ?? "Imported Zone",
      baseDeliveryFee: Number(pm.parsedDescription?.baseDeliveryFee ?? 0),
      perMileFee: Number(pm.parsedDescription?.perMileFee ?? 0),
      minOrderAmount: Number(pm.parsedDescription?.minOrderAmount ?? 0),
      estimatedPreparationTime: Number(pm.parsedDescription?.estimatedPreparationTime ?? 0),
      isRestricted: Boolean(pm.parsedDescription?.isRestricted ?? false),
      coordinates: coords, // already [lat, lng]
      storeUuid: selectedStoreUuid ?? form.storeUuid ?? "", // <-- use selected store uuid
    };
    setEditZone(null);
    setForm(createReq);
    setShowModal(true);
  };

  // Direct create from placemark without opening modal
  const createFromPlacemark = async (pm: any, idx: number) => {
    const resolvedUuid = selectedStoreUuid;
    if (!resolvedUuid) {
      alert("Please select a store (by name) before creating zones.");
      return;
    }
    const coords = pm.coordinates.length ? pm.coordinates : [[0, 0]];
    const createReq: CreateDeliveryZoneRequest = {
      zoneName: pm.parsedDescription?.zoneName ?? pm.name ?? `Imported Zone ${idx + 1}`,
      baseDeliveryFee: Number(pm.parsedDescription?.baseDeliveryFee ?? 0),
      perMileFee: Number(pm.parsedDescription?.perMileFee ?? 0),
      minOrderAmount: Number(pm.parsedDescription?.minOrderAmount ?? 0),
      estimatedPreparationTime: Number(pm.parsedDescription?.estimatedPreparationTime ?? 0),
      isRestricted: Boolean(pm.parsedDescription?.isRestricted ?? false),
      coordinates: coords,
      storeUuid: resolvedUuid,
    };

    try {
      setUploadingIndex(idx);
      await deliveryZoneService.createDeliveryZone(createReq);
      // refresh zones
      await fetchZones();
      // remove created placemark from UI
      setParsedPlacemarks((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      console.error(err);
      alert("Failed to create delivery zone from placemark");
    } finally {
      setUploadingIndex(null);
    }
  };

  // Handle bulk create (all parsed)
  const createAllPlacemarks = async () => {
    if (!selectedStoreUuid) {
      alert("Please select a store (by name) before creating zones.");
      return;
    }
    for (let i = 0; i < parsedPlacemarks.length; i++) {
      // await sequentially to avoid flooding backend; you can parallelize if desired
      // eslint-disable-next-line no-await-in-loop
      await createFromPlacemark(parsedPlacemarks[i], i);
    }
  };

  // utility: filter store names for dropdown suggestions
  const storeSuggestions = storeName.trim()
    ? stores.filter((s) => s.storeName.toLowerCase().includes(storeName.trim().toLowerCase()))
    : stores.slice(0, 10);

  return (
    <div style={styles.container}>
      <h2 style={{ color: "#FF6600" }}>Delivery Zones</h2>

      {/* Store name input + Search / Upload Row */}
      <div style={{ display: "flex", marginBottom: "16px", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            placeholder="Type or pick Store Name"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              // show suggestions again on change
              setShowSuggestions(true);
            }}
            // show suggestions on focus, hide on blur (with slight delay to allow click)
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // small timeout to allow click on suggestion before hiding
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // attempt resolution (exact then prefix) and hide suggestions
                const candidate = stores.find((s) => s.storeName?.toLowerCase() === storeName.trim().toLowerCase())
                  ?? stores.find((s) => s.storeName?.toLowerCase().startsWith(storeName.trim().toLowerCase()));
                if (candidate) {
                  setSelectedStoreUuid(candidate.uuid);
                  setStoreName(candidate.storeName);
                  alert(`Resolved store "${candidate.storeName}"`);
                } else {
                  setSelectedStoreUuid(null);
                  alert("Store not found. Please select from suggestions or add the store in backend.");
                }
                setShowSuggestions(false);
              }
            }}
            style={{ ...styles.input, width: "100%" }}
            aria-label="Store Name"
          />
          {/* Suggestions dropdown */}
          {storeSuggestions.length > 0 && storeName.trim() !== "" && showSuggestions && (
            <div style={{ position: "absolute", top: "42px", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", zIndex: 30, maxHeight: "200px", overflowY: "auto" }}>
              {storeSuggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={(ev) => {
                    // onMouseDown instead of onClick to avoid race with input blur
                    ev.preventDefault();
                    setStoreName(s.storeName);
                    setSelectedStoreUuid(s.uuid);
                    setShowSuggestions(false);
                  }}
                  style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #f1f1f1" }}
                >
                  {s.storeName}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              // immediate resolution attempt; notify user if not resolved
              if (!storeName.trim()) {
                alert("Please type store name to resolve.");
                return;
              }
              const match = stores.find((s) => s.storeName.toLowerCase() === storeName.trim().toLowerCase());
              if (match) {
                setSelectedStoreUuid(match.uuid);
                setShowSuggestions(false);
                alert(`Resolved store "${match.storeName}"`);
              } else {
                setSelectedStoreUuid(null);
                setShowSuggestions(false);
                alert("Store not found. Please select from suggestions or add the store in backend.");
              }
            }}
            style={{ ...styles.button }}
          >
            Resolve Store
          </button>

          <button onClick={fetchZones} style={styles.button}>Fetch Zones</button>

          {/* Upload KML */}
          <label
            style={{
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#FF6600",
              border: "solid",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "#000000")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "#ffffff")}
          >
            <span style={{ color: "#000000", fontWeight: "500" }}>Choose File</span>
            <input
              type="file"
              accept=".kml"
              onChange={(e) =>
                handleFileUpload(e.target.files ? e.target.files[0] : null)
              }
              style={{ display: "none" }}
            />
          </label>

        </div>
      </div>

      {/* show selected resolved uuid for clarity */}
      <div style={{ marginBottom: "12px", color: selectedStoreUuid ? "#2f855a" : "#c53030" }}>
        {selectedStoreUuid ? `Selected Store UUID: ${selectedStoreUuid}` : "No store selected or resolved"}
      </div>

      {/* Add button */}
      <button onClick={openAddModal} style={{ ...styles.button, marginBottom: "16px" }}>Add Delivery Zone</button>

      {/* Parsed placemarks preview */}
      {parsingError && <p style={{ color: "red" }}>{parsingError}</p>}
      {parsedPlacemarks.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ marginBottom: "8px" }}>Imported Placemarks ({parsedPlacemarks.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {parsedPlacemarks.map((pm, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "6px", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong>{pm.parsedDescription?.zoneName ?? pm.name ?? `Placemark ${idx + 1}`}</strong>
                    {/* <div style={{ fontSize: "13px", color: "#666" }}>{pm.parsedDescription?.notes ? (Array.isArray(pm.parsedDescription.notes) ? pm.parsedDescription.notes.join("; ") : pm.parsedDescription.notes) : pm.rawDescription}</div> */}
                    <div style={{ marginTop: "8px", fontSize: "13px" }}>
                      <div><strong>Base Fee:</strong> {pm.parsedDescription?.baseDeliveryFee ?? 0}</div>
                      <div><strong>Per Mile Fee:</strong> {pm.parsedDescription?.perMileFee ?? 0}</div>
                      <div><strong>Min Order:</strong> {pm.parsedDescription?.minOrderAmount ?? 0}</div>
                      <div><strong>Est Prep:</strong> {pm.parsedDescription?.estimatedPreparationTime ?? 0} mins</div>
                      <div><strong>Restricted:</strong> {pm.parsedDescription?.isRestricted ? "Yes" : "No"}</div>
                      <div><strong>Coordinates:</strong> {pm.coordinates.length} points</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button style={styles.modalButton} onClick={() => reviewPlacemark(pm)}>Review & Edit</button>
                    <button
                      style={{ ...styles.modalButton, backgroundColor: "#38a169" }}
                      onClick={() => createFromPlacemark(pm, idx)}
                      disabled={uploadingIndex === idx}
                    >
                      {uploadingIndex === idx ? "Creating..." : "Create Now"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: "8px" }}>
              <button style={{ ...styles.button, marginRight: "8px" }} onClick={createAllPlacemarks}>Create All</button>
              <button style={{ ...styles.modalButton, backgroundColor: "#aaa" }} onClick={() => { setParsedPlacemarks([]); }}>Clear List</button>
            </div>
          </div>
        </div>
      )}

      {/* Zones Table */}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {zones.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Zone Name</th>
              <th style={styles.th}>Base Fee</th>
              <th style={styles.th}>Per Mile Fee</th>
              <th style={styles.th}>Min Order</th>
              <th style={styles.th}>Restricted</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.zoneId}>
                <td style={styles.td}>{zone.zoneName}</td>
                <td style={styles.td}>{zone.baseDeliveryFee}</td>
                <td style={styles.td}>{zone.perMileFee}</td>
                <td style={styles.td}>{zone.minOrderAmount}</td>
                <td style={styles.td}>{zone.isRestricted ? "Yes" : "No"}</td>
                <td style={styles.td}>
                  <button onClick={() => openEditModal(zone)} style={{ ...styles.modalButton, marginRight: "8px" }}>Edit</button>
                  <button onClick={() => handleDelete(zone)} style={styles.removeCoordBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && zones.length === 0 && <p>No zones found.</p>}

      {/* --- Modal --- */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#FF6600" }}>{editZone ? "Edit Zone" : "Add Delivery Zone"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
              <label style={styles.label}>
                Zone Name:
                <input value={form.zoneName} onChange={(e) => setForm({ ...form, zoneName: e.target.value })} style={styles.modalInput} />
              </label>

              <label style={styles.label}>
                Base Fee:
                <input type="number" value={form.baseDeliveryFee} onChange={(e) => setForm({ ...form, baseDeliveryFee: Number(e.target.value) })} style={styles.modalInput} />
              </label>

              <label style={styles.label}>
                Per Mile Fee:
                <input type="number" value={form.perMileFee} onChange={(e) => setForm({ ...form, perMileFee: Number(e.target.value) })} style={styles.modalInput} />
              </label>

              <label style={styles.label}>
                Min Order:
                <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} style={styles.modalInput} />
              </label>

              <label style={styles.label}>
                Estimated Prep Time:
                <input type="number" value={form.estimatedPreparationTime} onChange={(e) => setForm({ ...form, estimatedPreparationTime: Number(e.target.value) })} style={styles.modalInput} />
              </label>

              <label style={{ ...styles.label, flexDirection: "row", alignItems: "center", gap: "8px" }}>
                Restricted:
                <input type="checkbox" checked={form.isRestricted} onChange={(e) => setForm({ ...form, isRestricted: e.target.checked })} />
              </label>

              <label style={styles.label}>
                Store UUID:
                <input value={form.storeUuid || selectedStoreUuid || ""} readOnly style={{ ...styles.modalInput, backgroundColor: "#eee", cursor: "not-allowed" }} />
              </label>
            </div>

            {/* Coordinates */}
            <div style={{ marginTop: "16px" }}>
              <h4>Coordinates</h4>
              {form.coordinates.map((coord, idx) => (
                <div key={idx} style={styles.coordinateRow}>
                  <label style={{ display: "flex", flexDirection: "column" }}>
                    Lat:
                    <input type="number" value={coord[0]} onChange={(e) => handleCoordinateChange(idx, 0, Number(e.target.value))} style={styles.coordinateInput} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column" }}>
                    Lng:
                    <input type="number" value={coord[1]} onChange={(e) => handleCoordinateChange(idx, 1, Number(e.target.value))} style={styles.coordinateInput} />
                  </label>
                  <button onClick={() => removeCoordinate(idx)} style={styles.removeCoordBtn}>Remove</button>
                </div>
              ))}
              <button onClick={addCoordinate} style={{ ...styles.modalButton, marginTop: "8px" }}>Add Coordinate</button>
            </div>

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button onClick={() => setShowModal(false)} style={{ marginRight: "8px", ...styles.modalButton, backgroundColor: "#aaa" }}>Cancel</button>
              <button onClick={handleSubmit} style={styles.modalButton}>{editZone ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
