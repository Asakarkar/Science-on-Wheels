import { useState, useEffect, type FormEvent } from "react";
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
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to the user's role-appropriate dashboard
  useEffect(() => {
    if (user) {
      const target =
        user.role === "SUPER_ADMIN"
          ? "/admin/dashboard"
          : user.role === "REGIONAL_ADMIN"
            ? "/regional/dashboard"
            : user.role === "SCIENCE_COMMUNICATOR"
              ? "/field/dashboard"
              : null;
      if (target) {
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setError("Please provide both your registered email and password.");
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password, remember);

      const stateFrom = (
        location.state as { from?: { pathname: string } } | null
      )?.from?.pathname;

      const isAllowedStateFrom =
        stateFrom &&
        stateFrom !== "/login" &&
        ((loggedUser.role === "SUPER_ADMIN" && stateFrom.startsWith("/admin")) ||
          (loggedUser.role === "REGIONAL_ADMIN" && stateFrom.startsWith("/regional")) ||
          (loggedUser.role === "SCIENCE_COMMUNICATOR" && stateFrom.startsWith("/field")));

      if (isAllowedStateFrom) {
        navigate(stateFrom, { replace: true });
        return;
      }

      const target =
        loggedUser.role === "SUPER_ADMIN"
          ? "/admin/dashboard"
          : loggedUser.role === "REGIONAL_ADMIN"
            ? "/regional/dashboard"
            : loggedUser.role === "SCIENCE_COMMUNICATOR"
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

  function handleForgotPassword() {
    setError(null);
    setInfoMessage(
      "Password resets are managed securely by central IT. Please contact your regional coordinator or system administrator."
    );
  }

  return (
    <div className="auth-form-container">
      {/* Mobile Branding (only displayed when left panel is hidden on mobile screens) */}
      <div className="auth-form-logo-mobile">
        <div className="auth-form-logo-mark-mobile">
          <BrandLogo size={34} />
        </div>
        <div>
          <strong className="auth-form-logo-title-mobile">VIBHA · Science on Wheels</strong>
          <span className="auth-form-logo-sub-mobile">Operations Management Platform</span>
        </div>
      </div>

      {/* Header */}
      <div className="auth-form-header">
        <h2 className="auth-form-title">Sign in to Platform</h2>
        <p className="auth-form-subtitle">
          Authorized personnel portal for mobile science laboratory dispatch and regional coordination.
        </p>
      </div>

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
        {/* Info Alert */}
        {infoMessage && (
          <div className="auth-info" role="status" aria-live="polite">
            <NavIcon name="Info" size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="auth-error" role="alert" aria-live="polite">
            <NavIcon name="AlertCircle" size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Email Address */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="email">
            Email Address
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <NavIcon name="Mail" size={16} />
            </span>
            <input
              className="auth-input has-left-icon"
              id="email"
              name="email"
              type="email"
              placeholder="operator@scienceonwheels.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
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
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <NavIcon name="Lock" size={16} />
            </span>
            <input
              className="auth-input has-left-icon"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <NavIcon name={showPassword ? "EyeOff" : "Eye"} size={16} />
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
            Keep this terminal session active
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
              <NavIcon name="ArrowRight" size={16} />
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
