"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Hook for scroll-triggered animations (triggers every time)
function useScrollAnimation(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
}

// Scroll-animated section header component
function ScrollSectionHeader({ isDark }: { isDark: boolean }) {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div 
      ref={ref}
      className={`section-header ${isVisible ? 'section-header-visible' : 'section-header-hidden'}`}
    >
      <h2 className="section-title" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
        Discover Our <span style={{ color: '#22c55e' }}>Features</span>
      </h2>
      <br />
      <br />
      <p className="section-description" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
        Explore the powerful capabilities that make NEURO COPILOT your perfect AI assistant
      </p>
    </div>
  );
}

// Scroll-animated feature card component
function ScrollFeatureGrid({ isDark, cardBg, borderColor }: { isDark: boolean; cardBg: string; borderColor: string }) {
  const features = [
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
  ];

  return (
    <div className="feature-grid">
      {features.map((item, index) => (
        <div
          key={index}
          className="feature-card"
          style={{
            background: cardBg,
            fontFamily: "monospace",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <div 
            className="feature-icon-wrapper"
            style={{ background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)' }}
          >
            <svg width="28" height="28" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
          </div>
          <h3 className="feature-title" style={{ color: isDark ? '#fafafa' : '#18181b' }}>{item.title}</h3>
          <p className="feature-description" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

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
    <div className={`min-h-screen overflow-y-auto ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-br from-green-500/5' : 'bg-gradient-to-br from-green-500/10'}`} />
        <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl ${isDark ? 'bg-gradient-to-tl from-emerald-500/5' : 'bg-gradient-to-tl from-emerald-500/10'}`} />
      </div>

      {/* Navbar - Fixed at top */}
      <nav 
        className="home-navbar"
        style={{
          background: isDark ? "rgba(9, 9, 11, 0.95)" : "rgba(255, 255, 255, 0.95)",
          borderColor: borderColor,
        }}
      >
        <div className="navbar-container">
          {/* Menu Icon */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="navbar-menu-btn"
            style={{ color: isDark ? '#e4e4e7' : '#18181b' }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="navbar-logo">
            <div className="navbar-logo-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="navbar-logo-text" style={{ color: isDark ? '#fafafa' : '#18181b' }}>NEURO COPILOT</span>
          </div>

          {/* Navigation Links */}
          <div className="navbar-links">
            <button 
              onClick={() => { window.scrollTo(0, 0); window.location.reload(); }} 
              className="navbar-link" 
              style={{ color: isDark ? '#a1a1aa' : '#71717a' }}
            >
              Home
            </button>
            <button 
              onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="navbar-link" 
              style={{ color: isDark ? '#a1a1aa' : '#71717a' }}
            >
              About Us
            </button>
            <button 
              onClick={() => router.push("/chat")} 
              className="navbar-link" 
              style={{ color: isDark ? '#a1a1aa' : '#71717a' }}
            >
              Q&A
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Drawer */}
      {menuOpen && (
        <>
          <div 
            className="menu-drawer-overlay"
            onClick={() => setMenuOpen(false)}
          />
          <div 
            className="menu-drawer"
            style={{ 
              background: isDark ? '#18181b' : '#ffffff',
              borderColor: borderColor 
            }}
          >
            <div className="menu-drawer-header">
              <span className="menu-drawer-title" style={{ color: isDark ? '#fafafa' : '#18181b' }}>Menu</span>
              <button 
                onClick={() => setMenuOpen(false)}
                className="menu-drawer-close"
                style={{ color: isDark ? '#e4e4e7' : '#18181b' }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="menu-drawer-items">
              <button 
                onClick={() => { setMenuOpen(false); document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="menu-drawer-item"
                style={{ color: isDark ? '#fafafa' : '#18181b' }}
              >
                About Us
              </button>
              <button 
                onClick={() => { setMenuOpen(false); router.push("/chat"); }}
                className="menu-drawer-item"
                style={{ color: isDark ? '#fafafa' : '#18181b' }}
              >
                Q&A
              </button>
              <button 
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="menu-drawer-item menu-drawer-item-logout"
                style={{ color: isDark ? '#fafafa' : '#18181b' }}
              >
                Logout
              </button>
              
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="menu-drawer-item"
                style={{ color: isDark ? '#fafafa' : '#18181b' }}
              >
                <span>Theme</span>
                <div className="menu-drawer-theme-icon">
                  {isDark ? (
                    <>
                      <span style={{ fontSize: '12px', color: '#71717a' }}>Dark</span>
                      <svg width="20" height="20" fill="currentColor" style={{ color: '#facc15' }} viewBox="0 0 24 24">
                        <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '12px', color: '#71717a' }}>Light</span>
                      <svg width="20" height="20" fill="currentColor" style={{ color: '#eab308' }} viewBox="0 0 24 24">
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* User Profile at Bottom */}
            <div className="menu-drawer-profile">
              <div 
                className="menu-drawer-profile-card"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div className="menu-drawer-profile-avatar">
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="menu-drawer-profile-name" style={{ color: isDark ? '#fafafa' : '#18181b' }}>{user.name}</div>
                  <div className="menu-drawer-profile-email" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>{user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <br />
          {/* User Greeting Badge */}
          <div 
            className="hero-badge"
            style={{
              background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#dcfce7',
              border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0'}`,
              color: isDark ? '#4ade80' : '#16a34a'
            }}
          >
            <span className="hero-badge-dot" style={{ background: isDark ? '#4ade80' : '#22c55e' }} />
            <span style={{ color: isDark ? '#a1a1aa' : '#71717a', fontFamily: 'monospace' }}>
              Hi <span style={{ color: '#22c55e' }}>{user.name}</span>, welcome back!
            </span>
            <span className="hero-badge-dot" style={{ background: isDark ? '#4ade80' : '#22c55e' }} />
          </div>
          
          <br />
          

          <h1 className="hero-title" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
            {mounted ? (
              <TypingText text="NEURO COPILOT is here to help!" speed={40} delay={300} />
            ) : (
              "NEURO COPILOT is here to help!"
            )}
          </h1>
          <br />
          

          <p className="hero-description" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
            Your intelligent support assistant powered by RAG technology. Get instant answers from our documentation.
          </p>

{/* Scroll Down Indicator - Centered between sections */}
      <div className="page-scroll-indicator">
        <span className="hero-scroll-text" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>Scroll to explore</span>
        <svg width="24" height="24" fill="none" stroke="currentColor" style={{ color: '#22c55e' }} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>


          
        </div>

        
      </section>

      
      {/* Main Content */}
      <main className="main-content">
        <div className="main-container">
          {/* Section Header */}
          <ScrollSectionHeader isDark={isDark} />

          <br />
          <br />

          {/* Feature Cards */}
          <ScrollFeatureGrid isDark={isDark} cardBg={cardBg} borderColor={borderColor} />
          
          <br />
          <br />

          {/* About Section */}
          <div id="about-section" className="about-section font-mono">
            <div
              className="about-card"
              style={{
                background: cardBg,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${borderColor}`,
              }}
            >
              
              <h3 className="about-title" style={{ color: isDark ? '#fafafa' : '#18181b' }}>About This Platform</h3>
              <p className="about-text" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                NEURO COPILOT is an AI-powered support assistant. 
                It uses cutting-edge RAG (Retrieval-Augmented Generation) technology to provide accurate, contextual answers 
                from our documentation.
              </p>
              <p className="about-text" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                The system is built with Next.js for the frontend, FastAPI for the backend, LangChain for AI orchestration, 
                FAISS for vector similarity search, and HuggingFace embeddings for semantic understanding.
              </p>
            </div>
          </div>

          <br />
          <br />

          {/* Open Chatbot Button */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button
              onClick={() => router.push("/chat")}
              className="hero-cta-btn"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              OPEN CHATBOT
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer 
        className="home-footer"
        style={{
          borderColor: isDark ? '#27272a' : '#e5e7eb',
          background: isDark ? 'rgba(24, 24, 27, 0.5)' : 'rgba(243, 244, 246, 0.5)'
        }}
      >
        <div className="footer-container">
          <div className="footer-content">
            {/* Logo & Copyright */}
            <div className="footer-brand">
              <div className="footer-logo">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="footer-copyright" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                © 2025 NEURO COPILOT. All rights reserved.
              </span>
            </div>

            
          </div>
        </div>
      </footer>
    </div>
  );
}
