// RolesModule.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { apiService } from "@/services/apiService";
import { CrudTable } from "./CrudTable";
import { Role } from "@/services/types";

/* ------------------ BCP-style AlertDialog ------------------ */
type CustomAlert = {
  isOpen: boolean;
  message: string;
  isConfirm: boolean;
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
};

const AlertDialog: React.FC<{ alert: CustomAlert; onClose: () => void }> = ({ alert, onClose }) => {
  if (!alert.isOpen) return null;

  const handleConfirm = async () => {
    try {
      if (alert.onConfirm) await alert.onConfirm();
    } finally {
      onClose();
    }
  };

  const handleCancel = () => {
    if (alert.onCancel) alert.onCancel();
    onClose();
  };

  return (
    <div
      role={alert.isConfirm ? "dialog" : "alertdialog"}
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0,0,0,0.35)",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700, color: "#222" }}>
          {alert.isConfirm ? "Please confirm" : "Notice"}
        </div>

        <div style={{ marginBottom: 18, color: "#333", lineHeight: 1.35 }}>{alert.message}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: alert.isConfirm ? "flex-end" : "center" }}>
          {alert.isConfirm && (
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#FF6600",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(255,102,0,0.12)",
            }}
          >
            {alert.isConfirm ? "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
/* ---------------------------------------------------------- */

export function RolesModule() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<{ name: string; description: string; permissions: string[] }>({
    name: "",
    description: "",
    permissions: [],
  });

  // Manage permissions modal state
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalMode, setPermissionModalMode] = useState<"add" | "remove">("add");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);

  // Alert state (BCP-style)
  const [customAlert, setCustomAlert] = useState<CustomAlert>({
    isOpen: false,
    message: "",
    isConfirm: false,
  });

  const showAlert = (message: string, isConfirm = false, onConfirm?: () => Promise<void> | void, onCancel?: () => void) => {
    setCustomAlert({ isOpen: true, message, isConfirm, onConfirm, onCancel });
  };
  const closeAlert = () => setCustomAlert((s) => ({ ...s, isOpen: false }));

  useEffect(() => {
    loadRoles();
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRoles();
      setRoles(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load roles";
      setError(msg);
      showAlert(msg, false);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const perms = await apiService.getRolePermissions();
      setAllPermissions(perms);
    } catch (err) {
      console.error("Failed to load permissions:", err);
      const msg = err instanceof Error ? err.message : "Failed to load permissions";
      showAlert(msg, false);
    }
  };

  // --- Add Role ---
  const handleAddRole = async () => {
    if (!formData.name.trim()) {
      showAlert("Role name is required", false);
      return;
    }
    if (!formData.permissions || formData.permissions.length === 0) {
      showAlert("Select at least one permission", false);
      return;
    }
    try {
      const newRole = await apiService.addRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      });
      setRoles((prev) => [...prev, { ...newRole, permissions: formData.permissions }]);
      setFormData({ name: "", description: "", permissions: [] });
      setShowAddModal(false);
      showAlert("Role added successfully!", false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to add role";
      showAlert(msg, false);
    }
  };

  // --- Delete Role ---
  const handleDeleteRole = async (roleId: string) => {
    if (!roleId) return;
    showAlert(
      "Are you sure you want to delete this role?",
      true,
      async () => {
        try {
          await apiService.deleteRole(roleId);
          setRoles((prev) => prev.filter((r) => r.id !== roleId));
          showAlert("Role deleted successfully!", false);
        } catch (err) {
          console.error(err);
          const msg = err instanceof Error ? err.message : "Failed to delete role";
          showAlert(msg, false);
        }
      },
      undefined
    );
  };

  // --- Manage Permissions single-call helpers (keeps your existing api signatures) ---
  const addPermissionsBatch = async (roleId: string, perms: string[]) => {
    if (!perms || perms.length === 0) {
      console.warn("addPermissionsBatch called with empty perms", { roleId, perms });
      return;
    }

    console.info("Frontend: calling batch add permissions", { roleId, perms });

    try {
      const result = await apiService.addRolePermissions(roleId, perms);
      console.info("Frontend: batch add response", result);

      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: Array.from(new Set([...(r.permissions || []), ...perms])) } : r))
      );
    } catch (err) {
      console.error("Frontend: addPermissionsBatch error", err);
      throw err;
    }
  };

  const removePermissionsBatch = async (roleId: string, perms: string[]) => {
    if (!perms || perms.length === 0) {
      console.warn("removePermissionsBatch called with empty perms", { roleId, perms });
      return;
    }
    console.info("Frontend: will remove permissions (single call)", { roleId, perms });

    try {
      console.debug("Frontend: calling apiService.removeRolePermission", { roleId, body: { permission: perms } });
      await apiService.removeRolePermission(roleId, perms);

      setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, permissions: (r.permissions || []).filter((p) => !perms.includes(p)) } : r)));
    } catch (err) {
      console.error("Frontend: removePermissionsBatch error", err);
      throw err;
    }
  };

  // Open manage-permissions modal
  const openManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setPermissionModalMode("add");
    setSelectedPermissions([]);
    setPermissionModalOpen(true);
  };

  // Toggle permission checkbox in modal
  const toggleSelectedPermission = (perm: string) => {
    setSelectedPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  // Save in modal
  const handleSavePermissions = async () => {
    if (!selectedRole) {
      showAlert("No role selected", false);
      return;
    }
    if (!selectedPermissions.length) {
      showAlert("Select at least one permission to save.", false);
      return;
    }

    const roleId = selectedRole.id;
    console.info("Frontend: Save permissions clicked", { roleId, mode: permissionModalMode, selectedPermissions });

    try {
      if (permissionModalMode === "add") {
        await addPermissionsBatch(roleId, selectedPermissions);
        showAlert("Permissions added successfully!", false);
      } else {
        await removePermissionsBatch(roleId, selectedPermissions);
        showAlert("Permissions removed successfully!", false);
      }

      setPermissionModalOpen(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      console.info("Frontend: permissions saved successfully");
    } catch (err: any) {
      console.error("Frontend: failed to save permissions", err);
      const msg = err?.message || "Failed to update permissions. Check console and network tab.";
      showAlert(msg, false);
    }
  };

  // --- Filter roles ---
  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  // --- Table Data ---
  const tableData = filteredRoles.map((role) => ({
    id: role.id,
    cells: [role.id, role.name, role.description || "-", (role.permissions || []).join(", ")],
    actions: [
      {
        label: "Manage Permissions",
        onClick: () => openManagePermissions(role),
      },
      {
        label: "Delete",
        onClick: () => handleDeleteRole(role.id),
      },
    ],
    extraComponent: null,
  }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by role name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
        />
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: "10px 16px", backgroundColor: "#FF6600", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          + Add Role
        </button>
      </div>

      {/* --- Add Role Modal --- */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: 400,
              background: "#fff",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>Add Role</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Role Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12, position: "relative" }} ref={dropdownRef}>
              <label style={{ display: "block", marginBottom: 4 }}>Permissions</label>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                <span>{formData.permissions.length ? formData.permissions.join(", ") : "Select permissions"}</span>
                <span style={{ fontWeight: "bold" }}>{dropdownOpen ? "▲" : "▼"}</span>
              </div>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: 150,
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    background: "#fff",
                    zIndex: 10,
                    marginTop: 4,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    padding: 8,
                  }}
                >
                  {allPermissions.map((p) => (
                    <label
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 6px",
                        cursor: "pointer",
                        borderRadius: 4,
                        background: formData.permissions.includes(p) ? "#f0f0f0" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(p)}
                        onChange={() => {
                          if (formData.permissions.includes(p)) {
                            setFormData({ ...formData, permissions: formData.permissions.filter((x) => x !== p) });
                          } else {
                            setFormData({ ...formData, permissions: [...formData.permissions, p] });
                          }
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#ccc",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#FF6600",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Add Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Manage Permissions Modal --- */}
      {permissionModalOpen && selectedRole && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 200,
          }}
          onClick={() => {
            setPermissionModalOpen(false);
            setSelectedRole(null);
            setSelectedPermissions([]);
          }}
        >
          <div
            style={{
              width: 520,
              maxWidth: "95%",
              background: "#fff",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Manage Permissions</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Role Name</label>
              <input readOnly value={selectedRole.name} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #eee", width: "100%", background: "#fafafa" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Description</label>
              <input readOnly value={selectedRole.description || ""} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #eee", width: "100%", background: "#fafafa" }} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => {
                  setPermissionModalMode("add");
                  setSelectedPermissions([]);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: permissionModalMode === "add" ? "2px solid #FF6600" : "1px solid #ccc",
                  background: permissionModalMode === "add" ? "#fff7f0" : "#fff",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setPermissionModalMode("remove");
                  setSelectedPermissions([]);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: permissionModalMode === "remove" ? "2px solid #FF6600" : "1px solid #ccc",
                  background: permissionModalMode === "remove" ? "#fff7f0" : "#fff",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>

            <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", padding: 10, borderRadius: 6 }}>
              {permissionModalMode === "add" ? (
                allPermissions.filter((p) => !(selectedRole.permissions || []).includes(p)).length ? (
                  allPermissions
                    .filter((p) => !(selectedRole.permissions || []).includes(p))
                    .map((p) => (
                      <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderRadius: 4 }}>
                        <input type="checkbox" checked={selectedPermissions.includes(p)} onChange={() => toggleSelectedPermission(p)} />
                        {p}
                      </label>
                    ))
                ) : (
                  <div style={{ color: "#666" }}>All permissions already assigned to this role.</div>
                )
              ) : (selectedRole.permissions || []).length ? (
                (selectedRole.permissions || []).map((p) => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderRadius: 4 }}>
                    <input type="checkbox" checked={selectedPermissions.includes(p)} onChange={() => toggleSelectedPermission(p)} />
                    {p}
                  </label>
                ))
              ) : (
                <div style={{ color: "#666" }}>This role has no permissions to remove.</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => {
                  setPermissionModalOpen(false);
                  setSelectedRole(null);
                  setSelectedPermissions([]);
                }}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#FF6600", color: "#fff", cursor: "pointer" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <CrudTable columns={["ID", "Name", "Description", "Permissions", "Actions"]} data={tableData} loading={loading} />

      {/* Global alert/confirm dialog */}
      <AlertDialog alert={customAlert} onClose={closeAlert} />
    </div>
  );
}
