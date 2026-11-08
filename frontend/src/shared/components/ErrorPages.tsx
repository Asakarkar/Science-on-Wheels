import { useNavigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

function ErrorLayout({
  code,
  title,
  description,
  actionLabel,
  onAction,
}: {
  code: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: "var(--canvas)",
        fontFamily: "var(--font-sans)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "440px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        {/* VIBHA Logo Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            borderRadius: "var(--r-xl)",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border)",
            padding: "8px",
            boxShadow: "var(--shadow-xs)",
            marginBottom: "8px",
          }}
        >
          <BrandLogo size={48} />
        </div>

        {/* Error code */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "72px",
            fontWeight: 800,
            color: "var(--border-strong)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          {code}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "14.5px",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: "380px",
          }}
        >
          {description}
        </p>

        {/* Action Button */}
        <button
          onClick={onAction}
          className="primary"
          style={{ marginTop: "10px" }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ErrorLayout
      code="404"
      title="Page not found"
      description="The requested route does not exist or has been relocated in the VIBHA Science on Wheels portal."
      actionLabel="Return to Dashboard"
      onAction={() => navigate("/")}
    />
  );
}

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <ErrorLayout
      code="403"
      title="Access denied"
      description="You do not have the required role or regional authorization to access this portal or resource."
      actionLabel="Go to Authorized Hub"
      onAction={() => navigate("/")}
    />
  );
}
