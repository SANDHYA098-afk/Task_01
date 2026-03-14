"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Typing animation component
function TypingText({ text, speed = 50, delay = 0 }: { text: string; speed?: number; delay?: number }) {
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
      <span className="animate-pulse opacity-70">|</span>
    </span>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push("/login");
    }
    
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDark(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
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

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-br from-green-500/5' : 'bg-gradient-to-br from-green-500/10'}`} />
        <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-tl from-emerald-500/5' : 'bg-gradient-to-tl from-emerald-500/10'}`} />
      </div>

      {/* Navbar - Fixed at top */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: isDark ? "rgba(9, 9, 11, 0.95)" : "rgba(255, 255, 255, 0.95)",
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

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push("/home")} className={`${secondaryText} hover:${accentColor} transition-colors font-medium`}>Home</button>
            <button className={`${secondaryText} hover:${accentColor} transition-colors font-medium`}>About Us</button>
            <button onClick={() => router.push("/chat")} className={`${secondaryText} hover:${accentColor} transition-colors font-medium`}>Q&A</button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <span className={`${secondaryText} text-sm hidden sm:block`}>
              Welcome, <span className={accentColor}>{user.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 rounded-xl transition-colors text-sm font-medium ${isDark ? 'text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700' : 'text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300'}`}
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
            className={`fixed top-0 left-0 h-full w-72 z-50 p-6 transition-transform duration-300 ${isDark ? 'bg-zinc-900' : 'bg-white'} border-r`}
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
                onClick={() => { setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
              >
                <span className={textColor}>About Us</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); router.push("/chat"); }}
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

      {/* Hero Section - Static, below navbar */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6 ${isDark ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-green-100 border border-green-200 text-green-600'}`}
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-400' : 'bg-green-500'}`} />
            AI-Powered Support Assistant
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {mounted ? (
              <TypingText text="How can I help you today?" speed={50} delay={300} />
            ) : (
              "How can I help you today?"
            )}
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto ${secondaryText} mb-8`}>
            Your intelligent support assistant powered by RAG technology. Get instant answers from our documentation.
          </p>
          <button
            onClick={() => router.push("/chat")}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Start Chatting
          </button>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              { 
                icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", 
                title: "Smart Q&A", 
                desc: "Ask any question and get instant, accurate answers from our knowledge base." 
              },
              { 
                icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", 
                title: "RAG Technology", 
                desc: "Powered by Retrieval-Augmented Generation for accurate, contextual responses." 
              },
              { 
                icon: "M13 10V3L4 14h7v7l9-11h-7z", 
                title: "Lightning Fast", 
                desc: "Get responses in under 2 seconds with our optimized FAISS vector search." 
              }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 cursor-pointer group transition-all duration-300 hover:scale-105"
                style={{
                  background: cardBg,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDark ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-green-100 group-hover:bg-green-200'}`}>
                  <svg className={`w-7 h-7 ${accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${textColor}`}>{item.title}</h3>
                <p className={`${secondaryText}`}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* About Section */}
          <div className="mb-16">
            <div
              className="rounded-2xl p-8"
              style={{
                background: cardBg,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${borderColor}`,
              }}
            >
              <h3 className={`text-2xl font-bold mb-4 ${textColor}`}>About This Platform</h3>
              <p className={`${secondaryText} mb-4 leading-relaxed`}>
                SupportAI is an AI-powered support assistant built for the NeuroStack Generative AI Internship Hackathon. 
                It uses cutting-edge RAG (Retrieval-Augmented Generation) technology to provide accurate, contextual answers 
                from our documentation.
              </p>
              <p className={`${secondaryText} leading-relaxed`}>
                The system is built with Next.js for the frontend, FastAPI for the backend, LangChain for AI orchestration, 
                FAISS for vector similarity search, and HuggingFace embeddings for semantic understanding.
              </p>
            </div>
          </div>

          {/* Q&A CTA Button */}
          <div className="text-center mb-16">
            <button
              onClick={() => router.push("/chat")}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Open Q&A Chat
            </button>
            <p className={`mt-4 ${secondaryText}`}>
              Click to start chatting with our AI assistant
            </p>
          </div>

          {/* User Profile Card */}
          <div className="max-w-md mx-auto">
            <div
              className="rounded-2xl p-6"
              style={{
                background: cardBg,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${borderColor}`,
              }}
            >
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textColor}`}>
                <svg className={`w-5 h-5 ${accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Profile
              </h3>
              <div className="space-y-3">
                <div className={`flex justify-between items-center py-2 ${isDark ? 'border-b border-zinc-800' : 'border-b border-gray-200'}`}>
                  <span className={secondaryText}>Name</span>
                  <span className={`font-medium ${textColor}`}>{user.name}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={secondaryText}>Email</span>
                  <span className={`font-medium ${textColor}`}>{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
