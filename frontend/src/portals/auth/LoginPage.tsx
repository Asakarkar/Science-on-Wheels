import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { BrandLogo } from "../../shared/components/BrandLogo";
import { NavIcon } from "../../shared/components/NavIcon";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const user = await login(email.trim(), password, remember);

      const stateFrom = (
        location.state as { from?: { pathname: string } } | null
      )?.from?.pathname;

      const isAllowedStateFrom =
        stateFrom &&
        stateFrom !== "/login" &&
        ((user.role === "SUPER_ADMIN" && stateFrom.startsWith("/admin")) ||
          (user.role === "REGIONAL_ADMIN" && stateFrom.startsWith("/regional")) ||
          (user.role === "SCIENCE_COMMUNICATOR" && stateFrom.startsWith("/field")));

      if (isAllowedStateFrom) {
        navigate(stateFrom, { replace: true });
        return;
      }

      const target =
        user.role === "SUPER_ADMIN"
          ? "/admin/dashboard"
          : user.role === "REGIONAL_ADMIN"
            ? "/regional/dashboard"
            : user.role === "SCIENCE_COMMUNICATOR"
              ? "/field/dashboard"
              : "/login";

      navigate(target, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-container">
      {/* Mobile Branding (only displayed when left panel is hidden on mobile screens) */}
      <div className="auth-form-logo-mobile" style={{ display: "none", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
        <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", backgroundColor: "#FFFFFF", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", boxShadow: "var(--shadow-xs)" }}>
          <BrandLogo size={36} />
        </div>
        <div>
          <strong style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>VIBHA · Science on Wheels</strong>
          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-subtle)" }}>Operations Management Platform</span>
        </div>
      </div>

      {/* Header */}
      <div className="auth-form-header">
        <h2 className="auth-form-title">Sign in to your account</h2>
        <p className="auth-form-subtitle">
          Enter your authorized credentials to access regional coordination and fleet management.
        </p>
      </div>

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
        {/* Error Alert */}
        {error && (
          <div className="auth-error" role="alert" aria-live="polite">
            <NavIcon name="AlertCircle" size={18} style={{ flexShrink: 0, marginTop: "2px", color: "var(--error)" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Email Address */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="email">
            Email Address
          </label>
          <input
            className="auth-input"
            id="email"
            name="email"
            type="email"
            placeholder="operator@scienceonwheels.com"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password with Show/Hide Toggle */}
        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-field-label" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="auth-link"
              onClick={() =>
                setError("Please contact your central system administrator to reset or re-issue your credentials.")
              }
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              className="auth-input"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-subtle)",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <NavIcon name="Eye" size={16} />
            </button>
          </div>
        </div>

        {/* Keep signed in */}
        <div className="auth-remember">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember" style={{ cursor: "pointer", userSelect: "none" }}>
            Remember this terminal session
          </label>
        </div>

        {/* Submit Button */}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            <>
              <div className="loader-ring" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: "#FFF" }} />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign in to Platform</span>
              <NavIcon name="ArrowRightLeft" size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer info */}
      <div className="auth-footer">
        VIBHA · Science on Wheels · Autonomous STEM Logistics Management
      </div>
    </div>
  );
}
