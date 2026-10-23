import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalRoutesPage() {
  return (
    <div className="portal-module">
      <RegionalDataTable
        resource="routes"
        title="Routes & Travel Planning"
        description="Planned and active laboratory travel routes within your assigned region."
      />
    </div>
  );
}
