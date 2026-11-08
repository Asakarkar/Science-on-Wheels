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
    <div className="login-card-panel">
      <section className="login-card" data-purpose="auth-card-panel">
        {/* Card Header with VIBHA Brand Lockup */}
        <div className="login-card-header">
          <div className="login-card-brand">
            <div className="login-brand-box">
              <BrandLogo size={32} />
            </div>
            <div>
              <div className="login-brand-title">VIBHA · Science on Wheels</div>
              <div className="login-brand-sub">Operations Command Platform</div>
            </div>
          </div>
          <h2 className="login-card-heading">Welcome back</h2>
          <p className="login-card-subheading">Sign in to continue to your workspace.</p>
        </div>

        {/* Login Form */}
        <form className="login-form" data-purpose="auth-form" onSubmit={handleSubmit}>
          {/* Info Alert */}
          {infoMessage && (
            <div className="login-alert login-alert-info" role="status" aria-live="polite">
              <NavIcon name="Info" size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="login-alert login-alert-error" role="alert" aria-live="polite">
              <NavIcon name="AlertCircle" size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="login-field">
            <label className="login-field-label" htmlFor="email">
              Email
            </label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                id="email"
                name="email"
                type="email"
                placeholder="operator@fleet.sow.org"
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

          {/* Password Input */}
          <div className="login-field">
            <div className="login-label-row">
              <label className="login-field-label" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                className="login-reset-link"
                onClick={handleForgotPassword}
              >
                Reset key?
              </button>
            </div>
            <div className="login-input-wrap">
              <input
                className="login-input"
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
                style={{ paddingRight: "40px", letterSpacing: showPassword ? "normal" : "0.15em" }}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <NavIcon name={showPassword ? "EyeOff" : "Eye"} size={16} />
              </button>
            </div>
          </div>

          {/* Remember Machine Checkbox */}
          <div className="login-remember-row">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="login-checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="login-remember-label">
              Remember terminal identity (30 days)
            </label>
          </div>

          {/* Submit Button */}
          <button className="login-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="loader-ring" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#FFF" }} />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <svg className="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
