import { useAuth } from "../../app/providers/AuthProvider";

export function RegionalProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
          ACCOUNT PROFILE
        </div>
        <h2 className="text-xl font-bold text-charcoal">Regional Operations Administrator</h2>
        <p className="text-xs text-charcoal-muted mt-0.5">
          Your credentials and administrative scope within the Science on Wheels platform.
        </p>
      </div>

      <div className="surface p-6 rounded-lg border border-stone space-y-4 font-mono text-xs">
        <div className="flex items-center space-x-4 pb-4 border-b border-stone">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xs"
            style={{ backgroundColor: "#3D6B52" }}
          >
            {(user?.name || "RA").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-charcoal">{user?.name || "Regional Administrator"}</h3>
            <span className="text-xs text-charcoal-muted block">{user?.email}</span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              ROLE: {user?.role || "REGIONAL_ADMIN"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-stone-50 rounded border border-stone">
            <span className="text-charcoal-muted block text-[10px] uppercase">Assigned Region</span>
            <strong className="text-charcoal block text-sm">{user?.regionId || "Assigned Jurisdiction"}</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded border border-stone">
            <span className="text-charcoal-muted block text-[10px] uppercase">Access Authority</span>
            <strong className="text-charcoal block text-sm">Full Regional Management</strong>
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded border border-stone space-y-1">
          <span className="text-charcoal-muted block text-[10px] uppercase">Jurisdiction Boundary</span>
          <p className="text-charcoal font-sans text-xs">
            Your permissions strictly grant full control over regional schools, fleet mobile labs, field staff, and visit approvals within your assigned region. Organization-wide master catalogue changes are managed by central Super Admins.
          </p>
        </div>
      </div>
    </div>
  );
}

