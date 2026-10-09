import { useEffect, useState } from 'react'

function Brand({ onHow }) {
  return (
    <a className="nav-brand" href="#how-it-works" aria-label="Open How It Works" onClick={(event) => { event.preventDefault(); onHow?.() }}>
      <svg viewBox="0 0 48 54" aria-hidden="true">
        <path d="M24 2 44 9v15c0 13-10 23-20 28C14 47 4 37 4 24V9z" fill="#071522" stroke="#0876b7" strokeWidth="2.5" />
        <path d="M24 7 39 12v12c0 10-7 18-15 22C16 42 9 34 9 24V12z" fill="#101b27" stroke="#005187" strokeWidth="1.2" />
        <path d="M24 8v9m0 17v8M10 24h8m12 0h8M14 14l6 6m8 8 6 6m0-20-6 6m-8 8-6 6" fill="none" stroke="#0065a3" strokeWidth="1" />
        <circle cx="24" cy="24" r="8" fill="#071522" stroke="#0083c8" strokeWidth="2" />
        <circle cx="24" cy="24" r="3.5" fill="#005187" />
        <circle cx="25.5" cy="22.5" r="1.3" fill="#fff" />
      </svg>
      <span className="nav-brand-copy"><span>VISION</span><span>SHIELD</span></span>
    </a>
  )
}

export default function Navbar({ user, broadcasting, onBroadcast, onSignOut, onOpenIncidents, onOpenLive, onOpenHome, onOpenAnalytics, onOpenHow, activePage = 'home', utcTime, muted, onToggleMute }) {
  const initials = (user?.name || user?.email || 'OP').slice(0, 2).toUpperCase()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [utcNow, setUtcNow] = useState(() => new Date().toISOString().slice(11, 19))
  useEffect(() => {
    const timer = window.setInterval(() => setUtcNow(new Date().toISOString().slice(11, 19)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <header className="home-header glass-panel">
      <Brand onHow={onOpenHow} />
      <button className="nav-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="vision-shield-main-nav" onClick={() => setMobileMenuOpen((open) => !open)}><span/><span/><span/></button>
      <nav className={`main-nav${mobileMenuOpen ? ' is-open' : ''}`} id="vision-shield-main-nav" aria-label="Main navigation">
        <a className={`main-nav__link${activePage === 'home' ? ' is-current' : ''}`} href="#home" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenHome?.() }}>Home</a>
        <a className={`main-nav__link${activePage === 'live' ? ' is-current' : ''}`} href="#live-monitoring" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenLive?.() }}>{activePage === 'live' && <i className="nav-live-dot" />}Live Monitoring</a>
        <a className={`main-nav__link${activePage === 'incidents' ? ' is-current' : ''}`} href="#incident-log" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenIncidents?.() }}>Incident Log</a>
        <a className={`main-nav__link${activePage === 'analytics' ? ' is-current' : ''}`} href="#analytics" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenAnalytics?.() }}>Analytics &amp; Admin</a>
      </nav>
      <div className="header-actions">
        {onToggleMute && <button className="navbar-icon-button" type="button" onClick={onToggleMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'}>{muted ? '◖' : '◖))'}</button>}
        <button aria-label={broadcasting ? 'Cancel emergency broadcast' : 'Activate emergency broadcast'} className={`broadcast-button${broadcasting ? ' is-live' : ''}`} type="button" onClick={onBroadcast}>
          <span className="broadcast-button__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M12 2.2 22 20a1.35 1.35 0 0 1-1.18 2H3.18A1.35 1.35 0 0 1 2 20L12 2.2Zm0 4.1L5.1 19.2h13.8L12 6.3Zm-1 4.1h2v5.2h-2v-5.2Zm0 6.7h2v2h-2v-2Z" /></svg>
          </span>
        </button>
        <div className="profile-chip" aria-label="Signed-in user">
          <span className="profile-chip__avatar">{initials}</span>
          </div>
        <button className="signout-button" type="button" onClick={onSignOut} aria-label="Sign out">↗</button>
      </div>
    </header>
  )
}
