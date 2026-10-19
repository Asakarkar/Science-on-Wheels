import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { RegionalAdminDashboard } from "./pages/RegionalAdminDashboard";
import { FieldDashboard } from "./pages/FieldDashboard";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/regional-admin" element={<RegionalAdminDashboard />} />
        <Route path="/instructor" element={<FieldDashboard role="SCIENCE_COMMUNICATOR" />} />
        <Route path="/driver" element={<FieldDashboard role="DRIVER" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
