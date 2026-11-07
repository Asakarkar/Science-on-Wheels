import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { configs, csvDownload } from "./resources";
import { ResourceView } from "./ResourceView";

interface SchoolRecord {
  id: string;
  name: string;
  udiseCode: string;
  address: string;
  regionId: string;
  regionName?: string;
  districtId: string;
  districtName?: string;
  blockId: string;
  blockName?: string;
  latitude: number;
  longitude: number;
  locationSource?: string | null;
  locationVerified: boolean;
  principalName?: string | null;
  contactPhone: string;
  totalStudents: number;
  hasScienceLab: boolean;
  hasElectricity: boolean;
  hasInternet: boolean;
  priorityScore: number;
  priorityCategory: "CRITICAL" | "HIGH" | "STANDARD" | "LOW";
  status?: string;
  studentCount?: number;
  teacherCount?: number;
  eventCount?: number;
  createdAt: string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface DistrictOption {
  id: string;
  name: string;
  regionId: string;
}

interface BlockOption {
  id: string;
  name: string;
  districtId: string;
}

interface SchoolProfileData {
  school: SchoolRecord;
  students: Array<{
    id: string;
    name: string;
    gradeClass: string;
    section?: string | null;
    rollNumber?: string | null;
    totalPoints: number;
    _count?: { EventAttendance: number };
  }>;
  teachers: Array<{
    id: string;
    subjectTaught: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  visits: Array<{
    id: string;
    eventCode: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    status: string;
    expectedStudents: number;
    attendanceCount: number;
    readinessPercentage: number;
    busName: string;
    busId?: string | null;
    communicators: string[];
    experiments: string[];
  }>;
  inventoryAllocations: Array<{
    id: string;
    consumableName: string;
    category: string;
    quantity: number;
    unit: string;
    date: string;
    eventCode: string;
  }>;
  issues: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  stats: {
    totalStudentsEnrolled: number;
    totalTeachers: number;
    totalVisits: number;
    totalConsumablesUsed: number;
    facilitiesScore: number;
  };
}

export function SchoolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "School Directory";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["School Directory", "Imported Schedule", "Registration", "Priority"];

  // School directory state
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Toolbar filters
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [facilityFilter, setFacilityFilter] = useState("ALL");

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSchool, setAssigningSchool] = useState<SchoolRecord | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<SchoolProfileData | null>(null);

  async function loadSchoolData() {
    setLoading(true);
    setError("");
    try {
      const [schoolsRes, regionsRes, districtsRes, blocksRes] = await Promise.all([
        apiClient<{ rows: SchoolRecord[] }>("/super-admin/resource/schools?limit=250"),
        apiClient<{ rows: RegionOption[] }>("/super-admin/resource/regions?limit=100"),
        apiClient<{ rows: DistrictOption[] }>("/super-admin/resource/districts?limit=300"),
        apiClient<{ rows: BlockOption[] }>("/super-admin/resource/blocks?limit=500")
      ]);

      setSchools(schoolsRes.rows || []);
      setRegions(regionsRes.rows || []);
      setDistricts(districtsRes.rows || []);
      setBlocks(blocksRes.rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load school directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sub === "School Directory") {
      loadSchoolData();
    }
  }, [sub]);

  // Derived filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      if (regionFilter !== "ALL" && school.regionId !== regionFilter) {
        return false;
      }
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE" && school.priorityCategory === "LOW") return false;
        if (statusFilter === "INACTIVE" && school.priorityCategory !== "LOW") return false;
        if (statusFilter === "HIGH" && !["CRITICAL", "HIGH"].includes(school.priorityCategory)) return false;
      }
      if (facilityFilter !== "ALL") {
        if (facilityFilter === "HAS_LAB" && !school.hasScienceLab) return false;
        if (facilityFilter === "NO_LAB" && school.hasScienceLab) return false;
        if (facilityFilter === "HAS_POWER" && !school.hasElectricity) return false;
        if (facilityFilter === "HAS_INTERNET" && !school.hasInternet) return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = school.name.toLowerCase().includes(query);
        const matchesUdise = school.udiseCode.toLowerCase().includes(query);
        const matchesPrincipal = (school.principalName || "").toLowerCase().includes(query);
        const matchesPhone = (school.contactPhone || "").toLowerCase().includes(query);
        const matchesDistrict = (school.districtName || "").toLowerCase().includes(query);
        const matchesRegion = (school.regionName || "").toLowerCase().includes(query);
        if (!matchesName && !matchesUdise && !matchesPrincipal && !matchesPhone && !matchesDistrict && !matchesRegion) {
          return false;
        }
      }
      return true;
    });
  }, [schools, search, regionFilter, statusFilter, facilityFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = schools.length;
    const mapped = schools.filter((s) => s.regionId).length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
    const withScienceLab = schools.filter((s) => s.hasScienceLab).length;
    const totalVisits = schools.reduce((acc, s) => acc + (s.eventCount || 0), 0);
    return { total, mapped, totalStudents, withScienceLab, totalVisits };
  }, [schools]);

  async function openProfile(school: SchoolRecord) {
    setProfileLoading(true);
    setShowProfileModal(true);
    try {
      const data = await apiClient<SchoolProfileData>(`/super-admin/schools/${school.id}/profile`);
      setProfileData(data);
    } catch (err: any) {
      alert("Failed to fetch school profile: " + (err?.message || "Unknown error"));
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleDeleteSchool(school: SchoolRecord) {
    if (!confirm(`Are you sure you want to delete school "${school.name}" (${school.udiseCode})?`)) {
      return;
    }
    try {
      await apiClient(`/super-admin/resource/schools/${school.id}?cascade=true`, {
        method: "DELETE"
      });
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      alert(`School "${school.name}" was successfully removed.`);
    } catch (err: any) {
      alert("Error deleting school: " + (err?.message || "Operation failed"));
    }
  }

  // Active resource config for auxiliary tabs
  let activeConfig = configs.schools;
  if (sub === "Imported Schedule") {
    activeConfig = configs.schoolScheduleEntries;
  } else if (sub === "Registration" || sub === "Verification") {
    activeConfig = configs.registrations;
  }

  return (
    <div className="portal-module" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Subnavigation Bar */}
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--stone, #e2e8f0)", paddingBottom: "0.75rem" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSub(opt)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              background: sub === opt ? "var(--charcoal-dark, #1E242B)" : "#ffffff",
              color: sub === opt ? "#ffffff" : "var(--charcoal, #334155)",
              border: sub === opt ? "1px solid var(--charcoal-dark, #1E242B)" : "1px solid var(--stone, #cbd5e1)",
              fontWeight: sub === opt ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {sub !== "School Directory" ? (
        <ResourceView config={activeConfig} />
      ) : (
        <>
          {/* Module Header & Summary Banner */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              border: "1px solid var(--stone, #e2e8f0)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--charcoal-dark, #1E242B)" }}>
                  School Management
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    background: "rgba(99, 102, 241, 0.12)",
                    color: "var(--color-primary, #6366f1)"
                  }}
                >
                  Central Directory
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                Maintain the central database of schools participating in the NGO&apos;s mobile laboratory programme.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="ghost"
                onClick={() => csvDownload("schools")}
              >
                <span>📥</span> Export CSV
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setEditingSchool(null);
                  setShowAddEditModal(true);
                }}
              >
                <span>➕</span> Register School
              </button>
            </div>
          </div>

          {/* Operational Metrics Cards */}
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Total Registered Schools</div>
              <strong>{metrics.total}</strong>
              <small>Central Master Registry</small>
            </div>

            <div className="metric-card">
              <div className="metric-label">Regional Mappings</div>
              <strong>{metrics.mapped} / {metrics.total}</strong>
              <small>Active geographical linkage</small>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Students Enrolled</div>
              <strong>{metrics.totalStudents.toLocaleString()}</strong>
              <small>Across all registered schools</small>
            </div>

            <div className="metric-card">
              <div className="metric-label">Mobile Lab Visits Hosted</div>
              <strong>{metrics.totalVisits}</strong>
              <small>On-site science sessions</small>
            </div>
          </div>

          {/* Filtering and Search Toolbar */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              padding: "1rem",
              border: "1px solid var(--stone, #e2e8f0)",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center"
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by school name, UDISE code, principal, district..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ minWidth: "160px" }}>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  background: "#ffffff"
                }}
              >
                <option value="ALL">All Regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: "150px" }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  background: "#ffffff"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Schools</option>
                <option value="HIGH">High / Critical Priority</option>
                <option value="INACTIVE">Low / Inactive</option>
              </select>
            </div>

            <div style={{ minWidth: "170px" }}>
              <select
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  background: "#ffffff"
                }}
              >
                <option value="ALL">All Facilities</option>
                <option value="HAS_LAB">Has Science Lab</option>
                <option value="NO_LAB">Needs Mobile Lab</option>
                <option value="HAS_POWER">Has Electricity</option>
                <option value="HAS_INTERNET">Has Internet</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadSchoolData}
              disabled={loading}
              style={{
                padding: "0.55rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid var(--stone, #cbd5e1)",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Error notice */}
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                fontSize: "13px"
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* School Directory Table */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid var(--stone, #e2e8f0)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid var(--stone, #e2e8f0)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                Participating Schools Directory ({filteredSchools.length} of {schools.length})
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Showing verified participating institutions
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                Loading school directory...
              </div>
            ) : filteredSchools.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                No schools matched the specified filters. Try adjusting your search query.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>School & UDISE</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Regional Mapping</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Contact Details</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Student Reach</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Facilities</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Priority & Status</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((s, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={s.id}
                          style={{
                            background: isEven ? "#ffffff" : "#fcfcfd",
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.1s ease"
                          }}
                        >
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                              {s.name}
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "2px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: "#f1f5f9",
                                  color: "#475569"
                                }}
                              >
                                {s.udiseCode}
                              </span>
                              {s.locationVerified && (
                                <span title="Location Verified" style={{ fontSize: "11px", color: "#10b981" }}>
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              📍 {s.address}
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: s.regionId ? "rgba(99, 102, 241, 0.1)" : "#fee2e2",
                                color: s.regionId ? "#4f46e5" : "#b91c1c"
                              }}
                            >
                              🗺️ {s.regionName || "Unassigned"}
                            </span>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                              District: <strong>{s.districtName || "—"}</strong>
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              Block: {s.blockName || "—"}
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 500, color: "#1e293b" }}>
                              👤 {s.principalName || "Principal (Unrecorded)"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                              📞 {s.contactPhone || "—"}
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              👥 {(s.totalStudents || 0).toLocaleString()} students
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                              🚐 Visits: <strong>{s.eventCount ?? 0}</strong>
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                              <span
                                title={s.hasScienceLab ? "Has On-site Science Lab" : "No Science Lab (Mobile Outreach Priority)"}
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: s.hasScienceLab ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.08)",
                                  color: s.hasScienceLab ? "#059669" : "#dc2626",
                                  fontWeight: 600
                                }}
                              >
                                {s.hasScienceLab ? "🔬 Lab" : "🚫 No Lab"}
                              </span>
                              <span
                                title={s.hasElectricity ? "Electricity Available" : "No Electricity"}
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: s.hasElectricity ? "rgba(59, 130, 246, 0.1)" : "rgba(148, 163, 184, 0.2)",
                                  color: s.hasElectricity ? "#2563eb" : "#64748b"
                                }}
                              >
                                ⚡ Power
                              </span>
                              {s.hasInternet && (
                                <span
                                  title="Internet Connectivity Available"
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(168, 85, 247, 0.1)",
                                    color: "#7c3aed"
                                  }}
                                >
                                  🌐 Web
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "fit-content",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background:
                                    s.priorityCategory === "CRITICAL"
                                      ? "#fef2f2"
                                      : s.priorityCategory === "HIGH"
                                      ? "#fffbeb"
                                      : "#f0fdf4",
                                  color:
                                    s.priorityCategory === "CRITICAL"
                                      ? "#b91c1c"
                                      : s.priorityCategory === "HIGH"
                                      ? "#b45309"
                                      : "#15803d",
                                  border: `1px solid ${
                                    s.priorityCategory === "CRITICAL"
                                      ? "#fca5a5"
                                      : s.priorityCategory === "HIGH"
                                      ? "#fcd34d"
                                      : "#86efac"
                                  }`
                                }}
                              >
                                {s.priorityCategory || "STANDARD"}
                              </span>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>
                                Score: {(s.priorityScore || 0).toFixed(1)}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                              <button
                                type="button"
                                onClick={() => openProfile(s)}
                                title="View Complete School Profile"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "5px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                              >
                                🔍 Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningSchool(s);
                                  setShowAssignModal(true);
                                }}
                                title="Assign or Transfer Region"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "5px",
                                  border: "1px solid #cbd5e1",
                                  background: "#f8fafc",
                                  color: "#4f46e5",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                              >
                                🗺️ Region
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSchool(s);
                                  setShowAddEditModal(true);
                                }}
                                title="Edit School Details"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "5px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchool(s)}
                                title="Delete School"
                                style={{
                                  padding: "0.35rem 0.55rem",
                                  borderRadius: "5px",
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: "12px",
                                  cursor: "pointer"
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: Register or Edit School */}
      {showAddEditModal && (
        <SchoolAddEditModal
          school={editingSchool}
          regions={regions}
          districts={districts}
          blocks={blocks}
          onClose={() => setShowAddEditModal(false)}
          onSuccess={(saved) => {
            setShowAddEditModal(false);
            if (editingSchool) {
              setSchools((prev) => prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
            } else {
              setSchools((prev) => [saved, ...prev]);
            }
          }}
        />
      )}

      {/* MODAL 2: Assign Regional Mapping */}
      {showAssignModal && assigningSchool && (
        <SchoolAssignRegionModal
          school={assigningSchool}
          regions={regions}
          districts={districts}
          blocks={blocks}
          onClose={() => {
            setShowAssignModal(false);
            setAssigningSchool(null);
          }}
          onSuccess={(updated) => {
            setShowAssignModal(false);
            setAssigningSchool(null);
            setSchools((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          }}
        />
      )}

      {/* MODAL 3: Deep-Dive School Profile */}
      {showProfileModal && (
        <SchoolProfileModal
          loading={profileLoading}
          data={profileData}
          onClose={() => {
            setShowProfileModal(false);
            setProfileData(null);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: School Add / Edit Modal
// -------------------------------------------------------------
function SchoolAddEditModal({
  school,
  regions,
  districts,
  blocks,
  onClose,
  onSuccess
}: {
  school: SchoolRecord | null;
  regions: RegionOption[];
  districts: DistrictOption[];
  blocks: BlockOption[];
  onClose: () => void;
  onSuccess: (record: SchoolRecord) => void;
}) {
  const isEdit = Boolean(school);

  const [name, setName] = useState(school?.name || "");
  const [udiseCode, setUdiseCode] = useState(school?.udiseCode || "");
  const [address, setAddress] = useState(school?.address || "");
  const [regionId, setRegionId] = useState(school?.regionId || (regions[0]?.id || ""));
  const [districtId, setDistrictId] = useState(school?.districtId || "");
  const [blockId, setBlockId] = useState(school?.blockId || "");
  const [latitude, setLatitude] = useState(school?.latitude?.toString() || "19.0760");
  const [longitude, setLongitude] = useState(school?.longitude?.toString() || "72.8777");
  const [principalName, setPrincipalName] = useState(school?.principalName || "");
  const [contactPhone, setContactPhone] = useState(school?.contactPhone || "");
  const [totalStudents, setTotalStudents] = useState(school?.totalStudents?.toString() || "250");
  const [hasScienceLab, setHasScienceLab] = useState(school?.hasScienceLab || false);
  const [hasElectricity, setHasElectricity] = useState(school?.hasElectricity !== false);
  const [hasInternet, setHasInternet] = useState(school?.hasInternet || false);
  const [priorityCategory, setPriorityCategory] = useState<string>(school?.priorityCategory || "STANDARD");
  const [priorityScore, setPriorityScore] = useState(school?.priorityScore?.toString() || "0");

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Filter districts by selected region
  const availableDistricts = useMemo(() => {
    return districts.filter((d) => d.regionId === regionId);
  }, [districts, regionId]);

  // Filter blocks by selected district
  const availableBlocks = useMemo(() => {
    return blocks.filter((b) => b.districtId === districtId);
  }, [blocks, districtId]);

  // Adjust districtId when region changes if not matched
  useEffect(() => {
    if (availableDistricts.length > 0 && !availableDistricts.some((d) => d.id === districtId)) {
      setDistrictId(availableDistricts[0].id);
    }
  }, [regionId, availableDistricts, districtId]);

  // Adjust blockId when district changes if not matched
  useEffect(() => {
    if (availableBlocks.length > 0 && !availableBlocks.some((b) => b.id === blockId)) {
      setBlockId(availableBlocks[0].id);
    }
  }, [districtId, availableBlocks, blockId]);

  function generateUdise() {
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
    setUdiseCode(`27${randomDigits.toString().slice(0, 9)}`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setModalError("");

    const payload = {
      name: name.trim(),
      udiseCode: udiseCode.trim(),
      address: address.trim(),
      regionId,
      districtId: districtId || undefined,
      blockId: blockId || undefined,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      principalName: principalName.trim() || null,
      contactPhone: contactPhone.trim(),
      totalStudents: parseInt(totalStudents, 10) || 0,
      hasScienceLab,
      hasElectricity,
      hasInternet,
      priorityCategory,
      priorityScore: parseFloat(priorityScore) || 0
    };

    try {
      let saved: SchoolRecord;
      if (isEdit && school) {
        saved = await apiClient<SchoolRecord>(`/super-admin/resource/schools/${school.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        saved = await apiClient<SchoolRecord>("/super-admin/resource/schools", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      onSuccess(saved);
    } catch (err: any) {
      setModalError(err?.message || "Failed to save school record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
              {isEdit ? "Edit School Record" : "Register New School"}
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Maintain official school credentials and regional mobile laboratory program linkage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#94a3b8"
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {modalError && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: "13px"
              }}
            >
              ⚠️ {modalError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                School Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adarsh Vidya Mandir"
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  UDISE Code *
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={generateUdise}
                    style={{ fontSize: "11px", color: "#6366f1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Auto-Generate
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={udiseCode}
                onChange={(e) => setUdiseCode(e.target.value)}
                placeholder="11-digit UDISE code"
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Full Campus Address *
            </label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Village, Post, Taluka, Pin Code..."
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
            />
          </div>

          {/* Regional Geography Assignment */}
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", marginBottom: "8px" }}>
              🗺️ Geographical & Regional Mapping
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Assigned Region *
                </label>
                <select
                  required
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  District
                </label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Block / Taluka
                </label>
                <select
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
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
          </div>

          {/* Coordinates & Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Principal / Headmaster Name
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="Dr. / Mr. / Ms. Principal"
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                School Contact Phone *
              </label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 9876543210"
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Total Students *
              </label>
              <input
                type="number"
                required
                min={0}
                value={totalStudents}
                onChange={(e) => setTotalStudents(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Infrastructure & Facilities */}
          <div style={{ background: "#ffffff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
              Campus Facilities & Infrastructure
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={hasScienceLab}
                  onChange={(e) => setHasScienceLab(e.target.checked)}
                />
                <span>🔬 Has Existing Science Lab</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={hasElectricity}
                  onChange={(e) => setHasElectricity(e.target.checked)}
                />
                <span>⚡ Electricity Available</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={hasInternet}
                  onChange={(e) => setHasInternet(e.target.checked)}
                />
                <span>🌐 Internet Connectivity</span>
              </label>
            </div>
          </div>

          {/* Priority & Outreach Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Priority Category
              </label>
              <select
                value={priorityCategory}
                onChange={(e) => setPriorityCategory(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
              >
                <option value="CRITICAL">Critical (Immediate Outreach)</option>
                <option value="HIGH">High Priority</option>
                <option value="STANDARD">Standard</option>
                <option value="LOW">Low / Inactive</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Priority Score (0 - 100)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={priorityScore}
                onChange={(e) => setPriorityScore(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "6px",
                border: "none",
                background: "var(--color-primary, #6366f1)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(99, 102, 241, 0.25)"
              }}
            >
              {saving ? "Saving..." : isEdit ? "Update School" : "Register School"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Regional Assignment Modal
// -------------------------------------------------------------
function SchoolAssignRegionModal({
  school,
  regions,
  districts,
  blocks,
  onClose,
  onSuccess
}: {
  school: SchoolRecord;
  regions: RegionOption[];
  districts: DistrictOption[];
  blocks: BlockOption[];
  onClose: () => void;
  onSuccess: (updated: SchoolRecord) => void;
}) {
  const [selectedRegionId, setSelectedRegionId] = useState(school.regionId || (regions[0]?.id || ""));
  const [selectedDistrictId, setSelectedDistrictId] = useState(school.districtId || "");
  const [selectedBlockId, setSelectedBlockId] = useState(school.blockId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableDistricts = useMemo(() => {
    return districts.filter((d) => d.regionId === selectedRegionId);
  }, [districts, selectedRegionId]);

  const availableBlocks = useMemo(() => {
    return blocks.filter((b) => b.districtId === selectedDistrictId);
  }, [blocks, selectedDistrictId]);

  useEffect(() => {
    if (availableDistricts.length > 0 && !availableDistricts.some((d) => d.id === selectedDistrictId)) {
      setSelectedDistrictId(availableDistricts[0].id);
    }
  }, [selectedRegionId, availableDistricts, selectedDistrictId]);

  useEffect(() => {
    if (availableBlocks.length > 0 && !availableBlocks.some((b) => b.id === selectedBlockId)) {
      setSelectedBlockId(availableBlocks[0].id);
    }
  }, [selectedDistrictId, availableBlocks, selectedBlockId]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await apiClient<{ message: string; school: SchoolRecord }>(
        `/super-admin/schools/${school.id}/assign-region`,
        {
          method: "POST",
          body: JSON.stringify({
            regionId: selectedRegionId,
            districtId: selectedDistrictId || undefined,
            blockId: selectedBlockId || undefined
          })
        }
      );
      onSuccess(res.school);
    } catch (err: any) {
      setError(err?.message || "Failed to assign region.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              Assign Regional Mapping
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Link or transfer school geographical operational zone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAssign} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div style={{ padding: "0.75rem", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{school.name}</div>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
              UDISE: <code>{school.udiseCode}</code> | Current Region: <strong>{school.regionName || "Unassigned"}</strong>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Target Region *
            </label>
            <select
              required
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              District within Region
            </label>
            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(e.target.value)}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
            >
              <option value="">Auto-resolve or Select District</option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Block / Taluka
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
            >
              <option value="">Auto-resolve or Select Block</option>
              {availableBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "0.55rem 1.3rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              {saving ? "Transferring..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Deep-Dive School Profile Modal
// -------------------------------------------------------------
function SchoolProfileModal({
  loading,
  data,
  onClose
}: {
  loading: boolean;
  data: SchoolProfileData | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "visits" | "inventory" | "issues">("overview");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 30px -5px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "#f8fafc"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>
                {data ? data.school.name : "School Profile"}
              </h3>
              {data && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "rgba(99, 102, 241, 0.12)",
                    color: "#4f46e5"
                  }}
                >
                  UDISE: {data.school.udiseCode}
                </span>
              )}
            </div>
            {data && (
              <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                📍 {data.school.address} &bull; Region: <strong>{data.school.regionName}</strong> &bull; District: <strong>{data.school.districtName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              color: "#94a3b8"
            }}
          >
            ✕
          </button>
        </div>

        {loading || !data ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>
            Loading school profile intelligence and visit history...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Quick Metrics Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0"
              }}
            >
              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "0.5rem" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>ENROLLED STUDENTS</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                  {(data.school.totalStudents || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "0.5rem" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>LAB VISITS COMPLETED</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                  {data.stats.totalVisits}
                </div>
              </div>

              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "0.5rem" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>TEACHERS ON RECORD</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#6366f1", marginTop: "2px" }}>
                  {data.stats.totalTeachers}
                </div>
              </div>

              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "0.5rem" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>SUPPLIES CONSUMED</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b", marginTop: "2px" }}>
                  {data.stats.totalConsumablesUsed} units
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>FACILITIES RATING</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                  {data.stats.facilitiesScore} / 3
                </div>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                padding: "0.6rem 1.5rem",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0"
              }}
            >
              {[
                { key: "overview", label: "Overview & Contacts" },
                { key: "students", label: `Student Information (${data.students.length})` },
                { key: "visits", label: `Visit History (${data.visits.length})` },
                { key: "inventory", label: `School Inventory (${data.inventoryAllocations.length})` },
                { key: "issues", label: `Operational Issues (${data.issues.length})` }
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      background: isActive ? "#ffffff" : "transparent",
                      color: isActive ? "#0f172a" : "#64748b",
                      border: isActive ? "1px solid #cbd5e1" : "1px solid transparent",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "12.5px",
                      cursor: "pointer",
                      boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Profile Content Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Contact Info Card */}
                  <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
                      📋 Administration & School Contact
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Principal / Headmaster:</span>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                          {data.school.principalName || "Unrecorded"}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Official Contact Phone:</span>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                          {data.school.contactPhone}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Assigned Region:</span>
                        <div style={{ fontWeight: 600, color: "#4f46e5", marginTop: "2px" }}>
                          {data.school.regionName}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>District & Block:</span>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                          {data.school.districtName} / {data.school.blockName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure Checklist */}
                  <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
                      🏢 Infrastructure & Facilities Assessment
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                      <div
                        style={{
                          padding: "0.75rem",
                          borderRadius: "6px",
                          background: data.school.hasScienceLab ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${data.school.hasScienceLab ? "#86efac" : "#fca5a5"}`
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>SCIENCE LAB</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: data.school.hasScienceLab ? "#15803d" : "#b91c1c", marginTop: "2px" }}>
                          {data.school.hasScienceLab ? "✓ Existing Lab Available" : "✗ No Science Lab (Outreach Priority)"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "0.75rem",
                          borderRadius: "6px",
                          background: data.school.hasElectricity ? "#eff6ff" : "#f8fafc",
                          border: `1px solid ${data.school.hasElectricity ? "#bfdbfe" : "#e2e8f0"}`
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>ELECTRICITY</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: data.school.hasElectricity ? "#1d4ed8" : "#64748b", marginTop: "2px" }}>
                          {data.school.hasElectricity ? "⚡ Power Grid Active" : "⚠️ No Electricity"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "0.75rem",
                          borderRadius: "6px",
                          background: data.school.hasInternet ? "#faf5ff" : "#f8fafc",
                          border: `1px solid ${data.school.hasInternet ? "#e9d5ff" : "#e2e8f0"}`
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>INTERNET</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: data.school.hasInternet ? "#7e22ce" : "#64748b", marginTop: "2px" }}>
                          {data.school.hasInternet ? "🌐 Connected" : "— No Internet"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Geolocation Details */}
                  <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
                      📍 Geolocation & Priority Weighting
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Coordinates:</span>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                          Lat: {data.school.latitude.toFixed(4)}, Lng: {data.school.longitude.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Location Verification:</span>
                        <div style={{ fontWeight: 600, color: data.school.locationVerified ? "#10b981" : "#f59e0b", marginTop: "2px" }}>
                          {data.school.locationVerified ? "✓ Verified Field Location" : "⚠️ Approximate Geocoding"}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Priority Category:</span>
                        <div style={{ fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                          {data.school.priorityCategory} (Score: {(data.school.priorityScore || 0).toFixed(1)})
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Registered Since:</span>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                          {new Date(data.school.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "students" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Registered Students ({data.students.length} sample of {data.school.totalStudents})
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Total Student Enrollment: <strong>{data.school.totalStudents}</strong>
                    </span>
                  </div>

                  {data.students.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "6px" }}>
                      No individual student records enrolled yet. Students are logged during on-site lab sessions.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Student Name</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Grade / Class</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Section / Roll</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Lab Attendance</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600, textAlign: "right" }}>Activity Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((st) => (
                          <tr key={st.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.6rem 0.8rem", fontWeight: 600, color: "#0f172a" }}>
                              {st.name}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#475569" }}>
                              {st.gradeClass}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#64748b" }}>
                              Sec: {st.section || "—"} | Roll: {st.rollNumber || "—"}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#10b981", fontWeight: 600 }}>
                              {st._count?.EventAttendance ?? 0} sessions attended
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "right", fontWeight: 700, color: "#6366f1" }}>
                              ⭐ {st.totalPoints} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "visits" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Mobile Laboratory Visits & Demonstrations ({data.visits.length})
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Historical and scheduled on-site science lab sessions
                    </span>
                  </div>

                  {data.visits.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "6px" }}>
                      No mobile laboratory visits recorded yet for this school. Schedule visits via Operations module.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Visit Code</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Date & Time</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Assigned Bus</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Communicators</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Attendance</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600, textAlign: "right" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.visits.map((v) => (
                          <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.6rem 0.8rem", fontWeight: 600, color: "#0f172a" }}>
                              {v.eventCode}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#334155" }}>
                              <div>{new Date(v.eventDate).toLocaleDateString()}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{v.startTime} - {v.endTime}</div>
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#4f46e5", fontWeight: 500 }}>
                              🚐 {v.busName}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#475569" }}>
                              {v.communicators.length > 0 ? v.communicators.join(", ") : "—"}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", fontWeight: 600, color: "#10b981" }}>
                              {v.attendanceCount} / {v.expectedStudents} students
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: v.status === "COMPLETED" ? "#f0fdf4" : "#eff6ff",
                                  color: v.status === "COMPLETED" ? "#16a34a" : "#2563eb",
                                  border: `1px solid ${v.status === "COMPLETED" ? "#bbf7d0" : "#bfdbfe"}`
                                }}
                              >
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "inventory" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Consumable & Equipment Allocations ({data.inventoryAllocations.length})
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Inventory allocated and consumed during sessions at this school
                    </span>
                  </div>

                  {data.inventoryAllocations.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "6px" }}>
                      No inventory consumption logged yet for this school.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Item Name</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Category</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Quantity Used</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600 }}>Associated Visit</th>
                          <th style={{ padding: "0.6rem 0.8rem", fontWeight: 600, textAlign: "right" }}>Usage Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.inventoryAllocations.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.6rem 0.8rem", fontWeight: 600, color: "#0f172a" }}>
                              {inv.consumableName}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#475569" }}>
                              {inv.category}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", fontWeight: 700, color: "#0f172a" }}>
                              {inv.quantity} {inv.unit}
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", color: "#4f46e5" }}>
                              <code>{inv.eventCode}</code>
                            </td>
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "right", color: "#64748b" }}>
                              {new Date(inv.date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "issues" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Operational Issues & Incident Records ({data.issues.length})
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Reported issues during lab demonstrations and visits
                    </span>
                  </div>

                  {data.issues.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center", color: "#10b981", background: "#f0fdf4", borderRadius: "6px" }}>
                      ✓ No operational issues recorded for this school campus.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {data.issues.map((iss) => (
                        <div
                          key={iss.id}
                          style={{
                            padding: "0.85rem 1rem",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                              {iss.title}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                              Category: {iss.category} &bull; Logged: {new Date(iss.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: iss.severity === "CRITICAL" ? "#fee2e2" : "#fffbeb",
                                color: iss.severity === "CRITICAL" ? "#b91c1c" : "#b45309"
                              }}
                            >
                              {iss.severity}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: iss.status === "RESOLVED" ? "#f0fdf4" : "#f1f5f9",
                                color: iss.status === "RESOLVED" ? "#16a34a" : "#475569"
                              }}
                            >
                              {iss.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            background: "#f8fafc"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
