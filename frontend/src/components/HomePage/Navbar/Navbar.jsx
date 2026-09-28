import { useEffect, useState } from 'react'

function Brand({ onHome }) {
  return (
    <a className="nav-brand" href="#home" aria-label="Safewatch AI home" onClick={(event) => { if (onHome) { event.preventDefault(); onHome() } }}>
      <svg viewBox="0 0 44 50" aria-hidden="true">
        <path d="M22 2 41 13v24L22 48 3 37V13L22 2Z" fill="#0a1820" stroke="currentColor" strokeWidth="2.5" />
        <path d="M22 8v7m0 20v7M8 25h7m14 0h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="25" r="8" fill="#0a1820" stroke="#4c8dff" strokeWidth="2.5" />
        <circle cx="22" cy="25" r="3" fill="#48c69b" />
      </svg>
      <span className="nav-brand-copy"><span>SAFEWATCH <b>AI</b></span><small>AUTONOMOUS DEFENSE</small></span>
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
      <Brand onHome={onOpenHome} />
      <span className="defense-grid-status"><i/><span>DEFENSE-GRID: ONLINE</span><b>LATENCY 18ms</b></span>
      <button className="nav-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="safewatch-main-nav" onClick={() => setMobileMenuOpen((open) => !open)}><span/><span/><span/></button>
      <nav className={`main-nav${mobileMenuOpen ? ' is-open' : ''}`} id="safewatch-main-nav" aria-label="Main navigation">
        <a className={`main-nav__link${activePage === 'home' ? ' is-current' : ''}`} href="#home" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenHome?.() }}>Home</a>
        <a className={`main-nav__link${activePage === 'live' ? ' is-current' : ''}`} href="#live-monitoring" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenLive?.() }}>{activePage === 'live' && <i className="nav-live-dot" />}Live Monitoring</a>
        <a className={`main-nav__link${activePage === 'incidents' ? ' is-current' : ''}`} href="#incident-log" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenIncidents?.() }}>Incident Log</a>
        <a className={`main-nav__link${activePage === 'analytics' ? ' is-current' : ''}`} href="#analytics" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenAnalytics?.() }}>Analytics &amp; Admin</a>
        <a className={`main-nav__link${activePage === 'how' ? ' is-current' : ''}`} href="#how-it-works" onClick={(event) => { event.preventDefault(); setMobileMenuOpen(false); onOpenHow?.() }}>How It Works</a>
      </nav>
      <div className="header-actions">
        <span className="navbar-clock"><i>UTC</i> {utcTime || utcNow}<b> / SHIFT B • ACTIVE</b></span>
        {onToggleMute && <button className="navbar-icon-button" type="button" onClick={onToggleMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'}>{muted ? '◖' : '◖))'}</button>}
        <button aria-label={broadcasting ? 'Cancel emergency broadcast' : 'Activate emergency broadcast'} className={`broadcast-button${broadcasting ? ' is-live' : ''}`} type="button" onClick={onBroadcast}>
          <span className="broadcast-button__icon" aria-hidden="true">!</span>
          <span>{broadcasting ? 'Broadcast active' : 'Emergency broadcast'}</span>
        </button>
        <div className="profile-chip" title={`${user?.name || 'Operator'} · ${user?.email || ''}`}>
          <span className="profile-chip__avatar">{initials}</span>
          <span className="profile-chip__identity"><span className="profile-chip__name">{user?.name || user?.email || 'OFFICER M. REYES'}</span><small className="profile-chip__meta">{user?.email ? `${user.email} · SYS-ADMIN / SAFETY LEVEL 4` : 'ID-884 · SYS-ADMIN / SAFETY LEVEL 4'}</small></span>
        </div>
        <button className="signout-button" type="button" onClick={onSignOut} aria-label="Sign out">↗</button>
      </div>
    </header>
  )
}
