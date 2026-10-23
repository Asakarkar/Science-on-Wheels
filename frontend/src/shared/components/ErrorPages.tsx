import { useNavigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
        background: "var(--color-bg, #0b0f19)",
        color: "var(--color-text, #f3f4f6)"
      }}
    >
      <div style={{ maxWidth: "480px" }}>
        <div style={{ width: "64px", height: "64px", margin: "0 auto 1.5rem" }}>
          <BrandLogo />
        </div>
        <div className="section-kicker" style={{ color: "#ec4899", marginBottom: "0.5rem" }}>
          404 / NOT FOUND
        </div>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Page not found</h1>
        <p style={{ opacity: 0.7, marginBottom: "2rem", lineHeight: 1.6 }}>
          The requested route does not exist or has been moved to a new role-based portal location.
        </p>
        <button
          className="primary"
          onClick={() => navigate("/")}
          style={{
            padding: "0.6rem 1.4rem",
            fontSize: "0.95rem",
            borderRadius: "6px",
            background: "var(--color-primary, #6366f1)",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
        background: "var(--color-bg, #0b0f19)",
        color: "var(--color-text, #f3f4f6)"
      }}
    >
      <div style={{ maxWidth: "480px" }}>
        <div style={{ width: "64px", height: "64px", margin: "0 auto 1.5rem" }}>
          <BrandLogo />
        </div>
        <div className="section-kicker" style={{ color: "#f43f5e", marginBottom: "0.5rem" }}>
          403 / ACCESS FORBIDDEN
        </div>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Access Denied</h1>
        <p style={{ opacity: 0.7, marginBottom: "2rem", lineHeight: 1.6 }}>
          You do not have the required role or regional authorization to access this portal or resource.
        </p>
        <button
          className="primary"
          onClick={() => navigate("/")}
          style={{
            padding: "0.6rem 1.4rem",
            fontSize: "0.95rem",
            borderRadius: "6px",
            background: "var(--color-primary, #6366f1)",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
        >
          Go to Your Portal
        </button>
      </div>
    </div>
  );
}
