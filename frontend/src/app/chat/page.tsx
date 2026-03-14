"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Typing animation for AI responses
function TypingResponse({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    setIsComplete(false);
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▊</span>}
    </span>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ type: "user" | "ai"; text: string; id: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push("/login");
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDark(false);
    }

    // Fetch suggested questions
    fetchSuggestedQuestions();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSuggestedQuestions = async () => {
    try {
      const response = await fetch("http://localhost:8000/suggestions");
      const data = await response.json();
      setSuggestedQuestions(data.questions || []);
    } catch {
      setSuggestedQuestions([
        "What is this platform?",
        "How does the AI assistant work?",
        "What is RAG?",
        "How do I get started?",
        "What features are available?",
        "Is my data secure?",
        "What technologies power this system?",
        "How accurate are the responses?",
        "Can I integrate this with my app?",
        "What is LangChain?",
        "How does the chatbot work?",
        "What is FAISS?",
        "How do I contact support?",
        "What are the system requirements?",
        "Is there a free tier?"
      ]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const sendMessage = async (msg: string) => {
    if (!msg.trim()) return;

    const messageId = Date.now();
    setMessages((prev) => [...prev, { type: "user", text: msg, id: messageId }]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: msg }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: data.response || "Sorry, I couldn't process that.", id: messageId + 1 },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "Sorry, I couldn't connect to the server.", id: messageId + 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(message);
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        <div className={`${isDark ? 'text-green-400' : 'text-green-600'} animate-pulse`}>Loading...</div>
      </div>
    );
  }

  const bgColor = isDark ? 'bg-black' : 'bg-gray-50';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'rgba(24, 24, 27, 0.6)' : 'rgba(255, 255, 255, 0.8)';
  const borderColor = isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)';
  const accentColor = isDark ? 'text-green-400' : 'text-green-600';
  const secondaryText = isDark ? 'text-zinc-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-zinc-800/50' : 'bg-white';
  const inputBorder = isDark ? 'border-zinc-700' : 'border-gray-300';
  const messageBg = isDark ? 'bg-zinc-800' : 'bg-gray-200';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} flex flex-col transition-colors duration-300`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-br from-green-500/5' : 'bg-gradient-to-br from-green-500/10'}`} />
        <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-tl from-emerald-500/5' : 'bg-gradient-to-tl from-emerald-500/10'}`} />
      </div>

      {/* Navbar */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: isDark ? "rgba(9, 9, 11, 0.8)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: borderColor,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Menu Icon */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
          >
            <svg className={`w-6 h-6 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className={`text-xl font-bold ${textColor}`}>SupportAI</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className={`px-4 py-2 rounded-xl transition-colors text-sm ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 rounded-xl transition-colors text-sm ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Drawer */}
      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setMenuOpen(false)}
          />
          <div 
            className={`fixed top-0 left-0 h-full w-72 z-50 p-6 ${isDark ? 'bg-zinc-900' : 'bg-white'} border-r`}
            style={{ borderColor: borderColor }}
          >
            <div className="flex items-center justify-between mb-8">
              <span className={`text-xl font-bold ${textColor}`}>Menu</span>
              <button 
                onClick={() => setMenuOpen(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
              >
                <svg className={`w-5 h-5 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => { setMenuOpen(false); router.push("/home"); }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
              >
                <span className={textColor}>About Us</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
              >
                <span className={textColor}>Q&A</span>
              </button>
              
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
              >
                <span className={textColor}>Theme</span>
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <>
                      <span className="text-xs text-zinc-500">Dark</span>
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500">Light</span>
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* User Profile at Bottom */}
            <div className="absolute bottom-6 left-6 right-6">
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className={`font-medium ${textColor}`}>{user.name}</div>
                  <div className={`text-xs ${secondaryText}`}>{user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 pt-20 flex relative">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className={`text-center mt-20 ${secondaryText}`}>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-green-500/10' : 'bg-green-100'}`}>
                  <svg className={`w-8 h-8 ${accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-lg">Start a conversation with the AI assistant</p>
                <p className="text-sm mt-2">Type a message or click a suggested question</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] px-5 py-3 rounded-2xl ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-md"
                      : `${messageBg} ${textColor} rounded-bl-md`
                  }`}
                >
                  {msg.type === "ai" ? (
                    <TypingResponse text={msg.text} speed={15} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fadeIn">
                <div className={`${messageBg} px-5 py-3 rounded-2xl rounded-bl-md`}>
                  <div className="flex gap-1">
                    <span className={`w-2 h-2 rounded-full animate-bounce ${accentColor}`} style={{ animationDelay: "0ms" }} />
                    <span className={`w-2 h-2 rounded-full animate-bounce ${accentColor}`} style={{ animationDelay: "150ms" }} />
                    <span className={`w-2 h-2 rounded-full animate-bounce ${accentColor}`} style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-6 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className={`flex-1 px-5 py-4 rounded-xl border ${inputBg} ${textColor} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-300`}
                style={{ borderColor: isDark ? '#3f3f46' : '#d1d5db' }}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Suggested Questions Sidebar */}
        <div className={`hidden lg:block w-80 border-l p-6 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/50 border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Suggested Questions</h3>
          <div className="space-y-2">
            {suggestedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => setMessage(q)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-green-500/30' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-green-500/30'}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Suggested Questions */}
      <div className={`lg:hidden border-t p-4 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/50 border-gray-200'}`}>
        <h3 className={`text-sm font-semibold mb-3 ${secondaryText}`}>Suggested Questions</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {suggestedQuestions.slice(0, 8).map((q, index) => (
            <button
              key={index}
              onClick={() => setMessage(q)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-200'}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Fade in animation style */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
