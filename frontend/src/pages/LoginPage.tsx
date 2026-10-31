import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setStoredSessionToken } from "../lib/api";
import { BrandLogo } from "../components/BrandLogo";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api<{
        user: { role: string };
        token?: string;
        accessToken?: string;
        refreshToken?: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const token = result.accessToken || result.token;
      if (token) {
        setStoredSessionToken(token, result.refreshToken);
      }

      const target =
        result.user.role === "SUPER_ADMIN"
          ? "/super-admin"
          : result.user.role === "REGIONAL_ADMIN"
            ? "/regional-admin"
            : result.user.role === "SCIENCE_COMMUNICATOR"
              ? "/instructor"
              : "/driver";

      navigate(target, { replace: true });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand-header">
          <BrandLogo className="login-logo" />
          <div className="login-brand-text">
            <h1 className="login-app-name">Science on Wheels</h1>
            <span className="login-badge">Company Operations Portal</span>
          </div>
        </div>
        <h2 id="login-title">Sign in to your account</h2>
        <p>Enter your employee credentials to access your designated workspace.</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </label>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : <>Sign in <span aria-hidden="true">→</span></>}
          </button>
        </form>
      </section>
    </main>
  );
}
