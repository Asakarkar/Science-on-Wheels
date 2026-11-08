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
      <div style={{ maxWidth: "420px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "var(--r-xl)",
            backgroundColor: "var(--brand)",
            marginBottom: "8px",
          }}
        >
          <BrandLogo size={28} color="#fff" />
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
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: "360px",
          }}
        >
          {description}
        </p>

        {/* Action */}
        <button
          onClick={onAction}
          style={{
            marginTop: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "var(--brand)",
            border: "1px solid var(--brand)",
            borderRadius: "var(--r-md)",
            cursor: "pointer",
            transition: "background-color 120ms ease",
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = "var(--brand-hover)")}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = "var(--brand)")}
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
      description="The requested route does not exist or has been moved to a new location in the role-based portal."
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
      actionLabel="Go to Your Portal"
      onAction={() => navigate("/")}
    />
  );
}
