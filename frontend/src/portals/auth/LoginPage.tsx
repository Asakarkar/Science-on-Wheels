import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { BrandLogo } from "../../shared/components/BrandLogo";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
        err instanceof Error ? err.message : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-container">
      {/* Mobile logo (shown only on mobile, panel is hidden) */}
      <div className="auth-form-logo-mobile">
        <div className="auth-form-logo-mark-mobile">
          <BrandLogo size={20} color="#fff" />
        </div>
        <span className="auth-form-logo-text-mobile">Science on Wheels</span>
      </div>

      {/* Header */}
      <div className="auth-form-header">
        <h2 className="auth-form-title">Sign in to your account</h2>
        <p className="auth-form-subtitle">
          Enter your credentials to access the operations management platform.
        </p>
      </div>

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
        {/* Error */}
        {error && (
          <div className="auth-error" role="alert" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="email">
            Email address
          </label>
          <input
            className="auth-input"
            id="email"
            name="email"
            type="email"
            placeholder="operator@sow.org"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-field-label" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="auth-link"
              onClick={() =>
                setError("Contact your system administrator to reset your password.")
              }
            >
              Forgot password?
            </button>
          </div>
          <input
            className="auth-input"
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Remember */}
        <div className="auth-remember">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember">Keep me signed in</label>
        </div>

        {/* Submit */}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            "Verifying credentials…"
          ) : (
            <>
              <span>Sign in</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="auth-footer">
        Science on Wheels · Secure Operations Platform · v1.26
      </div>
    </div>
  );
}
