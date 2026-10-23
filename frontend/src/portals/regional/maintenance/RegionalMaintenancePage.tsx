import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalMaintenancePage() {
  return (
    <div className="portal-module">
      <RegionalDataTable
        resource="maintenance"
        title="Regional Lab Maintenance"
        description="Maintenance schedules, tyre/engine servicing, and due dates for regional labs."
      />
    </div>
  );
}
