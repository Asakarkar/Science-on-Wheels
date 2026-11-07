import React, { useEffect, useState } from "react";
import { apiClient } from "../../../services/api-client";

interface FieldStaffUser {
  id: string;
  name: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  roleEnum: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface BusOption {
  id: string;
  busCode: string | null;
  registrationNumber: string;
}

interface StaffHistory {
  staff: FieldStaffUser;
  events: Array<{
    id: string;
    eventCode: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    status: string;
    School?: { name: string };
    Bus?: { busCode: string; registrationNumber: string };
  }>;
  stats: {
    totalVisitsAssigned: number;
    completedVisits: number;
    studentsAttended: number;
    consumablesRecorded: number;
    issuesReported: number;
  };
  issues: any[];
}

export function RegionalStaffPage() {
  const [staff, setStaff] = useState<FieldStaffUser[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<FieldStaffUser | null>(null);
  const [resetStaff, setResetStaff] = useState<FieldStaffUser | null>(null);
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);
  const [staffHistory, setStaffHistory] = useState<StaffHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    busId: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, busRes] = await Promise.all([
        apiClient<{ rows: FieldStaffUser[] }>("/regional-admin/staff?limit=200"),
        apiClient<{ rows: BusOption[] }>("/regional-admin/buses"),
      ]);
      setStaff(staffRes.rows || []);
      setBuses(busRes.rows || []);
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient("/regional-admin/staff", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", phone: "", password: "", busId: "" });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create field staff account");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient(`/regional-admin/staff/${editingStaff.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingStaff.name,
          phone: editingStaff.phone,
          email: editingStaff.email,
          status: editingStaff.status,
          isActive: editingStaff.status === "ACTIVE",
        }),
      });
      setEditingStaff(null);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to update staff account");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetStaff || !newPassword) return;
    setSubmitting(true);
    try {
      await apiClient(`/regional-admin/staff/${resetStaff.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      alert(`Password successfully reset for ${resetStaff.name}`);
      setResetStaff(null);
      setNewPassword("");
    } catch (err: any) {
      alert(err?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: FieldStaffUser) {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await apiClient(`/regional-admin/staff/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          isActive: nextStatus === "ACTIVE",
        }),
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to toggle status");
    }
  }

  async function openHistory(id: string) {
    setHistoryStaffId(id);
    setLoadingHistory(true);
    try {
      const data = await apiClient<StaffHistory>(`/regional-admin/staff/${id}/history`);
      setStaffHistory(data);
    } catch (err) {
      console.error("Failed to load staff history", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search));
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            FIELD STAFF ADMINISTRATION
          </div>
          <h2 className="text-xl font-bold text-charcoal">Science Communicators & Laboratory Staff</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Create field staff accounts, manage mobile lab assignments, reset credentials, and monitor operational performance.
          </p>
        </div>
        <button
          className="btn primary font-mono text-xs px-4 py-2 shrink-0 flex items-center space-x-2"
          onClick={() => setShowCreateModal(true)}
        >
          <span>＋</span>
          <span>Create Field Staff Account</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1.5 w-64 rounded border border-stone"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">ACTIVE (Authorized to Conduct Labs)</option>
            <option value="INACTIVE">INACTIVE (Deactivated / Left)</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
        <div className="text-charcoal-muted font-mono">
          Showing <strong>{filteredStaff.length}</strong> of {staff.length} staff members
        </div>
      </div>

      {/* STAFF TABLE */}
      <div className="surface rounded-lg border border-stone overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Staff Member</th>
                <th className="py-2.5 px-3">Contact Email</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-center">Account Status</th>
                <th className="py-2.5 px-3">Registered On</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    Loading regional field staff roster…
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    No field staff members found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-charcoal font-semibold block">{user.name}</strong>
                      <span className="text-[10px] text-charcoal-subtle font-mono">{user.id}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal">{user.email}</td>
                    <td className="py-3 px-3 font-mono text-charcoal-muted">{user.phone || "—"}</td>
                    <td className="py-3 px-3 font-mono">
                      <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {user.roleEnum}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleStatus(user)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-opacity hover:opacity-80 ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                        title="Click to toggle status"
                      >
                        {user.status}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal-subtle text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 font-mono">
                      <button
                        className="text-xs text-[#3D6B52] hover:underline font-semibold"
                        onClick={() => openHistory(user.id)}
                      >
                        Performance
                      </button>
                      <button
                        className="text-xs text-charcoal-muted hover:text-charcoal"
                        onClick={() => setEditingStaff(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-amber-700 hover:underline"
                        onClick={() => {
                          setResetStaff(user);
                          setNewPassword("");
                        }}
                      >
                        Reset PW
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-lg p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">REGIONAL AUTHORITY</span>
                <h3 className="text-base font-bold text-charcoal">Create Field Staff Account</h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                  placeholder="e.g. Dr. Rajesh Sharma"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                    placeholder="staff@scienceonwheels.com"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                  placeholder="Minimum 6 characters"
                />
                <span className="text-[10px] text-charcoal-subtle mt-0.5 block">
                  Password will be securely hashed with Argon2id.
                </span>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Assign to Mobile Lab (Optional)</label>
                <select
                  value={createForm.busId}
                  onChange={(e) => setCreateForm({ ...createForm, busId: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="">Unassigned (Assign later)</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber} ({b.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn primary px-4 py-1.5 text-xs font-mono"
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-md p-6 rounded-lg border border-stone shadow-xl">
            <h3 className="text-base font-bold text-charcoal mb-4">Edit Field Staff Details</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={editingStaff.phone || ""}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Account Status</label>
                <select
                  value={editingStaff.status}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button type="button" className="btn ghost px-3 py-1.5 text-xs font-mono" onClick={() => setEditingStaff(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn primary px-3 py-1.5 text-xs font-mono">
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetStaff && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-sm p-6 rounded-lg border border-stone shadow-xl">
            <h3 className="text-base font-bold text-charcoal mb-2">Reset Staff Password</h3>
            <p className="text-xs text-charcoal-muted mb-4 font-mono">
              User: {resetStaff.name} ({resetStaff.email})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">New Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full p-2 border border-stone rounded text-xs"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone">
                <button type="button" className="btn ghost px-3 py-1.5 text-xs font-mono" onClick={() => setResetStaff(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !newPassword} className="btn primary px-3 py-1.5 text-xs font-mono">
                  {submitting ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERFORMANCE & HISTORY DRAWER */}
      {historyStaffId && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex justify-end">
          <div className="surface w-full max-w-xl h-full p-6 overflow-y-auto border-l border-stone shadow-2xl bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
                <div>
                  <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">OPERATIONAL AUDIT</span>
                  <h3 className="text-lg font-bold text-charcoal">
                    {staffHistory?.staff?.name || "Staff Performance"}
                  </h3>
                  <span className="text-xs font-mono text-charcoal-muted">{staffHistory?.staff?.email}</span>
                </div>
                <button className="font-mono text-sm text-charcoal-muted hover:text-charcoal" onClick={() => setHistoryStaffId(null)}>
                  ✕
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
                  Loading field staff performance and visit log records…
                </div>
              ) : staffHistory ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Visits</span>
                      <strong className="text-base text-charcoal font-bold">{staffHistory.stats.totalVisitsAssigned}</strong>
                    </div>
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Completed</span>
                      <strong className="text-base text-emerald-700 font-bold">{staffHistory.stats.completedVisits}</strong>
                    </div>
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Attended</span>
                      <strong className="text-base text-[#3D6B52] font-bold">{staffHistory.stats.studentsAttended}</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono uppercase font-bold text-charcoal mb-2">
                      Recent Field Assignments
                    </h4>
                    {staffHistory.events.length === 0 ? (
                      <div className="p-4 bg-stone-50 border border-stone rounded text-xs text-charcoal-muted text-center font-mono">
                        No school visits assigned to this staff member yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {staffHistory.events.map((ev) => (
                          <div key={ev.id} className="p-3 bg-stone-50 border border-stone rounded text-xs font-mono flex items-center justify-between">
                            <div>
                              <strong className="text-charcoal block">{ev.School?.name || "School"}</strong>
                              <span className="text-[10px] text-charcoal-muted">
                                {new Date(ev.eventDate).toLocaleDateString()} | Lab: {ev.Bus?.busCode || "Bus"}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200 text-stone-800">
                              {ev.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-stone flex justify-end">
              <button className="btn ghost text-xs font-mono px-4 py-2" onClick={() => setHistoryStaffId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
