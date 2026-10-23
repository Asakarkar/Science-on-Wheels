import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";

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
      const user = await login(email.trim(), password);

      const stateFrom = (
        location.state as { from?: { pathname: string } } | null
      )?.from?.pathname;

      if (stateFrom && stateFrom !== "/login") {
        navigate(stateFrom, { replace: true });
        return;
      }

      const target =
        user.role === "SUPER_ADMIN"
          ? "/admin/dashboard"
          : user.role === "REGIONAL_ADMIN"
            ? "/regional/dashboard"
            : "/field/dashboard";

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
    <div className="sow-login-content mx-auto flex w-full max-w-[580px] min-w-0 flex-col items-center">
      {/* Branding */}
      <header className="sow-login-branding mb-8 w-full text-center">
        <h1 className="font-sans text-4xl font-extrabold tracking-tight text-charcoal sm:text-4xl">
          Science on Wheels
        </h1>
      </header>

      {/* Authentication Card */}
      <section className="w-full min-w-0" aria-labelledby="login-heading">
        <div className="sow-auth-card w-full min-w-0 rounded-2xl border border-stone bg-porcelain/95 p-7 shadow-[0_20px_48px_rgba(43,48,50,0.08)] backdrop-blur-md sm:p-10">
          {/* Card Header */}
          <div className="sow-card-header mb-6 border-b border-stone pb-5">
            <h2
              id="login-heading"
              className="font-sans text-2xl font-bold tracking-tight text-charcoal sm:text-[26px]"
            >
              Sign in to your account
            </h2>

            <p className="mt-1.5 text-sm leading-relaxed text-charcoal-muted">
              Enter your credentials to access operations management.
            </p>
          </div>

          {/* Login Form */}
          <form
            className="sow-auth-form flex w-full flex-col gap-5"
            onSubmit={handleSubmit}
            noValidate={false}
          >
            {/* Authentication Error */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border p-3 text-sm leading-5"
                style={{
                  backgroundColor: "#FFF2EF",
                  borderColor: "#E7B8B2",
                  color: "#A33229",
                }}
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div className="sow-field-group flex w-full min-w-0 flex-col">
              <label
                className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal"
                htmlFor="email"
              >
                Email address
              </label>

              <input
                className="sow-input block min-h-12 w-full min-w-0 rounded-lg border border-stone bg-white px-4 py-3 font-sans text-sm text-charcoal placeholder:text-charcoal-subtle transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                id="email"
                name="email"
                type="email"
                placeholder="operator@fleet.sow.org"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {/* Password */}
            <div className="sow-field-group flex w-full min-w-0 flex-col">
              <div className="mb-2 flex w-full items-center justify-between gap-3">
                <label
                  className="block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal"
                  htmlFor="password"
                >
                  Password
                </label>

                <button
                  type="button"
                  className="shrink-0 appearance-none border-0 bg-transparent p-0 font-mono text-[11px] text-terracotta-dark underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta"
                  onClick={() =>
                    setError(
                      "Contact your system administrator or super admin to reset your password."
                    )
                  }
                >
                  Reset password
                </button>
              </div>

              <input
                className="sow-input block min-h-12 w-full min-w-0 rounded-lg border border-stone bg-white px-4 py-3 font-sans text-sm text-charcoal placeholder:text-charcoal-subtle transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {/* Remember Identity */}
            <div className="flex items-start gap-3">
              <input
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#BE755F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                id="remember"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />

              <label
                className="cursor-pointer select-none text-xs leading-5 text-charcoal-muted"
                htmlFor="remember"
              >
                Remember terminal identity
              </label>
            </div>

            {/* Submit Button */}
            <button
              className="sow-submit-btn flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#1E242B] bg-[#1E242B] px-5 py-3 font-sans text-sm font-semibold text-white transition-colors duration-200 hover:border-[#303943] hover:bg-[#303943] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              <span className="whitespace-nowrap">
                {loading ? "Verifying credentials..." : "Sign in"}
              </span>

              {!loading && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}