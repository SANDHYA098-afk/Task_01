"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ── Types ─────────────────────────────────────────────── */
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  typing?: boolean;
  confidence?: number;
}

/* ── Typing response (character-by-character) ──────────── */
function TypingResponse({ text, onDone }: { text: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
        onDone();
      }
    }, 18);
    return () => clearInterval(iv);
  }, [text, onDone]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="typing-cursor" />}
    </span>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
export default function ChatPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /* ── Auth guard & initial data ───────────────────────── */
  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    // Apply saved theme
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // Welcome message
    setMessages([
      {
        id: "welcome",
        text: "Hello! Welcome to NEURO COPILOT. How can I assist you today? I'm here to help you with any questions about our platform.",
        sender: "bot",
      },
    ]);

    // Fetch suggestions
    fetchSuggestions();
  }, [router]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("https://sandytech-neurocopilot-backend.hf.space/suggestions?n=20");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setSuggestions(data.questions);
      } else {
        throw new Error("Empty or invalid format");
      }
    } catch (err) {
      console.error("Suggestions fetch error:", err);
      setSuggestions([
        "What is this platform?",
        "How does the AI assistant work?",
        "What is RAG?",
        "How do I get started?",
        "What features are available?",
        "Is my data secure?",
        "What technologies power this system?",
        "How accurate are the responses?",
      ]);
    }
  };

  /* ── Auto-scroll ─────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingId]);

  /* ── Send message ────────────────────────────────────── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://sandytech-neurocopilot-backend.hf.space/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      const botId = (Date.now() + 1).toString();
      const botMsg: Message = { id: botId, text: data.response, sender: "bot", typing: true, confidence: data.confidence };
      setMessages((prev) => [...prev, botMsg]);
      setTypingId(botId);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I could not connect to the server. Please ensure the backend is running.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (q: string) => {
    sendMessage(q);
    inputRef.current?.focus();
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* ═══ Navbar ═══ */}
      <nav className="navbar">
        <div className="navbar-logo">
          <span style={{ fontSize: 20 }}>⚡</span>
          NEURO COPILOT
        </div>

        <div className="navbar-links hidden md:flex">
          <button className="navbar-link" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="navbar-link" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setSidebarOpen(true)}
          style={{ background: "none", border: "none", color: "var(--fg)", fontSize: 22, cursor: "pointer" }}
        >
          ☰
        </button>
      </nav>

      {/* ═══ Mobile Sidebar ═══ */}
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            ⚡ NEURO COPILOT
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{user.email}</div>
        </div>

        <button className="sidebar-item" onClick={toggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"} Toggle Theme
        </button>
        <div style={{ flex: 1 }} />
        <button className="sidebar-item" onClick={handleLogout} style={{ color: "#f87171" }}>
          🚪 Logout
        </button>
      </div>

      {/* ═══ Main Chat Area ═══ */}
      <div style={{ display: "flex", flex: 1, marginTop: 60 }}>
        {/* Chat column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, overflowY: "auto" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                <div className={`chat-bubble ${msg.sender}`}>
                  {msg.typing && msg.id === typingId ? (
                    <TypingResponse
                      text={msg.text}
                      onDone={() => {
                        setTypingId(null);
                        setMessages((prev) =>
                          prev.map((m) => (m.id === msg.id ? { ...m, typing: false } : m))
                        );
                      }}
                    />
                  ) : (
                    msg.text
                  )}
                </div>
                {msg.sender === "bot" && msg.confidence !== undefined && msg.id !== "welcome" && !msg.typing && (
                  <div
                    style={{
                      fontSize: 11,
                      color: msg.confidence >= 50 ? "var(--accent)" : "#f59e0b",
                      marginTop: 4,
                      marginLeft: 4,
                      opacity: 0.8,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Confidence: {msg.confidence.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="chat-bubble bot" style={{ display: "flex", gap: 6, padding: "14px 20px" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      opacity: 0.6,
                      animation: `float 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <form onSubmit={handleSubmit} className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="chat-input"
              placeholder="Type your message..."
              disabled={loading || typingId !== null}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || loading || typingId !== null}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>

        {/* ═══ Suggestions Panel (desktop) ═══ */}
        <div className="suggestions-panel hidden md:flex" style={{ flexDirection: "column" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--accent)",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>💡</span>
            Suggested Questions
          </div>
          {suggestions.map((q, i) => (
            <button key={i} className="suggestion-chip" onClick={() => handleSuggestionClick(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
