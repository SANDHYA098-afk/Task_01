"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── Typing animation component ──────────────────────── */
function TypingText({ text, speed = 80, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, started]);

  return (
    <span>
      {displayed}
      <span className="typing-cursor" />
    </span>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // If already logged in, redirect
    const user = sessionStorage.getItem("user");
    if (user) router.replace("/chat");
  }, [router]);

  /* ── Auth helpers ──────────────────────────────────── */
  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("user", JSON.stringify(data.user));
        router.push("/chat");
      } else {
        setError(data.detail || "Login failed. Please try again.");
      }
    } catch {
      setError("Unable to connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("user", JSON.stringify(data.user));
        router.push("/chat");
      } else {
        setError(data.detail || "Signup failed. Please try again.");
      }
    } catch {
      setError("Unable to connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (toSignup: boolean) => {
    setIsSignup(toSignup);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  /* ── Spinner ────────────────────────────────────────── */
  const Spinner = () => (
    <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity={0.25} />
      <path
        fill="currentColor"
        opacity={0.75}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (!mounted) return null;

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            top: -200,
            left: -150,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            bottom: -180,
            right: -120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* ═══════════ DESKTOP ═══════════ */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100vh",
          position: "relative",
          zIndex: 1,
        }}
        className="hidden md:flex"
      >
        {/* Centre glowing divider */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 2,
            zIndex: 10,
            background:
              "linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.5) 30%, rgba(34,197,94,0.7) 50%, rgba(34,197,94,0.5) 70%, transparent 100%)",
            boxShadow: "0 0 20px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)",
          }}
        />

        {/* ── Login view: greeting LEFT, card RIGHT ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: isSignup ? 0 : 1,
            transform: isSignup ? "translateX(-30px)" : "translateX(0)",
            pointerEvents: isSignup ? "none" : "auto",
          }}
        >
          {/* Left – greeting */}
          <div style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "0 48px", maxWidth: 500 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: 9999,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "var(--accent-light)",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 24,
                }}
              >
                ✨ AI-Powered Support
              </span>
              <h1 style={{ fontSize: "3rem", fontWeight: 800, color: "var(--fg)", marginBottom: 16, lineHeight: 1.15 }}>
                <TypingText text="Welcome Back" speed={80} delay={300} />
              </h1>
              <p style={{ fontSize: "1.1rem", color: "var(--fg-muted)", lineHeight: 1.7 }}>
                Sign in to continue to your AI Support Assistant and get instant answers to your questions.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 32 }}>
                {["⚡", "🛡️", "💬"].map((icon, i) => (
                  <div
                    key={i}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right – login card */}
          <div
            style={{
              width: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <FormCard
              mode="login"
              mounted={mounted}
              error={error}
              email={email}
              password={password}
              name={name}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onNameChange={setName}
              onSubmit={handleLogin}
              onSwitch={() => switchMode(true)}
              Spinner={Spinner}
            />
          </div>
        </div>

        {/* ── Signup view: card LEFT, greeting RIGHT ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: isSignup ? 1 : 0,
            transform: isSignup ? "translateX(0)" : "translateX(30px)",
            pointerEvents: isSignup ? "auto" : "none",
          }}
        >
          {/* Left – signup card */}
          <div
            style={{
              width: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <FormCard
              mode="signup"
              mounted={mounted && isSignup}
              error={error}
              email={email}
              password={password}
              name={name}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onNameChange={setName}
              onSubmit={handleSignup}
              onSwitch={() => switchMode(false)}
              Spinner={Spinner}
            />
          </div>

          {/* Right – greeting */}
          <div style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "0 48px", maxWidth: 500 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: 9999,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "var(--accent-light)",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 24,
                }}
              >
                🚀 Get Started Free
              </span>
              <h1 style={{ fontSize: "3rem", fontWeight: 800, color: "var(--fg)", marginBottom: 16, lineHeight: 1.15 }}>
                <TypingText text="Join Us Today" speed={80} delay={300} />
              </h1>
              <p style={{ fontSize: "1.1rem", color: "var(--fg-muted)", lineHeight: 1.7 }}>
                Create an account to unlock the power of AI‑driven support and get instant answers.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 32 }}>
                {[
                  { val: "24/7", label: "Support" },
                  { val: "Fast", label: "Responses" },
                  { val: "Free", label: "Forever" },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 14,
                      padding: "14px 20px",
                      textAlign: "center",
                      minWidth: 90,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-light)" }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE ═══════════ */}
      <div className="md:hidden" style={{ position: "relative", zIndex: 1, minHeight: "100vh", padding: "60px 20px 40px" }}>
        {/* Greeting */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span
            style={{
              display: "inline-block",
              padding: "8px 20px",
              borderRadius: 9999,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "var(--accent-light)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {isSignup ? "🚀 Get Started Free" : "✨ AI-Powered Support"}
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--fg)", marginBottom: 12 }}>
            <TypingText text={isSignup ? "Join Us Today" : "Welcome Back"} speed={60} delay={200} />
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
            {isSignup ? "Create an account to get started" : "Sign in to continue to your AI Assistant"}
          </p>
        </div>

        {/* Card */}
        <FormCard
          mode={isSignup ? "signup" : "login"}
          mounted={mounted}
          error={error}
          email={email}
          password={password}
          name={name}
          loading={loading}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onNameChange={setName}
          onSubmit={isSignup ? handleSignup : handleLogin}
          onSwitch={() => switchMode(!isSignup)}
          Spinner={Spinner}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Shared FormCard component
   ═══════════════════════════════════════════════════════════ */
interface FormCardProps {
  mode: "login" | "signup";
  mounted: boolean;
  error: string;
  email: string;
  password: string;
  name: string;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitch: () => void;
  Spinner: React.FC;
}

function FormCard({
  mode,
  mounted,
  error,
  email,
  password,
  name,
  loading,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit,
  onSwitch,
  Spinner,
}: FormCardProps) {
  const isSignup = mode === "signup";

  return (
    <div
      className="glass animate-card-pop"
      style={{
        width: "100%",
        maxWidth: 440,
        padding: "40px 36px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s, transform 0.5s",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
          {isSignup ? "Create Account" : "Login"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--fg-muted)" }}>
          {isSignup ? "Join us and get started today" : "Enter your credentials to continue"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: 20,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12,
            color: "#f87171",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {isSignup && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 8 }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="input-field"
              placeholder="Your full name"
              required
            />
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 8 }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="input-field"
            placeholder={isSignup ? "Create a password" : "••••••••"}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", height: 50, marginTop: 4 }}>
          {loading ? (
            <>
              <Spinner /> {isSignup ? "Creating account…" : "Signing in…"}
            </>
          ) : isSignup ? (
            "Create Account"
          ) : (
            "Login"
          )}
        </button>
      </form>

      {/* Switch */}
      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--fg-muted)" }}>
        {isSignup ? "Already have an account?" : "Don\u2019t have an account?"}{" "}
        <button
          onClick={onSwitch}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent-light)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
          }}
        >
          {isSignup ? "Login" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
