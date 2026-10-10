import { useState } from 'react'
import Navbar from './Navbar/Navbar.jsx'
import HeroSection from './HeroSection/HeroSection.jsx'
import StatsBar from './StatsBar/StatsBar.jsx'
import Classifiers from './Classifiers/Classifiers.jsx'
import Pipeline from './Pipeline/Pipeline.jsx'
import PrototypeBanner from './PrototypeBanner/PrototypeBanner.jsx'
import Footer from './Footer/Footer.jsx'
import './HomePage.css'

export default function HomePage({ user, theme, onThemeChange, onSignOut, onOpenIncidents, onOpenLive, onOpenAnalytics, onOpenHow }) {
  const [broadcasting, setBroadcasting] = useState(false)
  const [activeView, setActiveView] = useState('Command overview')

  function chooseView(view) {
    setActiveView(view)
    document.getElementById('monitoring')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="home-page min-h-screen text-white">
      <Navbar
        user={user}
        theme={theme}
        onThemeChange={onThemeChange}
        broadcasting={broadcasting}
        onBroadcast={() => setBroadcasting((active) => !active)}
        onSignOut={onSignOut}
        onOpenIncidents={onOpenIncidents}
        onOpenLive={onOpenLive}
        onOpenAnalytics={onOpenAnalytics}
        onOpenHow={onOpenHow}
        activePage="home"
      />
      {broadcasting && (
        <div className="broadcast-banner" role="status">
          <span className="status-dot status-dot--red" /> Emergency broadcast is active across the site.
          <button type="button" onClick={() => setBroadcasting(false)}>Dismiss</button>
        </div>
      )}
      <div className="home-content">
        <HeroSection activeView={activeView} onSelectView={chooseView} />
        <StatsBar />
        <Classifiers />
        <Pipeline />
        <PrototypeBanner onLaunch={onOpenLive} />
        <Footer />
      </div>
    </div>
  )
}
