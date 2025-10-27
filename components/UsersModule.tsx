"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { CrudTable } from "./CrudTable";
import { User } from "@/services/types";

/**
 * UsersModule (ready-to-paste)
 *
 * - Uses server-side pagination via apiService.getUsers(page, size)
 * - Displays server totalElements / totalPages
 * - Does client-side search only within the currently loaded page
 * - After create: reloads page 0 from server so counts are correct
 */

type AppUser = Partial<User & { role?: any }>;

export function UsersModule() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewUser, setViewUser] = useState<AppUser | null>(null);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form (uses backend roleName values)
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    dob: "", // yyyy-mm-dd
    roleName: "CUSTOMER" as "CUSTOMER" | "STORE_OWNER" | "ADMIN",
  });

  // Edit form (profile update)
  const [updateForm, setUpdateForm] = useState({
    fullName: "",
    dob: "",
  });

  // search + pagination simple
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  // pagination meta from backend
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // -------------------------
  // Helper: normalize server user -> frontend User shape
  // -------------------------
  const normalizeUser = (u: any): User => ({
    id: u?.id,
    uuid: u?.uuid,
    email: u?.email ?? "",
    password: u?.password,
    fullName: u?.fullName ?? u?.name ?? "",
    mobileNumber: u?.mobileNumber,
    dob: u?.dob,
    // prefer explicit roleName, else try role.name / role.roleName / raw role string
    roleName: (u?.roleName ?? (typeof u?.role === "string" ? u.role : u?.role?.name ?? u?.role?.roleName ?? "CUSTOMER")) as User["roleName"],
  });

  // -------------------------
  // Load users (paginated)
  // -------------------------
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.info("Frontend: fetching users (page:", page, "size:", size, ")");
      const raw: any = await apiService.getUsers(page, size);

      console.debug("getUsers raw response:", raw);

      // backend may return array or paginated object
      let list: any[] = [];
      if (Array.isArray(raw)) {
        list = raw;
        setTotalElements(raw.length);
        setTotalPages(1);
      } else {
        list = raw?.content ?? [];
        // try a few common names for totals
        const t =
          typeof raw?.totalElements === "number"
            ? raw.totalElements
            : typeof raw?.total === "number"
            ? raw.total
            : Array.isArray(list)
            ? list.length
            : 0;

        setTotalElements(t);
        const tp =
          typeof raw?.totalPages === "number"
            ? raw.totalPages
            : Math.max(1, Math.ceil((t ?? list.length) / size));
        setTotalPages(tp);
      }

      const normalizedList = list.map(normalizeUser);
      setUsers(normalizedList);
      console.debug("Frontend: users loaded", { length: normalizedList.length, page, totalElements });
    } catch (err) {
      console.error("Frontend: failed to load users", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Create user (prettend + reload authoritative page)
  // -------------------------
  const handleCreateUser = async () => {
    const payload = {
      fullName: createForm.fullName,
      email: createForm.email || undefined,
      mobileNumber: createForm.mobileNumber || undefined,
      password: createForm.password || undefined,
      dob: createForm.dob || undefined,
    };

    if (!payload.fullName) {
      alert("Full name is required");
      return;
    }
    if (!payload.email && !payload.mobileNumber) {
      alert("Provide at least email or mobile number");
      return;
    }

    try {
      console.info("Frontend: creating user", createForm.roleName, payload);
      const created = await apiService.createUser(payload, createForm.roleName);
      const normalized = normalizeUser(created);

      // Prepend for instant feedback, but reload authoritative page 0 to update totals
      setUsers((prev) => [normalized, ...prev]);
      setPage(0); // triggers useEffect -> loadUsers

      // reset form
      setCreateForm({ fullName: "", email: "", mobileNumber: "", password: "", dob: "", roleName: "CUSTOMER" });
      setShowAddForm(false);
    } catch (err) {
      console.error("Frontend: create user failed", err);
      setError(err instanceof Error ? err.message : "Failed to create user");
      alert(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  // -------------------------
  // View single user
  // -------------------------
  const openViewUser = async (uuidOrId?: string | number) => {
    if (!uuidOrId) return;
    try {
      console.info("Frontend: fetching user details", uuidOrId);
      const uuid = String(uuidOrId);
      const u = await apiService.getUserByUuid(uuid);
      setViewUser(normalizeUser(u));
    } catch (err) {
      console.error("Frontend: fetch user failed", err);
      setError(err instanceof Error ? err.message : "Failed to fetch user");
      alert(err instanceof Error ? err.message : "Failed to fetch user");
    }
  };

  // -------------------------
  // Edit (open modal)
  // -------------------------
  const openEditUser = (user: AppUser) => {
    setEditUser(user);
    setUpdateForm({
      fullName: user.fullName ?? "",
      dob: user.dob ? String(user.dob).slice(0, 10) : "",
    });
  };

  // -------------------------
  // Update user (profile fields only)
  // -------------------------
  const handleUpdateUser = async () => {
    if (!editUser) return;
    const uuid = editUser.uuid || String(editUser.id || "");
    if (!uuid) {
      alert("Missing user id");
      return;
    }
    if (!updateForm.fullName) {
      alert("Full name required");
      return;
    }

    try {
      console.info("Frontend: updating user profile", { uuid, updateForm });
      const updated = await apiService.updateUser(uuid, {
        fullName: updateForm.fullName,
        dob: updateForm.dob || undefined,
      });
      const normalized = normalizeUser(updated);
      console.log(normalized)

      // update local list (if present) — otherwise reload page to be safe
      setUsers((prev) => prev.map((u) => (u.uuid === uuid || String(u.id) === uuid ? normalized : u)));
      setEditUser(null);
      setUpdateForm({ fullName: "", dob: "" });
    } catch (err) {
      console.error("Frontend: update user failed", err);
      setError(err instanceof Error ? err.message : "Failed to update user");
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // -------------------------
  // Delete user
  // -------------------------
  const handleDeleteUser = async (uuidOrId?: string | number) => {
    if (!uuidOrId) return;
    if (!confirm("Delete this user?")) return;
    try {
      const uuid = String(uuidOrId);
      console.info("Frontend: deleting user", uuid);
      await apiService.deleteUser(uuid);

      // after delete, reload current page to get authoritative content & totals
      await loadUsers();
    } catch (err) {
      console.error("Frontend: delete user failed", err);
      setError(err instanceof Error ? err.message : "Failed to delete user");
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // -------------------------
  // Filtering (client-side on current page)
  // -------------------------
  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.fullName ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.mobileNumber ?? "").toLowerCase().includes(q)
    );
  });

  // Since users is already the current page content returned by the server,
  // do NOT slice by page again. `paginated` is the current page's filtered results.
  const paginated = filtered;

  // -------------------------
  // Render
  // -------------------------
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search name, email, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
        />
        <button
          onClick={() => {
            setShowAddForm((s) => !s);
            if (showAddForm) {
              setCreateForm({ fullName: "", email: "", mobileNumber: "", password: "", dob: "", roleName: "CUSTOMER" });
            }
          }}
          style={{ padding: "8px 12px", background: "#FF6600", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {showAddForm ? "Cancel" : "+ Add User"}
        </button>
        <button onClick={() => loadUsers()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: loading ? "not-allowed" : "pointer" }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ backgroundColor: "#fee", color: "#c33", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {showAddForm && (
        <div style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Full name</label>
            <input value={createForm.fullName} onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Email</label>
              <input value={createForm.email} onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Mobile</label>
              <input value={createForm.mobileNumber} onChange={(e) => setCreateForm((s) => ({ ...s, mobileNumber: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={createForm.password} onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>DOB</label>
              <input type="date" value={createForm.dob} onChange={(e) => setCreateForm((s) => ({ ...s, dob: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Role</label>
              <select
                value={createForm.roleName}
                onChange={(e) => setCreateForm((s) => ({ ...s, roleName: e.target.value as any }))}
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="STORE_OWNER">Store Owner</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowAddForm(false); setCreateForm({ fullName: "", email: "", mobileNumber: "", password: "", dob: "", roleName: "CUSTOMER" }); }} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}>Cancel</button>
            <button onClick={handleCreateUser} style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#FF6600", color: "#fff" }}>Create</button>
          </div>
        </div>
      )}

      <CrudTable
        columns={["ID", "Name", "Email / Mobile", "Role", "Actions"]}
        data={paginated.map((u) => {
          const idVal = u.uuid || String(u.id || "");
          const displayId = idVal ? idVal.slice(0, 8) : "-";
          const displayName = u.fullName ?? "-";
          const displayContact = u.email ? String(u.email) : u.mobileNumber ? String(u.mobileNumber) : "-";
          const displayRole = u.roleName ?? (typeof u.role === "string" ? u.role : u.role?.name ?? u.role?.roleName ?? "-");

          return {
            id: idVal || displayId,
            cells: [displayId, displayName, displayContact, displayRole],
            actions: [
              { label: "View", onClick: () => openViewUser(u.uuid || u.id) },
              { label: "Edit", onClick: () => openEditUser(u) },
              { label: "Delete", onClick: () => handleDeleteUser(u.uuid || u.id) },
            ],
          };
        })}
        loading={loading}
      />

      {/* Pagination controls */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={loading || page === 0}
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: loading || page === 0 ? "not-allowed" : "pointer",
            }}
          >
            Prev
          </button>

          <button
            onClick={() => {
              if (page + 1 < totalPages) setPage((p) => p + 1);
            }}
            disabled={loading || page + 1 >= totalPages}
            style={{
              marginLeft: 8,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: loading || page + 1 >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>

        <div style={{ color: "#666" }}>
          Showing {paginated.length} of {totalElements} — page {page + 1} of {totalPages}
        </div>
      </div>

      {/* View modal */}
      {viewUser && (
        <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.28)", zIndex: 200 }}>
          <div style={{ width: 520, background: "#fff", borderRadius: 8, padding: 18 }}>
            <h3 style={{ marginBottom: 8 }}>User details</h3>
            <div style={{ marginBottom: 8 }}><strong>Name:</strong> {viewUser.fullName}</div>
            <div style={{ marginBottom: 8 }}><strong>Email:</strong> {viewUser.email || "-"}</div>
            <div style={{ marginBottom: 8 }}><strong>Mobile:</strong> {viewUser.mobileNumber || "-"}</div>
            <div style={{ marginBottom: 8 }}><strong>Role:</strong> {viewUser.roleName || viewUser.role?.name || "-"}</div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setViewUser(null)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.28)", zIndex: 200 }}>
          <div style={{ width: 520, background: "#fff", borderRadius: 8, padding: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Edit user profile</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Full name</label>
              <input value={updateForm.fullName} onChange={(e) => setUpdateForm((s) => ({ ...s, fullName: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6 }}>DOB</label>
              <input type="date" value={updateForm.dob} onChange={(e) => setUpdateForm((s) => ({ ...s, dob: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setEditUser(null); setUpdateForm({ fullName: "", dob: "" }); }} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}>Cancel</button>
              <button onClick={handleUpdateUser} style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#FF6600", color: "#fff" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
