import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { useAuth } from "../../app/providers/AuthProvider";

interface ProfileData {
  profile: {
    id: string;
    name: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    employeeId: string;
    region: string;
    district: string;
    state: string;
    joinedAt: string;
  };
  assignedBus: {
    id: string;
    registrationNumber: string;
    model: string;
    seatingCapacity: number;
    status: string;
    currentLocation: string;
    equipmentCount: number;
  } | null;
  regionalAdmin: {
    name: string;
    email: string;
    phone: string;
  } | null;
  stats: {
    completedVisits: number;
    activeStatus: string;
  };
}

export function FieldProfilePage() {
  const { logout } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<ProfileData>("/field/profile");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mb-3" />
        <span className="font-mono text-xs">Loading Staff Profile...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface p-6 max-w-xl mx-auto my-8 border border-stone rounded-xl text-center">
        <h2 className="text-sm font-bold text-charcoal mb-1">Could not load profile</h2>
        <p className="text-xs text-charcoal-muted mb-4">{error}</p>
        <button onClick={() => void loadProfile()} className="btn btn-secondary text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white font-mono text-xl font-bold shrink-0 shadow-xs"
            style={{ backgroundColor: "#176B50" }}
          >
            {(data.profile.fullName || data.profile.name || "SC").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-charcoal">{data.profile.fullName}</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded-full">
                {data.stats.activeStatus}
              </span>
            </div>
            <p className="text-xs text-charcoal-muted font-mono">
              Role: SCIENCE COMMUNICATOR • ID: {data.profile.employeeId}
            </p>
          </div>
        </div>

        <button
          onClick={() => void logout()}
          className="btn btn-secondary text-xs border border-stone text-rose-700 hover:bg-rose-50 font-semibold"
        >
          ↪ Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Account Details */}
        <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-stone pb-3">
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Staff Member Details
            </h2>
            <span className="text-[11px] text-charcoal-muted">
              Identity and contact information
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-stone">
              <span className="text-charcoal-muted">Full Legal Name</span>
              <strong className="text-charcoal">{data.profile.fullName}</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-stone">
              <span className="text-charcoal-muted">Email Address</span>
              <strong className="text-charcoal font-mono">{data.profile.email}</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-stone">
              <span className="text-charcoal-muted">Phone Contact</span>
              <strong className="text-charcoal">{data.profile.phone}</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-stone">
              <span className="text-charcoal-muted">Operational Region</span>
              <strong className="text-charcoal">{data.profile.region} ({data.profile.state})</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-stone">
              <span className="text-charcoal-muted">District Jurisdiction</span>
              <strong className="text-charcoal">{data.profile.district}</strong>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-charcoal-muted">Total Completed School Visits</span>
              <strong className="text-emerald-700 font-bold text-sm">
                {data.stats.completedVisits} Visits
              </strong>
            </div>
          </div>
        </div>

        {/* Assigned Mobile Lab Details */}
        <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-stone pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Assigned Mobile Laboratory Bus
              </h2>
              <span className="text-[11px] text-charcoal-muted">
                Vehicle operated during science tours
              </span>
            </div>
            {data.assignedBus && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-100 text-blue-800 rounded-full">
                {data.assignedBus.status}
              </span>
            )}
          </div>

          {data.assignedBus ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone">
                <span className="text-charcoal-muted">Registration Number</span>
                <strong className="text-charcoal font-mono">{data.assignedBus.registrationNumber}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-stone">
                <span className="text-charcoal-muted">Vehicle Model</span>
                <strong className="text-charcoal">{data.assignedBus.model}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-stone">
                <span className="text-charcoal-muted">Seating Capacity</span>
                <strong className="text-charcoal">{data.assignedBus.seatingCapacity} Seats</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-stone">
                <span className="text-charcoal-muted">Reusable Equipment Assets</span>
                <strong className="text-charcoal">{data.assignedBus.equipmentCount} Equipment Tagged</strong>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-charcoal-muted">GPS Last Known Location</span>
                <strong className="text-charcoal font-mono">{data.assignedBus.currentLocation}</strong>
              </div>

              <div className="pt-2">
                <Link
                  to="/field/inventory"
                  className="btn btn-secondary w-full text-center text-xs border border-stone"
                >
                  Inspect Bus Stock & Equipment
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-charcoal-muted">
              No vehicle currently assigned.
            </div>
          )}
        </div>

        {/* Regional Reporting Hierarchy */}
        <div className="md:col-span-2 surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-stone pb-3">
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Reporting & Operations Hierarchy
            </h2>
            <span className="text-[11px] text-charcoal-muted">
              Contact point for schedule modifications, emergency stock reorders, and vehicle breakdowns
            </span>
          </div>

          {data.regionalAdmin ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[10px] font-mono text-charcoal-subtle uppercase block">
                  Regional Administrator
                </span>
                <h3 className="text-base font-bold text-charcoal">{data.regionalAdmin.name}</h3>
                <p className="text-charcoal-muted font-mono mt-0.5">
                  Email: {data.regionalAdmin.email} • Phone: {data.regionalAdmin.phone}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to="/field/issues"
                  className="btn btn-secondary text-xs border border-stone text-rose-700"
                >
                  Report Operational Issue
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-xs text-charcoal-muted">
              No Regional Administrator currently assigned to {data.profile.region}. Contact central HQ.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
