"use client"

import { useState } from "react"
import { deliveryZoneService } from "../services/deliveryZone"
import { DeliveryZone, CreateDeliveryZoneRequest } from "../services/types"

export default function DeliveryZonesPage() {
  const [storeUuid, setStoreUuid] = useState("")
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editZone, setEditZone] = useState<DeliveryZone | null>(null)
  const [form, setForm] = useState<CreateDeliveryZoneRequest>({
    zoneName: "",
    baseDeliveryFee: 0,
    perMileFee: 0,
    minOrderAmount: 0,
    estimatedPreparationTime: 0,
    isRestricted: false,
    coordinates: [[0, 0]],
    storeUuid: "",
  })

  const fetchZones = async () => {
    if (!storeUuid.trim()) return
    setLoading(true)
    setError("")
    try {
      const data = await deliveryZoneService.getDeliveryZones(storeUuid)
      console.log(data)
      setZones(data)
    } catch (err) {
      console.error(err)
      setError("Failed to fetch zones")
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditZone(null)
    setForm({
      zoneName: "",
      baseDeliveryFee: 0,
      perMileFee: 0,
      minOrderAmount: 0,
      estimatedPreparationTime: 0,
      isRestricted: false,
      coordinates: [[0, 0]],
      storeUuid,
    })
    setShowModal(true)
  }

  const openEditModal = (zone: DeliveryZone) => {
    setEditZone(zone)
    setForm({
      zoneName: zone.zoneName,
      baseDeliveryFee: zone.baseDeliveryFee,
      perMileFee: zone.perMileFee,
      minOrderAmount: zone.minOrderAmount,
      estimatedPreparationTime: zone.estimatedPreparationTime ?? 0,
      isRestricted: zone.isRestricted,
      coordinates: zone.coordinates,
      storeUuid: zone.storeUuid,
    })
    setShowModal(true)
  }

  const handleDelete = async (zone: DeliveryZone) => {
    console.log("Full zone object:", zone)
    if (!zone.zoneId) return
    if (!confirm(`Delete zone "${zone.zoneName}"?`)) return
    try {
      setLoading(true)
      await deliveryZoneService.deleteDeliveryZone(zone.zoneId.toString())
      await fetchZones()
    } catch (err) {
      console.error(err)
      setError("Failed to delete zone")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      if (editZone?.zoneId) {
        await deliveryZoneService.updateDeliveryZone(editZone.zoneId.toString(), form)
      } else {
        await deliveryZoneService.createDeliveryZone(form)
      }
      setShowModal(false)
      await fetchZones()
    } catch (err) {
      console.error(err)
      setError("Failed to save zone")
    } finally {
      setLoading(false)
    }
  }

  const handleCoordinateChange = (index: number, latOrLng: 0 | 1, value: number) => {
    const newCoords = [...form.coordinates]
    newCoords[index][latOrLng] = value
    setForm({ ...form, coordinates: newCoords })
  }

  const addCoordinate = () => {
    setForm({ ...form, coordinates: [...form.coordinates, [0, 0]] })
  }

  const removeCoordinate = (index: number) => {
    const newCoords = form.coordinates.filter((_, i) => i !== index)
    setForm({ ...form, coordinates: newCoords })
  }

  // --- Styles ---
  const styles = {
    container: { maxWidth: "900px", margin: "0 auto", padding: "16px", fontFamily: "'Segoe UI', sans-serif" },
    input: { padding: "8px", borderRadius: "4px", border: "1px solid #ffa500" },
    button: { padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#ffa500", color: "#fff", cursor: "pointer" },
    table: { width: "100%", borderCollapse: "collapse" as const },
    th: { border: "1px solid #ffa500", padding: "8px", backgroundColor: "#ffa500", color: "#fff" },
    td: { border: "1px solid #ffa500", padding: "8px", backgroundColor: "#fff", color: "#333" },
    modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" },
    modalContent: { backgroundColor: "#fff",  padding: "24px",  borderRadius: "8px", width: "550px", maxHeight: "80vh", overflowY: "auto", overflowX:"hidden" },
    modalInput: { padding: "8px", borderRadius: "4px", border: "1px solid #ffa500" },
    modalButton: { padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#ffa500", color: "#fff", cursor: "pointer" },
    coordinateRow: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" },
    coordinateInput: { width: "100px", padding: "6px", borderRadius: "4px", border: "1px solid #ffa500" },
    removeCoordBtn: { padding: "4px 8px", borderRadius: "4px", border: "none", backgroundColor: "#ff4500", color: "#fff", cursor: "pointer" },
    label: { display: "flex", flexDirection: "column", marginBottom: "8px", fontWeight: "bold" }
  }

  return (
    <div style={styles.container}>
      <h2 style={{ color: "#ffa500" }}>Delivery Zones</h2>

      {/* Search */}
      <div style={{ display: "flex", marginBottom: "16px", gap: "8px" }}>
        <input type="text" placeholder="Enter Store UUID" value={storeUuid} onChange={(e) => setStoreUuid(e.target.value)} style={{ ...styles.input, flex: 1 }}  />
        <button onClick={fetchZones} style={styles.button}>Search</button>
      </div>

      {/* Add button */}
      <button onClick={openAddModal} style={{ ...styles.button, marginBottom: "16px" }}>Add Delivery Zone</button>

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
            <h3 style={{ color: "#ffa500" }}>{editZone ? "Edit Zone" : "Add Delivery Zone"}</h3>

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
                <input value={form.storeUuid} readOnly style={{ ...styles.modalInput, backgroundColor: "#eee", cursor: "not-allowed" }} />
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
  )
}
