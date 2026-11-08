import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface BusFleetItem {
  id: string;
  busCode: string | null;
  registrationNumber: string;
  seatingCapacity: number;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  serviceDate: string | null;
  primaryStaff?: { id: string; name: string; email: string; phone: string } | null;
  assignedStaffRoster: Array<{ staffId: string; staffName: string; role: string; assignedAt: string }>;
  Equipment?: Array<{ id: string; assetTag: string; name: string; category: string; status: string }>;
  BusMaintenanceRecord?: Array<{
    id: string;
    serviceType: string;
    costAmount: number;
    serviceDate: string;
    nextDueDate: string;
    remarks: string | null;
  }>;
  Event?: Array<{
    id: string;
    eventCode: string;
    eventDate: string;
    School: { name: string };
  }>;
}

interface StaffOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export function RegionalMobileLabsPage() {
  const [buses, setBuses] = useState<BusFleetItem[]>([]);
  const [allStaff, setAllStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [assigningBus, setAssigningBus] = useState<BusFleetItem | null>(null);
  const [statusBus, setStatusBus] = useState<BusFleetItem | null>(null);
  const [maintenanceBus, setMaintenanceBus] = useState<BusFleetItem | null>(null);
  const [inventoryBus, setInventoryBus] = useState<BusFleetItem | null>(null);

  // Assignment Form State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffRole, setStaffRole] = useState<"PRIMARY" | "SUPPORTING">("SUPPORTING");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Status Form State
  const [newStatus, setNewStatus] = useState("AVAILABLE");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Maintenance Form State
  const [maintForm, setMaintForm] = useState({
    serviceType: "GENERAL_SERVICING",
    costAmount: 5000,
    serviceDate: new Date().toISOString().slice(0, 10),
    nextDueDate: "",
    remarks: "",
    setMaintenanceStatus: true,
  });
  const [maintLoading, setMaintLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [busRes, staffRes] = await Promise.all([
        apiClient<{ rows: BusFleetItem[] }>("/regional-admin/buses"),
        apiClient<{ rows: StaffOption[] }>("/regional-admin/staff?limit=100"),
      ]);
      setBuses(busRes.rows || []);
      setAllStaff(staffRes.rows || []);
    } catch (err) {
      console.error("Failed to load fleet data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleAssignStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningBus || !selectedStaffId) return;
    setAssigningLoading(true);
    try {
      await apiClient(`/regional-admin/buses/${assigningBus.id}/staff`, {
        method: "POST",
        body: JSON.stringify({ staffId: selectedStaffId, role: staffRole }),
      });
      await loadData();
      // refresh active modal view
      const updated = (await apiClient<{ rows: BusFleetItem[] }>("/regional-admin/buses")).rows;
      const found = updated.find((b) => b.id === assigningBus.id);
      if (found) setAssigningBus(found);
      setSelectedStaffId("");
    } catch (err: any) {
      alert(err?.message || "Failed to assign staff");
    } finally {
      setAssigningLoading(false);
    }
  }

  async function handleRemoveStaff(busId: string, staffId: string) {
    if (!confirm("Are you sure you want to remove this staff member from the bus roster?")) return;
    try {
      await apiClient(`/regional-admin/buses/${busId}/staff/${staffId}`, {
        method: "DELETE",
      });
      await loadData();
      if (assigningBus && assigningBus.id === busId) {
        const updated = (await apiClient<{ rows: BusFleetItem[] }>("/regional-admin/buses")).rows;
        const found = updated.find((b) => b.id === busId);
        if (found) setAssigningBus(found);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to remove staff");
    }
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!statusBus) return;
    setUpdatingStatus(true);
    try {
      await apiClient(`/regional-admin/buses/${statusBus.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatusBus(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update bus status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleLogMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!maintenanceBus) return;
    setMaintLoading(true);
    try {
      await apiClient(`/regional-admin/buses/${maintenanceBus.id}/maintenance`, {
        method: "POST",
        body: JSON.stringify(maintForm),
      });
      setMaintenanceBus(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to record maintenance");
    } finally {
      setMaintLoading(false);
    }
  }

  const filteredBuses = buses.filter((b) => {
    const matchesSearch =
      !search ||
      (b.busCode && b.busCode.toLowerCase().includes(search.toLowerCase())) ||
      b.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (b.primaryStaff?.name && b.primaryStaff.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            MOBILE LABORATORY FLEET
          </div>
          <h2 className="text-xl font-bold text-charcoal">Bus Administration & Staff Rosters</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Manage regional laboratory vehicles, assign multiple field communicators per bus, and track servicing records.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            placeholder="Search by bus code, registration, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1.5 w-64 rounded border border-stone"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Operational Statuses</option>
            <option value="AVAILABLE">AVAILABLE (Ready)</option>
            <option value="ON_ROUTE">ON_ROUTE (In Transit)</option>
            <option value="AT_SCHOOL">AT_SCHOOL (Active Lab)</option>
            <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Workshop)</option>
            <option value="EMERGENCY">EMERGENCY</option>
          </select>
        </div>
        <div className="text-charcoal-muted font-mono">
          Showing <strong>{filteredBuses.length}</strong> of {buses.length} vehicles (Max 5 Capacity)
        </div>
      </div>

      {/* FLEET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-charcoal-muted font-mono text-xs">
            Loading regional fleet records…
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-charcoal-muted font-mono text-xs">
            No buses found matching your criteria.
          </div>
        ) : (
          filteredBuses.map((bus) => (
            <div key={bus.id} className="surface p-5 rounded-lg border border-stone shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone">
                  <div>
                    <h3 className="text-base font-bold text-charcoal">
                      {bus.busCode || bus.registrationNumber}
                    </h3>
                    <span className="font-mono text-[11px] text-charcoal-muted">
                      Plate: {bus.registrationNumber}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      bus.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-800"
                        : bus.status === "ON_ROUTE"
                        ? "bg-blue-100 text-blue-800"
                        : bus.status === "AT_SCHOOL"
                        ? "bg-purple-100 text-purple-800"
                        : bus.status === "UNDER_MAINTENANCE"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {bus.status.replace("_", " ")}
                  </span>
                </div>

                {/* MULTI-STAFF ROSTER SUMMARY (Section 4.3) */}
                <div className="mb-4 p-3 bg-stone-50 rounded border border-stone">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] uppercase font-bold text-charcoal-muted">
                      👥 Assigned Field Staff ({bus.assignedStaffRoster.length || (bus.primaryStaff ? 1 : 0)})
                    </span>
                    <button
                      className="text-[11px] font-mono text-[#3D6B52] hover:underline font-bold"
                      onClick={() => {
                        setAssigningBus(bus);
                        setSelectedStaffId("");
                      }}
                    >
                      + Manage Staff
                    </button>
                  </div>
                  {bus.assignedStaffRoster.length > 0 ? (
                    <div className="space-y-1">
                      {bus.assignedStaffRoster.map((st) => (
                        <div key={st.staffId} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-charcoal truncate">
                            {st.staffName}
                          </span>
                          <span className={`text-[9px] px-1 rounded font-bold uppercase ${
                            st.role === "PRIMARY" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                          }`}>
                            {st.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : bus.primaryStaff ? (
                    <div className="text-xs font-mono text-charcoal">
                      {bus.primaryStaff.name} <span className="text-charcoal-subtle text-[10px]">(Primary)</span>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-charcoal-subtle italic">
                      No staff currently assigned
                    </div>
                  )}
                </div>

                {/* ASSETS ON BOARD */}
                <div className="text-xs font-mono space-y-1.5 text-charcoal mb-4">
                  <div className="flex justify-between">
                    <span className="text-charcoal-muted">Seating Capacity:</span>
                    <span className="font-bold">{bus.seatingCapacity} seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-muted">Equipment On Board:</span>
                    <button
                      className="font-bold text-[#3D6B52] hover:underline"
                      onClick={() => setInventoryBus(bus)}
                    >
                      {bus.Equipment?.length || 0} Assets →
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-muted">Last Servicing:</span>
                    <span>
                      {bus.BusMaintenanceRecord?.[0]?.serviceDate
                        ? new Date(bus.BusMaintenanceRecord[0].serviceDate).toLocaleDateString()
                        : "No record"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 border-t border-stone flex items-center justify-between text-xs font-mono">
                <button
                  className="btn ghost text-xs px-2.5 py-1"
                  onClick={() => {
                    setStatusBus(bus);
                    setNewStatus(bus.status);
                  }}
                >
                  Change Status
                </button>
                <button
                  className="btn ghost text-xs px-2.5 py-1"
                  onClick={() => {
                    setMaintenanceBus(bus);
                    setMaintForm({
                      serviceType: "GENERAL_SERVICING",
                      costAmount: 5000,
                      serviceDate: new Date().toISOString().slice(0, 10),
                      nextDueDate: "",
                      remarks: "",
                      setMaintenanceStatus: true,
                    });
                  }}
                >
                  Log Service
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MULTI-STAFF ASSIGNMENT MODAL (Section 4.3) */}
      {assigningBus && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-lg p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">STAFF ROSTER MANAGEMENT</span>
                <h3 className="text-base font-bold text-charcoal">
                  Bus {assigningBus.busCode || assigningBus.registrationNumber}
                </h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setAssigningBus(null)}
              >
                ✕
              </button>
            </div>

            {/* CURRENT ROSTER */}
            <div className="mb-5">
              <span className="block font-mono text-xs font-bold text-charcoal mb-2 uppercase">
                Currently Assigned Communicators
              </span>
              {assigningBus.assignedStaffRoster.length === 0 ? (
                <div className="p-3 bg-stone-50 border border-stone rounded text-xs font-mono text-charcoal-muted text-center italic">
                  No field communicators assigned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {assigningBus.assignedStaffRoster.map((item) => (
                    <div
                      key={item.staffId}
                      className="p-2.5 bg-stone-50 border border-stone rounded flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <strong className="text-charcoal block">{item.staffName}</strong>
                        <span className="text-[10px] text-charcoal-subtle">
                          Role: {item.role} | Assigned: {new Date(item.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        className="text-red-700 hover:text-red-900 text-xs font-bold px-2 py-1"
                        onClick={() => handleRemoveStaff(assigningBus.id, item.staffId)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ADD STAFF FORM */}
            <form onSubmit={handleAssignStaff} className="p-4 bg-stone-50 rounded border border-stone space-y-3 text-xs font-mono">
              <span className="block font-bold text-charcoal uppercase">Assign Additional Communicator</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-muted mb-1">Select Field Staff</label>
                  <select
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Choose Communicator</option>
                    {allStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-charcoal-muted mb-1">Roster Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="PRIMARY">PRIMARY (Lead Communicator & Driver)</option>
                    <option value="SUPPORTING">SUPPORTING (Co-Facilitator)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={assigningLoading || !selectedStaffId}
                  className="btn primary px-4 py-1.5 text-xs font-mono"
                >
                  {assigningLoading ? "Assigning..." : "Assign to Bus"}
                </button>
              </div>
            </form>

            <div className="flex justify-end mt-4">
              <button className="btn ghost px-4 py-1.5 text-xs font-mono" onClick={() => setAssigningBus(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {statusBus && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-sm p-6 rounded-lg border border-stone shadow-xl">
            <h3 className="text-base font-bold text-charcoal mb-3">Update Bus Status</h3>
            <p className="text-xs text-charcoal-muted mb-4 font-mono">
              Vehicle: {statusBus.busCode || statusBus.registrationNumber}
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Operational Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE (Stationed at Depot / Ready)</option>
                  <option value="ON_ROUTE">ON_ROUTE (Moving between schools)</option>
                  <option value="AT_SCHOOL">AT_SCHOOL (Active field lab session)</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Workshop servicing)</option>
                  <option value="EMERGENCY">EMERGENCY (Breakdown / Incident)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone">
                <button type="button" className="btn ghost px-3 py-1.5 text-xs font-mono" onClick={() => setStatusBus(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={updatingStatus} className="btn primary px-3 py-1.5 text-xs font-mono">
                  {updatingStatus ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG MAINTENANCE MODAL */}
      {maintenanceBus && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-md p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <h3 className="text-base font-bold text-charcoal">
                Log Service & Maintenance
              </h3>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setMaintenanceBus(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogMaintenance} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Service Type</label>
                <select
                  value={maintForm.serviceType}
                  onChange={(e) => setMaintForm({ ...maintForm, serviceType: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="GENERAL_SERVICING">GENERAL SERVICING</option>
                  <option value="ENGINE">ENGINE & OIL</option>
                  <option value="TYRE">TYRE REPLACEMENT / ROTATION</option>
                  <option value="BATTERY">BATTERY & ELECTRICALS</option>
                  <option value="GPS">GPS TELEMETRY REPAIR</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Service Date</label>
                  <input
                    type="date"
                    required
                    value={maintForm.serviceDate}
                    onChange={(e) => setMaintForm({ ...maintForm, serviceDate: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Cost Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={maintForm.costAmount}
                    onChange={(e) => setMaintForm({ ...maintForm, costAmount: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Remarks & Details</label>
                <textarea
                  rows={2}
                  value={maintForm.remarks}
                  onChange={(e) => setMaintForm({ ...maintForm, remarks: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs font-sans"
                  placeholder="Replaced brake pads, oil filter, tyre pressure..."
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={maintForm.setMaintenanceStatus}
                  onChange={(e) => setMaintForm({ ...maintForm, setMaintenanceStatus: e.target.checked })}
                />
                <span className="text-charcoal">Set bus status to UNDER_MAINTENANCE</span>
              </label>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setMaintenanceBus(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={maintLoading}
                  className="btn primary px-4 py-1.5 text-xs font-mono"
                >
                  {maintLoading ? "Recording..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUS EQUIPMENT MODAL */}
      {inventoryBus && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-lg p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">ONBOARD EQUIPMENT</span>
                <h3 className="text-base font-bold text-charcoal">
                  Assets on {inventoryBus.busCode || inventoryBus.registrationNumber}
                </h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setInventoryBus(null)}
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {inventoryBus.Equipment && inventoryBus.Equipment.length > 0 ? (
                inventoryBus.Equipment.map((eq) => (
                  <div
                    key={eq.id}
                    className="p-3 bg-stone-50 border border-stone rounded flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <strong className="text-charcoal block">{eq.name}</strong>
                      <span className="text-[10px] text-charcoal-muted">Tag: {eq.assetTag} | {eq.category}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        eq.status === "DAMAGED"
                          ? "bg-red-100 text-red-800"
                          : eq.status === "IN_MAINTENANCE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {eq.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center font-mono text-xs text-charcoal-muted">
                  No individual equipment assets assigned to this vehicle yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-stone mt-4">
              <button className="btn ghost px-4 py-1.5 text-xs font-mono" onClick={() => setInventoryBus(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
