
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      // Adjust these names if your backend returns a different schema.
      const token = data.access_token || data.token;
      const user = data.user || data;

      if (!token) {
        throw new Error("The server did not return an access token.");
      }

      sessionStorage.setItem("edupulse_access_token", token);
      sessionStorage.setItem("edupulse_user", JSON.stringify(user));
      

      const role = String(user.role || "").toLowerCase();

if (["student", "faculty", "admin"].includes(role)) {
  navigate("/dashboard", { replace: true });
} else {
  sessionStorage.removeItem("edupulse_access_token");
  sessionStorage.removeItem("edupulse_user");
  setError("Login succeeded, but the account role is not recognized.");
}
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : err.message === "Network Error"
            ? "Cannot reach the backend. Check that it is running on port 8001."
            : "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <div className="login-brand-icon">
            <GraduationCap size={28} />
          </div>
          <span>EduPulse <strong>AI</strong></span>
        </div>

        <div className="login-brand-content">
          <span className="login-overline">
            SMARTER LEARNING, BETTER OUTCOMES
          </span>
          <h1>Every student deserves a clearer path to success.</h1>
          <p>
            Understand learning gaps, plan targeted support, and help every
            student move forward.
          </p>

          <div className="login-feature-list">
            <div>
              <ShieldCheck size={19} />
              <span>Data-informed student support</span>
            </div>
            <div>
              <GraduationCap size={19} />
              <span>Personalized learning recovery</span>
            </div>
          </div>
        </div>

        <p className="login-brand-footer">
          Intelligent insights for educators.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <GraduationCap size={25} />
            <span>EduPulse <strong>AI</strong></span>
          </div>

          <div className="login-welcome">
            <span className="login-overline">EDUPULSE AI PORTAL</span>
            <h2>Welcome back</h2>
            <p>Enter your details to continue to your dashboard.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-wrapper">
              <Mail size={18} />
              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrapper">
              <LockKeyhole size={18} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="login-submit-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue to Dashboard"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="login-security-note">
            <ShieldCheck size={16} />
            Secure sign-in through EduPulse AI backend.
          </p>

          <p className="login-copyright">
            © 2026 EduPulse AI · Learning intelligence platform
          </p>
        </div>
      </section>
    </main>
  );
}
