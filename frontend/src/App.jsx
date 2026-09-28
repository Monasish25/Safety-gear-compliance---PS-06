import { useState } from 'react'
import Background from './components/Background/Background.jsx'
import AuthPanel from './components/AuthPanel/AuthPanel.jsx'
import HomePage from './components/HomePage/HomePage.jsx'
import IncidentPage from './components/IncidentPage/IncidentPage.jsx'
import LiveMonitoringPage from './components/LiveMonitoringPage/LiveMonitoringPage.jsx'
import AnalyticsPage from './components/AnalyticsPage/AnalyticsPage.jsx'
import HowItWorksPage from './components/HowItWorksPage/HowItWorksPage.jsx'
import LogoIntro from './components/LogoIntro/LogoIntro.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')

  function signOut() {
    setUser(null)
    setPage('home')
  }

  return (
    <main className={user ? 'site-shell site-shell--home' : 'site-shell'}>
      <Background />
      {user ? (
        page === 'how'
          ? <HowItWorksPage user={user} onHome={() => setPage('home')} onLive={() => setPage('live')} onIncidents={() => setPage('incidents')} onAnalytics={() => setPage('analytics')} onSignOut={signOut} />
          : page === 'analytics'
          ? <AnalyticsPage user={user} onHome={() => setPage('home')} onLive={() => setPage('live')} onIncidents={() => setPage('incidents')} onHow={() => setPage('how')} onSignOut={signOut} />
          : page === 'incidents'
          ? <IncidentPage user={user} onHome={() => setPage('home')} onLive={() => setPage('live')} onAnalytics={() => setPage('analytics')} onHow={() => setPage('how')} onSignOut={signOut} />
          : page === 'live'
            ? <LiveMonitoringPage user={user} onHome={() => setPage('home')} onIncidents={() => setPage('incidents')} onAnalytics={() => setPage('analytics')} onHow={() => setPage('how')} onSignOut={signOut} />
            : <HomePage user={user} onSignOut={signOut} onOpenIncidents={() => setPage('incidents')} onOpenLive={() => setPage('live')} onOpenAnalytics={() => setPage('analytics')} onOpenHow={() => setPage('how')} />
      ) : <AuthPanel onLogin={(nextUser) => { setUser(nextUser); setPage('home') }} />}
      <LogoIntro />
    </main>
  )
}
