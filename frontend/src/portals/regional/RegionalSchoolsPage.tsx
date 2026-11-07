import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface School {
  id: string;
  name: string;
  udiseCode: string;
  address: string;
  districtId: string;
  blockId: string;
  latitude: number;
  longitude: number;
  principalName?: string | null;
  contactPhone: string;
  totalStudents: number;
  hasScienceLab: boolean;
  hasElectricity: boolean;
  hasInternet: boolean;
  priorityCategory: string;
  createdAt: string;
  District?: { id: string; name: string };
  Block?: { id: string; name: string };
  _count?: { Event: number };
}

interface SchoolProfile {
  school: School & {
    District?: { name: string };
    Block?: { name: string };
    Event: Array<{
      id: string;
      eventCode: string;
      eventDate: string;
      startTime: string;
      endTime: string;
      status: string;
      Bus?: { busCode: string; registrationNumber: string };
      EventsOnCommunicator: Array<{ User: { name: string } }>;
    }>;
  };
  allocatedInventory: Array<{
    id: string;
    itemType: string;
    itemName: string;
    quantity: number;
    unit: string;
    physicalLocationBus: string;
    custodianName: string;
    purpose: string;
    allocatedAt: string;
    status: string;
  }>;
  stats: {
    totalVisits: number;
    completedVisits: number;
    upcomingVisits: number;
    totalAllocatedItems: number;
  };
}

export function RegionalSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; name: string; districtId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [profileSchoolId, setProfileSchoolId] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    udiseCode: "",
    address: "",
    districtId: "",
    blockId: "",
    latitude: 0,
    longitude: 0,
    principalName: "",
    contactPhone: "",
    totalStudents: 100,
    hasScienceLab: false,
    hasElectricity: true,
    hasInternet: false,
    priorityCategory: "STANDARD",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [schoolsRes, distRes, blocksRes] = await Promise.all([
        apiClient<{ rows: School[] }>("/regional-admin/schools?limit=200"),
        apiClient<{ rows: Array<{ id: string; name: string }> }>("/regional-admin/districts"),
        apiClient<{ rows: Array<{ id: string; name: string; districtId: string }> }>("/regional-admin/blocks"),
      ]);
      setSchools(schoolsRes.rows || []);
      setDistricts(distRes.rows || []);
      setBlocks(blocksRes.rows || []);
      if (distRes.rows && distRes.rows.length > 0 && !formData.districtId) {
        setFormData((prev) => ({ ...prev, districtId: distRes.rows[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load schools", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function openProfile(id: string) {
    setProfileSchoolId(id);
    setLoadingProfile(true);
    try {
      const data = await apiClient<SchoolProfile>(`/regional-admin/schools/${id}/profile`);
      setSchoolProfile(data);
    } catch (err) {
      console.error("Failed to load school profile", err);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient("/regional-admin/schools", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowRegisterModal(false);
      setFormData({
        name: "",
        udiseCode: "",
        address: "",
        districtId: districts[0]?.id || "",
        blockId: "",
        latitude: 0,
        longitude: 0,
        principalName: "",
        contactPhone: "",
        totalStudents: 100,
        hasScienceLab: false,
        hasElectricity: true,
        hasInternet: false,
        priorityCategory: "STANDARD",
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to register school");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSchool) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient(`/regional-admin/schools/${editingSchool.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingSchool.name,
          address: editingSchool.address,
          principalName: editingSchool.principalName,
          contactPhone: editingSchool.contactPhone,
          totalStudents: editingSchool.totalStudents,
          hasScienceLab: editingSchool.hasScienceLab,
          hasElectricity: editingSchool.hasElectricity,
          hasInternet: editingSchool.hasInternet,
          priorityCategory: editingSchool.priorityCategory,
        }),
      });
      setEditingSchool(null);
      await loadData();
      if (profileSchoolId === editingSchool.id) {
        await openProfile(editingSchool.id);
      }
    } catch (err: any) {
      setFormError(err?.message || "Failed to update school");
    } finally {
      setSubmitting(false);
    }
  }

  const availableBlocks = blocks.filter((b) => b.districtId === formData.districtId);

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.udiseCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.principalName && s.principalName.toLowerCase().includes(search.toLowerCase()));
    const matchesDistrict = !selectedDistrict || s.districtId === selectedDistrict;
    const matchesPriority = !selectedPriority || s.priorityCategory === selectedPriority;
    return matchesSearch && matchesDistrict && matchesPriority;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            REGIONAL SCHOOL MANAGEMENT
          </div>
          <h2 className="text-xl font-bold text-charcoal">Participating School Directory</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Register and coordinate beneficiary schools, track student capacity, and monitor physical custody of allocated kits.
          </p>
        </div>
        <button
          className="btn primary font-mono text-xs px-4 py-2 shrink-0 flex items-center space-x-2"
          onClick={() => setShowRegisterModal(true)}
        >
          <span>＋</span>
          <span>Register New School</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            placeholder="Search by school name, UDISE code, principal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1.5 w-64 rounded border border-stone"
          />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Priority Categories</option>
            <option value="HIGH_OUTREACH">HIGH_OUTREACH</option>
            <option value="MEDIUM_PRIORITY">MEDIUM_PRIORITY</option>
            <option value="STANDARD">STANDARD</option>
          </select>
        </div>
        <div className="text-charcoal-muted font-mono">
          Showing <strong>{filteredSchools.length}</strong> of {schools.length} schools
        </div>
      </div>

      {/* SCHOOLS TABLE */}
      <div className="surface rounded-lg border border-stone overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">School Name</th>
                <th className="py-2.5 px-3">UDISE Code</th>
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">Principal / Contact</th>
                <th className="py-2.5 px-3 text-center">Students</th>
                <th className="py-2.5 px-3">Facilities</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                    Loading regional schools…
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                    No schools found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-charcoal font-semibold block">{school.name}</strong>
                      <span className="text-[11px] text-charcoal-muted truncate block max-w-xs">{school.address}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal">{school.udiseCode}</td>
                    <td className="py-3 px-3 text-charcoal-muted">
                      {districts.find((d) => d.id === school.districtId)?.name || "District"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-charcoal block">{school.principalName || "Principal not set"}</span>
                      <span className="text-charcoal-subtle font-mono text-[11px]">{school.contactPhone}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-charcoal">
                      {school.totalStudents}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className={`inline-block mr-2 ${school.hasScienceLab ? "text-emerald-700" : "text-stone-400"}`}>
                        {school.hasScienceLab ? "✓ Lab" : "✗ No Lab"}
                      </span>
                      <span className={`inline-block ${school.hasElectricity ? "text-emerald-700" : "text-stone-400"}`}>
                        {school.hasElectricity ? "⚡ Power" : "✗ No Power"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          school.priorityCategory === "HIGH_OUTREACH"
                            ? "bg-red-100 text-red-800"
                            : school.priorityCategory === "MEDIUM_PRIORITY"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {school.priorityCategory.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 font-mono">
                      <button
                        className="text-xs text-[#3D6B52] hover:underline font-semibold"
                        onClick={() => openProfile(school.id)}
                      >
                        Profile & Inventory
                      </button>
                      <button
                        className="text-xs text-charcoal-muted hover:text-charcoal"
                        onClick={() => setEditingSchool(school)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER SCHOOL MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-xl p-6 rounded-lg border border-stone shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">REGIONAL AUTHORITY</span>
                <h3 className="text-base font-bold text-charcoal">Register New School</h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setShowRegisterModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">School Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full p-2 border border-stone rounded font-sans text-xs"
                    placeholder="e.g. Adarsh Vidyalaya"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">UDISE Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.udiseCode}
                    onChange={(e) => setFormData({ ...formData, udiseCode: e.target.value })}
                    className="input w-full p-2 border border-stone rounded font-mono text-xs"
                    placeholder="e.g. 27210100101"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                  placeholder="Village / Town, Post Office"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">District *</label>
                  <select
                    required
                    value={formData.districtId}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      const validBlocks = blocks.filter((b) => b.districtId === newDist);
                      setFormData({
                        ...formData,
                        districtId: newDist,
                        blockId: validBlocks[0]?.id || "",
                      });
                    }}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Block *</label>
                  <select
                    required
                    value={formData.blockId}
                    onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Select Block</option>
                    {availableBlocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Principal Name</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="input w-full p-2 border border-stone rounded font-sans text-xs"
                    placeholder="Principal name"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Total Students</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.totalStudents}
                    onChange={(e) => setFormData({ ...formData, totalStudents: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div className="border border-stone rounded p-3 bg-stone-50 space-y-2">
                <span className="block font-bold text-charcoal">Infrastructure Facilities</span>
                <div className="flex flex-wrap gap-4 text-xs font-sans">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasScienceLab}
                      onChange={(e) => setFormData({ ...formData, hasScienceLab: e.target.checked })}
                    />
                    <span>Has Existing Science Lab</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasElectricity}
                      onChange={(e) => setFormData({ ...formData, hasElectricity: e.target.checked })}
                    />
                    <span>Has Reliable Electricity</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasInternet}
                      onChange={(e) => setFormData({ ...formData, hasInternet: e.target.checked })}
                    />
                    <span>Has Internet Access</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Priority Categorization</label>
                <select
                  value={formData.priorityCategory}
                  onChange={(e) => setFormData({ ...formData, priorityCategory: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="HIGH_OUTREACH">HIGH OUTREACH (Remote, no science lab)</option>
                  <option value="MEDIUM_PRIORITY">MEDIUM PRIORITY (Needs periodic visits)</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn primary px-4 py-1.5 text-xs font-mono"
                >
                  {submitting ? "Registering..." : "Register School"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHOOL MODAL */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-lg p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <h3 className="text-base font-bold text-charcoal">Edit School Details</h3>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setEditingSchool(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={editingSchool.name}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editingSchool.address}
                  onChange={(e) => setEditingSchool({ ...editingSchool, address: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Principal Name</label>
                  <input
                    type="text"
                    value={editingSchool.principalName || ""}
                    onChange={(e) => setEditingSchool({ ...editingSchool, principalName: e.target.value })}
                    className="input w-full p-2 border border-stone rounded font-sans text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingSchool.contactPhone}
                    onChange={(e) => setEditingSchool({ ...editingSchool, contactPhone: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Total Students</label>
                  <input
                    type="number"
                    value={editingSchool.totalStudents}
                    onChange={(e) => setEditingSchool({ ...editingSchool, totalStudents: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Priority</label>
                  <select
                    value={editingSchool.priorityCategory}
                    onChange={(e) => setEditingSchool({ ...editingSchool, priorityCategory: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="HIGH_OUTREACH">HIGH_OUTREACH</option>
                    <option value="MEDIUM_PRIORITY">MEDIUM_PRIORITY</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setEditingSchool(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn primary px-4 py-1.5 text-xs font-mono"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHOOL PROFILE & INVENTORY DRAWER (Section 4.2 & Section 7) */}
      {profileSchoolId && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex justify-end">
          <div className="surface w-full max-w-2xl h-full p-6 overflow-y-auto border-l border-stone shadow-2xl bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone mb-5">
                <div>
                  <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold tracking-wider">
                    SCHOOL PROFILE & CUSTODIAL LEDGER
                  </span>
                  <h3 className="text-lg font-bold text-charcoal">
                    {schoolProfile?.school?.name || "School Profile"}
                  </h3>
                  <span className="font-mono text-xs text-charcoal-muted">
                    UDISE: {schoolProfile?.school?.udiseCode}
                  </span>
                </div>
                <button
                  className="font-mono text-sm text-charcoal-muted hover:text-charcoal p-1"
                  onClick={() => {
                    setProfileSchoolId(null);
                    setSchoolProfile(null);
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {loadingProfile ? (
                <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
                  Loading school profile and allocated stock records…
                </div>
              ) : schoolProfile ? (
                <div className="space-y-6">
                  {/* SUMMARY CARDS */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Students</span>
                      <strong className="text-base text-charcoal font-bold">
                        {schoolProfile.school.totalStudents}
                      </strong>
                    </div>
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Visits</span>
                      <strong className="text-base text-charcoal font-bold">
                        {schoolProfile.stats.totalVisits}
                      </strong>
                    </div>
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Completed</span>
                      <strong className="text-base text-emerald-700 font-bold">
                        {schoolProfile.stats.completedVisits}
                      </strong>
                    </div>
                    <div className="p-3 bg-stone-50 rounded border border-stone">
                      <span className="block text-[10px] text-charcoal-muted uppercase">Allocated Kits</span>
                      <strong className="text-base text-[#3D6B52] font-bold">
                        {schoolProfile.stats.totalAllocatedItems}
                      </strong>
                    </div>
                  </div>

                  {/* SECTION 7 ARCHITECTURAL EMPHASIS: ALLOCATED INVENTORY VS PHYSICAL CUSTODY */}
                  <div className="border border-emerald-200 bg-emerald-50/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <strong className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono">
                        📦 School-Allocated Stock (Stored in Bus Custody)
                      </strong>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Decoupled Location Architecture
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900 mb-3 font-sans">
                      Materials allocated exclusively for this school remain physically stored on mobile lab buses until scheduled field sessions occur.
                    </p>

                    {schoolProfile.allocatedInventory.length === 0 ? (
                      <div className="text-xs text-charcoal-muted font-mono italic p-3 bg-white/70 rounded text-center">
                        No materials currently allocated to this school.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schoolProfile.allocatedInventory.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-3 rounded border border-emerald-100 flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <strong className="text-charcoal block">{item.itemName}</strong>
                              <span className="text-[10px] text-charcoal-muted block">
                                Purpose: {item.purpose}
                              </span>
                              <span className="text-[10px] text-[#3D6B52] block font-bold">
                                📍 Physical Location: {item.physicalLocationBus} (Custodian: {item.custodianName})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-charcoal block">
                                {item.quantity} {item.unit}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                                IN CUSTODY
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VISIT HISTORY */}
                  <div>
                    <h4 className="text-xs font-mono uppercase font-bold text-charcoal mb-3">
                      Visit & Laboratory History
                    </h4>
                    {schoolProfile.school.Event.length === 0 ? (
                      <div className="p-4 bg-stone-50 border border-stone rounded text-xs text-charcoal-muted text-center font-mono">
                        No mobile laboratory visits recorded yet for this school.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schoolProfile.school.Event.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 border border-stone rounded bg-stone-50/50 text-xs font-mono flex items-center justify-between"
                          >
                            <div>
                              <strong className="text-charcoal block">
                                {new Date(ev.eventDate).toLocaleDateString()} ({ev.startTime} - {ev.endTime})
                              </strong>
                              <span className="text-charcoal-muted text-[11px] block">
                                Lab: {ev.Bus?.busCode || ev.Bus?.registrationNumber || "Unassigned"} | Staff:{" "}
                                {ev.EventsOnCommunicator.map((e) => e.User.name).join(", ") || "None"}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ev.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
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
              <button
                className="btn ghost text-xs font-mono px-4 py-2"
                onClick={() => {
                  setProfileSchoolId(null);
                  setSchoolProfile(null);
                }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
