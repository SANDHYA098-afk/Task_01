"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Typing animation component
function TypingText({ text, speed = 100, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let index = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started]);

  return (
    <span>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/home");
      } else {
        setError(data.detail || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/home");
      } else {
        setError(data.detail || "Signup failed. Please try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Unable to connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const switchToSignup = () => {
    setIsSignup(true);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  const switchToLogin = () => {
    setIsSignup(false);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-green-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-emerald-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full h-screen relative" ref={containerRef}>

        {/* Slant Divider */}
        <div
          className={`absolute top-0 bottom-0 w-[200px] z-20 transition-all duration-700 ease-in-out ${isSignup ? "left-[calc(50%-100px)]" : "left-[calc(50%-100px)]"
            }`}
          style={{
            transform: "skewX(-12deg)",
            background: "linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.3), transparent)",
          }}
        />

        {/* Login View - Message Left, Card Right */}
        <div
          className={`absolute inset-0 flex transition-all duration-700 ease-in-out ${isSignup
            ? "opacity-0 pointer-events-none translate-x-[-20px]"
            : "opacity-100 translate-x-0"
            }`}
        >
          {/* Left Side - Welcome Message */}
          <div className="w-1/2 flex items-center justify-center relative">
            <div className="text-center px-12 z-10">
              <div className="mb-[155px]">
                <h1 className="text-5xl font-bold text-white mb-[15px]">
                <TypingText text="Welcome Back To" speed={80} delay={300} />
              </h1>
                <div className="inline-block px-4 py-2  text-green-400 text-[60px] font-bold font-mono animate-rainbow bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  NEURO COPILOT 
                </div>
              </div>
              <p className="text-xl text-zinc-400 max-w-md mx-auto mt-4 leading-relaxed text-[20px] font-mono">
                Sign in to continue to your AI Support Assistant and get instant answers to your questions.
              </p>
              <div className="pt-5 flex items-center justify-center gap-[15px]">
                
              </div>
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div className="w-1/2 h-full flex items-center justify-center bg-zinc-950/50 relative">
            <div
              className={`w-full max-w-md px-8 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              {/* Glass morphism card */}
              <div
                className="glass p-8 h-[500px] w-[400px] shadow-2xl border-2 border-white/60 animate-card"
              >
                <div className="text-center mb-6">
                  <br />
                  <h2 className="text-3xl font-bold text-white mb-2 font-mono p-4 mt-4">Login</h2>
                  <p className="p-4"> </p>
                  <p className="text-zinc-500 p-4">Enter your credentials to continue</p>
                  <br />
                </div>

                {error && (
                  <div className="mb-6 p-4 space-y-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4 px-4">
                  <div>
                    <label className="block text-center text-sm text-[20px] font-medium text-zinc-400 mb-2 font-mono">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-4 py-3.5 my-[10px]  border border-zinc bg-zinc text-white placeholder-zinc-500 outline-none transition-all duration-300"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-center text-sm font-medium text-zinc-400 mb-2 text-[20px] font-mono">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="px-4 py-3.5 my-[10px]  border border-zinc bg-zinc text-white placeholder-zinc-500 outline-none transition-all duration-300"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <div className="flex justify-center font-mono text-[25px]">
                    <button
                      type="submit"
                      disabled={loading}
                      className="login-btn text-center"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        "Login"
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <br />
                  <p className="text-zinc-500 text-[20px]">
                    Don&apos;t have an account?{" "}
                    <button
                      onClick={switchToSignup}
                      className="text-green-400 font-mono text-[20px] font-semibold hover:text-green-300 transition-colors"
                    >
                      Signup 
                    </button>
                    <br />
                     </p>
              
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signup View - Card Left, Message Right */}
        <div
          className={`absolute inset-0 flex transition-all duration-700 ease-in-out ${isSignup
            ? "opacity-100 translate-x-0"
            : "opacity-0 pointer-events-none translate-x-[20px]"
            }`}
        >
          {/* Left Side - Signup Card */}
          <div className="w-1/2 flex items-center justify-center bg-zinc-950/50 relative">
            <div
              className={`w-full max-w-md px-8 transition-all duration-500 ${mounted && isSignup ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              {/* Glass morphism card */}
              <div
                className="glass p-8 h-[500px] w-[400px] shadow-2xl border border-white/10 animate-card"
              >
                <div className="text-center mb-6">
                  <br />
                  <h2 className="text-3xl font-bold text-white mb-2 font-mono">Create Account</h2>
                  <p className="text-zinc-500">Join us and get started today</p>
                  <br />
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-center text-sm font-medium text-zinc-400 mb-2 text-[20px] font-mono">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-300"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-center text-sm font-medium text-zinc-400 mb-2 text-[20px] font-mono">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-300"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-center text-sm font-medium text-zinc-400 mb-2 text-[20px] font-mono">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-300"
                      placeholder="Create a password"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-center font-mono text-[25px]">
                    <button
                      type="submit"
                      disabled={loading}
                      className="login-btn"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-zinc-500 text-[20px]">
                    Already have an account?{" "}
                    <button
                      onClick={switchToLogin}
                      className="text-green-400 text-[20px] font-semibold hover:text-green-300 transition-colors"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Signup Message */}
          <div className="w-1/2 flex items-center justify-center relative">
            <div className="text-center px-12 z-10">
              <h1 className="text-5xl font-bold text-white mb-[15px]">
                <TypingText key={isSignup ? "signup" : "login"} text="Join Us Today" speed={80} delay={300} />
              </h1>

              <br />
              <div className="mb-[15px]">
                <span className="inline-block w-[220px] h-[25px] px-4 py-2 rounded-full font-mono bg-green-500/20 border border-green-500/30 text-green-400 text-[15px] font-medium">
                  🚀 Get Started Free
                </span>
              </div>
              <br />
    
              <p className="text-xl text-zinc-400 font-mono text-[20px] max-w-md mx-auto leading-relaxed">
                Create an account to unlock the power of AI-driven support and get instant answers.
              </p>
              
              <br />
              
              <div className="mt-[15px] grid grid-cols-3 gap-[20px] max-w-sm mx-auto">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="text-2xl font-bold text-green-400">24/7</div>
                  <div className="text-xs text-zinc-500">Support</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="text-2xl font-bold text-green-400">Fast</div>
                  <div className="text-xs text-zinc-500">Responses</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="text-2xl font-bold text-green-400">Free</div>
                  <div className="text-xs text-zinc-500">Forever</div>
                </div>
               
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full min-h-screen bg-zinc-950 relative">
        {/* Animated background for mobile */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        </div>

        {/* Message at Top */}
        <div className="relative py-12 px-6">
          <div className="text-center">
            <div className="mb-4">
              <span className="inline-block px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium">
                
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              <TypingText text={isSignup ? "Join Us Today" : "Welcome Back To"} speed={60} delay={200} />
            </h1>
            <div className="inline-block px-3 py-1 text-green-400 text-[32px] font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-3">
              NEURO COPILOT
            </div>
            <p className="text-zinc-400">
              {isSignup
                ? "Create an account to get started"
                : "Sign in to continue to your AI Assistant"}
            </p>
          </div>
        </div>

        {/* Login/Signup Card Below */}
        <div className="px-6 pb-8 relative">
          <div
            className="glass p-6 shadow-2xl border border-white/10 animate-card"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {isSignup ? "Create Account" : "Login"}
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {isSignup ? (
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    placeholder="Create a password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
                >
                  {loading ? "Signing in..." : "Login"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-zinc-500">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError("");
                    setName("");
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-green-400 font-semibold hover:text-green-300 transition-colors"
                >
                  {isSignup ? "Login" : "Signup"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
